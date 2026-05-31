import sqlite3

conn = sqlite3.connect('shop.db')
conn.execute("UPDATE products SET img = REPLACE(img, '.png', '.svg')")
conn.commit()
conn.close()
print('Готово')