from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
import logging
import json

from app.core.database import get_db, User, APIKey, get_or_create_quota, SubscriptionTier
from app.services.memory_queue import add_memory_task, get_queue_for_tier
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
    user_data: tuple = Depends(get_current_user_with_quota),
    db: Session = Depends(get_db)
):
    """
    批量提交对话 - 触发记忆提取
    
    流程：
    1. 接收 messages JSON 数组
    2. 格式校验（每条消息必须有 role、content、timestamp）
    3. Celery 异步处理：敏感信息过滤 + LLM 提取记忆 + 向量化 + 图构建
    """
    user_id, tier, quota, api_key_id = user_data
    
    if not request.messages or len(request.messages) == 0:
        raise HTTPException(status_code=400, detail="messages field is required")
    
    # 直接入队 Celery，与 memories/batch 保持一致
    messages_json = json.dumps([m.model_dump() for m in request.messages], ensure_ascii=False)
    
    queue = get_queue_for_tier(tier)
    task = add_memory_task.apply_async(
        args=[str(user_id), messages_json, {
            "conversation_id": request.conversation_id,
            "message_count": len(request.messages),
            "source": "conversation_flush",
            "project_id": "default",
            "needs_summary": True
        }, False, api_key_id],
        queue=queue
    )
    
    db.commit()
    
    logger.info(f"[Conversation] Task queued: {task.id}, user={user_id}, messages={len(request.messages)}")
    
    return {
        "status": "queued",
        "task_id": task.id,
        "message_count": len(request.messages)
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
