"""我命由天挺好的 - 后端主入口"""

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path

from app.core.database import init_db
from app.core.auth import verify_token
from app.api import auth, subjects, reports, chat, engine

app = FastAPI(title="我命由天挺好的", version="1.0.0")

# CORS（开发阶段允许所有来源）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(engine.router)


# 认证中间件（排除公开接口）
PUBLIC_PATHS = {"/api/auth/login", "/api/auth/verify", "/api/health", "/docs", "/openapi.json", "/api/engine/paipan"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path in PUBLIC_PATHS or path.startswith("/static") or path == "/":
        return await call_next(request)
    if path.startswith("/api/"):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "未登录"})
        token = auth_header.split(" ", 1)[1]
        if not verify_token(token):
            return JSONResponse(status_code=401, content={"detail": "登录已过期"})
    return await call_next(request)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "我命由天挺好的"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
