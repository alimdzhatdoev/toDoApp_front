// ====== ХРАНИЛИЩЕ/СОСТОЯНИЕ ======
const STORAGE_KEY = 'todo-list.v1';
const UI_KEY = 'todo-ui.v1'; // для состояния UI (свернуто/развернуто)

const state = {
    items: loadItems(),
    ui: loadUI()
};

function loadItems() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function saveItems() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); }

function loadUI() {
    try { return Object.assign({ doneCollapsed: true }, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); }
    catch { return { doneCollapsed: true }; }
}
function saveUI() { localStorage.setItem(UI_KEY, JSON.stringify(state.ui)); }

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

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

// ====== РЕНДЕР ======
function byCreatedDesc(a, b) { return b.createdAt - a.createdAt; }

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

    // отрисуем состояние коллапса "Done"
    applyDoneCollapsed(state.ui.doneCollapsed);
}

function renderItem(item) {
    const el = document.createElement('div');
    el.className = 'item';
    el.setAttribute('role', 'listitem');

    // Текст
    const title = document.createElement('div');
    title.className = 'title' + (item.done ? ' done' : '');
    title.textContent = item.title;
    // Двойной клик = редактирование
    title.addEventListener('dblclick', () => startEdit(item, el, title));
    el.appendChild(title);

    // Кнопка редактирования (карандаш)
    const btnEdit = document.createElement('button');
    btnEdit.className = 'icon-btn focus-ring';
    btnEdit.setAttribute('aria-label', 'Edit task');
    btnEdit.title = 'Edit';
    btnEdit.innerHTML = pencilSvg();
    btnEdit.addEventListener('click', () => startEdit(item, el, title));
    el.appendChild(btnEdit);

    // Переключение done
    const btnToggle = document.createElement('button');
    btnToggle.className = 'icon-btn icon-btn--check focus-ring';
    btnToggle.dataset.checked = String(item.done);
    btnToggle.setAttribute('aria-label', item.done ? 'Mark as not done' : 'Mark as done');
    btnToggle.title = item.done ? 'Mark as not done' : 'Mark as done';
    btnToggle.innerHTML = checkSvg();
    btnToggle.addEventListener('click', () => toggleDone(item.id));
    el.appendChild(btnToggle);

    // Удаление
    const btnTrash = document.createElement('button');
    btnTrash.className = 'icon-btn icon-btn--trash focus-ring';
    btnTrash.setAttribute('aria-label', 'Delete task');
    btnTrash.title = 'Delete';
    btnTrash.innerHTML = trashSvg();
    btnTrash.addEventListener('click', () => removeItem(item.id));
    el.appendChild(btnTrash);

    return el;
}

// ====== ОПЕРАЦИИ ======
function addItem(title) {
    const t = title.trim();
    if (!t) return;
    state.items.push({ id: uid(), title: t, done: false, createdAt: Date.now() });
    saveItems(); render();
}
function toggleDone(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.done = !item.done;
    saveItems(); render();
}
function removeItem(id) {
    state.items = state.items.filter(i => i.id !== id);
    saveItems(); render();
}

// ====== РЕДАКТИРОВАНИЕ ======
function startEdit(item, container, titleEl) {
    // создаём input и две кнопки (сохранить/отмена)
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

    // собираем временную строку: [input][Save][Cancel]
    const row = document.createElement('div');
    row.className = 'item';
    row.style.gridTemplateColumns = '1fr auto auto'; // без кнопок чек/удаление на время редактирования
    row.appendChild(edit); row.appendChild(btnSave); row.appendChild(btnCancel);

    container.replaceWith(row);
    edit.focus(); edit.select();

    const finish = (commit) => {
        if (commit) {
            const v = edit.value.trim();
            if (v) { item.title = v; saveItems(); }
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

// ====== КОЛЛАПС "DONE" ======
doneToggle.addEventListener('click', () => {
    state.ui.doneCollapsed = !state.ui.doneCollapsed;
    saveUI();
    applyDoneCollapsed(state.ui.doneCollapsed);
});
function applyDoneCollapsed(collapsed) {
    doneToggle.setAttribute('aria-expanded', String(!collapsed));
    // скрываем/показываем обертку
    doneWrapper.hidden = collapsed;
    if (collapsed) {
        doneWrapper.classList.add('collapsed');
    } else {
        doneWrapper.classList.remove('collapsed');
    }
}

// ====== UI: форма добавления ======
form.addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(input.value);
    form.reset();
    input.focus();
});

// старт
render();

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
      d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1zm1 2h4V4h-4v1zM7 7v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7H7zm3 3a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0v-7zm4 0a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0v-7z"/>
  </svg>`;
}
function pencilSvg() {
    return `
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#cbbef0"
      d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zm17.71-10.96a1.003 1.003 0 0 0 0-1.42l-1.58-1.58a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.08-1.08z"/>
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
