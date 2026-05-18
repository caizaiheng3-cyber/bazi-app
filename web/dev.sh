#!/bin/bash
# 我命由天挺好的 - 开发环境启动脚本

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动后端..."
cd "$PROJECT_ROOT/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID (http://localhost:8000)"

echo "🚀 启动前端..."
cd "$PROJECT_ROOT/frontend"
npx vite --port 5173 &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID (http://localhost:5173)"

echo ""
echo "✅ 开发环境已启动"
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:8000/docs"
echo "  密码: 123456"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
