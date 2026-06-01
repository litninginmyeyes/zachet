#venv\Scripts\activate

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import sqlite3
import hashlib
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'static'), static_url_path='')
app.config['JWT_SECRET_KEY'] = 'core-acolytes-secret-key-2024'
CORS(app)
jwt = JWTManager(app)

@app.route('/debug')
def debug():
    import os
    static_path = os.path.join(BASE_DIR, 'static')
    files = os.listdir(static_path) if os.path.exists(static_path) else 'папка не найдена'
    return {'base_dir': BASE_DIR, 'static_path': static_path, 'files': str(files)}

@app.route('/')
def index():
    return app.send_static_file('index.html')
 
DB_PATH = os.path.join(os.path.dirname(__file__), 'shop.db')
 
# ─────────────────────────────────────────
# База данных
# ─────────────────────────────────────────
 
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
 
def init_db():
    conn = get_db()
    c = conn.cursor()
 
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
 
    # Добавить колонку role если её нет (для существующих БД)
    try:
        c.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"')
    except:
        pass
 
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price INTEGER NOT NULL,
            brand TEXT,
            socket TEXT,
            ram_type TEXT,
            tdp INTEGER,
            max_tdp INTEGER,
            power_req INTEGER,
            watts INTEGER,
            img TEXT,
            specs TEXT
        )
    ''')
 
    c.execute('''
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            category TEXT,
            specs TEXT,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
 
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total INTEGER NOT NULL,
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
 
    c.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        )
    ''')
 
    c.execute('SELECT COUNT(*) FROM products')
    if c.fetchone()[0] == 0:
        seed_products(c)
 
    conn.commit()
    conn.close()
 
def seed_products(c):
    products = [
        ('Intel Core i5-13400F', 'cpu', 18000, 'intel', 'LGA1700', None, 65, None, None, None, 'img/cpu-icon.png', None),
        ('Intel Core i7-14700K', 'cpu', 32000, 'intel', 'LGA1700', None, 125, None, None, None, 'img/cpu-icon.png', None),
        ('Intel Core i9-14900K', 'cpu', 52000, 'intel', 'LGA1700', None, 125, None, None, None, 'img/cpu-icon.png', None),
        ('AMD Ryzen 5 7600X',    'cpu', 22000, 'amd',   'AM5',     None, 105, None, None, None, 'img/cpu-icon.png', None),
        ('AMD Ryzen 7 7700X',    'cpu', 30000, 'amd',   'AM5',     None, 105, None, None, None, 'img/cpu-icon.png', None),
        ('AMD Ryzen 9 7950X',    'cpu', 55000, 'amd',   'AM5',     None, 170, None, None, None, 'img/cpu-icon.png', None),
        ('NVIDIA RTX 4060',        'gpu', 28000,  'nvidia', None, None, None, None, 115,  None, 'img/gpu-icon.png', None),
        ('NVIDIA RTX 4070',        'gpu', 48000,  'nvidia', None, None, None, None, 200,  None, 'img/gpu-icon.png', None),
        ('NVIDIA RTX 4080',        'gpu', 85000,  'nvidia', None, None, None, None, 320,  None, 'img/gpu-icon.png', None),
        ('NVIDIA RTX 4090',        'gpu', 130000, 'nvidia', None, None, None, None, 450,  None, 'img/gpu-icon.png', None),
        ('AMD Radeon RX 7600',     'gpu', 22000,  'amd',   None, None, None, None, 165,  None, 'img/gpu-icon.png', None),
        ('AMD Radeon RX 7900 XT',  'gpu', 70000,  'amd',   None, None, None, None, 315,  None, 'img/gpu-icon.png', None),
        ('Kingston 16GB DDR4 3200MHz',  'ram', 4500,  'kingston', None, 'DDR4', None, None, None, None, 'img/ram-icon.png', None),
        ('Corsair 32GB DDR4 3600MHz',   'ram', 8500,  'corsair',  None, 'DDR4', None, None, None, None, 'img/ram-icon.png', None),
        ('Kingston 32GB DDR5 5200MHz',  'ram', 10000, 'kingston', None, 'DDR5', None, None, None, None, 'img/ram-icon.png', None),
        ('Corsair 64GB DDR5 6000MHz',   'ram', 22000, 'corsair',  None, 'DDR5', None, None, None, None, 'img/ram-icon.png', None),
        ('ASUS Prime B760M-A',       'mb', 9500,  'asus', 'LGA1700', 'DDR4', None, None, None, None, 'img/mb-icon.png', None),
        ('ASUS ROG Strix Z790-E',    'mb', 28000, 'asus', 'LGA1700', 'DDR5', None, None, None, None, 'img/mb-icon.png', None),
        ('MSI MAG B650 Tomahawk',    'mb', 16000, 'msi',  'AM5',     'DDR5', None, None, None, None, 'img/mb-icon.png', None),
        ('Gigabyte X670E Aorus',     'mb', 35000, 'gigabyte', 'AM5', 'DDR5', None, None, None, None, 'img/mb-icon.png', None),
        ('Samsung 970 EVO 1TB NVMe',   'disk', 7000,  'samsung', None, None, None, None, None, None, 'img/disk-icon.png', None),
        ('WD Black SN850X 2TB NVMe',   'disk', 14000, 'wd',      None, None, None, None, None, None, 'img/disk-icon.png', None),
        ('Seagate Barracuda 2TB HDD',  'disk', 3500,  'seagate', None, None, None, None, None, None, 'img/disk-icon.png', None),
        ('Samsung 990 Pro 4TB NVMe',   'disk', 28000, 'samsung', None, None, None, None, None, None, 'img/disk-icon.png', None),
        ('Deepcool AK400',                'cooler', 3500,  'deepcool', None, None, None, 220, None, None, 'img/cooler-icon.png', None),
        ('Noctua NH-D15',                 'cooler', 8500,  'noctua',   None, None, None, 250, None, None, 'img/cooler-icon.png', None),
        ('NZXT Kraken X63 280mm AIO',     'cooler', 12000, 'nzxt',     None, None, None, 300, None, None, 'img/cooler-icon.png', None),
        ('Corsair H150i Elite 360mm AIO', 'cooler', 18000, 'corsair',  None, None, None, 400, None, None, 'img/cooler-icon.png', None),
        ('Seasonic Focus GX-550W',    'power', 6500,  'seasonic', None, None, None, None, None, 550,  'img/power-icon.png', None),
        ('Corsair RM750x',            'power', 9000,  'corsair',  None, None, None, None, None, 750,  'img/power-icon.png', None),
        ('be quiet! Dark Power 850W', 'power', 14000, 'bequiet',  None, None, None, None, None, 850,  'img/power-icon.png', None),
        ('ASUS ROG Thor 1000W',       'power', 22000, 'asus',     None, None, None, None, None, 1000, 'img/power-icon.png', None),
        ('NZXT H5 Flow',              'frame', 7000,  'nzxt',    None, None, None, None, None, None, 'img/frame-icon.png', None),
        ('Fractal Design Meshify C',  'frame', 8500,  'fractal', None, None, None, None, None, None, 'img/frame-icon.png', None),
        ('Lian Li O11 Dynamic EVO',   'frame', 16000, 'lianli',  None, None, None, None, None, None, 'img/frame-icon.png', None),
        ('be quiet! Silent Base 802', 'frame', 14000, 'bequiet', None, None, None, None, None, None, 'img/frame-icon.png', None),
    ]
    c.executemany('''
        INSERT INTO products (name, category, price, brand, socket, ram_type, tdp, max_tdp, power_req, watts, img, specs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', products)
 
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()
 
def get_current_user(user_id):
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return user
 
def require_admin(user_id):
    user = get_current_user(user_id)
    if not user or user['role'] != 'admin':
        return False
    return True
 
# ─────────────────────────────────────────
# Авторизация
# ─────────────────────────────────────────
 
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
 
    if not username or not email or not password:
        return jsonify({'error': 'Заполните все поля'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Пароль должен быть не менее 6 символов'}), 400
 
    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            (username, email, hash_password(password))
        )
        conn.commit()
        return jsonify({'message': 'Аккаунт создан'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Пользователь с таким именем или email уже существует'}), 409
    finally:
        conn.close()
 
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
 
    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        (username, hash_password(password))
    ).fetchone()
    conn.close()
 
    if not user:
        return jsonify({'error': 'Неверный логин или пароль'}), 401
 
    token = create_access_token(identity=str(user['id']))
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']  # отдаём роль фронту
        }
    })
 
# ─────────────────────────────────────────
# Товары
# ─────────────────────────────────────────
 
@app.route('/api/products', methods=['GET'])
def get_products():
    category = request.args.get('category')
    brand = request.args.get('brand')
    max_price = request.args.get('max_price', type=int)
 
    query = 'SELECT * FROM products WHERE 1=1'
    params = []
    if category:
        query += ' AND category = ?'
        params.append(category)
    if brand:
        query += ' AND brand = ?'
        params.append(brand)
    if max_price:
        query += ' AND price <= ?'
        params.append(max_price)
 
    conn = get_db()
    products = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(p) for p in products])
 
# ─────────────────────────────────────────
# Корзина
# ─────────────────────────────────────────
 
@app.route('/api/cart', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    conn = get_db()
    items = conn.execute('SELECT * FROM cart WHERE user_id = ?', (user_id,)).fetchall()
    conn.close()
    return jsonify({'items': [dict(i) for i in items]})
 
@app.route('/api/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json()
    name     = data.get('name')
    price    = data.get('price')
    category = data.get('category', '')
    specs    = data.get('specs', '')
    quantity = data.get('quantity', 1)
 
    if not name or not price:
        return jsonify({'error': 'Не указан товар или цена'}), 400
 
    conn = get_db()
    existing = conn.execute(
        'SELECT * FROM cart WHERE user_id = ? AND name = ?', (user_id, name)
    ).fetchone()
    if existing:
        conn.execute('UPDATE cart SET quantity = quantity + ? WHERE id = ?', (quantity, existing['id']))
    else:
        conn.execute(
            'INSERT INTO cart (user_id, name, price, category, specs, quantity) VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, name, price, category, specs, quantity)
        )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Добавлено в корзину'}), 201
 
@app.route('/api/cart/update/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart(item_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    conn = get_db()
    conn.execute('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
                 (data.get('quantity', 1), item_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Обновлено'})
 
@app.route('/api/cart/remove/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    user_id = get_jwt_identity()
    conn = get_db()
    conn.execute('DELETE FROM cart WHERE id = ? AND user_id = ?', (item_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Удалено'})
 
# ─────────────────────────────────────────
# Заказы
# ─────────────────────────────────────────
 
@app.route('/api/orders/create', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    conn = get_db()
    items = conn.execute('SELECT * FROM cart WHERE user_id = ?', (user_id,)).fetchall()
    if not items:
        conn.close()
        return jsonify({'error': 'Корзина пуста'}), 400
 
    total = sum(i['price'] * i['quantity'] for i in items)
    cursor = conn.execute('INSERT INTO orders (user_id, total) VALUES (?, ?)', (user_id, total))
    order_id = cursor.lastrowid
 
    for item in items:
        conn.execute(
            'INSERT INTO order_items (order_id, name, price, quantity) VALUES (?, ?, ?, ?)',
            (order_id, item['name'], item['price'], item['quantity'])
        )
    conn.execute('DELETE FROM cart WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Заказ оформлен', 'order_id': order_id}), 201
 
@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    conn = get_db()
    orders = conn.execute(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        (user_id,)
    ).fetchall()
    result = []
    for o in orders:
        o = dict(o)
        items = conn.execute(
            'SELECT * FROM order_items WHERE order_id = ?', (o['id'],)
        ).fetchall()
        o['items'] = [dict(i) for i in items]
        result.append(o)
    conn.close()
    return jsonify(result)
# ─────────────────────────────────────────
# Админка
# ─────────────────────────────────────────
 
@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    if not require_admin(get_jwt_identity()):
        return jsonify({'error': 'Доступ запрещён'}), 403
    conn = get_db()
    users = conn.execute('SELECT id, username, email, role, created_at FROM users').fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])
 
@app.route('/api/admin/orders', methods=['GET'])
@jwt_required()
def admin_get_orders():
    if not require_admin(get_jwt_identity()):
        return jsonify({'error': 'Доступ запрещён'}), 403
    conn = get_db()
    orders = conn.execute('''
        SELECT o.id, o.total, o.status, o.created_at, u.username
        FROM orders o JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    ''').fetchall()
    result = []
    for o in orders:
        o = dict(o)
        items = conn.execute('SELECT * FROM order_items WHERE order_id = ?', (o['id'],)).fetchall()
        o['items'] = [dict(i) for i in items]
        result.append(o)
    conn.close()
    return jsonify(result)
 
@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def admin_update_order_status(order_id):
    if not require_admin(get_jwt_identity()):
        return jsonify({'error': 'Доступ запрещён'}), 403
    status = request.get_json().get('status')
    if status not in ('new', 'processing', 'done', 'cancelled'):
        return jsonify({'error': 'Недопустимый статус'}), 400
    conn = get_db()
    conn.execute('UPDATE orders SET status = ? WHERE id = ?', (status, order_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Статус обновлён'})
 
@app.route('/api/admin/products', methods=['POST'])
@jwt_required()
def admin_add_product():
    if not require_admin(get_jwt_identity()):
        return jsonify({'error': 'Доступ запрещён'}), 403
    d = request.get_json()
    conn = get_db()
    conn.execute('''
        INSERT INTO products (name, category, price, brand, socket, ram_type, tdp, max_tdp, power_req, watts, img)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        d.get('name'), d.get('category'), d.get('price'), d.get('brand'),
        d.get('socket'), d.get('ram_type'), d.get('tdp'), d.get('max_tdp'),
        d.get('power_req'), d.get('watts'), d.get('img')
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Товар добавлен'}), 201
 
@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def admin_update_product(product_id):
    if not require_admin(get_jwt_identity()):
        return jsonify({'error': 'Доступ запрещён'}), 403
    d = request.get_json()
    conn = get_db()
    conn.execute('''
        UPDATE products SET name=?, category=?, price=?, brand=?,
        socket=?, ram_type=?, tdp=?, max_tdp=?, power_req=?, watts=?
        WHERE id=?
    ''', (
        d.get('name'), d.get('category'), d.get('price'), d.get('brand'),
        d.get('socket'), d.get('ram_type'), d.get('tdp'), d.get('max_tdp'),
        d.get('power_req'), d.get('watts'), product_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Товар обновлён'})
 
@app.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_product(product_id):
    if not require_admin(get_jwt_identity()):
        return jsonify({'error': 'Доступ запрещён'}), 403
    conn = get_db()
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Товар удалён'})
 
# ─────────────────────────────────────────
# Запуск
# ─────────────────────────────────────────
 
if __name__ == '__main__':
    init_db()
    print('База данных инициализирована')
    print('Сервер запущен: http://127.0.0.1:5000')
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)