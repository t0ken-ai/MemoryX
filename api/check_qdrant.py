from qdrant_client import QdrantClient

client = QdrantClient(host="192.168.31.66", port=6333)
collection_name = "memoryx_5"

result = client.scroll(
    collection_name=collection_name,
    limit=10,
    with_payload=True,
    with_vectors=False
)

for point in result[0]:
    print(f"ID: {point.id}")
    print(f"Content: {point.payload.get('content')}")
    print(f"fact_id: {point.payload.get('fact_id')}")
    print("---")
