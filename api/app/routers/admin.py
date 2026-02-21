from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, String, cast
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db, User, APIKey, Project, Memory, Fact, MemoryJudgment, UserQuota
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


class ClaimAgentRequest(BaseModel):
    api_key: str


class ClaimAgentResponse(BaseModel):
    success: bool
    message: str
    agent: Optional[dict] = None


@router.get("/stats", response_model=dict)
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    agents_count = db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.is_active == True).count()
    
    projects_count = db.query(Project).filter(Project.owner_id == user_id).count()
    
    facts_count = db.query(Fact).filter(Fact.user_id == user_id).count()
    
    return {
        "success": True,
        "data": {
            "agents_count": agents_count,
            "projects_count": projects_count,
            "facts_count": facts_count,
            "account_created": current_user.created_at.isoformat() if current_user.created_at else None
        }
    }


@router.get("/agents", response_model=dict)
async def list_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    api_keys = db.query(APIKey).filter(
        APIKey.user_id == user_id,
        APIKey.is_active == True
    ).order_by(APIKey.created_at.desc()).all()
    
    agents = []
    for key in api_keys:
        project = db.query(Project).filter(Project.id == key.project_id).first() if key.project_id else None
        
        last_memory = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.project_id == cast(key.project_id, String)
        ).order_by(Memory.created_at.desc()).first()
        
        agents.append({
            "id": key.id,
            "name": key.name,
            "api_key": key.api_key[:10] + "..." + key.api_key[-4:],
            "project": project.name if project else "Default",
            "project_id": key.project_id,
            "created_at": key.created_at.isoformat() if key.created_at else None,
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
            "last_memory_at": last_memory.created_at.isoformat() if last_memory and last_memory.created_at else None,
            "is_auto_generated": key.is_auto_generated
        })
    
    return {
        "success": True,
        "data": agents,
        "total": len(agents)
    }


@router.post("/agents/claim", response_model=ClaimAgentResponse)
async def claim_agent(
    request: ClaimAgentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    api_key = db.query(APIKey).filter(
        APIKey.api_key == request.api_key,
        APIKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    if api_key.user_id == current_user.id:
        return ClaimAgentResponse(
            success=True,
            message="This agent is already linked to your account",
            agent={
                "id": api_key.id,
                "name": api_key.name
            }
        )
    
    old_user_id = api_key.user_id
    
    api_key.user_id = current_user.id
    
    if api_key.project_id:
        project = db.query(Project).filter(Project.id == api_key.project_id).first()
        if project:
            project.owner_id = current_user.id
    
    db.query(Memory).filter(Memory.user_id == old_user_id).update({"user_id": current_user.id})
    db.query(Fact).filter(Fact.user_id == old_user_id).update({"user_id": current_user.id})
    db.query(MemoryJudgment).filter(MemoryJudgment.user_id == old_user_id).update({"user_id": current_user.id})
    
    db.commit()
    
    return ClaimAgentResponse(
        success=True,
        message="Agent claimed successfully! All memories have been transferred to your account.",
        agent={
            "id": api_key.id,
            "name": api_key.name
        }
    )


@router.get("/memories", response_model=dict)
async def list_memories(
    limit: int = 50,
    offset: int = 0,
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    query = db.query(Memory).filter(Memory.user_id == user_id)
    
    if project_id:
        query = query.filter(Memory.project_id == project_id)
    
    total = query.count()
    
    memories = query.order_by(Memory.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": m.id,
                "content": m.content[:200] + "..." if len(m.content) > 200 else m.content,
                "project_id": m.project_id,
                "cognitive_sector": m.cognitive_sector,
                "confidence": m.confidence,
                "facts_count": len(m.facts) if m.facts else 0,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None
            }
            for m in memories
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/memories/{memory_id}", response_model=dict)
async def get_memory_detail(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id
    ).first()
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    facts = db.query(Fact).filter(Fact.memory_id == memory_id).all()
    
    return {
        "success": True,
        "data": {
            "id": memory.id,
            "content": memory.content,
            "project_id": memory.project_id,
            "cognitive_sector": memory.cognitive_sector,
            "confidence": memory.confidence,
            "meta": memory.meta,
            "created_at": memory.created_at.isoformat() if memory.created_at else None,
            "updated_at": memory.updated_at.isoformat() if memory.updated_at else None,
            "facts": [
                {
                    "id": f.id,
                    "content": f.content,
                    "category": f.category,
                    "importance": f.importance,
                    "entities": f.entities,
                    "relations": f.relations,
                    "created_at": f.created_at.isoformat() if f.created_at else None
                }
                for f in facts
            ]
        }
    }


@router.get("/facts", response_model=dict)
async def list_facts(
    limit: int = 10,
    offset: int = 0,
    category: Optional[str] = None,
    days: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    query = db.query(Fact).filter(Fact.user_id == user_id)
    
    if category:
        query = query.filter(Fact.category == category)
    
    if days:
        start_time = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Fact.created_at >= start_time)
    elif start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Fact.created_at >= start_dt)
        except:
            pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Fact.created_at <= end_dt)
            except:
                pass
    
    total = query.count()
    
    facts = query.order_by(Fact.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": f.id,
                "content": f.content,
                "category": f.category,
                "importance": f.importance,
                "entities": f.entities,
                "memory_id": f.memory_id,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in facts
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/logs", response_model=dict)
async def list_logs(
    limit: int = 10,
    offset: int = 0,
    operation_type: Optional[str] = None,
    days: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    agent_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    query = db.query(MemoryJudgment).filter(MemoryJudgment.user_id == user_id)
    
    if operation_type:
        query = query.filter(MemoryJudgment.operation_type == operation_type)
    
    if agent_id:
        query = query.filter(MemoryJudgment.api_key_id == agent_id)
    
    if days:
        start_time = datetime.utcnow() - timedelta(days=days)
        query = query.filter(MemoryJudgment.created_at >= start_time)
    elif start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(MemoryJudgment.created_at >= start_dt)
        except:
            pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(MemoryJudgment.created_at <= end_dt)
            except:
                pass
    
    total = query.count()
    
    logs = query.order_by(MemoryJudgment.created_at.desc()).offset(offset).limit(limit).all()
    
    api_keys = db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.is_active == True).all()
    key_map = {k.id: k.name for k in api_keys}
    
    result = []
    for l in logs:
        agent_name = "Unknown"
        if l.extracted_facts and isinstance(l.extracted_facts, list):
            for fact in l.extracted_facts:
                if isinstance(fact, dict):
                    agent_name = fact.get("agent_name", key_map.get(fact.get("api_key_id"), "Unknown"))
                    break
        
        facts_content = []
        if l.extracted_facts and isinstance(l.extracted_facts, list):
            for fact in l.extracted_facts:
                if isinstance(fact, dict) and fact.get("content"):
                    facts_content.append(fact["content"])
                elif isinstance(fact, str):
                    facts_content.append(fact)
        
        executed_ops = l.executed_operations or {}
        op_types = []
        if isinstance(executed_ops, dict):
            stats = executed_ops.get("stats", {})
            if stats.get("added_count", 0) > 0 or executed_ops.get("added"):
                op_types.append("add")
            if stats.get("updated_count", 0) > 0 or executed_ops.get("updated"):
                op_types.append("update")
            if stats.get("deleted_count", 0) > 0 or executed_ops.get("deleted"):
                op_types.append("delete")
        elif isinstance(executed_ops, list):
            for op in executed_ops:
                if isinstance(op, dict):
                    op_types.append(op.get("operation", op.get("type", "unknown")))
        
        result.append({
            "id": l.id,
            "trace_id": l.trace_id,
            "agent_name": agent_name,
            "operation_type": l.operation_type,
            "op_types": op_types,
            "facts_content": facts_content,
            "input_content": l.input_content[:100] + "..." if len(l.input_content) > 100 else l.input_content,
            "reasoning": l.reasoning,
            "executed_operations": executed_ops,
            "execution_success": l.execution_success,
            "error_message": l.error_message,
            "model_name": l.model_name,
            "latency_ms": l.latency_ms,
            "created_at": l.created_at.isoformat() if l.created_at else None
        })
    
    return {
        "success": True,
        "data": result,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/logs/{log_id}", response_model=dict)
async def get_log_detail(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log = db.query(MemoryJudgment).filter(
        MemoryJudgment.id == log_id,
        MemoryJudgment.user_id == current_user.id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    return {
        "success": True,
        "data": {
            "id": log.id,
            "trace_id": log.trace_id,
            "operation_type": log.operation_type,
            "input_content": log.input_content,
            "extracted_facts": log.extracted_facts,
            "existing_memories": log.existing_memories,
            "llm_response": log.llm_response,
            "parsed_operations": log.parsed_operations,
            "reasoning": log.reasoning,
            "executed_operations": log.executed_operations,
            "execution_success": log.execution_success,
            "error_message": log.error_message,
            "model_name": log.model_name,
            "latency_ms": log.latency_ms,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "is_verified": log.is_verified,
            "verification_result": log.verification_result,
            "verification_notes": log.verification_notes
        }
    }


@router.get("/quota", response_model=dict)
async def get_quota(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quota = db.query(UserQuota).filter(UserQuota.user_id == current_user.id).first()
    
    if not quota:
        return {
            "success": True,
            "data": {
                "cloud_search_used": 0,
                "cloud_search_limit": 50,
                "memories_created": 0,
                "memories_limit": 100,
                "tier": current_user.subscription_tier.value if current_user.subscription_tier else "free"
            }
        }
    
    from app.core.database import QUOTA_LIMITS, SubscriptionTier
    tier = current_user.subscription_tier or SubscriptionTier.FREE
    limits = QUOTA_LIMITS[tier]
    
    return {
        "success": True,
        "data": {
            "cloud_search_used": quota.cloud_search_used,
            "cloud_search_limit": limits["cloud_search_per_month"],
            "memories_created": quota.memories_created,
            "memories_limit": limits["memories_per_month"],
            "batch_uploads_today": quota.batch_uploads_today,
            "batch_uploads_limit": limits["batch_upload_per_day"],
            "tier": tier.value,
            "period_start": quota.period_start.isoformat() if quota.period_start else None
        }
    }


@router.delete("/memories/{memory_id}", response_model=dict)
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id
    ).first()
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    db.delete(memory)
    db.commit()
    
    return {
        "success": True,
        "message": "Memory deleted successfully"
    }


@router.delete("/agents/{agent_id}", response_model=dict)
async def delete_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    api_key = db.query(APIKey).filter(
        APIKey.id == agent_id,
        APIKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    api_key.is_active = False
    db.commit()
    
    return {
        "success": True,
        "message": "Agent deactivated successfully"
    }
