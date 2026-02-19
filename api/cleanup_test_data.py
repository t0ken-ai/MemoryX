import psycopg2
from qdrant_client import QdrantClient
from neo4j import GraphDatabase

conn = psycopg2.connect(host='192.168.31.66', database='memoryx', user='memoryx', password='memoryx123')
cur = conn.cursor()
cur.execute('DELETE FROM facts WHERE user_id = 5')
cur.execute('DELETE FROM memory_judgments WHERE user_id = 5')
conn.commit()
print(f"Deleted {cur.rowcount} facts from PostgreSQL")

qdrant = QdrantClient(host='192.168.31.66', port=6333)
try:
    qdrant.delete_collection("memoryx_5")
    print("Deleted Qdrant collection")
except:
    print("Qdrant collection not found")

neo4j = GraphDatabase.driver("bolt://192.168.31.66:7687", auth=("neo4j", "memoryx123"))
with neo4j.session() as session:
    result = session.run("MATCH (n {user_id: '5'}) DETACH DELETE n RETURN count(n) as deleted")
    record = result.single()
    print(f"Deleted {record['deleted']} nodes from Neo4j")
neo4j.close()

cur.close()
conn.close()
print("Cleanup complete!")
