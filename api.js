// Базовый URL нашего Django API
const API = 'http://127.0.0.1:8000/api';

// Универсальная обёртка (бросает ошибку, если HTTP не 2xx)
async function http(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// CRUD для задач
async function apiGetTodos() {
  return http(`${API}/todos/`);
}
async function apiCreateTodo(payload) {
  return http(`${API}/todos/`, { method: 'POST', body: JSON.stringify(payload) });
}
async function apiUpdateTodo(id, patch) {
  return http(`${API}/todos/${id}/`, { method: 'PATCH', body: JSON.stringify(patch) });
}
async function apiDeleteTodo(id) {
  return http(`${API}/todos/${id}/`, { method: 'DELETE' });
}
