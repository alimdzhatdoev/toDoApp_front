// ==============================
//  ToDo (frontend) + Django API
//  Этот файл НЕ объявляет const API и CRUD — они берутся из api.js
//  Сохраняем в localStorage только состояние "свернуть Done"
// ==============================

// ====== UI state only ======
const UI_KEY = 'todo-ui.v1';
const state = {
    items: [],                                 // задачи придут с сервера
    ui: loadUI()                               // свернутость "Done"
};
function loadUI() {
    try { return Object.assign({ doneCollapsed: true }, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); }
    catch { return { doneCollapsed: true }; }
}
function saveUI() { localStorage.setItem(UI_KEY, JSON.stringify(state.ui)); }

// ====== DOM ======
const form = document.getElementById('add-form');
const input = document.getElementById('new-title');

const todoList = document.getElementById('todo-list');
const doneList = document.getElementById('done-list');
const todoCountEl = document.getElementById('todo-count');
const doneCountEl = document.getElementById('done-count');
const todoEmpty = document.getElementById('todo-empty');
const doneEmpty = document.getElementById('done-empty');
const doneToggle = document.getElementById('done-toggle');
const doneWrapper = document.getElementById('done-wrapper');

// ====== helpers ======
function byCreatedDesc(a, b) { return b.createdAt - a.createdAt; }
function normalizeFromServer(dto) {
    return {
        id: dto.id,
        title: dto.title,
        done: dto.status === 'done',
        createdAt: Date.parse(dto.created_at || Date.now())
    };
}

// ====== init ======
init();
async function init() {
    try {
        const list = await apiGetTodos();            // из api.js
        state.items = list.map(normalizeFromServer).sort(byCreatedDesc);
        render();
    } catch (e) {
        console.error('Load failed', e);
        alert('Не удалось загрузить задачи с сервера.');
    }
}

// ====== render ======
function render() {
    todoList.innerHTML = '';
    doneList.innerHTML = '';

    const todos = state.items.filter(i => !i.done).sort(byCreatedDesc);
    const dones = state.items.filter(i => i.done).sort(byCreatedDesc);

    todos.forEach(i => todoList.appendChild(renderItem(i)));
    dones.forEach(i => doneList.appendChild(renderItem(i)));

    todoCountEl.textContent = String(todos.length);
    doneCountEl.textContent = String(dones.length);

    todoEmpty.hidden = todos.length !== 0;
    doneEmpty.hidden = dones.length !== 0;

    applyDoneCollapsed(state.ui.doneCollapsed);
}

function renderItem(item) {
    const el = document.createElement('div');
    el.className = 'item';
    el.setAttribute('role', 'listitem');

    const title = document.createElement('div');
    title.className = 'title' + (item.done ? ' done' : '');
    title.textContent = item.title;
    title.addEventListener('dblclick', () => startEdit(item, el, title));
    el.appendChild(title);

    const btnEdit = document.createElement('button');
    btnEdit.className = 'icon-btn focus-ring';
    btnEdit.setAttribute('aria-label', 'Edit task');
    btnEdit.title = 'Edit';
    btnEdit.innerHTML = pencilSvg();
    btnEdit.addEventListener('click', () => startEdit(item, el, title));
    el.appendChild(btnEdit);

    const btnToggle = document.createElement('button');
    btnToggle.className = 'icon-btn icon-btn--check focus-ring';
    btnToggle.dataset.checked = String(item.done);
    btnToggle.setAttribute('aria-label', item.done ? 'Mark as not done' : 'Mark as done');
    btnToggle.title = item.done ? 'Mark as not done' : 'Mark as done';
    btnToggle.innerHTML = checkSvg();
    btnToggle.addEventListener('click', () => toggleDone(item.id));
    el.appendChild(btnToggle);

    const btnTrash = document.createElement('button');
    btnTrash.className = 'icon-btn icon-btn--trash focus-ring';
    btnTrash.setAttribute('aria-label', 'Delete task');
    btnTrash.title = 'Delete';
    btnTrash.innerHTML = trashSvg();
    btnTrash.addEventListener('click', () => removeItem(item.id));
    el.appendChild(btnTrash);

    return el;
}

// ====== operations (через api.js) ======
async function addItem(title) {
    const t = title.trim();
    if (!t) return;
    try {
        const created = await apiCreateTodo({ title: t, status: 'todo' }); // api.js
        const item = normalizeFromServer(created);
        state.items.unshift(item);             // новые — вверх
        render();
    } catch (e) {
        console.error(e);
        alert('Не удалось создать задачу');
    }
}

async function toggleDone(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    const nextStatus = item.done ? 'todo' : 'done';
    try {
        const upd = await apiUpdateTodo(id, { status: nextStatus });       // api.js
        const norm = normalizeFromServer(upd);
        const idx = state.items.findIndex(x => x.id === id);
        if (idx >= 0) state.items[idx] = norm;
        render();
    } catch (e) {
        console.error(e);
        alert('Не удалось обновить задачу');
    }
}

async function removeItem(id) {
    try {
        await apiDeleteTodo(id);                                         // api.js
        state.items = state.items.filter(i => i.id !== id);
        render();
    } catch (e) {
        console.error(e);
        alert('Не удалось удалить задачу');
    }
}

// ====== редактирование ======
function startEdit(item, container, titleEl) {
    const edit = document.createElement('input');
    edit.className = 'input focus-ring';
    edit.style.height = '36px';
    edit.style.borderRadius = '10px';
    edit.value = item.title;

    const btnSave = document.createElement('button');
    btnSave.className = 'icon-btn focus-ring';
    btnSave.setAttribute('aria-label', 'Save');
    btnSave.title = 'Save';
    btnSave.innerHTML = checkThinSvg();

    const btnCancel = document.createElement('button');
    btnCancel.className = 'icon-btn focus-ring';
    btnCancel.setAttribute('aria-label', 'Cancel');
    btnCancel.title = 'Cancel';
    btnCancel.innerHTML = crossSvg();

    const row = document.createElement('div');
    row.className = 'item';
    row.style.gridTemplateColumns = '1fr auto auto';
    row.appendChild(edit); row.appendChild(btnSave); row.appendChild(btnCancel);

    container.replaceWith(row);
    edit.focus(); edit.select();

    const finish = async (commit) => {
        if (commit) {
            const v = edit.value.trim();
            if (v && v !== item.title) {
                try {
                    const upd = await apiUpdateTodo(item.id, { title: v });     // api.js
                    const norm = normalizeFromServer(upd);
                    const idx = state.items.findIndex(x => x.id === item.id);
                    if (idx >= 0) state.items[idx] = norm;
                } catch (e) {
                    console.error(e);
                    alert('Не удалось сохранить изменения');
                }
            }
        }
        render();
    };

    btnSave.addEventListener('click', () => finish(true));
    btnCancel.addEventListener('click', () => finish(false));
    edit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
    });
    edit.addEventListener('blur', () => finish(true));
}

// ====== коллапс "Done" ======
doneToggle.addEventListener('click', () => {
    state.ui.doneCollapsed = !state.ui.doneCollapsed;
    saveUI();
    applyDoneCollapsed(state.ui.doneCollapsed);
});
function applyDoneCollapsed(collapsed) {
    doneToggle.setAttribute('aria-expanded', String(!collapsed));
    doneWrapper.hidden = collapsed;
    if (collapsed) doneWrapper.classList.add('collapsed');
    else doneWrapper.classList.remove('collapsed');
}

// ====== форма добавления ======
form.addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(input.value);
    form.reset();
    input.focus();
});

// ====== SVG ======
function checkSvg() {
    return `
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#7CE0C2"
      d="M9.55 17.6a1 1 0 0 1-.74-.33l-3.8-4.13a1 1 0 1 1 1.48-1.34l3 3.26 8.02-8.02a1 1 0 0 1 1.41 1.41l-8.76 8.76a1 1 0 0 1-.71.29z"/>
  </svg>`;
}
function trashSvg() {
    return `
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#ff99b1"
      d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1zm1 2h4V4h-4v1zM7 7v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7Ҳ"/>`;
}
function pencilSvg() {
    return `
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#cbbef0"
      d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zm17.71-10.96a1.003 1.003 0 0 0 0-1.42l-1.58-1.58a1 1 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.08-1.08z"/>
  </svg>`;
}
function checkThinSvg() {
    return `
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#7CE0C2"
      d="M20.285 6.709a1 1 0 0 1 0 1.414l-9.2 9.2a1 1 0 0 1-1.414 0l-5.2-5.2a1 1 0 1 1 1.414-1.414l4.493 4.493 8.493-8.493a1 1 0 0 1 1.414 0z"/>
  </svg>`;
}
function crossSvg() {
    return `
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#ff99b1"
      d="M18.3 5.71a1 1 0 0 1 0 1.41L13.41 12l4.89 4.88a1 1 0 1 1-1.41 1.42L12 13.41l-4.88 4.89a1 1 0 1 1-1.42-1.41L10.59 12 5.7 7.12a1 1 0 0 1 1.41-1.41L12 10.59l4.88-4.89a1 1 0 0 1 1.42 0z"/>
  </svg>`;
}
