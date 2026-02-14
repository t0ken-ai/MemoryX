#!/bin/bash
# MemoryX Skill Installer
# Unified pip installation

echo "🧠 Installing MemoryX Skill..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 required"
    exit 1
fi

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 required"
    exit 1
fi

# Install memoryx from PyPI
echo "📦 Installing t0ken-memoryx from PyPI..."
pip3 install t0ken-memoryx -q

if [ $? -ne 0 ]; then
    echo "❌ Failed to install t0ken-memoryx"
    exit 1
fi

# Determine skill directory
SKILL_DIR="${OPENCLAW_SKILLS:-$HOME/.openclaw/skills}/memoryx"
mkdir -p "$SKILL_DIR"

# Copy MCP server and config
cp mcp_server.py "$SKILL_DIR/"
cp mcp-config.json "$SKILL_DIR/"
cp SKILL.md "$SKILL_DIR/"
mkdir -p "$SKILL_DIR/examples"
cp examples/basic_usage.py "$SKILL_DIR/examples/"

chmod +x "$SKILL_DIR/examples/basic_usage.py"
chmod +x "$SKILL_DIR/mcp_server.py"

# Auto-install OpenClaw Hook (for automatic memory sync)
if [ -d "$HOME/.openclaw" ]; then
    echo "🔌 Installing OpenClaw Hook for automatic memory sync..."
    
    HOOK_DIR="$HOME/.openclaw/hooks/memoryx-sync"
    mkdir -p "$HOOK_DIR"
    
    # Create HOOK.md
    cat > "$HOOK_DIR/HOOK.md" << 'HOOKMD'
name: memoryx-sync
version: 1.0.0
entry: handler.js
events:
  - message:received
  - agent:response
HOOKMD
    
    # Create handler.js (OpenClaw only supports JS/TS hooks)
    cat > "$HOOK_DIR/handler.js" << 'HANDLERJS'
/**
 * MemoryX OpenClaw Hook - JavaScript
 * Auto-sync important memories to MemoryX
 */

const MEMORYX_AVAILABLE = (() => {
  try {
    require('t0ken-memoryx');
    return true;
  } catch (e) {
    return false;
  }
})();

function isPluginInstalled() {
  try {
    const { execSync } = require('child_process');
    const result = execSync('openclaw plugins list', { 
      encoding: 'utf8', 
      timeout: 5000 
    });
    return result.includes('memoryx-realtime') && result.includes('loaded');
  } catch (e) {
    return false;
  }
}

async function onMessage(message, context) {
  // Skip if memoryx-realtime-plugin is installed (avoid duplication)
  if (isPluginInstalled()) {
    return { context };
  }
  
  if (!MEMORYX_AVAILABLE || !message || message.length < 5) {
    return { context };
  }
  
  // Submit to cloud for processing
  try {
    const memoryx = require('t0ken-memoryx');
    const memory = memoryx.connect_memory({ verbose: false });
    
    // Async store (non-blocking)
    memory.add(message, 'semantic', 'default', {
      source: 'openclaw_hook_js',
      timestamp: new Date().toISOString()
    }).catch(() => {});
  } catch (e) {}
  
  return { context };
}

function onResponse(response, context) {
  return response;
}

module.exports = { onMessage, onResponse };
HANDLERJS
    
    # Configure OpenClaw
    CONFIG_FILE="$HOME/.openclaw/openclaw.json"
    if [ -f "$CONFIG_FILE" ]; then
        python3 << PYEOF
import json
import os

config_file = os.path.expanduser("~/.openclaw/openclaw.json")
with open(config_file, 'r') as f:
    config = json.load(f)

if 'hooks' not in config:
    config['hooks'] = {}
if 'internal' not in config['hooks']:
    config['hooks']['internal'] = {}
if 'entries' not in config['hooks']['internal']:
    config['hooks']['internal']['entries'] = {}

config['hooks']['internal']['entries']['memoryx-sync'] = {'enabled': True}

with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)
PYEOF
    else
        cat > "$CONFIG_FILE" << 'CONFIGJSON'
{
  "hooks": {
    "internal": {
      "entries": {
        "memoryx-sync": {
          "enabled": true
        }
      }
    }
  }
}
CONFIGJSON
    fi
    
    echo "✅ OpenClaw Hook installed"
    echo "   Restart OpenClaw Gateway to activate auto-sync"
fi

echo ""
echo "✅ MemoryX Skill installed!"
echo ""
echo "Quick start:"
echo "  from memoryx import connect_memory"
echo "  memory = connect_memory()"
echo "  memory.add('User prefers dark mode')"
echo ""
echo "📖 Full docs: https://docs.t0ken.ai"
echo "🔗 Claim machine: https://t0ken.ai/agent-register"
echo ""
echo "For MCP integration, add to ~/.openclaw/mcporter.json:"
cat "$SKILL_DIR/mcp-config.json"
