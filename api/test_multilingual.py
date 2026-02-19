import requests
import json
import time

API_KEY = 'mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9'
BASE_URL = 'http://localhost:8000/api/v1'
headers = {'Content-Type': 'application/json', 'X-API-Key': API_KEY}

print("=" * 50)
print("测试4: 多语言记忆")
print("=" * 50)

multilingual_memories = [
    {"content": "John works at Google in Mountain View, he is a senior software engineer"},
    {"content": "John likes to play tennis on weekends, his favorite player is Federer"},
    {"content": "田中さんは東京の楽天で働いています、彼はプロダクトマネージャーです"},
    {"content": "田中さんは週末に日本料理を作るのが好きです、特に寿司が得意です"},
    {"content": "Marie travaille à Paris chez LVMH, elle est directrice marketing"},
    {"content": "Marie adore la mode française et collectionne les sacs à main de luxe"},
    {"content": "Carlos trabaja en Madrid para Telefónica, es arquitecto de software"},
    {"content": "Carlos disfruta tocar la guitarra flamenca en su tiempo libre"}
]

print(f"\n添加 {len(multilingual_memories)} 条多语言记忆...")

start_time = time.time()

response = requests.post(
    f"{BASE_URL}/memories/batch",
    headers=headers,
    json={"memories": multilingual_memories}
)

end_time = time.time()
print(f"耗时: {int((end_time - start_time) * 1000)} 毫秒")
print(f"状态码: {response.status_code}")

print("\n" + "=" * 50)
print("搜索验证 - 英文")
print("=" * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': 'John job and hobbies', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')

print("\n" + "=" * 50)
print("搜索验证 - 日文")
print("=" * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': '田中さんの仕事と趣味', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')

print("\n" + "=" * 50)
print("搜索验证 - 法文")
print("=" * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': 'Marie travail et loisirs', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')

print("\n" + "=" * 50)
print("搜索验证 - 西班牙文")
print("=" * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': 'Carlos trabajo y pasatiempos', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')

print("\n" + "=" * 50)
print("跨语言搜索测试")
print("=" * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': 'software engineer', 'limit': 10})
print("用英文搜索 'software engineer':")
for m in r.json()['data'][:5]:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')
