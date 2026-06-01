import sqlite3

conn = sqlite3.connect('shop.db')
rows = conn.execute('SELECT id, img FROM products').fetchall()
for row in rows:
    print(row[0], row[1])
conn.close()