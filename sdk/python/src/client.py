"""
MemoryX Client - Python SDK for MemoryX API
"""

import json
import hashlib
import platform
import socket
import os
from typing import Optional, List, Dict, Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError


class MemoryXError(Exception):
    """MemoryX Error"""
    pass


class APIClient:
    """MemoryX API Client - Python SDK"""
    
    DEFAULT_API_BASE = "https://t0ken.ai/api"
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize MemoryX client
        
        Args:
            config: Optional config dict with keys:
                - api_key: API Key (if already registered)
                - api_base_url: API base URL
                - project_id: Project ID (default: "default")
                - user_id: User ID
        """
        if config is None:
            config = {}
        
        self.api_key: Optional[str] = config.get("api_key")
        self.api_base_url: str = config.get("api_base_url", self.DEFAULT_API_BASE)
        self.project_id: str = config.get("project_id", "default")
        self.user_id: Optional[str] = config.get("user_id")
    
    def get_api_key(self) -> Optional[str]:
        """Get current API key"""
        return self.api_key
    
    def get_project_id(self) -> str:
        """Get current project ID"""
        return self.project_id
    
    def get_user_id(self) -> Optional[str]:
        """Get current user ID"""
        return self.user_id
    
    def get_api_base_url(self) -> str:
        """Get API base URL"""
        return self.api_base_url
    
    def get_config(self) -> Dict[str, Any]:
        """Get current config"""
        return {
            "api_key": self.api_key,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "api_base_url": self.api_base_url
        }
    
    def set_api_key(self, key: str) -> None:
        """Set API key"""
        self.api_key = key
    
    def set_project_id(self, project_id: str) -> None:
        """Set project ID"""
        self.project_id = project_id
    
    def set_user_id(self, user_id: str) -> None:
        """Set user ID"""
        self.user_id = user_id
    
    def get_machine_fingerprint(self) -> str:
        """Generate machine fingerprint based on hardware info"""
        components = [
            socket.gethostname(),
            platform.system(),
            platform.machine(),
            platform.processor() or "unknown",
            str(os.cpu_count() or 0)
        ]
        raw = "|".join(components)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]
    
    def _request(self, method: str, endpoint: str, data: Optional[dict] = None) -> dict:
        """Send HTTP request"""
        url = f"{self.api_base_url}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"memoryx-python/2.0.0"
        }
        
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        
        req = Request(
            url,
            data=json.dumps(data).encode() if data else None,
            headers=headers,
            method=method
        )
        
        try:
            with urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode())
        except HTTPError as e:
            error_body = e.read().decode()
            try:
                error_data = json.loads(error_body)
                raise MemoryXError(error_data.get("detail", error_data.get("message", f"HTTP {e.code}")))
            except json.JSONDecodeError:
                raise MemoryXError(f"HTTP {e.code}: {error_body}")
        except Exception as e:
            raise MemoryXError(f"Request failed: {str(e)}")
    
    def auto_register(self, agent_type: str = "python_sdk", agent_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Auto-register to get API Key
        
        Args:
            agent_type: Agent type (default: "python_sdk")
            agent_name: Agent name (default: hostname)
        
        Returns:
            {
                "agent_id": "...",
                "api_key": "...",
                "project_id": "..."
            }
        """
        if agent_name is None:
            agent_name = socket.gethostname()
        
        fingerprint = self.get_machine_fingerprint()
        
        data = {
            "machine_fingerprint": fingerprint,
            "agent_type": agent_type,
            "agent_name": agent_name,
            "platform": platform.system().lower(),
            "platform_version": platform.release()
        }
        
        result = self._request("POST", "/agents/auto-register", data)
        
        # Update instance with returned values
        if result.get("api_key"):
            self.api_key = result["api_key"]
        if result.get("project_id"):
            self.project_id = str(result["project_id"])
        if result.get("agent_id"):
            self.user_id = result["agent_id"]
        
        return {
            "agent_id": result.get("agent_id"),
            "api_key": result.get("api_key"),
            "project_id": str(result.get("project_id", ""))
        }
    
    def send_memories(self, memories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Send memories (single or batch)
        
        Args:
            memories: List of memory dicts, each with:
                - content: Memory content (required)
                - metadata: Optional metadata dict with category etc.
        
        Returns:
            {"success": True, "task_id": "...", "status": "..."}
            
        Example:
            >>> client.send_memories([
            ...     {"content": "User prefers dark theme", "metadata": {"category": "semantic"}}
            ... ])
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        if not memories:
            return {"success": True}
        
        if len(memories) == 1:
            # Single memory endpoint
            data = {
                "content": memories[0]["content"],
                "project_id": self.project_id,
                "metadata": memories[0].get("metadata", {})
            }
            result = self._request("POST", "/v1/memories", data)
        else:
            # Batch endpoint
            data = {
                "memories": memories,
                "project_id": self.project_id
            }
            result = self._request("POST", "/v1/memories/batch", data)
        
        return {
            "success": True,
            "task_id": result.get("task_id"),
            "status": result.get("status")
        }
    
    def send_conversation(self, conversation_id: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Send conversation messages for memory extraction
        
        Args:
            conversation_id: Unique conversation ID
            messages: List of message dicts with:
                - role: "user" or "assistant"
                - content: Message content
                - timestamp: Optional timestamp (ms)
                - tokens: Optional token count
        
        Returns:
            {"success": True, "task_id": "...", "status": "..."}
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        if not messages:
            return {"success": True}
        
        import time
        
        formatted_messages = []
        for m in messages:
            formatted_messages.append({
                "role": m["role"],
                "content": m["content"],
                "timestamp": m.get("timestamp", int(time.time() * 1000)),
                "tokens": m.get("tokens", 0)
            })
        
        data = {
            "conversation_id": conversation_id,
            "messages": formatted_messages
        }
        
        result = self._request("POST", "/v1/conversations/flush", data)
        
        return {
            "success": True,
            "task_id": result.get("task_id"),
            "status": result.get("status")
        }
    
    def search(self, query: str, limit: int = 10) -> Dict[str, Any]:
        """
        Search memories by semantic similarity
        
        Args:
            query: Search query
            limit: Maximum results (default: 10)
        
        Returns:
            {
                "success": True,
                "data": [{"id": "...", "content": "...", "category": "...", "score": 0.9}],
                "related_memories": [...],
                "remaining_quota": {...}
            }
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        data = {
            "query": query,
            "project_id": self.project_id,
            "limit": limit
        }
        
        result = self._request("POST", "/v1/memories/search", data)
        
        # Normalize response
        formatted_data = []
        for m in result.get("data", []):
            formatted_data.append({
                "id": m.get("id"),
                "content": m.get("memory") or m.get("content"),
                "category": m.get("category", "other"),
                "score": m.get("score", 0.5)
            })
        
        related = []
        for m in result.get("related_memories", []):
            related.append({
                "id": m.get("id"),
                "content": m.get("memory") or m.get("content"),
                "category": m.get("category", "other"),
                "score": m.get("score", 0)
            })
        
        return {
            "success": True,
            "data": formatted_data,
            "related_memories": related,
            "remaining_quota": result.get("remaining_quota")
        }
    
    def list(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        List memories
        
        Args:
            limit: Maximum results (default: 50)
            offset: Pagination offset (default: 0)
        
        Returns:
            {
                "success": True,
                "data": [{"id": "...", "content": "...", "category": "...", "score": 0}],
                "total": 100
            }
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        params = f"?limit={limit}&offset={offset}&project_id={self.project_id}"
        
        result = self._request("GET", f"/v1/memories/list{params}")
        
        # Normalize response
        formatted_data = []
        for m in result.get("data", []):
            formatted_data.append({
                "id": m.get("id"),
                "content": m.get("memory") or m.get("content"),
                "category": m.get("category", "other"),
                "score": 0
            })
        
        return {
            "success": True,
            "data": formatted_data,
            "total": result.get("total", 0)
        }
    
    def delete(self, memory_id: str) -> Dict[str, Any]:
        """
        Delete a memory
        
        Args:
            memory_id: Memory ID to delete
        
        Returns:
            {"success": True}
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        self._request("DELETE", f"/v1/memories/{memory_id}")
        return {"success": True}
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get async task status
        
        Args:
            task_id: Task ID returned from send_memories/send_conversation
        
        Returns:
            {
                "task_id": "...",
                "status": "PENDING|STARTED|SUCCESS|FAILURE",
                "result": {...}  # Only when completed
            }
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        return self._request("GET", f"/v1/memories/task/{task_id}")
    
    def get_quota(self) -> Dict[str, Any]:
        """
        Get quota information
        
        Returns:
            Quota info dict
        """
        if not self.api_key:
            raise MemoryXError("Not authenticated. Call auto_register() first.")
        
        return self._request("GET", "/v1/quota")


# Backward compatibility alias
MemoryXClient = APIClient


def connect_memory(base_url: Optional[str] = None, verbose: bool = True) -> APIClient:
    """
    Quick connect to MemoryX
    
    Args:
        base_url: API base URL (optional)
        verbose: Print usage guide (default: True)
        
    Returns:
        APIClient instance
        
    Example:
        >>> from memoryx import connect_memory
        >>> client = connect_memory()
        >>> client.send_memories([{"content": "User prefers dark mode"}])
        >>> results = client.search("preferences")
    """
    config = {}
    if base_url:
        config["api_base_url"] = base_url
    
    client = APIClient(config)
    
    # Try to load saved config
    config_path = os.path.expanduser("~/.memoryx/config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                saved_config = json.load(f)
            if saved_config.get("machine_fingerprint") == client.get_machine_fingerprint():
                if saved_config.get("api_key"):
                    client.set_api_key(saved_config["api_key"])
                    if verbose:
                        print("Connected to MemoryX")
                    if verbose:
                        _print_usage_guide()
                    return client
        except Exception:
            pass
    
    # Auto register if no saved config
    if verbose:
        print("First time setup, registering...")
    
    result = client.auto_register()
    
    if result.get("api_key"):
        # Save config
        config_dir = os.path.expanduser("~/.memoryx")
        os.makedirs(config_dir, exist_ok=True)
        
        saved_config = {
            "api_key": client.api_key,
            "project_id": client.project_id,
            "user_id": client.user_id,
            "machine_fingerprint": client.get_machine_fingerprint(),
            "base_url": client.api_base_url
        }
        
        with open(os.path.join(config_dir, "config.json"), "w") as f:
            json.dump(saved_config, f)
        
        if verbose:
            print(f"MemoryX activated")
            print(f"  Agent ID: {result.get('agent_id', 'N/A')}")
    else:
        raise MemoryXError(f"Registration failed: {result}")
    
    if verbose:
        _print_usage_guide()
    
    return client


def _print_usage_guide():
    """Print usage guide"""
    guide = """
MemoryX Usage:
  client.send_memories(memories)  - Store memories (list of dicts)
  client.search(query)            - Search memories
  client.list()                   - List all memories
  client.delete(memory_id)        - Delete a memory
  client.get_quota()              - Get quota info

Example:
  client.send_memories([{"content": "User prefers dark mode"}])
  results = client.search("preferences")
  for m in results["data"]:
      print(m["content"])
"""
    print(guide)