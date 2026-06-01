
const CATEGORY_NAMES = {
    cpu: 'Процессор', gpu: 'Видеокарта', ram: 'Оперативная память',
    mb: 'Материнская плата', disk: 'Накопители', cooler: 'Охлаждение',
    power: 'Блок питания', frame: 'Корпус'
};

const selectedBuild = {
    cpu: null, gpu: null, ram: null, mb: null,
    disk: null, cooler: null, power: null, frame: null
};

let currentCategory = 'cpu';
let allProducts = [];
let currentProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    initCategoryButtons();
    initSlider();
    initSaveButton();
    loadComponents('cpu');
});

function initCategoryButtons() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadComponents(currentCategory);
        });
    });
}

async function loadComponents(category) {
    const grid = document.querySelector('.components-grid');
    const header = document.querySelector('.components-header h2');
    const subheader = document.querySelector('.components-header p');

    if (header) header.textContent = CATEGORY_NAMES[category] || category;
    if (subheader) subheader.textContent = `Выберите ${CATEGORY_NAMES[category]?.toLowerCase()}`;
    if (grid) grid.innerHTML = '<p style="color:#aaa;padding:1rem">Загрузка...</p>';

    try {
        const res = await fetch(`${window.API_BASE || 'https://zachet-production.up.railway.app'}/api/products?category=${category}`);
        allProducts = await res.json();

        buildBrandFilter(allProducts);
        applyFilters();
    } catch {
        if (grid) grid.innerHTML = '<p style="color:#ff6666;padding:1rem">Ошибка загрузки. Сервер запущен?</p>';
    }
}

function buildBrandFilter(products) {
    const container = document.querySelector('.brand-filter');
    if (!container) return;

    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];

    const brandNames = {
        intel: 'Intel', amd: 'AMD', nvidia: 'NVIDIA', asus: 'ASUS',
        msi: 'MSI', gigabyte: 'Gigabyte', kingston: 'Kingston',
        corsair: 'Corsair', samsung: 'Samsung', wd: 'WD',
        seagate: 'Seagate', noctua: 'Noctua', nzxt: 'NZXT',
        deepcool: 'Deepcool', seasonic: 'Seasonic', bequiet: 'be quiet!',
        fractal: 'Fractal Design', lianli: 'Lian Li'
    };

    container.innerHTML = brands.map(brand => `
        <label>
            <input type="checkbox" name="brand" value="${brand}" checked>
            ${brandNames[brand] || brand}
        </label>
    `).join('');

    container.querySelectorAll('input').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const maxPrice = parseInt(document.querySelector('.price-slider')?.value || 999999);
    const checkedBrands = [...document.querySelectorAll('.brand-filter input:checked')]
        .map(cb => cb.value);

    currentProducts = allProducts.filter(p => {
        const priceOk = p.price <= maxPrice;
        const brandOk = checkedBrands.length === 0 || checkedBrands.includes(p.brand);
        return priceOk && brandOk;
    });

    renderComponents(currentProducts, currentCategory);
}

function initSlider() {
    const slider = document.querySelector('.price-slider');
    const priceLabel = document.querySelector('.price-values span');
    if (!slider) return;

    slider.addEventListener('input', () => {
        if (priceLabel) priceLabel.textContent = `до ${formatPrice(slider.value)}₽`;
        applyFilters();
    });
}

function renderComponents(products, category) {
    const grid = document.querySelector('.components-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;padding:1rem">Нет подходящих компонентов</p>';
        return;
    }

    products.forEach(item => {
        const card = document.createElement('div');
        card.className = 'component-card';

        const isSelected = selectedBuild[category]?.id === item.id;
        const compatibility = checkCompatibility(category, item);

        card.style.opacity = compatibility.ok ? '1' : '0.5';

        card.innerHTML = `
            <img src="${item.img || 'img/cpu-icon.svg'}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p>${formatPrice(item.price)}₽</p>
            ${!compatibility.ok ? `<div class="compat-warning">⚠️ ${compatibility.reason}</div>` : ''}
            <button class="select-component-btn ${isSelected ? 'selected' : ''}"
                    data-id="${item.id}"
                    ${!compatibility.ok ? 'disabled' : ''}>
                ${isSelected ? '✓ Выбрано' : 'Выбрать'}
            </button>
        `;

        const warning = card.querySelector('.compat-warning');
        if (warning) {
            warning.style.cssText = `
                color: #ff9944; font-size: 0.85rem; padding: 0.5rem;
                background: rgba(255,153,68,0.1); border-radius: 4px;
                border: 1px solid rgba(255,153,68,0.3);
                margin-bottom: 0.5rem; text-align: center;
            `;
        }

        const btn = card.querySelector('.select-component-btn');
        if (isSelected) {
            btn.style.cssText = 'background: rgba(0,212,255,0.2); border-color: #00d4ff; color: #00d4ff;';
        }

        btn.addEventListener('click', () => selectComponent(category, item));
        grid.appendChild(card);
    });
}

function checkCompatibility(category, item) {
    if (category === 'mb') {
        if (selectedBuild.cpu && item.socket !== selectedBuild.cpu.socket) {
            return { ok: false, reason: `Сокет не совпадает: нужен ${selectedBuild.cpu.socket}, плата — ${item.socket}` };
        }
    }
    if (category === 'ram') {
        if (selectedBuild.mb && item.ram_type !== selectedBuild.mb.ram_type) {
            return { ok: false, reason: `Тип памяти не совпадает: плата поддерживает ${selectedBuild.mb.ram_type}` };
        }
    }
    if (category === 'cooler') {
        if (selectedBuild.cpu && item.max_tdp < selectedBuild.cpu.tdp) {
            return { ok: false, reason: `Кулер не справится с CPU (TDP ${selectedBuild.cpu.tdp}W > ${item.max_tdp}W)` };
        }
    }
    if (category === 'power') {
        const cpuTdp = selectedBuild.cpu?.tdp || 0;
        const gpuPower = selectedBuild.gpu?.power_req || 0;
        const needed = cpuTdp + gpuPower + 100;
        if (needed > 0 && item.watts < needed) {
            return { ok: false, reason: `Мощности не хватает: нужно ~${needed}W, БП даёт ${item.watts}W` };
        }
    }
    return { ok: true };
}

function selectComponent(category, item) {
    selectedBuild[category] = item;

    if (category === 'cpu') {
        ['mb', 'cooler', 'power'].forEach(cat => {
            if (selectedBuild[cat] && !checkCompatibility(cat, selectedBuild[cat]).ok) {
                selectedBuild[cat] = null;
                window.CoreShop.showNotification(`⚠️ ${CATEGORY_NAMES[cat]} сброшен — несовместим с новым процессором`, 'error');
            }
        });
    }
    if (category === 'mb') {
        if (selectedBuild.ram && !checkCompatibility('ram', selectedBuild.ram).ok) {
            selectedBuild.ram = null;
            window.CoreShop.showNotification('⚠️ ОЗУ сброшено — несовместимо с новой платой', 'error');
        }
    }

    updateBuildSidebar();
    renderComponents(currentProducts, category);
    window.CoreShop.showNotification(`✅ ${item.name} выбран`);
}

function updateBuildSidebar() {
    const keys = ['cpu', 'gpu', 'ram', 'mb', 'disk', 'cooler', 'power', 'frame'];
    document.querySelectorAll('.component-item').forEach((item, i) => {
        const key = keys[i];
        const selected = selectedBuild[key];
        const valueEl = item.querySelector('.component-value');
        if (valueEl) {
            valueEl.textContent = selected ? selected.name : 'не выбран';
            valueEl.style.color = selected ? '#00d4ff' : '#666';
        }
    });

    const total = Object.values(selectedBuild).reduce((sum, item) => sum + (item?.price || 0), 0);
    const priceEl = document.querySelector('.price-value');
    if (priceEl) priceEl.textContent = formatPrice(total) + '₽';
}

function initSaveButton() {
    const btn = document.querySelector('.save-build-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!window.CoreShop.isLoggedIn()) {
            window.CoreShop.showNotification('Войдите, чтобы сохранить сборку', 'error');
            setTimeout(() => window.location.href = 'auth.html', 1200);
            return;
        }

        const filled = Object.values(selectedBuild).filter(Boolean);
        if (filled.length < 4) {
            window.CoreShop.showNotification('Выберите хотя бы 4 компонента', 'error');
            return;
        }

        const total = Object.values(selectedBuild).reduce((sum, i) => sum + (i?.price || 0), 0);
        const specs = Object.entries(selectedBuild)
            .filter(([, v]) => v)
            .map(([k, v]) => `${CATEGORY_NAMES[k]}: ${v.name}`)
            .join(' | ');

        btn.textContent = '⏳ Сохраняем...';
        btn.disabled = true;

        try {
            await window.CoreShop.apiFetch('/cart/add', {
                method: 'POST',
                body: JSON.stringify({ name: 'Кастомная сборка', price: total, category: 'custom', specs, quantity: 1 })
            });
            window.CoreShop.showNotification('✅ Сборка добавлена в корзину!');
            window.CoreShop.updateCartCounter();
            btn.textContent = '✓ Добавлено в корзину';
            setTimeout(() => { btn.textContent = 'Сохранить сборку'; btn.disabled = false; }, 3000);
        } catch {
            window.CoreShop.showNotification('Ошибка сохранения сборки', 'error');
            btn.textContent = 'Сохранить сборку';
            btn.disabled = false;
        }
    });
}

function formatPrice(num) {
    return Number(num).toLocaleString('ru-RU');
}
