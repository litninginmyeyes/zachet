// cart.js — загрузка корзины, изменение количества, удаление, оформление заказа

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
});

// --- Загрузка корзины с сервера ---
async function loadCart() {
    if (!window.CoreShop.isLoggedIn()) {
        showEmptyCart();
        document.querySelector('.cart-items h2') && (document.querySelector('.cart-items h2').textContent = 'Войдите, чтобы увидеть корзину');
        return;
    }

    try {
        const data = await window.CoreShop.apiFetch('/cart');
        renderCart(data.items || []);
    } catch (err) {
        window.CoreShop.showNotification('Не удалось загрузить корзину', 'error');
        showEmptyCart();
    }
}

// --- Отрисовка товаров корзины ---
function renderCart(items) {
    const container = document.querySelector('.cart-items');
    if (!container) return;

    // Очистить статичные карточки из HTML
    container.querySelectorAll('.cart-item').forEach(el => el.remove());
    const emptyMsg = container.querySelector('.empty-cart-message');

    if (items.length === 0) {
        showEmptyCart();
        updateSummary([]);
        return;
    }

    // Скрыть пустое сообщение
    if (emptyMsg) emptyMsg.style.display = 'none';

    // Вставить товары перед пустым сообщением
    items.forEach(item => {
        const card = createCartItemElement(item);
        container.insertBefore(card, emptyMsg);
    });

    updateSummary(items);
    initCartEvents();
}

// --- Создать карточку товара ---
function createCartItemElement(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.dataset.itemId = item.id;

    // Картинка по категории
    const imgMap = { standard: 'standart', pro: 'pro', ultimate: 'ultimate', custom: 'configurator' };
    const imgName = imgMap[item.category] || 'standart';

    div.innerHTML = `
        <img src="img/${imgName}.png" alt="${item.name}">
        <div class="item-details">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p class="item-description">${item.specs || ''}</p>
                <p class="item-category">Категория: ${item.category || '—'}</p>
            </div>
            <div class="item-controls">
                <div class="item-quantity">
                    <button class="quantity-btn minus" data-id="${item.id}">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn plus" data-id="${item.id}">+</button>
                </div>
                <div class="item-price">
                    <p class="price">${formatPrice(item.price * item.quantity)}₽</p>
                </div>
                <button class="remove-btn" data-id="${item.id}">🗑️ Удалить</button>
            </div>
        </div>
    `;
    return div;
}

// --- Навешивание событий на кнопки ---
function initCartEvents() {
    // Кнопки количества
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => changeQuantity(btn.dataset.id, -1));
    });
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => changeQuantity(btn.dataset.id, 1));
    });

    // Кнопки удаления
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeItem(btn.dataset.id));
    });

    // Кнопка оформления заказа
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
}

// --- Изменить количество ---
async function changeQuantity(itemId, delta) {
    const card = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
    const quantityEl = card?.querySelector('.quantity');
    if (!quantityEl) return;

    const newQty = parseInt(quantityEl.textContent) + delta;
    if (newQty < 1) {
        removeItem(itemId);
        return;
    }

    try {
        await window.CoreShop.apiFetch(`/cart/update/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity: newQty })
        });
        quantityEl.textContent = newQty;

        // Обновить цену в карточке
        const data = await window.CoreShop.apiFetch('/cart');
        const item = data.items.find(i => String(i.id) === String(itemId));
        if (item) {
            card.querySelector('.price').textContent = formatPrice(item.price * item.quantity) + '₽';
        }

        updateSummary(data.items);
        window.CoreShop.updateCartCounter();
    } catch {
        window.CoreShop.showNotification('Ошибка обновления', 'error');
    }
}

// --- Удалить товар ---
async function removeItem(itemId) {
    try {
        await window.CoreShop.apiFetch(`/cart/remove/${itemId}`, { method: 'DELETE' });

        const card = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease forwards';
            const style = document.createElement('style');
            style.textContent = `@keyframes fadeOut { to { opacity:0; transform: translateX(30px); } }`;
            document.head.appendChild(style);
            setTimeout(() => {
                card.remove();
                checkIfEmpty();
            }, 300);
        }

        window.CoreShop.showNotification('Товар удалён из корзины');
        window.CoreShop.updateCartCounter();

        const data = await window.CoreShop.apiFetch('/cart');
        updateSummary(data.items || []);
    } catch {
        window.CoreShop.showNotification('Ошибка удаления', 'error');
    }
}

// --- Обновить итоговую сумму ---
function updateSummary(items) {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    const countEl = document.querySelector('.summary-row span');
    if (countEl) countEl.textContent = `Сборки (${count})`;

    const totalEl = document.querySelector('.total-price');
    if (totalEl) totalEl.textContent = formatPrice(total) + '₽';

    // Также обновить строку с суммой без скидки
    const rows = document.querySelectorAll('.summary-row');
    if (rows[0]) rows[0].querySelector('span:last-child').textContent = formatPrice(total) + '₽';
}

// --- Показать пустую корзину ---
function showEmptyCart() {
    const emptyMsg = document.querySelector('.empty-cart-message');
    if (emptyMsg) emptyMsg.style.display = 'block';

    const summaryCard = document.querySelector('.summary-card');
    if (summaryCard) summaryCard.style.opacity = '0.5';

    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) checkoutBtn.disabled = true;
}

// --- Проверить, стала ли корзина пустой ---
function checkIfEmpty() {
    const items = document.querySelectorAll('.cart-item');
    if (items.length === 0) showEmptyCart();
}

// --- Оформить заказ ---
async function checkout() {
    const items = document.querySelectorAll('.cart-item');
    if (items.length === 0) {
        window.CoreShop.showNotification('Корзина пуста', 'error');
        return;
    }

    const btn = document.querySelector('.checkout-btn');
    btn.textContent = '⏳ Оформляем...';
    btn.disabled = true;

    try {
        await window.CoreShop.apiFetch('/orders/create', { method: 'POST' });
        window.CoreShop.showNotification('✅ Заказ успешно оформлен!');

        // Очистить корзину на странице
        document.querySelectorAll('.cart-item').forEach(el => el.remove());
        showEmptyCart();
        window.CoreShop.updateCartCounter();

        btn.textContent = '✓ Заказ оформлен';
    } catch (err) {
        window.CoreShop.showNotification('Ошибка оформления заказа', 'error');
        btn.textContent = '🚀 Оформить заказ';
        btn.disabled = false;
    }
}

// --- Утилита форматирования цены ---
function formatPrice(num) {
    return num.toLocaleString('ru-RU');
}
