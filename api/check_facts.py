import psycopg2
conn = psycopg2.connect(host='192.168.31.66', database='memoryx', user='memoryx', password='memoryx123')
cur = conn.cursor()
cur.execute('SELECT id, content FROM facts WHERE user_id = 5 ORDER BY id')
print('Facts in database:')
for row in cur.fetchall():
    print(f'  ID {row[0]}: {row[1]}')
cur.close()
conn.close()
