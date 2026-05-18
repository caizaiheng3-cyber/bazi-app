"""
报告生成服务（WEB层）

职责：接收用户请求 → 调用报告层 generator → 存数据库 → 返回结果
不包含任何 AI 调用逻辑，所有报告生成能力由 report/generator.py 提供。
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import PROJECT_ROOT
from app.models.db_models import Subject, Report

# 将项目根目录加入 path，使 report 包可被 import
sys.path.insert(0, str(PROJECT_ROOT))
from report.generator import generate_reports, compute_paipan, compute_rules


def run_paipan(subject: Subject) -> dict:
    """执行排盘计算"""
    birth_str = f"{subject.birth_date} {subject.birth_time}"
    birth_city = getattr(subject, "birth_city", "") or ""
    return compute_paipan(subject.name, birth_str, subject.gender,
                          birth_place=birth_city)


def run_rules(paipan_data: dict, gender: str = "男") -> dict:
    """执行规则分析"""
    return compute_rules(paipan_data, gender=gender)


def render_html_report(master_markdown: str, subject: Subject) -> str:
    """将命理师版 Markdown 报告转为精美排版的独立 HTML 页面"""
    import re

    lines = master_markdown.strip().split("\n")
    html_body_parts = []
    in_list = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            html_body_parts.append("")
            continue

        if stripped.startswith("# "):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            text = stripped[2:].strip()
            html_body_parts.append(f'<h1>{text}</h1>')
        elif stripped.startswith("## "):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            text = stripped[3:].strip()
            html_body_parts.append(f'<h2>{text}</h2>')
        elif stripped.startswith("### "):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            text = stripped[4:].strip()
            html_body_parts.append(f'<h3>{text}</h3>')
        elif stripped.startswith("#### "):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            text = stripped[5:].strip()
            html_body_parts.append(f'<h4>{text}</h4>')
        elif stripped.startswith("---"):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            html_body_parts.append("<hr>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            if not in_list:
                html_body_parts.append("<ul>")
                in_list = True
            text = stripped[2:].strip()
            text = _inline_md_to_html(text)
            html_body_parts.append(f"  <li>{text}</li>")
        elif stripped.startswith("> "):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            text = _inline_md_to_html(stripped[2:].strip())
            html_body_parts.append(f'<blockquote>{text}</blockquote>')
        elif stripped.startswith("|"):
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            html_body_parts.append(_render_table_row(stripped))
        else:
            if in_list:
                html_body_parts.append("</ul>")
                in_list = False
            text = _inline_md_to_html(stripped)
            html_body_parts.append(f"<p>{text}</p>")

    if in_list:
        html_body_parts.append("</ul>")

    body_html = "\n".join(html_body_parts)
    gen_time = datetime.now().strftime("%Y年%m月%d日")

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject.name} - 命理报告</title>
<style>
  :root {{
    --bg: #faf9f7;
    --card: #ffffff;
    --text: #1a1a1a;
    --text-secondary: #6b6b6b;
    --accent: #b8860b;
    --accent-light: #f5f0e6;
    --border: #e8e4de;
    --divider: #d4cfc7;
  }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.9;
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
  }}
  .page-container {{
    max-width: 720px;
    margin: 0 auto;
    padding: 60px 32px 80px;
  }}
  .header {{
    text-align: center;
    padding-bottom: 40px;
    margin-bottom: 40px;
    border-bottom: 2px solid var(--divider);
  }}
  .header h1 {{
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 4px;
    color: var(--accent);
    margin-bottom: 12px;
  }}
  .header .meta {{
    font-size: 14px;
    color: var(--text-secondary);
    letter-spacing: 1px;
  }}
  h1 {{ font-size: 24px; font-weight: 700; color: var(--accent); margin: 48px 0 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 2px; }}
  h2 {{ font-size: 20px; font-weight: 600; color: var(--text); margin: 36px 0 16px; padding-left: 12px; border-left: 3px solid var(--accent); }}
  h3 {{ font-size: 17px; font-weight: 600; color: var(--text); margin: 28px 0 12px; }}
  h4 {{ font-size: 15px; font-weight: 600; color: var(--text-secondary); margin: 20px 0 10px; }}
  p {{ margin: 12px 0; text-align: justify; text-indent: 2em; }}
  ul {{ margin: 12px 0; padding-left: 2em; list-style: none; }}
  ul li {{ position: relative; padding: 4px 0 4px 16px; text-align: justify; }}
  ul li::before {{ content: "·"; position: absolute; left: 0; color: var(--accent); font-weight: bold; }}
  blockquote {{ margin: 20px 0; padding: 16px 20px; background: var(--accent-light); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; color: var(--text); font-style: italic; text-indent: 0; }}
  blockquote p {{ text-indent: 0; margin: 4px 0; }}
  hr {{ border: none; height: 1px; background: var(--divider); margin: 40px 0; }}
  strong {{ color: var(--accent); font-weight: 600; }}
  em {{ font-style: italic; color: var(--text-secondary); }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }}
  th, td {{ border: 1px solid var(--border); padding: 8px 12px; text-align: left; }}
  th {{ background: var(--accent-light); font-weight: 600; }}
  .footer {{
    text-align: center;
    margin-top: 60px;
    padding-top: 32px;
    border-top: 2px solid var(--divider);
    font-size: 13px;
    color: var(--text-secondary);
    letter-spacing: 1px;
  }}
  @media print {{
    body {{ background: white; font-size: 14px; }}
    .page-container {{ padding: 20px; max-width: 100%; }}
    h1 {{ page-break-before: always; }}
    h1:first-of-type {{ page-break-before: avoid; }}
  }}
  @media (max-width: 640px) {{
    .page-container {{ padding: 32px 20px 60px; }}
    body {{ font-size: 15px; }}
    h1 {{ font-size: 20px; }}
    h2 {{ font-size: 18px; }}
  }}
</style>
</head>
<body>
<div class="page-container">
  <div class="header">
    <h1 style="font-size:28px;border:none;margin:0 0 12px;padding:0;">{subject.name} · 命理报告</h1>
    <div class="meta">{subject.gender} · {subject.birth_date} {subject.birth_time} · {subject.birth_city}</div>
    <div class="meta" style="margin-top:6px;">生成于 {gen_time}  ·  我命由天挺好的</div>
  </div>
  {body_html}
  <div class="footer">
    <p style="text-indent:0;">— 我命由天挺好的 · AI 命理工作台 —</p>
    <p style="text-indent:0;margin-top:4px;">本报告由 AI 辅助生成，仅供参考</p>
  </div>
</div>
</body>
</html>"""


def _inline_md_to_html(text: str) -> str:
    """将 Markdown 行内语法转为 HTML"""
    import re
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    return text


def _render_table_row(line: str) -> str:
    """将 Markdown 表格行转为 HTML tr"""
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if all(set(c) <= set("-| :") for c in cells):
        return ""  # 分隔行，跳过
    cell_html = "".join(f"<td>{_inline_md_to_html(c)}</td>" for c in cells)
    return f"<tr>{cell_html}</tr>"


async def generate_full_report(subject_id: int, db: Session):
    """完整报告生成流程（后台异步执行）"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return

    try:
        # 更新状态
        subject.report_status = "生成中"
        subject.report_progress = "排盘计算中"
        db.commit()

        # 构建出生时间字符串
        birth_str = f"{subject.birth_date} {subject.birth_time}"

        # 进度回调：更新数据库中的进度信息
        def update_progress(msg: str):
            subject.report_progress = msg
            db.commit()

        # 调用报告层的唯一接口
        birth_city = getattr(subject, "birth_city", "") or ""
        results = await generate_reports(
            name=subject.name,
            birth_str=birth_str,
            gender=subject.gender,
            birth_place=birth_city,
            skip_consumer=True,
            on_progress=update_progress,
        )

        # 保存报告
        report = db.query(Report).filter(Report.subject_id == subject_id).first()
        if not report:
            report = Report(subject_id=subject_id)
            db.add(report)

        report.paipan_json = json.dumps(results["paipan_json"], ensure_ascii=False)
        report.rules_json = json.dumps(results["rules_json"], ensure_ascii=False)
        report.master_report = results["master"]
        report.wechat_report = results["wechat"]
        report.html_report = render_html_report(results["master"], subject)
        report.generated_at = datetime.utcnow()

        subject.report_status = "已生成"
        subject.report_progress = ""
        subject.info_updated_after_report = False
        db.commit()

    except Exception as exc:
        subject.report_status = "生成失败"
        subject.report_progress = str(exc)[:200]
        db.commit()
        raise
