// main.js — общие утилиты, счётчик корзины в шапке

const API_BASE = 'http://127.0.0.1:5000/api';

// --- Утилиты для работы с API ---
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(API_BASE + endpoint, { ...options, headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        return data;
    } catch (err) {
        console.error('API Error:', err.message);
        throw err;
    }
}

// --- Счётчик корзины в шапке ---
async function updateCartCounter() {
    const token = localStorage.getItem('token');
    if (!token) { setCartBadge(0); return; }
    try {
        const data = await apiFetch('/cart');
        const total = (data.items || []).reduce((sum, item) => sum + item.quantity, 0);
        setCartBadge(total);
    } catch {
        setCartBadge(0);
    }
}

function setCartBadge(count) {
    const cartLink = document.querySelector('nav a[href="cart.html"]');
    if (!cartLink) return;

    let badge = cartLink.querySelector('.cart-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge';
        cartLink.style.position = 'relative';
        cartLink.appendChild(badge);
    }

    if (count > 0) {
        badge.textContent = count;
        badge.style.cssText = `
            position: absolute; top: -6px; right: -6px;
            background: #00d4ff; color: #0a0a0a;
            border-radius: 50%; width: 18px; height: 18px;
            font-size: 11px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
        `;
    } else {
        badge.remove();
    }
}

// --- Показать уведомление ---
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const note = document.createElement('div');
    note.className = 'notification';
    note.textContent = message;
    note.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        padding: 1rem 1.5rem; border-radius: 8px;
        font-size: 1rem; font-weight: 500; z-index: 9999;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 80, 80, 0.15)'};
        border: 1px solid ${type === 'success' ? '#00d4ff' : '#ff5050'};
        color: ${type === 'success' ? '#00d4ff' : '#ff5050'};
        box-shadow: 0 0 20px ${type === 'success' ? 'rgba(0,212,255,0.2)' : 'rgba(255,80,80,0.2)'};
    `;
    const style = document.createElement('style');
    style.textContent = `@keyframes slideIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }`;
    document.head.appendChild(style);
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3000);
}

// --- Проверка авторизации ---
function isLoggedIn() { return !!localStorage.getItem('token'); }
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// --- Обновить пункт входа/профиля в шапке ---
function updateHeaderAuth() {
    const authLink = document.querySelector('.auth-nav-item a');
    if (!authLink) return;

    if (isLoggedIn()) {
        const user = getCurrentUser();
        authLink.textContent = '👤 ' + (user?.username || 'Профиль');
        authLink.href = '#';
        authLink.style.position = 'relative';

        // Добавить стили выпадающего меню
        if (!document.querySelector('#dropdown-style')) {
            const style = document.createElement('style');
            style.id = 'dropdown-style';
            style.textContent = `
                .profile-dropdown {
                    display: none;
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    background: #111;
                    border: 1px solid rgba(0,212,255,0.3);
                    border-radius: 8px;
                    min-width: 160px;
                    z-index: 9999;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                }
                .profile-dropdown.open { display: block; }
                .profile-dropdown a {
                    display: block;
                    padding: 0.8rem 1.2rem;
                    color: #ccc;
                    text-decoration: none;
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .profile-dropdown a:last-child { border-bottom: none; }
                .profile-dropdown a:hover {
                    background: rgba(0,212,255,0.1);
                    color: #00d4ff;
                }
            `;
            document.head.appendChild(style);
        }

        // Создать выпадающее меню
        const dropdown = document.createElement('div');
        dropdown.className = 'profile-dropdown';
        dropdown.innerHTML = `
            <a href="orders.html">📦 Мои заказы</a>
            <a href="#" id="logout-btn">🚪 Выйти</a>
        `;

        const li = authLink.closest('li');
        li.style.position = 'relative';
        li.appendChild(dropdown);

        // Открыть/закрыть по клику
        authLink.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('open');
        });

        // Закрыть при клике вне меню
        document.addEventListener('click', (e) => {
            if (!li.contains(e.target)) dropdown.classList.remove('open');
        });

        // Выход
        dropdown.querySelector('#logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showNotification('Вы вышли из аккаунта');
            setTimeout(() => window.location.href = 'index.html', 800);
        });

    } else {
        authLink.textContent = 'Войти';
        authLink.href = 'auth.html';
    }
}

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCounter();
    updateHeaderAuth();
});

window.CoreShop = { apiFetch, showNotification, updateCartCounter, isLoggedIn, getCurrentUser };
