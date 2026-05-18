"""认证逻辑"""

from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError

from app.core.config import AUTH_PASSWORD, TOKEN_SECRET, TOKEN_EXPIRE_DAYS


def verify_password(password: str) -> bool:
    """验证密码"""
    return password == AUTH_PASSWORD


def create_token() -> str:
    """创建 JWT token"""
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"exp": expire, "sub": "user"}
    return jwt.encode(payload, TOKEN_SECRET, algorithm="HS256")


def verify_token(token: str) -> bool:
    """验证 token 是否有效"""
    try:
        jwt.decode(token, TOKEN_SECRET, algorithms=["HS256"])
        return True
    except JWTError:
        return False
