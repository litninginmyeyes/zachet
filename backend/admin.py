import sqlite3

conn = sqlite3.connect('shop.db')

try:
    conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    print('Колонка role добавлена')
except:
    print('Колонка role уже есть')

# Назначить админа
conn.execute("UPDATE users SET role='admin' WHERE username='test'")
conn.commit()
conn.close()
print('Готово')