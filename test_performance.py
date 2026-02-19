#!/usr/bin/env python3
"""
MemoryX 性能测试脚本
测试自定义图记忆服务（不依赖 function calling）
"""

import sys
import os
import time
import asyncio
import json
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from app.core.config import get_settings

settings = get_settings()

TEST_USER_ID = f"test_user_{uuid.uuid4().hex[:8]}"


class Timer:
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.elapsed = 0
        
    def __enter__(self):
        self.start_time = time.time()
        return self
        
    def __exit__(self, *args):
        self.elapsed = time.time() - self.start_time


def print_header(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_step(step: str, elapsed: float, details: str = ""):
    status = "✓" if elapsed < 5 else "⚠" if elapsed < 15 else "✗"
    print(f"  {status} {step}: {elapsed:.2f}s {details}")


async def test_entity_extraction():
    """测试实体关系提取（普通 chat + prompt，不依赖 tools）"""
    from app.services.memory_core.graph_memory_service import graph_memory_service
    
    print_header("1. 实体关系提取测试 (LLM + Prompt)")
    
    test_text = "张三是一名Python工程师，住在北京朝阳区，他喜欢机器学习和深度学习，他的同事李四也住在附近。"
    
    print(f"  测试用户ID: {TEST_USER_ID}")
    print(f"  输入文本: {test_text[:50]}...")
    
    times = {"extraction": 0, "total": 0}
    
    with Timer("实体提取") as t:
        try:
            start = time.time()
            result = await graph_memory_service.extract_entities_and_relations(test_text, TEST_USER_ID)
            times["extraction"] = time.time() - start
            
            print_step("LLM 实体提取", times["extraction"], f"- 模型: {settings.llm_model}")
            
            entities = result.get("entities", [])
            relations = result.get("relations", [])
            
            print(f"    提取实体: {len(entities)} 个")
            for e in entities[:5]:
                print(f"      - {e.get('name')} ({e.get('type')})")
            
            print(f"    提取关系: {len(relations)} 个")
            for r in relations[:5]:
                print(f"      - {r.get('source')} --{r.get('relation')}--> {r.get('target')}")
                
        except Exception as e:
            print_step("实体提取失败", 0, f"- 错误: {str(e)[:100]}")
    
    times["total"] = t.elapsed
    return times


async def test_embedding():
    """测试 Embedding 生成"""
    from app.services.memory_core.graph_memory_service import graph_memory_service
    
    print_header("2. Embedding 生成测试")
    
    test_text = "用户张三对Python编程和机器学习感兴趣"
    times = {"embedding": 0, "total": 0}
    
    with Timer("Embedding") as t:
        try:
            start = time.time()
            embedding = await graph_memory_service._get_embedding(test_text)
            times["embedding"] = time.time() - start
            
            print_step("Embedding 生成", times["embedding"], f"- 模型: {settings.embed_model}")
            print(f"    向量维度: {len(embedding)}")
            print(f"    前5个值: {embedding[:5]}")
        except Exception as e:
            print_step("Embedding 错误", 0, f"- 错误: {e}")
    
    times["total"] = t.elapsed
    return times


async def test_add_memory():
    """测试添加记忆"""
    from app.services.memory_core.graph_memory_service import graph_memory_service
    
    print_header("3. 添加记忆测试 (向量 + 图)")
    
    content = "用户张三对Python编程和机器学习感兴趣，住在北京朝阳区望京街道。他的同事李四是一名Java工程师。"
    
    print(f"  测试用户ID: {TEST_USER_ID}")
    print(f"  输入内容: {content[:50]}...")
    
    times = {"total": 0, "extraction": 0, "neo4j": 0, "qdrant": 0}
    
    with Timer("添加记忆") as t:
        try:
            start_total = time.time()
            
            start = time.time()
            extraction = await graph_memory_service.extract_entities_and_relations(content, TEST_USER_ID)
            times["extraction"] = time.time() - start
            
            start = time.time()
            graph_memory_service.save_to_neo4j(
                TEST_USER_ID, 
                extraction.get("entities", []), 
                extraction.get("relations", [])
            )
            times["neo4j"] = time.time() - start
            
            import uuid
            memory_id = str(uuid.uuid4())
            start = time.time()
            await graph_memory_service.save_to_qdrant(TEST_USER_ID, memory_id, content)
            times["qdrant"] = time.time() - start
            
            times["total"] = time.time() - start_total
            
            print_step("实体提取", times["extraction"])
            print_step("Neo4j 写入", times["neo4j"])
            print_step("Qdrant 写入", times["qdrant"])
            print_step("总计", times["total"])
            
            print(f"    记忆ID: {memory_id}")
            print(f"    实体数: {len(extraction.get('entities', []))}")
            print(f"    关系数: {len(extraction.get('relations', []))}")
                        
        except Exception as e:
            print_step("添加记忆失败", 0, f"- 错误: {str(e)[:150]}")
            
    return times


async def test_search_memory():
    """测试搜索记忆"""
    from app.services.memory_core.graph_memory_service import graph_memory_service
    
    print_header("4. 搜索记忆测试 (向量 + 图)")
    
    queries = ["张三的兴趣爱好是什么", "谁住在望京"]
    
    times = {"total": 0, "vector_search": 0, "graph_search": 0}
    
    with Timer("搜索记忆") as t:
        for query in queries:
            try:
                print(f"\n  查询: {query}")
                
                start = time.time()
                context = await graph_memory_service.get_context_for_query(
                    user_id=TEST_USER_ID,
                    query=query,
                    limit=3
                )
                search_time = time.time() - start
                times["total"] += search_time
                
                print_step("综合搜索", search_time)
                
                vector_results = context.get("vector_memories", [])
                graph_results = context.get("graph_entities", [])
                entities = context.get("extracted_entities", [])
                
                print(f"    向量结果: {len(vector_results)} 条")
                if vector_results:
                    for r in vector_results[:2]:
                        print(f"      - 分数:{r.get('score', 0):.3f} {r.get('memory', '')[:40]}...")
                
                print(f"    图结果: {len(graph_results)} 条")
                if graph_results:
                    for g in graph_results[:2]:
                        print(f"      - 实体: {g.get('entity')} 关系: {g.get('relations', [])[:2]}")
                
                print(f"    提取实体: {[e.get('name') for e in entities[:3]]}")
                        
            except Exception as e:
                print_step("搜索失败", 0, f"- 错误: {str(e)[:100]}")
    
    return times


async def test_sensitive_filter():
    """测试敏感信息过滤"""
    import httpx
    
    print_header("5. 敏感信息过滤测试 (LLM)")
    
    test_content = "我叫张三，电话13812345678，银行卡6222021234567890123"
    
    prompt = f"""分析以下文本，识别并替换敏感信息（姓名、电话、银行卡、身份证、地址等）。
文本：{test_content}
请返回 JSON: {{"has_sensitive": true/false, "safe_content": "替换后的内容"}}"""
    
    times = {"llm_call": 0, "total": 0}
    
    with Timer("敏感信息过滤") as t:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                start = time.time()
                response = await client.post(
                    f"{settings.ollama_base_url}/v1/chat/completions",
                    headers={"Content-Type": "application/json"},
                    json={
                        "model": settings.llm_model,
                        "messages": [
                            {"role": "system", "content": "你是敏感信息识别助手。"},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1
                    }
                )
                times["llm_call"] = time.time() - start
                
                if response.status_code == 200:
                    data = response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    print_step("LLM 过滤", times["llm_call"], f"- 模型: {settings.llm_model}")
                    print(f"    原文: {test_content}")
                    print(f"    结果: {content[:100]}...")
                else:
                    print_step("LLM 过滤失败", times["llm_call"], f"- 状态码: {response.status_code}")
        except Exception as e:
            print_step("LLM 过滤错误", 0, f"- 错误: {e}")
    
    times["total"] = t.elapsed
    return times


def print_summary(all_times: dict):
    """打印汇总报告"""
    print_header("性能汇总报告")
    
    print(f"\n  配置信息:")
    print(f"    - Ollama: {settings.ollama_base_url}")
    print(f"    - LLM 模型: {settings.llm_model}")
    print(f"    - Embed 模型: {settings.embed_model}")
    print(f"    - Qdrant: {settings.qdrant_host}:{settings.qdrant_port}")
    print(f"    - Neo4j: {settings.neo4j_uri}")
    print(f"    - 测试用户: {TEST_USER_ID}")
    
    print(f"\n  时间消耗:")
    total_time = 0
    
    for test_name, times in all_times.items():
        if times:
            print(f"\n  {test_name}:")
            for step, elapsed in times.items():
                if elapsed > 0:
                    status = "✓" if elapsed < 5 else "⚠" if elapsed < 30 else "✗"
                    print(f"    {status} {step}: {elapsed:.2f}s")
            if "total" in times:
                total_time += times["total"]
    
    print(f"\n  总测试时间: {total_time:.2f}s")
    
    print(f"\n  性能评估:")
    
    extraction_time = all_times.get("实体关系提取", {}).get("extraction", 0)
    if extraction_time < 5:
        print("    ✓ 实体提取: 性能优秀")
    elif extraction_time < 15:
        print("    ✓ 实体提取: 性能良好")
    elif extraction_time < 30:
        print("    ⚠ 实体提取: 可接受")
    else:
        print("    ✗ 实体提取: 需要换更快模型")
        
    embed_time = all_times.get("Embedding生成", {}).get("embedding", 0)
    if embed_time < 1:
        print("    ✓ Embedding 生成: 性能优秀")
    elif embed_time < 3:
        print("    ✓ Embedding 生成: 性能良好")
    else:
        print("    ⚠ Embedding 生成: 需要优化")
        
    add_time = all_times.get("添加记忆", {}).get("total", 0)
    if add_time < 10:
        print("    ✓ 添加记忆: 性能良好")
    elif add_time < 60:
        print("    ⚠ 添加记忆: 可接受")
    else:
        print("    ✗ 添加记忆: 需要优化")
        
    search_time = all_times.get("搜索记忆", {}).get("total", 0)
    if search_time < 5:
        print("    ✓ 搜索记忆: 性能优秀")
    elif search_time < 15:
        print("    ✓ 搜索记忆: 性能良好")
    else:
        print("    ⚠ 搜索记忆: 需要优化")


async def main():
    print("\n" + "=" * 60)
    print("  MemoryX 性能测试 (自定义图记忆服务)")
    print("  不依赖 function calling，使用普通 chat + prompt")
    print("=" * 60)
    
    all_times = {}
    
    all_times["实体关系提取"] = await test_entity_extraction()
    all_times["Embedding生成"] = await test_embedding()
    all_times["添加记忆"] = await test_add_memory()
    all_times["搜索记忆"] = await test_search_memory()
    all_times["敏感信息过滤"] = await test_sensitive_filter()
    
    print_summary(all_times)


if __name__ == "__main__":
    asyncio.run(main())
