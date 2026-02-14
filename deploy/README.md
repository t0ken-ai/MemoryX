# MemoryX 服务器部署指南

## 服务器清单

- **31.65 (Production)** - 生产环境
- **31.66 (Test)** - 测试环境

## 准备工作

### 1. 创建用户和目录

```bash
# 创建用户
sudo useradd -r -s /bin/false memoryx

# 创建目录
sudo mkdir -p /data/memoryx/{api,static,backups,deploy/scripts}
sudo mkdir -p /var/log/memoryx
sudo chown -R memoryx:memoryx /data/memoryx /var/log/memoryx

# 克隆代码
sudo -u memoryx git clone https://github.com/t0ken-ai/MemoryX.git /data/memoryx/repo
```

### 2. 安装依赖

```bash
# Python 依赖
cd /data/memoryx/repo/api
pip install -r requirements.txt

# 复制部署脚本
sudo cp /data/memoryx/repo/deploy/scripts/*.sh /data/memoryx/deploy/scripts/
sudo cp /data/memoryx/repo/deploy/scripts/*.py /data/memoryx/deploy/scripts/
sudo chmod +x /data/memoryx/deploy/scripts/*.sh
```

### 3. 配置 Nginx

```bash
# 复制配置文件
sudo cp /data/memoryx/repo/deploy/nginx/memoryx.conf /etc/nginx/sites-available/memoryx
sudo ln -s /etc/nginx/sites-available/memoryx /etc/nginx/sites-enabled/

# 检查配置
sudo nginx -t

# 重载
sudo systemctl reload nginx
```

### 4. 配置 Systemd 服务

```bash
# 复制服务文件
sudo cp /data/memoryx/repo/deploy/systemd/*.service /etc/systemd/system/

# 设置环境变量
sudo vim /etc/memoryx/api.env
# 添加:
# DATABASE_URL=postgresql://memoryx:password@localhost:5432/memoryx
# SECRET_KEY=your-secret-key
# REDIS_URL=redis://localhost:6379/0
# OLLAMA_HOST=http://192.168.31.65:11434

# 更新 webhook token
sudo vim /etc/systemd/system/memoryx-webhook.service
# 修改 DEPLOY_TOKEN=your-actual-token

# 重载并启用
sudo systemctl daemon-reload
sudo systemctl enable memoryx-api memoryx-webhook
sudo systemctl start memoryx-api memoryx-webhook
```

### 5. 配置防火墙

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许内部 API 端口（仅本地访问）
sudo ufw allow from 127.0.0.1 to any port 8000
sudo ufw allow from 127.0.0.1 to any port 9000
```

## 检查服务状态

```bash
# 检查所有服务
sudo systemctl status memoryx-api
sudo systemctl status memoryx-webhook
sudo systemctl status nginx

# 查看日志
sudo journalctl -u memoryx-api -f
sudo tail -f /var/log/memoryx/webhook.log
```

## 手动部署

```bash
# 切换到 memoryx 用户
sudo -u memoryx -i

# 执行部署脚本
/data/memoryx/deploy/scripts/deploy.sh release  # 生产环境
/data/memoryx/deploy/scripts/deploy.sh alpha    # 测试环境
```

## 更新配置

修改配置文件后：

```bash
sudo systemctl daemon-reload
sudo systemctl restart memoryx-api memoryx-webhook
```
