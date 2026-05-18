"""引擎 API — 排盘 + 规则分析（轻量级，不走报告生成流程）

供 app/ 前端直接调用，返回排盘 + 规则分析的结构化 JSON。
所有计算由 Python 引擎层完成，本模块仅做 HTTP 包装。
"""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import PROJECT_ROOT

# 将项目根目录加入 path，使 engine 包可被 import
sys.path.insert(0, str(PROJECT_ROOT))
from report.generator import compute_paipan, compute_rules

router = APIRouter(prefix="/api/engine", tags=["引擎"])


class PaipanRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50, description="命主姓名")
    gender: str = Field(pattern="^(男|女)$", description="性别")
    birth_date: str = Field(description="出生日期，格式 YYYY-MM-DD")
    birth_time: str = Field(description="出生时间，格式 HH:MM")
    birth_city: str = Field(default="", description="出生城市（用于真太阳时修正）")


@router.post("/paipan")
def run_paipan(data: PaipanRequest):
    """排盘 + 规则分析（一步到位）

    返回 {paipan: {...}, rules: {...}}，前端负责将其映射为 BaziChart 类型。
    """
    birth_str = f"{data.birth_date} {data.birth_time}"
    try:
        paipan_data = compute_paipan(data.name, birth_str, data.gender,
                                         birth_place=data.birth_city)
        rules_data = compute_rules(paipan_data, gender=data.gender)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"引擎计算失败: {str(exc)[:200]}")

    return {
        "paipan": paipan_data,
        "rules": rules_data,
    }
