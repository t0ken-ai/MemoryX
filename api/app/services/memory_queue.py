"""
Memory Queue Tasks - Celery 异步任务

所有记忆操作（添加/删除/修改）通过队列异步处理，防止 LLM 被打爆。
搜索操作保持同步，保证响应速度。
"""
import logging
import asyncio
import time
import json
from typing import Dict, Any, List, Optional
from celery import shared_task
import httpx

from app.core.celery_config import celery_app
from app.services.memory_core.graph_memory_service import graph_memory_service
from app.core.database import SubscriptionTier
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


SENSITIVE_FILTER_PROMPT = """请将以下内容中的敏感信息替换为[已过滤]：

必须替换以下类型：
1. 银行卡卡号：任何长度的银行卡号（不限制位数，如62220000111122223333、4532123456789012等）
2. 密码：密码后面跟的内容（如"密码是abc123"替换为"密码是[已过滤]"）
3. 身份证号码：如110101199001011234、420123198512125678等18位中国身份证号
4. 社保号码：如123-45-6789等社会保险号码
5. 护照号码：如GB1234567、E12345678等护照号码
6. 驾驶证号码：驾驶证编号

不要替换以下内容：
- 姓名（如张三、李四、John）
- 地址（如北京市朝阳区、New York）
- 手机号码（如13812345678、+1234567890）
- 电子邮箱

原始内容：
{content}

请严格按以下 JSON 格式返回：
{{"has_sensitive": true或false, "filtered_content": "替换敏感信息后的内容", "sensitive_count": 数字}}"""


CONVERSATION_SUMMARY_PROMPT = """请对以下内容进行总结。

要求：
1. 保留所有重要的事实信息（用户偏好、个人情况、工作信息等）
2. 保留具体的时间、地点、人物、事件
3. 去除对话中的寒暄、重复、无关内容
4. 保持时间顺序，用简洁的语言描述
5. 不要添加任何解释或分析，只做总结

内容：
{content}

请直接返回总结内容，不要包含任何其他文字。"""


async def summarize_conversation(content: str) -> str:
    """使用 LLM 总结对话内容"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/v1/chat/completions",
                headers={"Content-Type": "application/json"},
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "你是一个对话总结助手。请简洁地总结对话内容，保留所有重要事实，去除无关信息。"
                        },
                        {
                            "role": "user",
                            "content": CONVERSATION_SUMMARY_PROMPT.format(content=content)
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                logger.error(f"LLM summarize failed: {response.status_code} - {response.text}")
                return content
            
            data = response.json()
            summary = data.get("choices", [{}])[0].get("message", {}).get("content", content)
            
            logger.info(f"Summarized: {len(content)} chars -> {len(summary)} chars")
            return summary
            
    except Exception as e:
        logger.error(f"LLM summarize error: {e}")
        return content


async def filter_sensitive_with_llm(content: str) -> Dict[str, Any]:
    """使用 LLM 过滤敏感信息"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/v1/chat/completions",
                headers={"Content-Type": "application/json"},
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "你是一个敏感信息识别助手。请分析内容，识别并替换所有敏感信息。只返回JSON格式结果。"
                        },
                        {
                            "role": "user",
                            "content": SENSITIVE_FILTER_PROMPT.format(content=content)
                        }
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code != 200:
                logger.error(f"LLM filter failed: {response.status_code} - {response.text}")
                return {"has_sensitive": False, "filtered_content": content, "sensitive_count": 0}
            
            data = response.json()
            llm_response = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            
            result = json.loads(llm_response)
            filtered_content = result.get("filtered_content", content)
            sensitive_count = filtered_content.count("[已过滤]") if filtered_content else 0
            
            return {
                "has_sensitive": result.get("has_sensitive", False),
                "filtered_content": filtered_content,
                "sensitive_count": sensitive_count
            }
            
    except json.JSONDecodeError as e:
        logger.error(f"LLM response parse failed: {e}")
        return {"has_sensitive": False, "filtered_content": content, "sensitive_count": 0}
    except Exception as e:
        logger.error(f"LLM filter error: {e}")
        return {"has_sensitive": False, "filtered_content": content, "sensitive_count": 0}


def get_queue_for_tier(tier: SubscriptionTier) -> str:
    """根据用户订阅层级返回队列名称"""
    if tier == SubscriptionTier.PRO:
        return "memory_pro"
    return "memory_free"


def run_async(coro):
    """在同步任务中运行异步函数"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _log_task_start(task_name: str, task_id: str, user_id: str, **kwargs):
    """记录任务开始日志"""
    extra_info = " | ".join([f"{k}={v}" for k, v in kwargs.items() if v is not None])
    logger.info(f"[{task_name}] START | task_id={task_id} | user_id={user_id} | {extra_info}")


def _log_task_end(task_name: str, task_id: str, user_id: str, duration_ms: int, success: bool, **kwargs):
    """记录任务结束日志"""
    status = "SUCCESS" if success else "FAILED"
    extra_info = " | ".join([f"{k}={v}" for k, v in kwargs.items() if v is not None])
    logger.info(f"[{task_name}] {status} | task_id={task_id} | user_id={user_id} | duration={duration_ms}ms | {extra_info}")


def _log_task_error(task_name: str, task_id: str, user_id: str, error: Exception, retry_count: int = 0):
    """记录任务错误日志"""
    logger.error(f"[{task_name}] ERROR | task_id={task_id} | user_id={user_id} | retry={retry_count} | error={type(error).__name__}: {str(error)}")


def _log_task_progress(task_name: str, task_id: str, user_id: str, current: int, total: int, message: str = ""):
    """记录任务进度日志"""
    progress_pct = int(current / total * 100) if total > 0 else 0
    logger.info(f"[{task_name}] PROGRESS | task_id={task_id} | user_id={user_id} | {current}/{total} ({progress_pct}%) | {message}")


@celery_app.task(
    name="memory.add",
    bind=True,
    max_retries=3,
    default_retry_delay=10
)
def add_memory_task(
    self,
    user_id: str,
    content: str,
    metadata: Dict = None,
    skip_judge: bool = False,
    api_key_id: int = None
) -> Dict[str, Any]:
    """
    异步添加记忆任务
    
    Args:
        user_id: 用户ID
        content: 记忆内容
        metadata: 元数据
        skip_judge: 是否跳过LLM判断
        api_key_id: API Key ID
        
    Returns:
        处理结果
    """
    task_id = self.request.id
    start_time = time.time()
    content_preview = content[:50] + "..." if len(content) > 50 else content
    
    _log_task_start(
        "ADD_MEMORY", task_id, user_id,
        content_len=len(content),
        skip_judge=skip_judge,
        content_preview=content_preview
    )
    
    try:
        # 检查是否是对话流（需要先总结）
        needs_summary = metadata and metadata.get('needs_summary', False) if metadata else False
        
        if needs_summary:
            # 对话流处理：先总结，再过滤敏感信息
            logger.info(f"[ADD_MEMORY] Conversation flow detected, processing summary and filter")
            
            # Step 1: 总结对话
            summary = run_async(summarize_conversation(content))
            logger.info(f"[ADD_MEMORY] Summarized: {len(content)} -> {len(summary)} chars")
            
            # Step 2: 过滤敏感信息
            filter_result = run_async(filter_sensitive_with_llm(summary))
            if filter_result.get('has_sensitive'):
                logger.info(f"[ADD_MEMORY] Filtered {filter_result.get('sensitive_count', 0)} sensitive items")
            
            final_content = filter_result.get('filtered_content', summary)
            
            # 更新 metadata，移除 needs_summary 标记
            if metadata:
                metadata['summarized'] = True
                metadata['original_length'] = len(content)
                metadata['summary_length'] = len(summary)
        else:
            # 普通记忆：直接使用
            final_content = content
        
        result = run_async(
            graph_memory_service.add_memory(
                user_id=user_id,
                content=final_content,
                metadata=metadata,
                skip_judge=skip_judge,
                api_key_id=api_key_id
            )
        )
        
        stats = result.get('stats', {})
        duration_ms = int((time.time() - start_time) * 1000)
        
        _log_task_end(
            "ADD_MEMORY", task_id, user_id, duration_ms, True,
            added=stats.get('added_count', 0),
            updated=stats.get('updated_count', 0),
            deleted=stats.get('deleted_count', 0),
            trace_id=result.get('trace_id', '')
        )
        
        return result
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        retry_count = self.request.retries
        
        _log_task_error("ADD_MEMORY", task_id, user_id, e, retry_count)
        _log_task_end("ADD_MEMORY", task_id, user_id, duration_ms, False, error=str(e))
        
        raise self.retry(exc=e)


@celery_app.task(
    name="memory.batch_add",
    bind=True,
    max_retries=3,
    default_retry_delay=10
)
def batch_add_memory_task(
    self,
    user_id: str,
    contents: List[str],
    metadatas: List[Dict] = None,
    api_key_id: int = None
) -> List[Dict[str, Any]]:
    """
    异步批量添加记忆任务
    
    Args:
        user_id: 用户ID
        contents: 记忆内容列表
        metadatas: 元数据列表
        api_key_id: API Key ID
        
    Returns:
        处理结果列表
    """
    task_id = self.request.id
    start_time = time.time()
    total_count = len(contents)
    
    _log_task_start(
        "BATCH_ADD", task_id, user_id,
        total_count=total_count
    )
    
    results = []
    success_count = 0
    error_count = 0
    
    try:
        for i, content in enumerate(contents):
            metadata = metadatas[i] if metadatas and i < len(metadatas) else None
            content_preview = content[:30] + "..." if len(content) > 30 else content
            
            _log_task_progress(
                "BATCH_ADD", task_id, user_id,
                i + 1, total_count,
                f"processing: {content_preview}"
            )
            
            try:
                result = run_async(
                    graph_memory_service.add_memory(
                        user_id=user_id,
                        content=content,
                        metadata=metadata,
                        api_key_id=api_key_id
                    )
                )
                results.append(result)
                success_count += 1
                
                stats = result.get('stats', {})
                logger.debug(f"[BATCH_ADD] Item {i+1}/{total_count} done | added={stats.get('added_count', 0)} | updated={stats.get('updated_count', 0)} | deleted={stats.get('deleted_count', 0)}")
                
            except Exception as item_error:
                error_count += 1
                logger.error(f"[BATCH_ADD] Item {i+1}/{total_count} failed | error={type(item_error).__name__}: {str(item_error)}")
                results.append({
                    "error": str(item_error),
                    "content_preview": content_preview,
                    "index": i
                })
        
        duration_ms = int((time.time() - start_time) * 1000)
        avg_duration_ms = int(duration_ms / total_count) if total_count > 0 else 0
        
        _log_task_end(
            "BATCH_ADD", task_id, user_id, duration_ms, error_count == 0,
            success_count=success_count,
            error_count=error_count,
            avg_duration_ms=avg_duration_ms
        )
        
        return results
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        retry_count = self.request.retries
        
        _log_task_error("BATCH_ADD", task_id, user_id, e, retry_count)
        _log_task_end("BATCH_ADD", task_id, user_id, duration_ms, False, processed=len(results), error=str(e))
        
        raise self.retry(exc=e)


@celery_app.task(
    name="memory.update",
    bind=True,
    max_retries=3,
    default_retry_delay=10
)
def update_memory_task(
    self,
    user_id: str,
    content: str,
    metadata: Dict = None
) -> Dict[str, Any]:
    """
    异步更新记忆任务（通过添加新内容触发LLM判断更新）
    
    Args:
        user_id: 用户ID
        content: 新内容
        metadata: 元数据
        
    Returns:
        处理结果
    """
    task_id = self.request.id
    start_time = time.time()
    content_preview = content[:50] + "..." if len(content) > 50 else content
    
    _log_task_start(
        "UPDATE_MEMORY", task_id, user_id,
        content_len=len(content),
        content_preview=content_preview
    )
    
    try:
        result = run_async(
            graph_memory_service.add_memory(
                user_id=user_id,
                content=content,
                metadata=metadata
            )
        )
        
        stats = result.get('stats', {})
        duration_ms = int((time.time() - start_time) * 1000)
        
        _log_task_end(
            "UPDATE_MEMORY", task_id, user_id, duration_ms, True,
            added=stats.get('added_count', 0),
            updated=stats.get('updated_count', 0),
            deleted=stats.get('deleted_count', 0),
            trace_id=result.get('trace_id', '')
        )
        
        return result
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        retry_count = self.request.retries
        
        _log_task_error("UPDATE_MEMORY", task_id, user_id, e, retry_count)
        _log_task_end("UPDATE_MEMORY", task_id, user_id, duration_ms, False, error=str(e))
        
        raise self.retry(exc=e)


@celery_app.task(
    name="memory.delete",
    bind=True,
    max_retries=3,
    default_retry_delay=10
)
def delete_memory_task(
    self,
    user_id: str,
    content: str,
    metadata: Dict = None
) -> Dict[str, Any]:
    """
    异步删除记忆任务（通过添加矛盾内容触发LLM判断删除）
    
    Args:
        user_id: 用户ID
        content: 矛盾内容
        metadata: 元数据
        
    Returns:
        处理结果
    """
    task_id = self.request.id
    start_time = time.time()
    content_preview = content[:50] + "..." if len(content) > 50 else content
    
    _log_task_start(
        "DELETE_MEMORY", task_id, user_id,
        content_len=len(content),
        content_preview=content_preview
    )
    
    try:
        result = run_async(
            graph_memory_service.add_memory(
                user_id=user_id,
                content=content,
                metadata=metadata
            )
        )
        
        stats = result.get('stats', {})
        duration_ms = int((time.time() - start_time) * 1000)
        
        _log_task_end(
            "DELETE_MEMORY", task_id, user_id, duration_ms, True,
            added=stats.get('added_count', 0),
            updated=stats.get('updated_count', 0),
            deleted=stats.get('deleted_count', 0),
            trace_id=result.get('trace_id', '')
        )
        
        return result
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        retry_count = self.request.retries
        
        _log_task_error("DELETE_MEMORY", task_id, user_id, e, retry_count)
        _log_task_end("DELETE_MEMORY", task_id, user_id, duration_ms, False, error=str(e))
        
        raise self.retry(exc=e)
