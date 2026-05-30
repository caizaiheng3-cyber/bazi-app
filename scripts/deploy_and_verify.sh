#!/bin/bash
# 部署 + 校验脚本：同步所有关键文件到线上，并验证一致性+服务健康
# 用法: bash scripts/deploy_and_verify.sh
set -e

SERVER="root@120.26.184.204"
REMOTE_DIR="/opt/bazi-app"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 需要同步的关键文件列表
FILES=(
    "engine/paipan.py"
    "engine/rules.py"
    "engine/__init__.py"
    "report/generator.py"
    "report/__init__.py"
    "report/templates/master_report.md.j2"
    "report/templates/consumer_report.md.j2"
    "report/templates/wechat_report.md.j2"
    "report/templates/index_report.md.j2"
    "report/prompts/judge.md"
    "web/backend/app/services/report_service.py"
    "web/backend/app/api/engine.py"
    "web/backend/app/api/reports.py"
    "web/backend/app/api/chat.py"
    "web/backend/app/models/schemas.py"
    "web/backend/main.py"
)

echo "🚀 === 八字项目部署脚本 ==="
echo ""

# Step 1: 同步所有文件
echo "📦 Step 1: 同步文件到服务器..."
for f in "${FILES[@]}"; do
    if [ -f "$LOCAL_DIR/$f" ]; then
        scp -q "$LOCAL_DIR/$f" "$SERVER:$REMOTE_DIR/$f"
        echo "  ✅ $f"
    else
        echo "  ⚠️  本地缺失: $f (跳过)"
    fi
done
echo ""

# Step 2: MD5 校验
echo "🔍 Step 2: MD5 校验本地 vs 线上..."
MISMATCH=0
for f in "${FILES[@]}"; do
    if [ ! -f "$LOCAL_DIR/$f" ]; then
        continue
    fi
    LOCAL_MD5=$(md5 -q "$LOCAL_DIR/$f" 2>/dev/null || md5sum "$LOCAL_DIR/$f" | cut -d' ' -f1)
    REMOTE_MD5=$(ssh "$SERVER" "md5sum $REMOTE_DIR/$f 2>/dev/null | cut -d' ' -f1")
    if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
        echo "  ✅ $f"
    else
        echo "  ❌ $f 不一致! 本地=$LOCAL_MD5 线上=$REMOTE_MD5"
        MISMATCH=$((MISMATCH + 1))
    fi
done

if [ $MISMATCH -gt 0 ]; then
    echo ""
    echo "❌ 有 $MISMATCH 个文件不一致，部署失败！"
    exit 1
fi
echo ""

# Step 3: 重启服务
echo "🔄 Step 3: 重启后端服务..."
ssh "$SERVER" "fuser -k 8000/tcp 2>/dev/null; sleep 2; systemctl restart bazi-backend"
sleep 4

# Step 4: 检查服务状态
echo "🏥 Step 4: 检查服务状态..."
SERVICE_STATUS=$(ssh "$SERVER" "systemctl is-active bazi-backend")
if [ "$SERVICE_STATUS" = "active" ]; then
    echo "  ✅ bazi-backend 服务运行正常"
else
    echo "  ❌ 服务状态: $SERVICE_STATUS"
    echo "  查看日志: ssh $SERVER journalctl -u bazi-backend -n 20"
    exit 1
fi
echo ""

# Step 5: 端到端排盘验证（Vincy）
echo "🧪 Step 5: 端到端排盘验证..."
VERIFY_RESULT=$(ssh "$SERVER" "cd $REMOTE_DIR/web/backend && PYTHONPATH=$REMOTE_DIR/web/backend python3 << 'PYEOF'
import sys
sys.path.insert(0, \"$REMOTE_DIR\")
from engine.paipan import paipan
from engine.rules import judge_wangshuai, judge_geju, judge_yongshen
r = paipan(1998, 8, 9, 13, 50, gender=\"\u5973\", birth_place=\"\u8d35\u5dde\u5b89\u987a\")
sz = r[\"\u56db\u67f1\"]
time_zhu = sz[\"\u65f6\u67f1\"][\"\u5929\u5e72\"] + sz[\"\u65f6\u67f1\"][\"\u5730\u652f\"]
ws = judge_wangshuai(r)
geju = judge_geju(r, ws)
ys = judge_yongshen(r, ws, geju)
print(f\"TIME={time_zhu}\")
print(f\"METHOD={ys[\"\u53d6\u7528\u6cd5\"]}\")
print(f\"FIRST_YS={ys[\"\u7528\u795e\"][0][\"\u5341\u795e\"] if ys[\"\u7528\u795e\"] else 'NONE'}\")
PYEOF")

echo "$VERIFY_RESULT"
TIME_ZHU=$(echo "$VERIFY_RESULT" | grep "TIME=" | cut -d= -f2)
METHOD=$(echo "$VERIFY_RESULT" | grep "METHOD=" | cut -d= -f2)

if [ "$TIME_ZHU" = "戊午" ]; then
    echo "  ✅ 时柱=戊午（真太阳时修正正确）"
else
    echo "  ❌ 时柱=$TIME_ZHU（期望戊午，真太阳时可能未生效）"
    exit 1
fi

if [ "$METHOD" = "扶抑为主" ]; then
    echo "  ✅ 取用法=扶抑为主（身弱格局冲突检测正确）"
else
    echo "  ⚠️  取用法=$METHOD（非扶抑为主，请确认是否预期）"
fi
echo ""

# Step 6: 前端同步（如果有 dist）
if [ -d "$LOCAL_DIR/web/frontend/dist" ]; then
    echo "🌐 Step 6: 同步前端..."
    rsync -az --delete "$LOCAL_DIR/web/frontend/dist/" "$SERVER:/opt/bazi-app-old/web/frontend/dist/"
    echo "  ✅ 前端 dist 已同步"
else
    echo "⏭️  Step 6: 跳过前端（本地无 dist 目录，需先 npm run build）"
fi
echo ""

echo "🎉 === 部署完成，全部校验通过 ==="
