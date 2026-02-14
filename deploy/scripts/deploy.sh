#!/bin/bash
# MemoryX 部署脚本
# 用法: ./deploy.sh [release|alpha]

set -e

DEPLOY_TYPE=${1:-alpha}
LOG_FILE="/var/log/memoryx/deploy.log"
DEPLOY_DIR="/data/memoryx"
BACKUP_DIR="/data/memoryx/backups"
GITHUB_REPO="t0ken-ai/MemoryX"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a $LOG_FILE
}

# 创建目录
mkdir -p $DEPLOY_DIR $BACKUP_DIR /var/log/memoryx

# 获取最新 Artifact
download_artifact() {
    log "Downloading latest artifact for $DEPLOY_TYPE..."
    
    # 获取最新成功的 workflow run
    RUN_ID=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/actions/workflows/deploy-webhook.yml/runs?branch=main&status=success&per_page=1" | \
        python3 -c "import sys,json; print(json.load(sys.stdin)['workflow_runs'][0]['id'])")
    
    if [ -z "$RUN_ID" ]; then
        error "Failed to get latest run ID"
    fi
    
    log "Found run ID: $RUN_ID"
    
    # 下载 artifact
    ARTIFACT_URL="https://api.github.com/repos/$GITHUB_REPO/actions/runs/$RUN_ID/artifacts"
    
    # 使用 GitHub CLI 或直接下载
    cd /tmp
    rm -f deploy-package*.tar.gz
    
    # 备用方案：直接 git pull
    log "Using git pull instead..."
}

# 备份当前版本
backup_current() {
    log "Creating backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C $DEPLOY_DIR static api 2>/dev/null || true
    
    # 保留最近10个备份
    ls -t $BACKUP_DIR/backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    log "Backup created: backup_$TIMESTAMP.tar.gz"
}

# 部署静态文件
deploy_static() {
    log "Deploying static files..."
    
    if [ -d "/tmp/memoryx-deploy/static" ]; then
        rm -rf $DEPLOY_DIR/static
        cp -r /tmp/memoryx-deploy/static $DEPLOY_DIR/
        log "Static files deployed"
    else
        warn "No static files found"
    fi
}

# 部署 API
deploy_api() {
    log "Deploying API..."
    
    # 拉取最新代码
    if [ -d "$DEPLOY_DIR/repo" ]; then
        cd $DEPLOY_DIR/repo
        git fetch origin
        git reset --hard origin/main
    else
        git clone https://github.com/$GITHUB_REPO.git $DEPLOY_DIR/repo
        cd $DEPLOY_DIR/repo
    fi
    
    # 复制 API 文件
    cp -r api $DEPLOY_DIR/
    
    # 安装依赖
    cd $DEPLOY_DIR/api
    pip install -r requirements.txt -q
    
    log "API deployed"
}

# 重启服务
restart_services() {
    log "Restarting services..."
    
    # 重启 API 服务
    sudo systemctl restart memoryx-api
    
    # 重载 nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    log "Services restarted"
}

# 健康检查
health_check() {
    log "Running health check..."
    
    sleep 5
    
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        log "✅ Health check passed"
    else
        error "❌ Health check failed"
    fi
}

# 主流程
main() {
    log "=========================================="
    log "Starting deployment: $DEPLOY_TYPE"
    log "=========================================="
    
    backup_current
    deploy_api
    deploy_static
    restart_services
    health_check
    
    log "=========================================="
    log "✅ Deployment completed successfully!"
    log "=========================================="
}

main
