"""
MemoryX Python SDK
Give your AI agents long-term memory
"""

__version__ = "2.0.0"
__author__ = "MemoryX Team"

from .client import APIClient, MemoryXClient, MemoryXError, connect_memory

__all__ = ["APIClient", "MemoryXClient", "MemoryXError", "connect_memory"]
