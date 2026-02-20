#!/usr/bin/env python3
"""
Generate OpenAPI specification for MemoryX API.
Run from the api directory: python generate_openapi.py
"""

import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app


def generate_openapi():
    """Generate OpenAPI JSON file"""
    openapi_schema = app.openapi()
    
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "openapi.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
    
    print(f"OpenAPI schema generated: {output_path}")
    print(f"Title: {openapi_schema.get('info', {}).get('title')}")
    print(f"Version: {openapi_schema.get('info', {}).get('version')}")
    print(f"Paths: {len(openapi_schema.get('paths', {}))}")


if __name__ == "__main__":
    generate_openapi()
