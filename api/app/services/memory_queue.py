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

from app.core.celery_config import celery_app
from app.services.memory_core.graph_memory_service import graph_memory_service

logger = logging.getLogger(__name__)


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
    skip_judge: bool = False
) -> Dict[str, Any]:
    """
    异步添加记忆任务
    
    Args:
        user_id: 用户ID
        content: 记忆内容
        metadata: 元数据
        skip_judge: 是否跳过LLM判断
        
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
        result = run_async(
            graph_memory_service.add_memory(
                user_id=user_id,
                content=content,
                metadata=metadata,
                skip_judge=skip_judge
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
    metadatas: List[Dict] = None
) -> List[Dict[str, Any]]:
    """
    异步批量添加记忆任务
    
    Args:
        user_id: 用户ID
        contents: 记忆内容列表
        metadatas: 元数据列表
        
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
                        metadata=metadata
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
