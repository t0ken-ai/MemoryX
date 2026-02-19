import psycopg2
from qdrant_client import QdrantClient

print("=== PostgreSQL Facts ===")
conn = psycopg2.connect(host='192.168.31.66', database='memoryx', user='memoryx', password='memoryx123')
cur = conn.cursor()
cur.execute('SELECT id, content, vector_id FROM facts WHERE user_id = 5 ORDER BY id')
for row in cur.fetchall():
    print(f"  Fact ID {row[0]}: {row[1]} (vector_id: {row[2]})")
cur.close()
conn.close()

print("\n=== Qdrant Points ===")
client = QdrantClient(host="192.168.31.66", port=6333)
result = client.scroll(collection_name="memoryx_5", limit=10, with_payload=True, with_vectors=False)
for point in result[0]:
    print(f"  Vector ID: {point.id}")
    print(f"    Content: {point.payload.get('content')}")
    print(f"    fact_id: {point.payload.get('fact_id')}")
