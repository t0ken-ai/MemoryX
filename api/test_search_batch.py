import requests

API_KEY = 'mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9'
BASE_URL = 'http://localhost:8000/api/v1'
headers = {'Content-Type': 'application/json', 'X-API-Key': API_KEY}

print('=' * 50)
print('搜索验证 - 李四')
print('=' * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': '李四的工作和爱好', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')

print()
print('=' * 50)
print('搜索验证 - 王五')
print('=' * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': '王五的技能和爱好', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')

print()
print('=' * 50)
print('搜索验证 - 赵六')
print('=' * 50)
r = requests.post(f'{BASE_URL}/memories/search', headers=headers, json={'query': '赵六的技术栈', 'limit': 5})
for m in r.json()['data']:
    print(f'  - {m["memory"]} (score: {m["score"]:.3f})')
