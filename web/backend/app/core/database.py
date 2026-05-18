"""数据库初始化"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import DATABASE_URL, BACKEND_ROOT

# 确保 data 目录存在
(BACKEND_ROOT / "data").mkdir(parents=True, exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 依赖：获取数据库 session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """创建所有表（需先导入模型确保 Base.metadata 包含表定义）"""
    import app.models.db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
