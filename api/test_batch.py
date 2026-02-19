import requests
import json
import time

API_KEY = "mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9"
BASE_URL = "http://localhost:8000/api/v1"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

print("=" * 50)
print("测试3: 批量添加记忆")
print("=" * 50)

batch_memories = [
    {"content": "李四在北京字节跳动工作，担任产品经理"},
    {"content": "李四喜欢打篮球，每周打三次"},
    {"content": "李四最近在学习产品设计的课程"},
    {"content": "王五在上海美团工作，是数据分析师"},
    {"content": "王五擅长Python和SQL，正在学习机器学习"},
    {"content": "王五的爱好是摄影，有一台索尼相机"},
    {"content": "赵六在广州腾讯工作，是前端开发工程师"},
    {"content": "赵六熟悉React和Vue框架"},
    {"content": "赵六最近在做一个开源项目"},
    {"content": "赵六的GitHub账号是zhaoliu_dev"}
]

print(f"\n批量添加 {len(batch_memories)} 条记忆...")

start_time = time.time()

response = requests.post(
    f"{BASE_URL}/memories/batch",
    headers=headers,
    json={"memories": batch_memories}
)

end_time = time.time()
print(f"耗时: {int((end_time - start_time) * 1000)} 毫秒")
print(f"状态码: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"\n响应数据:")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])
else:
    print(f"错误: {response.text}")

print("\n" + "=" * 50)
print("搜索验证 - 查找李四的信息")
print("=" * 50)

search_response = requests.post(
    f"{BASE_URL}/memories/search",
    headers=headers,
    json={"query": "李四的工作和爱好", "limit": 5}
)

if search_response.status_code == 200:
    search_data = search_response.json()
    print(f"\n找到 {len(search_data['data'])} 条相关记忆:")
    for m in search_data['data']:
        print(f"  - {m['memory']} (score: {m['score']:.3f})")

print("\n" + "=" * 50)
print("搜索验证 - 查找王五的信息")
print("=" * 50)

search_response = requests.post(
    f"{BASE_URL}/memories/search",
    headers=headers,
    json={"query": "王五的技能和爱好", "limit": 5}
)

if search_response.status_code == 200:
    search_data = search_response.json()
    print(f"\n找到 {len(search_data['data'])} 条相关记忆:")
    for m in search_data['data']:
        print(f"  - {m['memory']} (score: {m['score']:.3f})")

print("\n" + "=" * 50)
print("搜索验证 - 查找赵六的信息")
print("=" * 50)

search_response = requests.post(
    f"{BASE_URL}/memories/search",
    headers=headers,
    json={"query": "赵六的技术栈", "limit": 5}
)

if search_response.status_code == 200:
    search_data = search_response.json()
    print(f"\n找到 {len(search_data['data'])} 条相关记忆:")
    for m in search_data['data']:
        print(f"  - {m['memory']} (score: {m['score']:.3f})")
