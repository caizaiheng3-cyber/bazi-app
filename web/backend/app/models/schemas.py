"""Pydantic 数据模型（请求/响应）"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ===== 认证 =====

class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_in_days: int = 30


# ===== 命主 =====

class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    gender: str = Field(pattern="^(男|女)$")
    birth_date: str = Field(description="出生日期，格式 YYYY-MM-DD")
    birth_time: str = Field(description="出生时间，格式 HH:MM")
    calendar_type: str = Field(default="公历", pattern="^(公历|农历)$")
    birth_city: str = Field(min_length=1, max_length=20)
    notes: Optional[str] = Field(default="", max_length=500)


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=20)
    gender: Optional[str] = Field(default=None, pattern="^(男|女)$")
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    calendar_type: Optional[str] = Field(default=None, pattern="^(公历|农历)$")
    birth_city: Optional[str] = Field(default=None, min_length=1, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=500)


class SubjectResponse(BaseModel):
    id: int
    name: str
    gender: str
    birth_date: str
    birth_time: str
    calendar_type: str
    birth_city: str
    notes: str
    report_status: str  # 未生成 / 生成中 / 已生成 / 生成失败
    created_at: str
    updated_at: str
    info_updated_after_report: bool = False

    model_config = {"from_attributes": True}


# ===== 报告 =====

class ReportResponse(BaseModel):
    subject_id: int
    status: str
    master_report: Optional[str] = None
    wechat_report: Optional[str] = None
    html_report: Optional[str] = None
    generated_at: Optional[str] = None
    progress: Optional[str] = None


class GenerateRequest(BaseModel):
    subject_id: int


# ===== 问答 =====

class ChatRequest(BaseModel):
    subject_id: int
    question: str = Field(min_length=1, max_length=2000)


class ChatMessage(BaseModel):
    id: int
    subject_id: int
    role: str  # user / assistant
    content: str
    created_at: str

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    messages: List[ChatMessage]
