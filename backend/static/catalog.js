
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initAddToCart();
});

function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const buildCards = document.querySelectorAll('.build-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;

            buildCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeIn 0.3s ease';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    const style = document.createElement('style');
    style.textContent = `@keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }`;
    document.head.appendChild(style);
}

function initAddToCart() {
    const addBtns = document.querySelectorAll('.add-to-cart');

    addBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!window.CoreShop.isLoggedIn()) {
                window.CoreShop.showNotification('Войдите, чтобы добавить в корзину', 'error');
                setTimeout(() => window.location.href = 'auth.html', 1200);
                return;
            }

            const card = btn.closest('.build-card');
            const name = card.querySelector('h3').textContent;
            const priceText = card.querySelector('.build-price').textContent;
            const price = parseInt(priceText.replace(/\D/g, ''));
            const category = card.dataset.category;

            const specs = [...card.querySelectorAll('.build-specs li')].map(li => li.textContent).join(' • ');

            btn.textContent = '⏳ Добавляем...';
            btn.disabled = true;

            try {
                await window.CoreShop.apiFetch('/cart/add', {
                    method: 'POST',
                    body: JSON.stringify({ name, price, category, specs, quantity: 1 })
                });

                window.CoreShop.showNotification(`✅ ${name} добавлен в корзину`);
                window.CoreShop.updateCartCounter();
                btn.textContent = '✓ В корзине';
                btn.style.borderColor = '#4CAF50';
                btn.style.color = '#4CAF50';
            } catch (err) {
                window.CoreShop.showNotification('Ошибка добавления в корзину', 'error');
                btn.textContent = 'В корзину';
                btn.disabled = false;
            }
        });
    });
}
