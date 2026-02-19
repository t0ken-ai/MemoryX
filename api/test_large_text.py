import requests
import json
import time

API_KEY = "mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9"
BASE_URL = "http://localhost:8000/api/v1"

LARGE_TEXT = """[2026-02-20 10:15:32] INFO: Agent session started for user zhang_san_001
[2026-02-20 10:15:33] DEBUG: Loading user preferences from database
[2026-02-20 10:15:34] INFO: User prefers Chinese language, timezone: Asia/Shanghai
[2026-02-20 10:15:35] INFO: User mentioned: 我最近在研究大语言模型，特别是LLaMA和Qwen系列
[2026-02-20 10:15:36] DEBUG: Extracting entities from user message
[2026-02-20 10:15:37] INFO: Found entities: 大语言模型, LLaMA, Qwen
[2026-02-20 10:15:38] INFO: User mentioned: 我在阿里云上部署了一个7B参数的模型，用的是A100显卡
[2026-02-20 10:15:39] DEBUG: Storing memory: 用户研究大语言模型，关注LLaMA和Qwen系列
[2026-02-20 10:15:40] DEBUG: Storing memory: 用户在阿里云部署了7B参数模型，使用A100显卡
[2026-02-20 10:15:41] INFO: User asked: 如何优化推理速度？
[2026-02-20 10:15:42] DEBUG: Searching knowledge base for: 推理速度优化
[2026-02-20 10:15:43] INFO: Found 3 relevant documents
[2026-02-20 10:15:44] INFO: User mentioned: 我试过vLLM，效果不错，但显存占用有点高
[2026-02-20 10:15:45] DEBUG: Storing memory: 用户使用过vLLM进行推理优化，认为效果好但显存占用高
[2026-02-20 10:15:46] INFO: User mentioned: 我还试过量化，INT8和INT4都测过，INT4速度快但精度损失明显
[2026-02-20 10:15:47] DEBUG: Storing memory: 用户测试过INT8和INT4量化，INT4速度快但精度损失明显
[2026-02-20 10:15:48] INFO: User mentioned: 我的项目代码在GitHub上，仓库叫LLM-Playground
[2026-02-20 10:15:49] DEBUG: Storing memory: 用户有GitHub仓库LLM-Playground
[2026-02-20 10:15:50] INFO: User mentioned: 我用的是Python 3.10和PyTorch 2.0
[2026-02-20 10:15:51] DEBUG: Storing memory: 用户开发环境是Python 3.10和PyTorch 2.0
[2026-02-20 10:15:52] INFO: User mentioned: 我还尝试了Flash Attention 2，推理速度提升了30%
[2026-02-20 10:15:53] DEBUG: Storing memory: 用户使用Flash Attention 2，推理速度提升30%
[2026-02-20 10:15:54] INFO: User mentioned: 我的联系方式是zhangsan@example.com，有问题可以联系我
[2026-02-20 10:15:55] DEBUG: Storing memory: 用户邮箱是zhangsan@example.com
[2026-02-20 10:15:56] INFO: Session ended, total messages: 15"""

print("=" * 50)
print("测试2: 大文本添加（Agent 日志文本）")
print("=" * 50)
print(f"\n文本长度: {len(LARGE_TEXT)} 字符")

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

print("\n开始添加大文本...")
start_time = time.time()

response = requests.post(
    f"{BASE_URL}/memories",
    headers=headers,
    json={"content": LARGE_TEXT}
)

end_time = time.time()
print(f"耗时: {int((end_time - start_time) * 1000)} 毫秒")
print(f"状态码: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"\n添加结果: {data['data']['stats']}")
    print(f"提取的事实数: {len(data['data']['extracted_facts'])}")
    print(f"Trace ID: {data['data']['trace_id']}")
    print("\n提取的事实:")
    for fact in data['data']['extracted_facts']:
        print(f"  - {fact['content']}")
else:
    print(f"错误: {response.text}")

print("\n" + "=" * 50)
print("搜索验证")
print("=" * 50)

search_response = requests.post(
    f"{BASE_URL}/memories/search",
    headers=headers,
    json={"query": "用户研究什么技术", "limit": 10}
)

if search_response.status_code == 200:
    search_data = search_response.json()
    print(f"\n找到 {len(search_data['data'])} 条相关记忆:")
    for m in search_data['data'][:8]:
        print(f"  - {m['memory']} (score: {m['score']:.3f})")
