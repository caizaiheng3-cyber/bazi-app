"""AI 问答 API（P6：检索结构化命理证据）"""

import json
import re
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

# 问题分类关键词映射
DOMAIN_KEYWORDS = {
    "事业": ["事业", "工作", "跳槽", "升职", "换工作", "辞职", "创业", "副业", "职场", "老板", "公司"],
    "财运": ["财运", "投资", "理财", "钱", "收入", "赚钱", "亏钱", "买房", "股票", "破财", "发财"],
    "感情": ["感情", "婚姻", "结婚", "离婚", "对象", "桃花", "复合", "分手", "恋爱", "老公", "老婆", "伴侣"],
    "健康": ["健康", "身体", "生病", "手术", "养生", "失眠", "体检"],
    "学业": ["学业", "考试", "读书", "考研", "考证", "留学", "学习"],
    "择时": ["什么时候", "几月", "何时", "时机", "吉日", "搬家", "开业", "动土"],
}


def _classify_question(question: str) -> str:
    """基于关键词对用户问题进行领域分类"""
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if keyword in question:
                return domain
    return "开放"


def _extract_domain_evidence(rules_data: dict, domain: str) -> str:
    """根据领域分类，精准抽取对应的结构化命理证据"""
    nl = "\n"
    evidence_parts = []

    # 1. 用神仲裁信息（所有领域都需要）
    yongshen = rules_data.get("用神忌神", {})
    ys_main = json.dumps(
        [{"五行": i.get("五行"), "理由": i.get("理由")} for i in yongshen.get("主用神", [])],
        ensure_ascii=False)
    js_list = json.dumps(
        [{"五行": i.get("五行"), "理由": i.get("理由")} for i in yongshen.get("忌神", [])[:3]],
        ensure_ascii=False)
    zonglun = yongshen.get("取用总论", "未知")
    evidence_parts.append(
        f"【用神仲裁】取用总论：{zonglun}{nl}主用神：{ys_main}{nl}忌神：{js_list}"
    )

    # 2. 领域画像（精准匹配）
    domain_profiles = rules_data.get("领域画像", {})
    domain_map = {"事业": "事业", "财运": "财运", "感情": "婚恋", "健康": "健康", "学业": "事业"}
    target_domain = domain_map.get(domain, "")

    if target_domain and target_domain in domain_profiles:
        profile = domain_profiles[target_domain]
        advice_json = json.dumps(profile.get("行动建议", []), ensure_ascii=False)
        evidence_parts.append(
            f"{nl}【{target_domain}领域画像】{nl}"
            f"吉凶定性：{profile.get('吉凶定性', '中')}{nl}"
            f"核心结论：{profile.get('核心结论', '')}{nl}"
            f"优势：{profile.get('优势', [])}{nl}"
            f"风险：{profile.get('风险', [])}{nl}"
            f"关键年份：{profile.get('关键年份', [])}{nl}"
            f"行动建议：{advice_json}"
        )
    elif domain == "开放":
        # 开放类问题给所有领域概要
        for d_name, d_profile in domain_profiles.items():
            conclusion = d_profile.get("核心结论", "")[:50]
            disposition = d_profile.get("吉凶定性", "中")
            evidence_parts.append(f"{nl}【{d_name}】{disposition} - {conclusion}")

    # 3. 相关事件推理（按领域过滤）
    events = rules_data.get("事件推理", [])
    relevant_events = []
    for year_data in events:
        for evt in year_data.get("事件候选", []):
            evt_domain = evt.get("领域", "")
            if domain == "开放" or evt_domain == target_domain or (domain == "感情" and evt_domain == "婚恋"):
                relevant_events.append({
                    "年": year_data.get("公历年"),
                    "事件": evt.get("事件"),
                    "吉凶": evt.get("吉凶"),
                    "强度": evt.get("强度"),
                    "证据": evt.get("证据", "")[:60],
                })
    # 只取强度最高的5条
    relevant_events.sort(key=lambda x: x.get("强度", 0), reverse=True)
    top_events = relevant_events[:5]
    if top_events:
        lines = [f"- {e['年']}年 {e['事件']}({e['吉凶']}·强度{e['强度']}) → {e['证据']}"
                 for e in top_events]
        evidence_parts.append(
            "\n【相关事件推理（按强度排序前5）】\n" + "\n".join(lines)
        )

    # 4. 流月事件（本年相关领域）
    monthly_events = rules_data.get("流月事件", [])
    monthly_relevant = []
    for month_data in monthly_events:
        for evt in month_data.get("事件候选", []):
            evt_domain = evt.get("领域", "")
            if domain == "开放" or evt_domain == target_domain or (domain == "感情" and evt_domain == "婚恋"):
                monthly_relevant.append({
                    "月": month_data.get("公历月"),
                    "事件": evt.get("事件"),
                    "吉凶": evt.get("吉凶"),
                    "强度": evt.get("强度"),
                })
    monthly_relevant.sort(key=lambda x: x.get("强度", 0), reverse=True)
    top_monthly = monthly_relevant[:3]
    if top_monthly:
        lines = [f"- {e['月']} {e['事件']}({e['吉凶']}·强度{e['强度']})"
                 for e in top_monthly]
        evidence_parts.append(
            "\n【本年流月相关事件（前3）】\n" + "\n".join(lines)
        )

    # 5. 当下定位
    dangxia = rules_data.get("当下定位", {})
    if dangxia:
        dy_ganzi = dangxia.get("当前大运", {}).get("干支", "未知")
        dy_ss = dangxia.get("当前大运", {}).get("天干十神", "")
        dy_stage = dangxia.get("大运阶段", "未知")
        ln_ganzi = dangxia.get("当前流年", {}).get("干支", "未知")
        ln_ss = dangxia.get("当前流年", {}).get("天干十神", "")
        evidence_parts.append(
            f"{nl}【当下定位】{nl}"
            f"当前大运：{dy_ganzi}({dy_ss}){nl}"
            f"大运阶段：{dy_stage}{nl}"
            f"当前流年：{ln_ganzi}({ln_ss})"
        )

    return nl.join(evidence_parts)


def _build_system_prompt(subject: Subject, report: Report, question: str = "") -> str:
    """构建问答的系统 prompt（P6：基于问题分类精准抽取结构化命理证据）"""
    # 加载事件咨询 prompt
    consult_prompt_path = PROMPTS_PATH / "event_consult.md"
    consult_prompt = consult_prompt_path.read_text(encoding="utf-8") if consult_prompt_path.exists() else ""

    # 问题分类
    domain = _classify_question(question)

    # 基础命盘信息
    paipan_summary = ""
    wangshuai_text = ""
    geju_text = ""
    if report.paipan_json:
        paipan_data = json.loads(report.paipan_json)
        four_pillars = paipan_data.get("四柱", {})
        day_master = paipan_data.get("日主", {})
        nz = four_pillars.get("年柱", {})
        yz = four_pillars.get("月柱", {})
        rz = four_pillars.get("日柱", {})
        sz = four_pillars.get("时柱", {})
        pillars_str = (
            f"{nz.get('天干', '')}{nz.get('地支', '')}"
            f"/{yz.get('天干', '')}{yz.get('地支', '')}"
            f"/{rz.get('天干', '')}{rz.get('地支', '')}"
            f"/{sz.get('天干', '')}{sz.get('地支', '')}"
        )
        dm_tg = day_master.get("天干", "")
        dm_wx = day_master.get("五行", "")
        dm_yy = day_master.get("阴阳", "")
        paipan_summary = f"四柱：{pillars_str}\n日主：{dm_tg}（{dm_wx}{dm_yy}）"

    # 精准抽取领域证据
    domain_evidence = ""
    if report.rules_json:
        rules_data = json.loads(report.rules_json)
        wangshuai = rules_data.get("旺衰", {})
        wangshuai_text = "旺衰：" + wangshuai.get("结论", "未知") + "·" + wangshuai.get("程度", "")
        geju = rules_data.get("格局", {})
        geju_text = "格局：" + geju.get("格局", "未知")
        domain_evidence = _extract_domain_evidence(rules_data, domain)

    parts = [
        consult_prompt,
        "",
        "---",
        "",
        "## 当前命主信息",
        "",
        "- 姓名：" + subject.name,
        "- 性别：" + subject.gender,
        "- 出生：" + subject.birth_date + " " + subject.birth_time,
        "- 城市：" + (subject.birth_city or ""),
        "- " + paipan_summary,
        "- " + wangshuai_text,
        "- " + geju_text,
        "",
        "## 问题领域分类：" + domain,
        "",
        "## 引擎结构化证据（基于问题精准抽取）",
        "",
        domain_evidence,
        "",
        "## 回复要求",
        "",
        '1. **必须有明确倾向**：不能泛泛而谈，要说"建议做/不建议做"',
        "2. **核心证据≤3条**：从上面的结构化证据中选最关键的",
        "3. **给时间窗口**：最佳时间/不宜时间",
        "4. **具体行动**：可执行的建议",
        "5. **风险提醒**：如有忌神/凶象，必须提示",
        "6. **口语化**：像懂命理的朋友在微信上回复",
    ]
    return "\n".join(parts)


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

    system_prompt = _build_system_prompt(subject, report, question=data.question)
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
