#!/bin/bash
# 从线上服务器同步最新数据库到本地
# 用法: bash sync_db.sh

set -e

SERVER="root@120.26.184.204"
REMOTE_DB="/opt/bazi-app-old/web/backend/data/app.db"
LOCAL_DB="/Users/caizaiheng/vscode/八字项目/web/backend/data/app.db"

echo "📥 从线上同步数据库..."
scp "$SERVER:$REMOTE_DB" "$LOCAL_DB"
echo "✅ 同步完成: $LOCAL_DB"
echo "📊 数据库大小: $(ls -lh $LOCAL_DB | awk '{print $5}')"
