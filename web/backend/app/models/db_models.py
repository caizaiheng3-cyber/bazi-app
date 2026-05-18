"""SQLAlchemy ORM 模型"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean

from app.core.database import Base


class Subject(Base):
    """命主"""
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(20), nullable=False)
    gender = Column(String(2), nullable=False)
    birth_date = Column(String(10), nullable=False)
    birth_time = Column(String(5), nullable=False)
    calendar_type = Column(String(4), nullable=False, default="公历")
    birth_city = Column(String(20), nullable=False)
    notes = Column(Text, default="")

    report_status = Column(String(10), default="未生成")
    report_progress = Column(String(50), default="")
    info_updated_after_report = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class Report(Base):
    """命理报告"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, nullable=False, index=True, unique=True)

    paipan_json = Column(Text, default="")
    rules_json = Column(Text, default="")

    master_report = Column(Text, default="")
    consumer_report = Column(Text, default="")
    wechat_report = Column(Text, default="")
    html_report = Column(Text, default="")

    generated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatMessage(Base):
    """问答消息"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, nullable=False, index=True)
    role = Column(String(10), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
