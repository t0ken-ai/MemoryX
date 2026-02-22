#!/bin/bash
#
# MemoryX VS Code Extension 一键安装脚本
# 用法: curl -fsSL https://t0ken.ai/install-vscode.sh | bash
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🧠 MemoryX VS Code Extension 安装器             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查 VS Code 是否安装
if ! command -v code &> /dev/null; then
    echo -e "${RED}❌ 未找到 VS Code CLI (code 命令)${NC}"
    echo ""
    echo "请确保已安装 VS Code 并添加到 PATH:"
    echo "  - macOS: 在 VS Code 中运行 'Shell Command: Install code command in PATH'"
    echo "  - Linux: 通常已自动配置"
    echo "  - Windows: 安装时勾选 'Add to PATH'"
    exit 1
fi

echo -e "${GREEN}✅ 找到 VS Code CLI${NC}"

# 创建临时目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# 下载最新的 .vsix 文件
VSIX_URL="https://github.com/t0ken-ai/MemoryX/releases/latest/download/memoryx-vscode.vsix"
VSIX_PATH="$TEMP_DIR/memoryx-vscode.vsix"

echo -e "${YELLOW}📥 下载 MemoryX VS Code Extension...${NC}"

# 尝试从 GitHub Releases 下载
if curl -fsSL "$VSIX_URL" -o "$VSIX_PATH" 2>/dev/null; then
    echo -e "${GREEN}✅ 下载成功${NC}"
else
    # 如果 Releases 没有，从仓库下载
    echo -e "${YELLOW}⚠️  Releases 中未找到，尝试从仓库下载...${NC}"
    REPO_URL="https://raw.githubusercontent.com/t0ken-ai/MemoryX/main/plugins/memoryx-vscode-extension/memoryx-vscode-1.0.0.vsix"
    
    if curl -fsSL "$REPO_URL" -o "$VSIX_PATH" 2>/dev/null; then
        echo -e "${GREEN}✅ 下载成功${NC}"
    else
        echo -e "${RED}❌ 下载失败${NC}"
        echo ""
        echo "请手动下载安装:"
        echo "  1. 访问 https://github.com/t0ken-ai/MemoryX/releases"
        echo "  2. 下载 memoryx-vscode.vsix"
        echo "  3. 运行: code --install-extension memoryx-vscode.vsix"
        exit 1
    fi
fi

# 安装扩展
echo -e "${YELLOW}📦 安装 VS Code Extension...${NC}"

if code --install-extension "$VSIX_PATH" --force; then
    echo -e "${GREEN}✅ 安装成功！${NC}"
else
    echo -e "${RED}❌ 安装失败${NC}"
    exit 1
fi

# 显示使用说明
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🎉 MemoryX VS Code Extension 已安装完成！${NC}"
echo ""
echo -e "使用方法:"
echo -e "  1. 打开 VS Code Chat (Cmd/Ctrl + Shift + I)"
echo -e "  2. 输入 ${YELLOW}@memoryx 帮我写一个登录函数${NC}"
echo ""
echo -e "可用命令:"
echo -e "  ${YELLOW}@memoryx /search <关键词>${NC}  - 搜索记忆"
echo -e "  ${YELLOW}@memoryx /list${NC}             - 列出最近记忆"
echo -e "  ${YELLOW}@memoryx /remember${NC}         - 保存对话"
echo ""
echo -e "配置:"
echo -e "  在 VS Code 设置中搜索 ${YELLOW}MemoryX${NC} 进行配置"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"