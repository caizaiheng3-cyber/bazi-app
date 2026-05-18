"""认证 API"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.core.auth import verify_password, create_token, verify_token
from app.models.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """密码验证，返回 JWT token"""
    if not verify_password(request.password):
        raise HTTPException(status_code=401, detail="密码错误，请重试")
    token = create_token()
    return LoginResponse(token=token)


@router.get("/verify")
def verify(authorization: Optional[str] = Header(None)):
    """验证 token 是否有效"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录")
    token = authorization.split(" ", 1)[1]
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="登录已过期")
    return {"valid": True}
