import psycopg2

conn = psycopg2.connect(host='192.168.31.66', database='memoryx', user='memoryx', password='memoryx123')
cur = conn.cursor()
cur.execute('SELECT trace_id, llm_response, parsed_operations FROM memory_judgments ORDER BY created_at DESC LIMIT 1')
row = cur.fetchone()
if row:
    print(f'Trace ID: {row[0]}')
    print(f'LLM Response:')
    print(row[1])
    print(f'\nParsed Operations:')
    print(row[2])
cur.close()
conn.close()
