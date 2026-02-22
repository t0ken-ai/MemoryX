from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import logging
import json

from app.core.database import (
    get_db, User, APIKey, UserQuota, 
    get_or_create_quota, SubscriptionTier, QUOTA_LIMITS
)
from app.services.memory_core.graph_memory_service import graph_memory_service
from app.services.memory_queue import add_memory_task, get_queue_for_tier
from app.core.celery_config import celery_app
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/v1", tags=["conversations"])


class MessageItem(BaseModel):
    role: Literal["user", "assistant"] = Field(..., description="消息角色：user 或 assistant")
    content: str = Field(..., min_length=1, description="消息内容")
    tokens: Optional[int] = Field(default=0, description="Token 数量")
    timestamp: Optional[int] = Field(default=None, description="时间戳")


class ConversationFlushRequest(BaseModel):
    conversation_id: Optional[str] = Field(default=None, description="对话ID")
    messages: List[MessageItem] = Field(..., min_length=1, description="消息列表，每条包含 role、content、timestamp")


def safe_int_user_id(user_id) -> int:
    """安全地将 user_id 转换为整数"""
    if user_id is None:
        raise ValueError("user_id is None")
    if isinstance(user_id, int):
        return user_id
    try:
        return int(str(user_id))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid user_id format: {user_id}") from e


def process_conversation_task(conversation_data: dict, api_key_id: int = None):
    """后台任务：快速入队，后续由 Celery worker 处理总结和过滤"""
    try:
        user_id = conversation_data["user_id"]
        messages = conversation_data["messages"]
        
        from app.core.database import SessionLocal, User
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == safe_int_user_id(user_id)).first()
            tier = user.subscription_tier if user else SubscriptionTier.FREE
        finally:
            db.close()
        
        import json
        
        # 直接入队原始对话，由 Celery worker 处理总结和过滤
        messages_json = json.dumps(messages, ensure_ascii=False)
        logger.info(f"[Conversation] Queued for user {user_id}: {len(messages)} messages, {len(messages_json)} chars")
        
        queue = get_queue_for_tier(tier)
        task = add_memory_task.apply_async(
            args=[user_id, messages_json, {
                "conversation_id": conversation_data.get("conversation_id"),
                "message_count": len(messages),
                "source": "conversation_flush",
                "project_id": conversation_data.get("project_id", "default"),
                "needs_summary": True  # 标记需要先总结
            }, False, api_key_id],
            queue=queue
        )
        
        logger.info(f"[Conversation] Task queued: {task.id}")
        return {"task_id": task.id, "status": "queued", "message_count": len(messages)}
        
    except Exception as e:
        logger.error(f"[Conversation] Failed to queue: {e}")
        raise


def get_current_user_with_quota(
    x_api_key: str = Header(None), 
    db: Session = Depends(get_db)
) -> tuple:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header required")
    
    api_key = db.query(APIKey).filter(
        APIKey.api_key == x_api_key, 
        APIKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    quota = get_or_create_quota(db, user.id)
    
    return user.id, user.subscription_tier, quota, api_key.id


@router.post("/conversations/flush")
async def flush_conversation(
    request: ConversationFlushRequest,
    background_tasks: BackgroundTasks,
    user_data: tuple = Depends(get_current_user_with_quota),
    db: Session = Depends(get_db)
):
    """
    批量提交对话 - 触发记忆提取
    
    流程：
    1. 接收 messages JSON 数组
    2. 格式校验（每条消息必须有 role、content、timestamp）
    3. 后台异步处理：敏感信息过滤 + LLM 提取记忆 + 向量化 + 图构建
    """
    user_id, tier, quota, api_key_id = user_data
    
    if not request.messages or len(request.messages) == 0:
        raise HTTPException(status_code=400, detail="messages field is required")
    
    conversation_data = {
        "user_id": str(user_id),
        "conversation_id": request.conversation_id,
        "messages": [m.model_dump() for m in request.messages],
        "project_id": "default"
    }
    
    background_tasks.add_task(process_conversation_task, conversation_data, api_key_id)
    
    db.commit()
    
    return {
        "status": "ok",
        "message": "Conversation queued for processing",
        "message_count": len(request.messages),
        "extracted_count": 1,
        "server_model_version": 1,
        "sync_required": False
    }


@router.post("/conversations/realtime")
async def realtime_message(
    message: MessageItem,
    user_data: tuple = Depends(get_current_user_with_quota),
    db: Session = Depends(get_db)
):
    """
    实时消息接收 - 立即入队处理
    
    用于高优先级消息，快速入队由 Celery worker 处理
    """
    user_id, tier, quota, api_key_id = user_data
    
    if not message.content or len(message.content) < 2:
        return {"status": "skipped", "reason": "content_too_short"}
    
    queue = get_queue_for_tier(tier)
    task = add_memory_task.apply_async(
        args=[str(user_id), message.content, {
            "role": message.role,
            "tokens": message.tokens,
            "source": "realtime"
        }, False, api_key_id],
        queue=queue
    )
    
    db.commit()
    
    return {
        "status": "queued",
        "task_id": task.id
    }
