#!/usr/bin/env python3
"""
MemoryX Webhook Receiver
接收 GitHub Actions 的部署通知，触发本地部署
"""

import os
import sys
import json
import hmac
import hashlib
import subprocess
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 配置
DEPLOY_TOKEN = os.environ.get('DEPLOY_TOKEN', 'your-secret-token')
DEPLOY_SCRIPT = '/data/memoryx/deploy/scripts/deploy.sh'
LOG_FILE = '/var/log/memoryx/webhook.log'
PORT = 9000

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class WebhookHandler(BaseHTTPRequestHandler):
    """处理 webhook 请求"""
    
    def log_message(self, format, *args):
        """重定向日志到文件"""
        logger.info(format % args)
    
    def do_POST(self):
        """处理 POST 请求"""
        try:
            # 解析 URL
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            # 验证 token
            token = query_params.get('token', [''])[0]
            deploy_type = query_params.get('tupe', ['alpha'])[0]
            
            if token != DEPLOY_TOKEN:
                logger.warning(f"Invalid token from {self.client_address}")
                self.send_error(403, "Invalid token")
                return
            
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            try:
                payload = json.loads(body)
                logger.info(f"Received webhook: {payload.get('event', 'unknown')} for {deploy_type}")
            except json.JSONDecodeError:
                payload = {}
                logger.info(f"Received webhook (no JSON body) for {deploy_type}")
            
            # 触发部署
            logger.info(f"Triggering deployment: {deploy_type}")
            
            # 异步执行部署脚本
            subprocess.Popen(
                [DEPLOY_SCRIPT, deploy_type],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd='/data/memoryx'
            )
            
            # 返回成功响应
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                'status': 'success',
                'message': f'Deployment triggered for {deploy_type}',
                'deploy_type': deploy_type,
                'sha': payload.get('sha', 'unknown')
            }
            self.wfile.write(json.dumps(response).encode())
            
            logger.info(f"Deployment triggered successfully for {deploy_type}")
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            self.send_error(500, str(e))
    
    def do_GET(self):
        """处理 GET 请求（健康检查）"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Webhook receiver is running\n')


def run_server():
    """启动 webhook 服务器"""
    server = HTTPServer(('127.0.0.1', PORT), WebhookHandler)
    logger.info(f"Starting webhook server on port {PORT}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        server.shutdown()


if __name__ == '__main__':
    run_server()
