"""AI 问答 API"""

import json
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, PROMPTS_PATH
from app.core.database import get_db
from app.models.db_models import Subject, Report, ChatMessage
from app.models.schemas import ChatRequest, ChatMessage as ChatMessageSchema, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["问答"])

MAX_HISTORY_ROUNDS = 20


def _build_system_prompt(subject: Subject, report: Report) -> str:
    """构建问答的系统 prompt（排盘+规则+报告）"""
    judge_prompt_path = PROMPTS_PATH / "judge.md"
    base_prompt = judge_prompt_path.read_text(encoding="utf-8") if judge_prompt_path.exists() else ""

    paipan_summary = ""
    if report.paipan_json:
        paipan_data = json.loads(report.paipan_json)
        four_pillars = paipan_data.get("四柱", {})
        paipan_summary = (
            f"四柱: {four_pillars.get('年柱', {}).get('天干', '')}{four_pillars.get('年柱', {}).get('地支', '')}"
            f"/{four_pillars.get('月柱', {}).get('天干', '')}{four_pillars.get('月柱', {}).get('地支', '')}"
            f"/{four_pillars.get('日柱', {}).get('天干', '')}{four_pillars.get('日柱', {}).get('地支', '')}"
            f"/{four_pillars.get('时柱', {}).get('天干', '')}{four_pillars.get('时柱', {}).get('地支', '')}"
        )

    rules_summary = ""
    if report.rules_json:
        rules_data = json.loads(report.rules_json)
        rules_summary = json.dumps(rules_data, ensure_ascii=False)[:3000]

    master_excerpt = (report.master_report or "")[:4000]

    return (
        f"{base_prompt}\n\n"
        f"## 当前命主信息\n\n"
        f"- 姓名: {subject.name}\n"
        f"- 性别: {subject.gender}\n"
        f"- 出生: {subject.birth_date} {subject.birth_time} ({subject.calendar_type})\n"
        f"- 城市: {subject.birth_city}\n"
        f"- 备注: {subject.notes or '无'}\n"
        f"- {paipan_summary}\n\n"
        f"## 规则分析摘要\n\n```json\n{rules_summary}\n```\n\n"
        f"## 命理师版报告摘要\n\n{master_excerpt}\n\n"
        f"## 你的任务\n\n"
        f"基于以上完整数据回答用户的命理问题。保持专业命理师风格，"
        f"术语后紧跟人话翻译，给出可操作的建议。"
    )


@router.get("/{subject_id}/messages", response_model=ChatResponse)
def get_messages(subject_id: int, db: Session = Depends(get_db)):
    """获取命主的问答历史"""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.subject_id == subject_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return ChatResponse(
        messages=[
            ChatMessageSchema(
                id=m.id,
                subject_id=m.subject_id,
                role=m.role,
                content=m.content,
                created_at=m.created_at.strftime("%Y-%m-%d %H:%M"),
            )
            for m in messages
        ]
    )


@router.post("/{subject_id}/send", response_model=ChatMessageSchema)
async def send_message(subject_id: int, data: ChatRequest, db: Session = Depends(get_db)):
    """发送问题，获取 AI 回答"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="命主不存在")

    report = db.query(Report).filter(Report.subject_id == subject_id).first()
    if not report or not report.master_report:
        raise HTTPException(status_code=400, detail="请先生成报告后再使用问答功能")

    # 保存用户消息
    user_msg = ChatMessage(subject_id=subject_id, role="user", content=data.question)
    db.add(user_msg)
    db.commit()

    # 构建对话历史
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.subject_id == subject_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(MAX_HISTORY_ROUNDS * 2)
        .all()
    )
    history.reverse()

    system_prompt = _build_system_prompt(subject, report)
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # 调用 DeepSeek
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPSEEK_API_KEY 未配置")

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "max_tokens": 4096,
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            ai_content = response.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI 回答失败: {str(exc)[:200]}")

    # 保存 AI 回答
    ai_msg = ChatMessage(subject_id=subject_id, role="assistant", content=ai_content)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return ChatMessageSchema(
        id=ai_msg.id,
        subject_id=ai_msg.subject_id,
        role=ai_msg.role,
        content=ai_msg.content,
        created_at=ai_msg.created_at.strftime("%Y-%m-%d %H:%M"),
    )


@router.delete("/{subject_id}/messages/{message_id}")
def delete_message(subject_id: int, message_id: int, db: Session = Depends(get_db)):
    """删除单条问答记录"""
    message = (
        db.query(ChatMessage)
        .filter(ChatMessage.id == message_id, ChatMessage.subject_id == subject_id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")

    # 如果删除的是用户消息，同时删除紧接着的 AI 回复
    if message.role == "user":
        next_msg = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.subject_id == subject_id,
                ChatMessage.id > message_id,
                ChatMessage.role == "assistant",
            )
            .order_by(ChatMessage.id.asc())
            .first()
        )
        if next_msg:
            db.delete(next_msg)

    db.delete(message)
    db.commit()
    return {"message": "已删除"}
