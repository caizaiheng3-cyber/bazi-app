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


def _markdown_to_report_html(markdown: str) -> tuple[str, list]:
    """将 Markdown 正文转成报告 HTML，并生成目录。"""
    lines = (markdown or "").strip().split("\n")
    html_body_parts = []
    in_list = False
    table_lines = []
    toc_items = []
    heading_index = 0
    skipped_title = False
    in_section = False

    def close_list():
        nonlocal in_list
        if in_list:
            html_body_parts.append("</ul>")
            in_list = False

    def close_section():
        nonlocal in_section
        if in_section:
            html_body_parts.append("</section>")
            in_section = False

    def flush_table():
        if table_lines:
            html_body_parts.append(_render_markdown_table(table_lines))
            table_lines.clear()

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|"):
            close_list()
            table_lines.append(stripped)
            continue

        if not stripped:
            if table_lines:
                continue
            close_list()
            html_body_parts.append("")
            continue

        flush_table()

        if stripped.startswith("# "):
            close_list()
            text = stripped[2:].strip()
            if not skipped_title:
                skipped_title = True
                continue
            heading_index += 1
            anchor = f"section-{heading_index}"
            toc_items.append((1, text, anchor))
            close_section()
            html_body_parts.append(f'<h1 id="{anchor}">{_inline_md_to_html(text)}</h1>')
        elif stripped.startswith("## "):
            close_list()
            text = stripped[3:].strip()
            heading_index += 1
            anchor = f"section-{heading_index}"
            toc_items.append((2, text, anchor))
            close_section()
            html_body_parts.append(
                f'<section class="visual-report-section {_section_theme_class(text)}">'
            )
            in_section = True
            html_body_parts.append(f'<h2 id="{anchor}">{_inline_md_to_html(text)}</h2>')
        elif stripped.startswith("### "):
            close_list()
            text = stripped[4:].strip()
            heading_index += 1
            anchor = f"section-{heading_index}"
            toc_items.append((3, text, anchor))
            html_body_parts.append(f'<h3 id="{anchor}">{_inline_md_to_html(text)}</h3>')
        elif stripped.startswith("#### "):
            close_list()
            text = stripped[5:].strip()
            heading_index += 1
            anchor = f"section-{heading_index}"
            html_body_parts.append(f'<h4 id="{anchor}">{_inline_md_to_html(text)}</h4>')
        elif stripped.startswith("---"):
            close_list()
            html_body_parts.append("<hr>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            if not in_list:
                html_body_parts.append('<ul class="report-list">')
                in_list = True
            text = stripped[2:].strip()
            text = _inline_md_to_html(text)
            html_body_parts.append(f"  <li>{text}</li>")
        elif stripped.startswith("> "):
            close_list()
            text = _inline_md_to_html(stripped[2:].strip())
            html_body_parts.append(f'<blockquote>{text}</blockquote>')
        else:
            close_list()
            text = _inline_md_to_html(stripped)
            html_body_parts.append(f"<p>{text}</p>")

    close_list()
    flush_table()
    close_section()

    body_html = "\n".join(html_body_parts)
    return body_html, toc_items


def render_html_report(report_markdown: str, subject: Subject,
                       evidence_markdown: str = "") -> str:
    """将精读决策版 Markdown 报告转为独立 HTML，命理师版作为专业依据。"""
    import html

    source_markdown = evidence_markdown or report_markdown or ""
    body_html, toc_items = _markdown_to_report_html(report_markdown or "")
    evidence_body_html, evidence_toc_items = ("", [])
    if evidence_markdown and evidence_markdown != report_markdown:
        evidence_body_html, evidence_toc_items = _markdown_to_report_html(evidence_markdown)

    gen_time = datetime.now().strftime("%Y年%m月%d日")
    escaped_name = html.escape(subject.name or "")
    escaped_gender = html.escape(subject.gender or "")
    escaped_birth_date = html.escape(str(subject.birth_date or ""))
    escaped_birth_time = html.escape(str(subject.birth_time or ""))
    escaped_birth_city = html.escape(subject.birth_city or "")
    pillars = _extract_pillars(source_markdown)
    elements = _extract_elements(source_markdown)
    verdict = _extract_first_match(
        source_markdown, r"\*\*结论：(.+?)\*\*", "待校验"
    )
    geju = _extract_first_match(
        source_markdown, r"\*\*格局：(.+?)\*\*", "格局待判"
    )
    toc_html = _render_toc(toc_items)
    evidence_toc_html = _render_toc(evidence_toc_items)
    pro_paipan_html = _render_professional_paipan(
        pillars, elements, verdict, geju, evidence_toc_items or toc_items
    )
    visual_story_html = _render_visual_story(
        source_markdown, evidence_toc_items or toc_items, pillars, elements, verdict, geju
    )
    decision_map_html = _render_paid_decision_overview(report_markdown or "")
    evidence_detail_html = ""
    if evidence_body_html:
        evidence_detail_html = f"""
  <details class="source-report">
    <summary>
      <span>完整推演依据</span>
      <strong>展开命理师版全文与原始表格</strong>
    </summary>
    <div class="reader-layout">
      <aside class="toc-rail">
        <div class="toc-title">依据目录</div>
        {evidence_toc_html}
      </aside>
      <main class="report-content">
        {evidence_body_html}
      </main>
    </div>
  </details>
"""
    css = _report_html_css()
    interaction_js = _report_html_interaction_js()

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escaped_name} - 命理报告</title>
<style>
{css}
</style>
</head>
<body>
<div class="report-shell">
  <section class="report-hero">
    <div class="hero-copy">
      <div class="report-kicker">付费决策报告</div>
      <h1>{escaped_name} · 精读决策报告</h1>
      <div class="hero-meta">
        <span>{escaped_gender}</span>
        <span>{escaped_birth_date} {escaped_birth_time}</span>
        <span>{escaped_birth_city}</span>
        <span>{gen_time}</span>
      </div>
      <div class="hero-verdict">
        <div>
          <span class="label">旺衰判定</span>
          <strong>{_inline_md_to_html(verdict)}</strong>
        </div>
        <div>
          <span class="label">格局核心</span>
          <strong>{_inline_md_to_html(geju)}</strong>
        </div>
      </div>
    </div>
    <div class="astrolabe" aria-hidden="true">
      <div class="ring outer"></div>
      <div class="ring middle"></div>
      <div class="ring inner"></div>
      <span class="axis top">年</span>
      <span class="axis right">月</span>
      <span class="axis bottom">日</span>
      <span class="axis left">时</span>
      <span class="center-mark">命</span>
    </div>
  </section>

  {visual_story_html}
  {decision_map_html}

  <section class="decision-reader">
    <div class="visual-story-head">
      <div>
        <div class="report-kicker">精读决策版</div>
        <h2>完整付费决策报告</h2>
      </div>
      <p>主报告直接面向决策：我是谁、卡在哪里、怎么走、什么能做、什么不能做。</p>
    </div>
    <div class="reader-layout">
      <aside class="toc-rail">
        <div class="toc-title">报告目录</div>
        {toc_html}
      </aside>
      <main class="report-content">
        {body_html}
      </main>
    </div>
  </section>

  <details class="evidence-drawer">
    <summary>
      <span>专业排盘证据</span>
      <strong>展开四柱细盘、藏干、纳音与断事索引</strong>
    </summary>
    {pro_paipan_html}
  </details>
  {evidence_detail_html}

  <div class="footer">
    <p>我命由天挺好的 · AI 命理工作台</p>
    <p>本报告由 AI 辅助生成，仅供参考</p>
  </div>
</div>
<script>
{interaction_js}
</script>
</body>
</html>"""


def _inline_md_to_html(text: str) -> str:
    """将 Markdown 行内语法转为 HTML"""
    import re
    import html

    text = html.escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    return text


def _markdown_table_cells(line: str) -> list:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _is_separator_row(cells: list) -> bool:
    if not cells:
        return False
    return all(c and set(c) <= set("-: ") for c in cells)


def _render_markdown_table(lines: list) -> str:
    """将 Markdown 表格块转为完整 HTML table。"""
    rows = [_markdown_table_cells(line) for line in lines]
    rows = [row for row in rows if row]
    if not rows:
        return ""

    has_header = len(rows) > 1 and _is_separator_row(rows[1])
    header = rows[0] if has_header else []
    body_rows = rows[2:] if has_header else rows

    parts = ['<div class="table-scroll"><table class="data-table">']
    if header:
        head_cells = "".join(f"<th>{_inline_md_to_html(cell)}</th>" for cell in header)
        parts.append(f"<thead><tr>{head_cells}</tr></thead>")
    parts.append("<tbody>")
    for row in body_rows:
        cell_html = "".join(f"<td>{_inline_md_to_html(cell)}</td>" for cell in row)
        parts.append(f"<tr>{cell_html}</tr>")
    parts.append("</tbody></table></div>")
    return "".join(parts)


def _plain_cell(text: str) -> str:
    import re

    return re.sub(r"\(.+?\)", "", text).strip()


def _extract_cell_element(text: str) -> str:
    import re

    match = re.search(r"\((木|火|土|金|水)(?:·[阴阳])?\)", text)
    return match.group(1) if match else ""


def _extract_hidden_stems(text: str) -> list:
    import re

    hidden = []
    stem_element = {
        "甲": "木", "乙": "木",
        "丙": "火", "丁": "火",
        "戊": "土", "己": "土",
        "庚": "金", "辛": "金",
        "壬": "水", "癸": "水",
    }
    for part in re.split(r"\s*/\s*", text or ""):
        part = part.strip()
        if not part:
            continue
        match = re.match(r"([甲乙丙丁戊己庚辛壬癸])\((.+?)(?:·(本气|中气|余气))?\)", part)
        if match:
            gan, shishen, qi = match.groups()
            hidden.append({
                "gan": gan,
                "element": stem_element.get(gan, ""),
                "shishen": shishen,
                "qi": qi or "",
            })
            continue
        hidden.append({
            "gan": _plain_cell(part)[:1],
            "element": "",
            "shishen": _plain_cell(part)[1:] or part,
            "qi": "",
        })
    return hidden


def _element_class(element: str) -> str:
    return {
        "木": "elem-wood",
        "火": "elem-fire",
        "土": "elem-earth",
        "金": "elem-metal",
        "水": "elem-water",
    }.get(element, "elem-neutral")


def _section_theme_class(text: str) -> str:
    if "基础" in text:
        return "section-base"
    if "核心" in text or "命局" in text or "判决" in text:
        return "section-core"
    if "干支" in text or "合冲" in text or "领域" in text:
        return "section-relation"
    if "大运" in text or "流年" in text or "时间" in text or "月度" in text:
        return "section-time"
    if "必须做" in text or "不做" in text:
        return "section-action"
    return "section-default"


def _strip_md_to_text(text: str) -> str:
    import re

    text = re.sub(r"`(.+?)`", r"\1", text or "")
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def _safe_float(value: str, fallback: float = 0) -> float:
    import re

    match = re.search(r"-?\d+(?:\.\d+)?", str(value or ""))
    return float(match.group(0)) if match else fallback


def _short_text(text: str, limit: int = 42) -> str:
    text = _strip_md_to_text(text)
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def _tone_class(text: str) -> str:
    text = text or ""
    if "🔴" in text or "凶" in text or "谨慎" in text or "风险" in text or "忌神" in text:
        return "tone-bad"
    if "🟡" in text or "参半" in text or "中性" in text or "注意" in text:
        return "tone-mid"
    if "🟢" in text or "吉" in text or "有利" in text or "用神" in text:
        return "tone-good"
    return "tone-neutral"


def _extract_markdown_tables(markdown: str) -> list:
    tables = []
    table_lines = []

    def flush():
        if not table_lines:
            return
        rows = [_markdown_table_cells(line) for line in table_lines]
        rows = [row for row in rows if row]
        if rows:
            has_header = len(rows) > 1 and _is_separator_row(rows[1])
            tables.append({
                "header": rows[0] if has_header else [],
                "rows": rows[2:] if has_header else rows,
            })
        table_lines.clear()

    for line in markdown.splitlines():
        stripped = line.strip()
        if stripped.startswith("|"):
            table_lines.append(stripped)
        elif not stripped and table_lines:
            continue
        else:
            flush()
    flush()
    return tables


def _find_table(markdown: str, required_headers: tuple) -> dict:
    for table in _extract_markdown_tables(markdown):
        header_text = " ".join(table.get("header", []))
        if all(item in header_text for item in required_headers):
            return table
    return {"header": [], "rows": []}


def _rows_to_dict(table: dict) -> dict:
    result = {}
    for row in table.get("rows", []):
        if len(row) >= 2:
            result[_strip_md_to_text(row[0])] = _strip_md_to_text(row[1])
    return result


def _extract_wangshuai_visual_data(markdown: str) -> dict:
    import re

    table = _find_table(markdown, ("步骤", "得分", "判定"))
    steps = []
    for row in table.get("rows", []):
        if len(row) >= 3:
            steps.append({
                "name": _strip_md_to_text(row[0]),
                "score": _strip_md_to_text(row[1]),
                "detail": _strip_md_to_text(row[2]),
            })
    support = _safe_float(_extract_first_match(markdown, r"日主方合计\*\*：(.+?)分", "0"))
    drain = _safe_float(_extract_first_match(markdown, r"\*\*克泄耗方\*\*：(.+?)分", "0"))
    ratio = _safe_float(_extract_first_match(markdown, r"ratio=(\d+(?:\.\d+)?)", "0"))
    conclusion = _extract_first_match(markdown, r"\*\*综合结论\*\*：(.+?)(?:\n|$)", "")
    if not conclusion:
        conclusion = re.sub(r"\s+", " ", _extract_first_match(markdown, r"\*\*结论：(.+?)\*\*", ""))
    total = max(support + drain, 1)
    return {
        "steps": steps,
        "support": support,
        "drain": drain,
        "support_width": round(support / total * 100, 1),
        "drain_width": round(drain / total * 100, 1),
        "ratio": ratio,
        "conclusion": _strip_md_to_text(conclusion),
    }


def _extract_yongshen_items(markdown: str) -> dict:
    import re

    result = {"use": [], "avoid": []}
    patterns = [
        ("use", r"- 第\d+用神：\*\*(.+?)\*\*（(.+?)）→ (.+)"),
        ("avoid", r"- 第\d+忌神：\*\*(.+?)\*\*（(.+?)）→ (.+)"),
    ]
    for key, pattern in patterns:
        for match in re.finditer(pattern, markdown):
            result[key].append({
                "element": _strip_md_to_text(match.group(1)),
                "role": _strip_md_to_text(match.group(2)),
                "reason": _strip_md_to_text(match.group(3)),
            })
    return result


def _extract_ten_god_items(markdown: str) -> list:
    import re

    items = []
    for match in re.finditer(
        r"- \*\*(.+?)\*\*：透干=(.+?) / 藏干=(.+?) / 力量=(\d+)",
        markdown,
    ):
        power = int(match.group(4))
        items.append({
            "name": _strip_md_to_text(match.group(1)),
            "visible": _strip_md_to_text(match.group(2)),
            "hidden": _strip_md_to_text(match.group(3)),
            "power": power,
            "width": max(8, min(100, power * 4)),
        })
    return items


def _extract_relation_items(markdown: str) -> list:
    import re

    relation_names = ("三合", "半合", "六合", "六冲", "相刑", "相害", "暗合")
    items = []
    for name in relation_names:
        pattern = rf"\*\*{name}\*\*：\s*\n+((?:- .+(?:\n|$))+)"
        match = re.search(pattern, markdown)
        if not match:
            continue
        for line in match.group(1).splitlines():
            line = line.strip()
            if not line.startswith("- "):
                continue
            content = _strip_md_to_text(line[2:])
            parts = content.split("：", 1)
            items.append({
                "type": name,
                "source": parts[0] if parts else content,
                "relation": parts[1] if len(parts) > 1 else "",
            })
    return items


def _extract_luck_items(markdown: str) -> list:
    import re

    items = []
    for match in re.finditer(
        r"^###\s+([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]运)"
        r"（(.+?)岁 / (.+?)年）(.+)$",
        markdown,
        re.MULTILINE,
    ):
        title_tail = _strip_md_to_text(match.group(4))
        stage = title_tail.split("→")[-1].strip() if "→" in title_tail else title_tail
        items.append({
            "ganzi": match.group(1),
            "age": match.group(2),
            "years": match.group(3),
            "label": title_tail,
            "stage": stage,
            "tone": _tone_class(title_tail),
        })
    return items


def _extract_year_items(markdown: str) -> list:
    import re

    items = []
    for match in re.finditer(
        r"^####\s+(\d{4})年\s+(.+?)（(.+?)）·\s+虚岁(\d+)\s+·\s+(.+?)\s+([🟢🟡🔴])",
        markdown,
        re.MULTILINE,
    ):
        label = f"{match.group(6)} {match.group(3)}"
        items.append({
            "year": match.group(1),
            "ganzi": match.group(2),
            "role": match.group(3),
            "age": match.group(4),
            "luck": match.group(5),
            "label": label,
            "tone": _tone_class(label),
        })
    return items


def _extract_month_items(markdown: str) -> list:
    import re

    items = []
    for match in re.finditer(
        r"^####\s+(\d{1,2})月\s+(.+?)（(.+?)）([🟢🟡🔴])",
        markdown,
        re.MULTILINE,
    ):
        label = f"{match.group(4)} {match.group(3)}"
        items.append({
            "month": match.group(1),
            "ganzi": match.group(2),
            "role": match.group(3),
            "label": label,
            "tone": _tone_class(label),
        })
    return items


def _render_visual_story(
    markdown: str,
    toc_items: list,
    pillars: list,
    elements: list,
    verdict: str,
    geju: str,
) -> str:
    wangshuai = _extract_wangshuai_visual_data(markdown)
    yongshen = _extract_yongshen_items(markdown)
    ten_gods = _extract_ten_god_items(markdown)
    relations = _extract_relation_items(markdown)
    luck_items = _extract_luck_items(markdown)
    year_items = _extract_year_items(markdown)

    core_html = _render_core_visual(pillars, elements, verdict, geju)
    wangshuai_html = _render_wangshuai_visual(wangshuai)
    yongshen_html = _render_yongshen_visual(yongshen)
    ten_god_html = _render_ten_gods_visual(ten_gods)
    relation_html = _render_relations_visual(relations)
    time_html = _render_time_visual(luck_items, year_items)

    return f"""
  <section class="visual-story" aria-label="命理师版全篇可视化">
    <div class="visual-story-head">
      <div>
        <div class="report-kicker">决策版</div>
        <h2>付费决策总览</h2>
      </div>
      <p>默认只看结论、证据和行动。专业排盘与完整推演保留在下方，供复核时展开。</p>
    </div>
    {core_html}
    {wangshuai_html}
    {yongshen_html}
    {ten_god_html}
    {relation_html}
    {time_html}
  </section>
"""


def _extract_decision_sections(markdown: str) -> list:
    sections = []
    current = None
    for line in (markdown or "").splitlines():
        stripped = line.strip()
        if stripped.startswith("## "):
            if current:
                sections.append(current)
            current = {"title": _strip_md_to_text(stripped[3:]), "lines": []}
        elif current is not None:
            current["lines"].append(line)
    if current:
        sections.append(current)
    return sections


def _section_summary(lines: list, limit: int = 72) -> str:
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "---", "|")):
            continue
        if stripped.startswith(("-", "*")):
            stripped = stripped[1:].strip()
        text = _strip_md_to_text(stripped)
        if text:
            return _short_text(text, limit)
    return "本节给出结论、证据和可执行动作。"


def _render_paid_decision_overview(markdown: str) -> str:
    sections = _extract_decision_sections(markdown)
    if not sections:
        return ""
    labels = ("核心", "必做", "不做", "时间", "领域", "月度", "依据", "附录")
    cards = []
    for idx, section in enumerate(sections[:8]):
        label = labels[idx] if idx < len(labels) else f"{idx + 1:02d}"
        title = section["title"]
        summary = _section_summary(section.get("lines", []))
        cards.append(
            '<article>'
            f'<span>{_inline_md_to_html(label)}</span>'
            f'<strong>{_inline_md_to_html(title)}</strong>'
            f'<p>{_inline_md_to_html(summary)}</p>'
            '</article>'
        )
    return f"""
  <section class="visual-module decision-map-module">
    <div class="module-title">
      <span>付费版导航</span>
      <h3>决策板块总览</h3>
    </div>
    <div class="decision-map-grid">{''.join(cards)}</div>
  </section>
"""


def _render_visual_nav(toc_items: list) -> str:
    parts = []
    for _, text, anchor in toc_items:
        if not text.startswith("Part"):
            continue
        parts.append(
            f'<a href="#{anchor}" class="visual-nav-card {_section_theme_class(text)}">'
            f'<span>{_inline_md_to_html(text.split("·")[0].strip())}</span>'
            f'<strong>{_inline_md_to_html(text.split("·")[-1].strip())}</strong>'
            '</a>'
        )
    if not parts:
        return ""
    return f'<div class="visual-nav">{("".join(parts))}</div>'


def _render_birth_visual(birth: dict) -> str:
    if not birth:
        return ""
    fields = ("公历", "农历", "出生地", "上一节气", "下一节气", "贴节气风险")
    rows = "".join(
        f'<div><span>{_inline_md_to_html(field)}</span>'
        f'<strong>{_inline_md_to_html(birth.get(field, "待补充"))}</strong></div>'
        for field in fields
    )
    return f"""
    <section class="visual-module birth-module">
      <div class="module-title">
        <span>基础校验</span>
        <h3>出生信息与节气风险</h3>
      </div>
      <div class="birth-grid">{rows}</div>
    </section>
"""


def _render_core_visual(pillars: list, elements: list, verdict: str, geju: str) -> str:
    day_pillar = pillars[2] if len(pillars) >= 3 else (pillars[0] if pillars else {})
    dominant = max(elements, key=lambda item: _safe_float(item.get("percent", ""))) if elements else {}
    weak = min(elements, key=lambda item: _safe_float(item.get("percent", ""))) if elements else {}
    return f"""
    <section class="visual-module core-module">
      <div class="module-title">
        <span>模块 01</span>
        <h3>命局总判断</h3>
      </div>
      <div class="core-decision-grid">
        <article>
          <span>结论</span>
          <strong>{_inline_md_to_html(verdict)}</strong>
          <p>先补承载力，再谈财官和输出。</p>
        </article>
        <article>
          <span>主线</span>
          <strong>{_inline_md_to_html(geju)}</strong>
          <p>以才华输出、专业表达、内容变现为主轴。</p>
        </article>
        <article>
          <span>证据</span>
          <strong class="{_element_class(day_pillar.get("gan_element", ""))}">{_inline_md_to_html(day_pillar.get("gan", "待判"))}</strong>
          <p>{_inline_md_to_html(day_pillar.get("gan_element", ""))}日主，{_inline_md_to_html(dominant.get("name", ""))}最高{_inline_md_to_html(dominant.get("percent", ""))}，{_inline_md_to_html(weak.get("name", ""))}最低{_inline_md_to_html(weak.get("percent", ""))}。</p>
        </article>
        <article>
          <span>行动</span>
          <strong>蓄力优先</strong>
          <p>短期少做冒险变动，把学习、证书、人脉变成下一步筹码。</p>
        </article>
      </div>
    </section>
"""


def _render_wangshuai_visual(data: dict) -> str:
    steps = "".join(
        '<article>'
        f'<span>{_inline_md_to_html(step["name"])}</span>'
        f'<strong>{_inline_md_to_html(step["score"])}</strong>'
        f'<p>{_inline_md_to_html(_short_text(step["detail"], 34))}</p>'
        '</article>'
        for step in data.get("steps", [])
    )
    return f"""
    <section class="visual-module wangshuai-module">
      <div class="module-title">
        <span>模块 02</span>
        <h3>旺衰证据</h3>
      </div>
      <div class="force-compare">
        <div>
          <span>日主方 {data.get("support", 0):.1f}</span>
          <i style="width:{data.get("support_width", 0)}%"></i>
        </div>
        <div class="force-drain">
          <span>克泄耗方 {data.get("drain", 0):.1f}</span>
          <i style="width:{data.get("drain_width", 0)}%"></i>
        </div>
      </div>
      <div class="ratio-callout">
        <span>关键证据</span>
        <strong>日主方 {data.get("support", 0):.1f} / 克泄耗方 {data.get("drain", 0):.1f}</strong>
        <p>ratio {data.get("ratio", 0):.3f}，判断为身弱微弱，建议以补承载力为先。</p>
      </div>
      <div class="wangshuai-steps">{steps}</div>
    </section>
"""


def _render_yongshen_visual(data: dict) -> str:
    use_items = data.get("use", [])
    avoid_items = data.get("avoid", [])
    conflicts = sorted(
        {item["element"] for item in use_items} & {item["element"] for item in avoid_items}
    )

    def cards(items, kind):
        return "".join(
            f'<article class="{kind} {_element_class(item["element"])}">'
            f'<span>{_inline_md_to_html(item["element"])}</span>'
            f'<strong>{_inline_md_to_html(item["role"])}</strong>'
            f'<p>{_inline_md_to_html(_short_text(item["reason"], 28))}</p>'
            '</article>'
            for item in items[:3]
        )

    conflict_html = ""
    if conflicts:
        conflict_html = (
            '<div class="conflict-callout">'
            '<span>策略冲突提示</span>'
            f'<strong>{_inline_md_to_html(" / ".join(conflicts))}</strong>'
            '<p>同一五行同时出现在用神与忌神时，需要按“格局、调候、扶抑”的场景条件解释，不能直接给用户一句绝对化建议。</p>'
            '</div>'
        )
    return f"""
    <section class="visual-module yongshen-module">
      <div class="module-title">
        <span>模块 03</span>
        <h3>用忌策略</h3>
      </div>
      {conflict_html}
      <div class="dual-board">
        <div>
          <h4>可借之力</h4>
          <div class="strategy-grid">{cards(use_items, "use-card")}</div>
        </div>
        <div>
          <h4>需控之力</h4>
          <div class="strategy-grid">{cards(avoid_items, "avoid-card")}</div>
        </div>
      </div>
    </section>
"""


def _render_ten_gods_visual(items: list) -> str:
    if not items:
        return ""
    max_power = max((item["power"] for item in items), default=1)
    rows = "".join(
        '<article>'
        f'<span>{_inline_md_to_html(item["name"])}</span>'
        '<div class="ten-god-bar">'
        f'<i style="width:{max(8, item["power"] / max_power * 100):.1f}%"></i>'
        '</div>'
        f'<strong>{item["power"]}</strong>'
        f'<p>透干：{_inline_md_to_html(item["visible"])} / 藏干：{_inline_md_to_html(item["hidden"])}</p>'
        '</article>'
        for item in items
    )
    return f"""
    <section class="visual-module ten-god-module">
      <div class="module-title">
        <span>模块 04</span>
        <h3>十神结构</h3>
      </div>
      <div class="ten-god-list">{rows}</div>
    </section>
"""


def _render_relations_visual(items: list) -> str:
    if not items:
        return ""
    cards = "".join(
        f'<article class="{_tone_class(item["type"] + item["relation"])}">'
        f'<span>{_inline_md_to_html(item["type"])}</span>'
        f'<strong>{_inline_md_to_html(item["relation"])}</strong>'
        f'<p>{_inline_md_to_html(item["source"])}</p>'
        '</article>'
        for item in items
    )
    return f"""
    <section class="visual-module relation-module">
      <div class="module-title">
        <span>模块 05</span>
        <h3>干支动力</h3>
      </div>
      <div class="relation-grid">{cards}</div>
    </section>
"""


def _render_shensha_visual(table: dict) -> str:
    rows = table.get("rows", [])
    if not rows:
        return ""
    cards = ""
    for row in rows:
        if len(row) < 5:
            continue
        name, rule, source, luck, effect = row[:5]
        cards += (
            f'<article class="{_tone_class(luck)}">'
            f'<span>{_inline_md_to_html(_strip_md_to_text(luck))}</span>'
            f'<strong>{_inline_md_to_html(_strip_md_to_text(name))}</strong>'
            f'<p>{_inline_md_to_html(_strip_md_to_text(effect))}</p>'
            f'<small>{_inline_md_to_html(_strip_md_to_text(source))} · {_inline_md_to_html(_strip_md_to_text(rule))}</small>'
            '</article>'
        )
    return f"""
    <section class="visual-module shensha-module">
      <div class="module-title">
        <span>神煞辅助</span>
        <h3>只做辅助判断，不抢主线</h3>
      </div>
      <div class="shensha-grid">{cards}</div>
    </section>
"""


def _render_luck_visual(items: list) -> str:
    if not items:
        return ""
    points = "".join(
        f'<article class="{item["tone"]}">'
        f'<span>{_inline_md_to_html(item["age"])}岁</span>'
        f'<strong>{_inline_md_to_html(item["ganzi"])}</strong>'
        f'<p>{_inline_md_to_html(item["years"])} · {_inline_md_to_html(item["stage"])}</p>'
        '</article>'
        for item in items
    )
    return f"""
    <section class="visual-module luck-module">
      <div class="module-title">
        <span>大运节奏</span>
        <h3>人生十年段时间轴</h3>
      </div>
      <div class="luck-timeline">{points}</div>
    </section>
"""


def _render_time_visual(luck_items: list, year_items: list) -> str:
    if not luck_items and not year_items:
        return ""
    current = None
    for item in luck_items:
        years = item.get("years", "")
        bounds = [int(part) for part in __import__("re").findall(r"\d{4}", years)]
        if len(bounds) >= 2 and bounds[0] <= datetime.now().year <= bounds[1]:
            current = item
            break
    current = current or (luck_items[0] if luck_items else {})
    luck_points = "".join(
        f'<article class="{item["tone"]}">'
        f'<span>{_inline_md_to_html(item["age"])}岁</span>'
        f'<strong>{_inline_md_to_html(item["ganzi"])}</strong>'
        f'<p>{_inline_md_to_html(item["years"])} · {_inline_md_to_html(_short_text(item["stage"], 12))}</p>'
        '</article>'
        for item in luck_items
    )
    year_cards = "".join(
        f'<article class="{item["tone"]}">'
        f'<span>{_inline_md_to_html(item["year"])}</span>'
        f'<strong>{_inline_md_to_html(item["ganzi"])}</strong>'
        f'<p>{_inline_md_to_html(item["role"])} · 虚岁{_inline_md_to_html(item["age"])}</p>'
        '</article>'
        for item in year_items[:6]
    )
    return f"""
    <section class="visual-module time-module">
      <div class="module-title">
        <span>模块 06</span>
        <h3>大运流年窗口</h3>
      </div>
      <div class="current-luck-card">
        <span>当前大运</span>
        <strong>{_inline_md_to_html(current.get("ganzi", "待判"))} · {_inline_md_to_html(current.get("stage", ""))}</strong>
        <p>{_inline_md_to_html(current.get("years", ""))}，当前重点是把机会转成可承接的能力。</p>
      </div>
      <div class="luck-timeline compact">{luck_points}</div>
      <div class="year-grid compact">{year_cards}</div>
    </section>
"""


def _render_year_visual(items: list) -> str:
    if not items:
        return ""
    cards = "".join(
        f'<article class="{item["tone"]}">'
        f'<span>{_inline_md_to_html(item["year"])}</span>'
        f'<strong>{_inline_md_to_html(item["ganzi"])}</strong>'
        f'<p>虚岁{_inline_md_to_html(item["age"])} · {_inline_md_to_html(item["role"])}</p>'
        f'<small>{_inline_md_to_html(item["luck"])}</small>'
        '</article>'
        for item in items
    )
    return f"""
    <section class="visual-module year-module">
      <div class="module-title">
        <span>关键流年</span>
        <h3>2026-2031 年风险与机会窗口</h3>
      </div>
      <div class="year-grid">{cards}</div>
    </section>
"""


def _render_month_visual(items: list) -> str:
    if not items:
        return ""
    cells = "".join(
        f'<article class="{item["tone"]}">'
        f'<span>{_inline_md_to_html(item["month"])}月</span>'
        f'<strong>{_inline_md_to_html(item["ganzi"])}</strong>'
        f'<p>{_inline_md_to_html(item["role"])}</p>'
        '</article>'
        for item in items
    )
    return f"""
    <section class="visual-module month-module">
      <div class="module-title">
        <span>流月热力</span>
        <h3>2026 年逐月节奏</h3>
      </div>
      <div class="month-heatmap">{cells}</div>
    </section>
"""


def _extract_pillars(markdown: str) -> list:
    pillars = []
    for line in markdown.splitlines():
        cells = _markdown_table_cells(line) if line.strip().startswith("|") else []
        if len(cells) >= 4 and cells[0] in ("年柱", "月柱", "日柱", "时柱"):
            pillars.append({
                "name": cells[0],
                "gan": _plain_cell(cells[1]),
                "gan_element": _extract_cell_element(cells[1]),
                "zhi": _plain_cell(cells[2]),
                "zhi_element": _extract_cell_element(cells[2]),
                "shishen": cells[3],
                "nayin": cells[4] if len(cells) > 4 else "",
                "hidden": _extract_hidden_stems(cells[5]) if len(cells) > 5 else [],
            })
    return pillars[:4]


def _extract_elements(markdown: str) -> list:
    elements = []
    for line in markdown.splitlines():
        cells = _markdown_table_cells(line) if line.strip().startswith("|") else []
        if len(cells) >= 3 and cells[0] in ("木", "火", "土", "金", "水"):
            try:
                percent = float(cells[2].replace("%", ""))
            except ValueError:
                percent = 0
            elements.append({
                "name": cells[0],
                "score": cells[1],
                "percent": cells[2],
                "width": max(4, min(100, percent)),
            })
    order = {"木": 0, "火": 1, "土": 2, "金": 3, "水": 4}
    elements.sort(key=lambda item: order.get(item["name"], 99))
    return elements[:5]


def _extract_first_match(text: str, pattern: str, fallback: str) -> str:
    import re

    match = re.search(pattern, text)
    return match.group(1).strip() if match else fallback


def _render_pillar_cards(pillars: list) -> str:
    if not pillars:
        return '<div class="empty-summary">暂无四柱数据</div>'
    parts = ['<div class="pillar-grid">']
    for pillar in pillars:
        parts.append(
            '<div class="pillar-card">'
            f'<span class="pillar-name">{_inline_md_to_html(pillar["name"])}</span>'
            f'<strong>{_inline_md_to_html(pillar["gan"] + pillar["zhi"])}</strong>'
            f'<span>{_inline_md_to_html(pillar["shishen"])}</span>'
            '</div>'
        )
    parts.append("</div>")
    return "".join(parts)


def _render_element_meters(elements: list) -> str:
    if not elements:
        return '<div class="empty-summary">暂无五行数据</div>'
    parts = ['<div class="element-stack">']
    for item in elements:
        parts.append(
            f'<div class="element-row element-{_inline_md_to_html(item["name"])}">'
            f'<span class="element-name">{_inline_md_to_html(item["name"])}</span>'
            '<div class="meter"><i style="width: '
            f'{item["width"]}%"></i></div>'
            f'<span class="element-value">{_inline_md_to_html(item["score"])} · {_inline_md_to_html(item["percent"])}</span>'
            '</div>'
        )
    parts.append("</div>")
    return "".join(parts)


def _render_hidden_stem_cell(hidden: list, compact: bool = False) -> str:
    if not hidden:
        return '<span class="muted-cell">无</span>'
    chips = []
    for item in hidden:
        chip_class = _element_class(item.get("element", ""))
        gan = _inline_md_to_html(item.get("gan", ""))
        shishen = _inline_md_to_html(item.get("shishen", ""))
        qi = _inline_md_to_html(item.get("qi", ""))
        if compact:
            label = f"{gan}<small>{qi}</small>" if qi else gan
        else:
            label = f"{gan}<small>{shishen}{'·' + qi if qi else ''}</small>"
        chips.append(f'<span class="hidden-chip {chip_class}">{label}</span>')
    return "".join(chips)


def _pick_toc_anchor(toc_items: list, keywords: tuple, fallback: str) -> str:
    for _, text, anchor in toc_items:
        if any(keyword in text for keyword in keywords):
            return anchor
    return fallback


def _render_professional_paipan(
    pillars: list, elements: list, verdict: str, geju: str, toc_items: list
) -> str:
    if not pillars:
        return ""

    day_pillar = pillars[2] if len(pillars) >= 3 else pillars[0]
    month_pillar = pillars[1] if len(pillars) >= 2 else pillars[0]
    year_pillar = pillars[0]
    hour_pillar = pillars[3] if len(pillars) >= 4 else pillars[-1]

    headers = "".join(
        f'<th><span>{_inline_md_to_html(pillar["name"])}</span></th>'
        for pillar in pillars
    )
    star_row = "".join(
        f'<td><span class="star-badge">{_inline_md_to_html(pillar["shishen"])}</span></td>'
        for pillar in pillars
    )
    gan_row = "".join(
        '<td>'
        f'<span class="big-glyph {_element_class(pillar.get("gan_element", ""))}">'
        f'{_inline_md_to_html(pillar["gan"])}</span>'
        f'<span class="glyph-meta">{_inline_md_to_html(pillar.get("gan_element", ""))}</span>'
        '</td>'
        for pillar in pillars
    )
    zhi_row = "".join(
        '<td>'
        f'<span class="big-glyph branch {_element_class(pillar.get("zhi_element", ""))}">'
        f'{_inline_md_to_html(pillar["zhi"])}</span>'
        f'<span class="glyph-meta">{_inline_md_to_html(pillar.get("zhi_element", ""))}</span>'
        '</td>'
        for pillar in pillars
    )
    hidden_row = "".join(
        f'<td><div class="hidden-stack">{_render_hidden_stem_cell(pillar.get("hidden", []))}</div></td>'
        for pillar in pillars
    )
    sub_star_row = "".join(
        '<td>'
        f'<div class="sub-star-list">{_inline_md_to_html(" / ".join(h.get("shishen", "") for h in pillar.get("hidden", [])) or "无")}</div>'
        '</td>'
        for pillar in pillars
    )
    nayin_row = "".join(
        f'<td><span class="nayin-pill">{_inline_md_to_html(pillar.get("nayin", ""))}</span></td>'
        for pillar in pillars
    )
    element_chips = "".join(
        f'<span class="element-chip {_element_class(item.get("name", ""))}">'
        f'{_inline_md_to_html(item.get("name", ""))} {_inline_md_to_html(item.get("percent", ""))}</span>'
        for item in elements
    )

    wangshuai_anchor = _pick_toc_anchor(toc_items, ("旺衰", "强弱"), "section-1")
    yongshen_anchor = _pick_toc_anchor(toc_items, ("用神", "忌神"), "section-2")
    dayun_anchor = _pick_toc_anchor(toc_items, ("大运", "流年"), "section-3")
    domain_anchor = _pick_toc_anchor(
        toc_items, ("事业", "财运", "婚恋", "健康", "领域"), "section-4"
    )

    return f"""
  <section class="pro-console" aria-label="专业排盘工作台">
    <div class="console-head">
      <div>
        <div class="report-kicker dark">专业排盘</div>
        <h2>四柱细盘工作台</h2>
      </div>
      <div class="console-tabs" role="tablist" aria-label="排盘视图">
        <button class="console-tab is-active" type="button" data-panel="base">基本排盘</button>
        <button class="console-tab" type="button" data-panel="detail">专业细盘</button>
        <button class="console-tab" type="button" data-panel="events">断事索引</button>
      </div>
    </div>

    <div class="console-panels">
      <div class="console-panel is-active" data-panel="base">
        <div class="paipan-grid">
          <div class="matrix-wrap">
            <table class="bazi-matrix">
              <thead>
                <tr><th>层级</th>{headers}</tr>
              </thead>
              <tbody>
                <tr><th>主星</th>{star_row}</tr>
                <tr class="glyph-row"><th>天干</th>{gan_row}</tr>
                <tr class="glyph-row"><th>地支</th>{zhi_row}</tr>
                <tr><th>藏干</th>{hidden_row}</tr>
                <tr><th>副星</th>{sub_star_row}</tr>
                <tr><th>纳音</th>{nayin_row}</tr>
              </tbody>
            </table>
          </div>
          <aside class="chart-side">
            <div class="day-master-card">
              <span>日主</span>
              <strong class="{_element_class(day_pillar.get("gan_element", ""))}">
                {_inline_md_to_html(day_pillar["gan"])}
              </strong>
              <p>{_inline_md_to_html(day_pillar.get("gan_element", ""))}日主 · 以月令、通根、生扶克泄综合判力</p>
            </div>
            <div class="decision-card">
              <span>旺衰</span>
              <strong>{_inline_md_to_html(verdict)}</strong>
            </div>
            <div class="decision-card">
              <span>格局</span>
              <strong>{_inline_md_to_html(geju)}</strong>
            </div>
            <div class="element-chip-row">{element_chips}</div>
          </aside>
        </div>
      </div>

      <div class="console-panel" data-panel="detail">
        <div class="method-grid">
          <article>
            <span>一看月令</span>
            <strong>{_inline_md_to_html(month_pillar["zhi"])}月令</strong>
            <p>月支决定季节底盘，是旺衰和格局判断的第一权重。</p>
          </article>
          <article>
            <span>二看日主</span>
            <strong>{_inline_md_to_html(day_pillar["gan"])}日元</strong>
            <p>日主承载力决定建议是“顺势发力”还是“先补能量”。</p>
          </article>
          <article>
            <span>三看透藏</span>
            <strong>{_inline_md_to_html(year_pillar["gan"] + month_pillar["gan"] + day_pillar["gan"] + hour_pillar["gan"])}</strong>
            <p>天干为显性资源，地支藏干为隐性资源，两者不可混说。</p>
          </article>
        </div>
        <div class="pillar-drill">
          {''.join(
              '<article>'
              f'<span>{_inline_md_to_html(pillar["name"])}</span>'
              f'<strong>{_inline_md_to_html(pillar["gan"] + pillar["zhi"])}</strong>'
              f'<div class="hidden-stack">{_render_hidden_stem_cell(pillar.get("hidden", []), compact=True)}</div>'
              f'<p>{_inline_md_to_html(pillar.get("nayin", ""))} · {_inline_md_to_html(pillar.get("shishen", ""))}</p>'
              '</article>'
              for pillar in pillars
          )}
        </div>
      </div>

      <div class="console-panel" data-panel="events">
        <div class="event-shortcuts">
          <a href="#{wangshuai_anchor}">
            <span>01</span>
            <strong>先看旺衰</strong>
            <p>判断命主是先补承载力，还是先释放优势。</p>
          </a>
          <a href="#{yongshen_anchor}">
            <span>02</span>
            <strong>再看用忌</strong>
            <p>把五行矛盾收敛为可执行的趋利避害策略。</p>
          </a>
          <a href="#{dayun_anchor}">
            <span>03</span>
            <strong>定位时运</strong>
            <p>用大运流年判断当下窗口，而不是泛泛而谈。</p>
          </a>
          <a href="#{domain_anchor}">
            <span>04</span>
            <strong>落到决策</strong>
            <p>婚恋、事业、财富、健康等领域给出行动建议。</p>
          </a>
        </div>
      </div>
    </div>
  </section>
"""


def _render_toc(toc_items: list) -> str:
    if not toc_items:
        return '<div class="toc-empty">暂无目录</div>'
    links = []
    for level, text, anchor in toc_items:
        if level > 3:
            continue
        links.append(
            f'<a class="toc-link depth-{level}" href="#{anchor}">'
            f'{_inline_md_to_html(text)}</a>'
        )
    return "".join(links)


def _report_html_css() -> str:
    return """
  :root {
    --page: #f6f4ef;
    --paper: #fffdfa;
    --ink: #161310;
    --muted: #756d62;
    --line: #ddd4c6;
    --gold: #b88a3b;
    --gold-soft: #efe0bd;
    --cinnabar: #9e2f29;
    --jade: #2f6f63;
    --indigo: #263f5d;
    --stone: #5a5148;
    --shadow: 0 18px 60px rgba(31, 24, 16, 0.12);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    background:
      linear-gradient(90deg, rgba(22,19,16,0.035) 1px, transparent 1px),
      linear-gradient(180deg, rgba(22,19,16,0.026) 1px, transparent 1px),
      var(--page);
    background-size: 34px 34px;
    color: var(--ink);
    font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif;
    line-height: 1.85;
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
  }
  .report-shell {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 28px 0 72px;
  }
  .report-hero {
    min-height: 430px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 34px;
    align-items: center;
    overflow: hidden;
    position: relative;
    padding: 54px;
    border: 1px solid rgba(184, 138, 59, 0.42);
    background:
      linear-gradient(135deg, rgba(22,19,16,0.98), rgba(42,35,28,0.96) 45%, rgba(25,31,37,0.98)),
      #181512;
    color: #fffaf0;
    box-shadow: var(--shadow);
  }
  .report-hero::before {
    content: "";
    position: absolute;
    inset: 18px;
    border: 1px solid rgba(239, 224, 189, 0.22);
    pointer-events: none;
  }
  .report-hero::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(90deg, transparent 0 82px, rgba(239,224,189,0.06) 82px 83px),
      repeating-linear-gradient(0deg, transparent 0 82px, rgba(239,224,189,0.045) 82px 83px);
    opacity: 0.7;
    pointer-events: none;
  }
  .hero-copy, .astrolabe { position: relative; z-index: 1; }
  .report-kicker {
    display: inline-block;
    margin-bottom: 18px;
    color: var(--gold-soft);
    font-size: 13px;
    letter-spacing: 0;
    border-bottom: 1px solid rgba(239,224,189,0.5);
    padding-bottom: 5px;
  }
  .report-hero h1 {
    font-size: 42px;
    line-height: 1.18;
    margin: 0 0 18px;
    font-weight: 700;
    color: #fff7e6;
  }
  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    color: rgba(255, 250, 240, 0.76);
    font-size: 14px;
  }
  .hero-meta span {
    padding-right: 16px;
    border-right: 1px solid rgba(239,224,189,0.22);
  }
  .hero-meta span:last-child { border-right: 0; }
  .hero-verdict {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 34px;
    max-width: 620px;
  }
  .hero-verdict > div {
    border: 1px solid rgba(239, 224, 189, 0.25);
    background: rgba(255, 253, 250, 0.075);
    padding: 18px;
    min-height: 100px;
  }
  .label {
    display: block;
    color: rgba(255,250,240,0.62);
    font-size: 12px;
    margin-bottom: 10px;
  }
  .hero-verdict strong {
    color: #f5d288;
    font-size: 19px;
    font-weight: 700;
  }
  .astrolabe {
    width: 268px;
    height: 268px;
    justify-self: end;
    border-radius: 50%;
    border: 1px solid rgba(239,224,189,0.46);
    background:
      radial-gradient(circle at center, rgba(184,138,59,0.22) 0 6%, transparent 6% 23%, rgba(239,224,189,0.13) 23% 24%, transparent 24% 47%, rgba(239,224,189,0.12) 47% 48%, transparent 48%),
      conic-gradient(from 0deg, rgba(184,138,59,0.22), rgba(47,111,99,0.18), rgba(38,63,93,0.2), rgba(158,47,41,0.18), rgba(184,138,59,0.22));
  }
  .ring { position: absolute; border-radius: 50%; border: 1px solid rgba(239,224,189,0.28); }
  .ring.outer { inset: 18px; }
  .ring.middle { inset: 56px; }
  .ring.inner { inset: 96px; }
  .axis, .center-mark {
    position: absolute;
    color: rgba(255,247,230,0.86);
    font-size: 14px;
  }
  .axis.top { top: 26px; left: 50%; transform: translateX(-50%); }
  .axis.right { right: 28px; top: 50%; transform: translateY(-50%); }
  .axis.bottom { bottom: 26px; left: 50%; transform: translateX(-50%); }
  .axis.left { left: 28px; top: 50%; transform: translateY(-50%); }
  .center-mark {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #f5d288;
    font-size: 32px;
    font-weight: 700;
  }
  .summary-band {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin: 22px 0;
  }
  .summary-block {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: 0 10px 32px rgba(31,24,16,0.08);
    padding: 22px;
  }
  .block-title {
    font-size: 14px;
    color: var(--muted);
    margin-bottom: 16px;
  }
  .pillar-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .pillar-card {
    border: 1px solid rgba(184,138,59,0.28);
    background: linear-gradient(180deg, #fffdfa, #f7f0e5);
    padding: 14px 10px;
    text-align: center;
    min-height: 118px;
  }
  .pillar-name, .pillar-card span:last-child {
    display: block;
    color: var(--muted);
    font-size: 12px;
  }
  .pillar-card strong {
    display: block;
    color: var(--cinnabar);
    font-size: 30px;
    line-height: 1.2;
    margin: 10px 0 8px;
  }
  .element-stack { display: grid; gap: 10px; }
  .element-row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 86px;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }
  .element-name { font-weight: 700; }
  .meter {
    height: 10px;
    background: #ebe5db;
    overflow: hidden;
  }
  .meter i {
    display: block;
    height: 100%;
    background: var(--stone);
  }
  .element-木 .meter i { background: var(--jade); }
  .element-火 .meter i { background: var(--cinnabar); }
  .element-土 .meter i { background: var(--gold); }
  .element-金 .meter i { background: #8a8f8b; }
  .element-水 .meter i { background: var(--indigo); }
  .element-value { color: var(--muted); text-align: right; }
  .pro-console {
    margin: 0 0 22px;
    background: #161310;
    color: #fffaf0;
    border: 1px solid rgba(184,138,59,0.5);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .console-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
    padding: 26px 28px 20px;
    border-bottom: 1px solid rgba(239,224,189,0.18);
    background:
      linear-gradient(90deg, rgba(184,138,59,0.16), transparent 42%),
      linear-gradient(180deg, rgba(255,253,250,0.06), transparent);
  }
  .report-kicker.dark {
    color: var(--gold-soft);
    margin-bottom: 8px;
  }
  .console-head h2 {
    font-size: 25px;
    line-height: 1.2;
    color: #fff7e6;
  }
  .console-tabs {
    display: inline-grid;
    grid-template-columns: repeat(3, minmax(88px, 1fr));
    border: 1px solid rgba(239,224,189,0.26);
    min-height: 42px;
  }
  .console-tab {
    appearance: none;
    border: 0;
    border-right: 1px solid rgba(239,224,189,0.2);
    background: transparent;
    color: rgba(255,250,240,0.66);
    padding: 9px 14px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .console-tab:last-child { border-right: 0; }
  .console-tab:hover,
  .console-tab.is-active {
    background: rgba(184,138,59,0.25);
    color: #fff7e6;
  }
  .console-panels {
    background:
      repeating-linear-gradient(90deg, transparent 0 78px, rgba(239,224,189,0.04) 78px 79px),
      #1b1713;
  }
  .console-panel {
    display: none;
    padding: 24px 28px 28px;
  }
  .console-panel.is-active { display: block; }
  .paipan-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 20px;
    align-items: stretch;
  }
  .matrix-wrap {
    overflow-x: auto;
    border: 1px solid rgba(239,224,189,0.22);
    background: rgba(255,253,250,0.04);
  }
  .bazi-matrix {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif;
  }
  .bazi-matrix th,
  .bazi-matrix td {
    border-right: 1px solid rgba(239,224,189,0.16);
    border-bottom: 1px solid rgba(239,224,189,0.16);
    padding: 12px 10px;
    text-align: center;
    vertical-align: middle;
  }
  .bazi-matrix thead th {
    color: var(--gold-soft);
    background: rgba(0,0,0,0.22);
    font-size: 13px;
    font-weight: 700;
  }
  .bazi-matrix tbody th {
    width: 72px;
    color: rgba(255,250,240,0.56);
    background: rgba(0,0,0,0.18);
    font-size: 12px;
    font-weight: 400;
  }
  .glyph-row td { background: rgba(255,253,250,0.035); }
  .big-glyph {
    display: block;
    width: 54px;
    height: 54px;
    line-height: 50px;
    margin: 0 auto 5px;
    border: 1px solid currentColor;
    font-size: 34px;
    font-weight: 700;
    background: rgba(255,253,250,0.05);
  }
  .big-glyph.branch {
    background: rgba(255,253,250,0.095);
  }
  .glyph-meta {
    display: block;
    color: rgba(255,250,240,0.48);
    font-size: 12px;
    min-height: 18px;
  }
  .star-badge,
  .nayin-pill {
    display: inline-block;
    min-width: 58px;
    padding: 4px 8px;
    border: 1px solid rgba(239,224,189,0.18);
    background: rgba(255,253,250,0.06);
    color: #fff7e6;
    font-size: 13px;
  }
  .hidden-stack {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }
  .hidden-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    min-height: 26px;
    padding: 3px 7px;
    border: 1px solid currentColor;
    background: rgba(255,253,250,0.045);
    font-weight: 700;
    line-height: 1.2;
  }
  .hidden-chip small {
    color: rgba(255,250,240,0.62);
    font-size: 10px;
    font-weight: 400;
  }
  .sub-star-list {
    color: rgba(255,250,240,0.72);
    font-size: 12px;
    line-height: 1.55;
  }
  .muted-cell { color: rgba(255,250,240,0.38); }
  .elem-wood { color: #76b58b; }
  .elem-fire { color: #e07161; }
  .elem-earth { color: #d4a94e; }
  .elem-metal { color: #c6cbc6; }
  .elem-water { color: #7ca6d8; }
  .elem-neutral { color: #ddd4c6; }
  .chart-side {
    display: grid;
    gap: 12px;
  }
  .day-master-card,
  .decision-card,
  .element-chip-row {
    border: 1px solid rgba(239,224,189,0.22);
    background: rgba(255,253,250,0.06);
    padding: 16px;
  }
  .day-master-card span,
  .decision-card span {
    display: block;
    color: rgba(255,250,240,0.55);
    font-size: 12px;
    margin-bottom: 8px;
  }
  .day-master-card strong {
    display: block;
    font-size: 64px;
    line-height: 1;
    margin-bottom: 10px;
  }
  .day-master-card p,
  .decision-card p {
    color: rgba(255,250,240,0.68);
    font-size: 13px;
    line-height: 1.6;
  }
  .decision-card strong {
    display: block;
    color: #f5d288;
    font-size: 18px;
    line-height: 1.45;
  }
  .element-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    align-content: start;
  }
  .element-chip {
    border: 1px solid currentColor;
    padding: 4px 7px;
    background: rgba(255,253,250,0.035);
    font-size: 12px;
  }
  .method-grid,
  .pillar-drill,
  .event-shortcuts {
    display: grid;
    gap: 14px;
  }
  .method-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-bottom: 16px;
  }
  .pillar-drill {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .method-grid article,
  .pillar-drill article,
  .event-shortcuts a {
    border: 1px solid rgba(239,224,189,0.2);
    background: rgba(255,253,250,0.055);
    padding: 16px;
    min-width: 0;
  }
  .method-grid span,
  .pillar-drill span,
  .event-shortcuts span {
    display: block;
    color: rgba(255,250,240,0.52);
    font-size: 12px;
    margin-bottom: 8px;
  }
  .method-grid strong,
  .pillar-drill strong,
  .event-shortcuts strong {
    display: block;
    color: #f5d288;
    font-size: 18px;
    line-height: 1.35;
    margin-bottom: 8px;
  }
  .method-grid p,
  .pillar-drill p,
  .event-shortcuts p {
    color: rgba(255,250,240,0.68);
    font-size: 13px;
    line-height: 1.6;
  }
  .event-shortcuts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .event-shortcuts a {
    display: block;
    color: inherit;
    text-decoration: none;
    min-height: 168px;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .event-shortcuts a:hover {
    background: rgba(184,138,59,0.16);
    border-color: rgba(245,210,136,0.45);
  }
  .visual-story {
    margin: 22px 0;
    display: grid;
    gap: 18px;
    min-width: 0;
  }
  .decision-reader {
    margin: 22px 0;
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: 0 10px 32px rgba(31,24,16,0.08);
    overflow: hidden;
  }
  .decision-reader .visual-story-head {
    border: 0;
    border-bottom: 1px solid var(--line);
    box-shadow: none;
  }
  .decision-reader .reader-layout {
    margin: 0;
    border: 0;
    box-shadow: none;
  }
  .visual-story *,
  .visual-report-section * {
    min-width: 0;
  }
  .visual-story-head,
  .visual-nav,
  .visual-module {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
  .visual-story-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 24px;
    align-items: end;
    padding: 30px;
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: 0 10px 32px rgba(31,24,16,0.08);
  }
  .visual-story-head p,
  .visual-nav-card,
  .birth-grid div,
  .core-decision-grid article,
  .wangshuai-steps article,
  .strategy-grid article,
  .ten-god-list article,
  .relation-grid article,
  .shensha-grid article,
  .luck-timeline article,
  .year-grid article,
  .month-heatmap article,
  .conflict-callout,
  .ratio-callout,
  .current-luck-card {
    overflow-wrap: anywhere;
  }
  .visual-story-head .report-kicker {
    color: var(--gold);
    margin-bottom: 8px;
  }
  .visual-story-head h2 {
    font-size: 30px;
    line-height: 1.25;
  }
  .visual-story-head p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.7;
  }
  .visual-nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .visual-nav-card {
    display: block;
    min-height: 118px;
    padding: 18px;
    color: var(--ink);
    text-decoration: none;
    background: var(--paper);
    border: 1px solid var(--line);
    transition: transform 0.16s ease, border-color 0.16s ease;
  }
  .visual-nav-card:hover {
    transform: translateY(-2px);
    border-color: var(--gold);
  }
  .visual-nav-card span {
    display: block;
    color: var(--gold);
    font-size: 12px;
    margin-bottom: 14px;
  }
  .visual-nav-card strong {
    display: block;
    font-size: 18px;
    line-height: 1.35;
  }
  .visual-module {
    background: var(--paper);
    border: 1px solid var(--line);
    padding: 26px;
    box-shadow: 0 10px 32px rgba(31,24,16,0.07);
  }
  .decision-map-module {
    margin: 22px 0;
  }
  .decision-map-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .decision-map-grid article {
    min-height: 188px;
    border: 1px solid rgba(221,212,198,0.95);
    background:
      linear-gradient(180deg, rgba(255,253,250,0.96), rgba(247,240,229,0.96));
    padding: 16px;
    overflow-wrap: anywhere;
  }
  .decision-map-grid span {
    display: inline-block;
    color: var(--gold);
    font-size: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(184,138,59,0.35);
    padding-bottom: 4px;
  }
  .decision-map-grid strong {
    display: block;
    font-size: 18px;
    line-height: 1.35;
    margin-bottom: 10px;
  }
  .decision-map-grid p {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.65;
  }
  .module-title {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line);
  }
  .module-title span {
    color: var(--gold);
    font-size: 13px;
  }
  .module-title h3 {
    font-size: 24px;
    line-height: 1.25;
  }
  .birth-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .birth-grid div,
  .core-decision-grid article,
  .wangshuai-steps article,
  .strategy-grid article,
  .ten-god-list article,
  .relation-grid article,
  .shensha-grid article,
  .luck-timeline article,
  .year-grid article,
  .month-heatmap article,
  .conflict-callout,
  .ratio-callout {
    border: 1px solid rgba(221,212,198,0.95);
    background: linear-gradient(180deg, #fffefa, #f8f1e7);
    padding: 14px;
    min-width: 0;
  }
  .birth-grid span,
  .core-decision-grid span,
  .wangshuai-steps span,
  .strategy-grid span,
  .ten-god-list span,
  .relation-grid span,
  .shensha-grid span,
  .luck-timeline span,
  .year-grid span,
  .month-heatmap span,
  .conflict-callout span,
  .ratio-callout span,
  .current-luck-card span {
    display: block;
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 7px;
  }
  .birth-grid strong,
  .core-decision-grid strong,
  .wangshuai-steps strong,
  .strategy-grid strong,
  .ten-god-list strong,
  .relation-grid strong,
  .shensha-grid strong,
  .luck-timeline strong,
  .year-grid strong,
  .month-heatmap strong,
  .conflict-callout strong,
  .ratio-callout strong,
  .current-luck-card strong {
    display: block;
    color: var(--ink);
    font-size: 18px;
    line-height: 1.35;
  }
  .birth-grid p,
  .core-decision-grid p,
  .wangshuai-steps p,
  .strategy-grid p,
  .ten-god-list p,
  .relation-grid p,
  .shensha-grid p,
  .luck-timeline p,
  .year-grid p,
  .month-heatmap p,
  .conflict-callout p,
  .ratio-callout p,
  .current-luck-card p {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.65;
    margin-top: 8px;
  }
  .core-decision-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .core-decision-grid article:first-child strong {
    font-size: 34px;
    line-height: 1.18;
  }
  .force-compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .force-compare div {
    background: #eee8df;
    min-height: 52px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
  }
  .force-compare span {
    position: relative;
    z-index: 1;
    display: block;
    padding: 14px;
    color: var(--ink);
    font-weight: 700;
  }
  .force-compare i {
    position: absolute;
    inset: 0 auto 0 0;
    background: rgba(47,111,99,0.28);
  }
  .force-compare .force-drain i {
    background: rgba(158,47,41,0.24);
  }
  .ratio-callout {
    margin-bottom: 12px;
    border-left: 5px solid var(--gold);
  }
  .wangshuai-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .dual-board {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .dual-board h4 {
    margin: 0 0 10px;
    font-size: 16px;
    color: var(--stone);
  }
  .strategy-grid {
    display: grid;
    gap: 10px;
  }
  .strategy-grid article {
    border-left: 5px solid var(--gold);
  }
  .strategy-grid .avoid-card {
    border-left-color: var(--cinnabar);
  }
  .conflict-callout {
    margin-bottom: 16px;
    border-left: 5px solid var(--cinnabar);
  }
  .ten-god-list {
    display: grid;
    gap: 10px;
  }
  .ten-god-list article {
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr) 52px minmax(0, 1.35fr);
    gap: 12px;
    align-items: center;
  }
  .ten-god-list article p {
    margin: 0;
  }
  .ten-god-bar {
    height: 12px;
    background: #ece5dc;
    overflow: hidden;
  }
  .ten-god-bar i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--gold), var(--cinnabar));
  }
  .relation-grid,
  .shensha-grid,
  .year-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .relation-grid article,
  .shensha-grid article,
  .year-grid article,
  .month-heatmap article {
    border-top: 4px solid var(--gold);
  }
  .tone-good { border-top-color: var(--jade) !important; }
  .tone-mid { border-top-color: var(--gold) !important; }
  .tone-bad { border-top-color: var(--cinnabar) !important; }
  .tone-neutral { border-top-color: var(--stone) !important; }
  .shensha-grid small,
  .year-grid small {
    display: block;
    margin-top: 9px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }
  .luck-timeline {
    display: grid;
    grid-template-columns: repeat(9, minmax(132px, 1fr));
    gap: 0;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .luck-timeline article {
    border-right: 0;
    min-height: 156px;
  }
  .luck-timeline article:last-child {
    border-right: 1px solid var(--line);
  }
  .month-heatmap {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
  }
  .visual-report-section {
    margin: 0 0 34px;
    padding: 0 0 30px;
    border-bottom: 1px solid var(--line);
  }
  .visual-report-section:last-child {
    border-bottom: 0;
  }
  .visual-report-section > h2 {
    margin-top: 10px;
  }
  .visual-report-section.section-core > h2 { border-left-color: var(--gold); }
  .visual-report-section.section-relation > h2 { border-left-color: var(--jade); }
  .visual-report-section.section-time > h2 { border-left-color: var(--indigo); }
  .visual-report-section.section-action > h2 { border-left-color: var(--crimson, #c0392b); }
  .evidence-drawer,
  .source-report {
    margin: 18px 0;
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: 0 10px 32px rgba(31,24,16,0.07);
  }
  .evidence-drawer summary,
  .source-report summary {
    list-style: none;
    cursor: pointer;
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 18px;
    align-items: center;
    padding: 20px 24px;
  }
  .evidence-drawer summary::-webkit-details-marker,
  .source-report summary::-webkit-details-marker {
    display: none;
  }
  .evidence-drawer summary::after,
  .source-report summary::after {
    content: "+";
    justify-self: end;
    color: var(--gold);
    font-size: 24px;
    line-height: 1;
  }
  .evidence-drawer[open] summary::after,
  .source-report[open] summary::after {
    content: "-";
  }
  .evidence-drawer summary span,
  .source-report summary span {
    color: var(--gold);
    font-size: 13px;
  }
  .evidence-drawer summary strong,
  .source-report summary strong {
    color: var(--ink);
    font-size: 18px;
    line-height: 1.35;
  }
  .evidence-drawer .pro-console {
    margin: 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    box-shadow: none;
  }
  .source-report .reader-layout {
    padding: 0 22px 24px;
  }
  .reader-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }
  .toc-rail {
    position: sticky;
    top: 16px;
    max-height: calc(100vh - 32px);
    overflow: auto;
    background: rgba(255,253,250,0.86);
    border: 1px solid var(--line);
    padding: 16px 14px;
  }
  .toc-title {
    color: var(--gold);
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .toc-link {
    display: block;
    color: var(--muted);
    text-decoration: none;
    font-size: 13px;
    line-height: 1.45;
    padding: 7px 0;
    border-top: 1px solid rgba(221,212,198,0.65);
  }
  .toc-link:hover { color: var(--cinnabar); }
  .toc-link.depth-3 { padding-left: 12px; font-size: 12px; }
  .report-content {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    padding: 48px 58px 64px;
    min-width: 0;
  }
  .report-content h1,
  .report-content h2,
  .report-content h3,
  .report-content h4 {
    font-weight: 700;
    line-height: 1.35;
    scroll-margin-top: 24px;
  }
  .report-content h1 {
    font-size: 30px;
    color: var(--cinnabar);
    margin: 52px 0 24px;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--gold);
  }
  .report-content h2 {
    margin: 52px 0 18px;
    font-size: 25px;
    color: var(--ink);
    padding-left: 16px;
    border-left: 5px solid var(--cinnabar);
  }
  .report-content h3 {
    margin: 34px 0 14px;
    font-size: 20px;
    color: var(--indigo);
  }
  .report-content h4 {
    margin: 24px 0 10px;
    font-size: 16px;
    color: var(--muted);
  }
  .report-content p {
    margin: 13px 0;
    text-align: justify;
    text-indent: 2em;
  }
  .report-content strong { color: var(--cinnabar); font-weight: 700; }
  .report-content em { color: var(--muted); }
  .report-content code {
    font-family: "SFMono-Regular", Consolas, monospace;
    background: #f1ece3;
    color: var(--indigo);
    padding: 2px 5px;
    border-radius: 4px;
  }
  .report-list {
    margin: 14px 0 18px;
    padding-left: 0;
    list-style: none;
  }
  .report-list li {
    position: relative;
    padding: 8px 0 8px 22px;
    border-bottom: 1px solid rgba(221,212,198,0.55);
  }
  .report-list li::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 18px;
    width: 7px;
    height: 7px;
    background: var(--gold);
    transform: rotate(45deg);
  }
  blockquote {
    margin: 24px 0;
    padding: 18px 22px;
    background: #f6f0e5;
    border-left: 5px solid var(--gold);
    color: var(--stone);
  }
  hr {
    border: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--line), transparent);
    margin: 42px 0;
  }
  .table-scroll {
    width: 100%;
    overflow-x: auto;
    margin: 18px 0 26px;
    border: 1px solid var(--line);
    background: #fffefa;
  }
  .data-table {
    width: 100%;
    min-width: 620px;
    border-collapse: collapse;
    font-size: 14px;
    line-height: 1.55;
  }
  .data-table th,
  .data-table td {
    padding: 11px 13px;
    border-bottom: 1px solid var(--line);
    border-right: 1px solid rgba(221,212,198,0.65);
    vertical-align: top;
  }
  .data-table th {
    background: #1f1a16;
    color: #fff7e6;
    font-weight: 700;
    white-space: nowrap;
  }
  .data-table tr:nth-child(even) td { background: #faf6ee; }
  .data-table td:first-child {
    color: var(--cinnabar);
    font-weight: 700;
    white-space: nowrap;
  }
  .footer {
    margin-top: 30px;
    padding: 28px 0 10px;
    color: var(--muted);
    text-align: center;
    font-size: 13px;
  }
  .footer p { margin: 4px 0; }
  .empty-summary, .toc-empty { color: var(--muted); font-size: 13px; }
  @media (max-width: 980px) {
    .report-hero { grid-template-columns: 1fr; padding: 42px 32px; }
    .astrolabe { justify-self: start; width: 220px; height: 220px; }
    .summary-band, .reader-layout { grid-template-columns: 1fr; }
    .console-head { align-items: start; flex-direction: column; }
    .console-tabs { width: 100%; }
    .paipan-grid { grid-template-columns: 1fr; }
    .chart-side { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .element-chip-row { grid-column: 1 / -1; }
    .method-grid, .event-shortcuts { grid-template-columns: 1fr; }
    .pillar-drill { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .visual-story-head { grid-template-columns: 1fr; }
    .visual-nav,
    .birth-grid,
    .core-decision-grid,
    .decision-map-grid,
    .wangshuai-steps,
    .relation-grid,
    .shensha-grid,
    .year-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .dual-board { grid-template-columns: 1fr; }
    .ten-god-list article {
      grid-template-columns: 78px minmax(0, 1fr) 42px;
    }
    .ten-god-list article p {
      grid-column: 1 / -1;
    }
    .month-heatmap { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .toc-rail { position: static; max-height: none; }
    .toc-link.depth-3 { padding-left: 0; }
    .report-content { padding: 36px 28px 48px; }
  }
  @media (max-width: 640px) {
    body { font-size: 15px; }
    .report-shell { width: 100%; padding: 0 0 44px; }
    .report-hero { min-height: 0; padding: 34px 22px; border-left: 0; border-right: 0; }
    .report-hero::before { inset: 10px; }
    .report-hero h1 { font-size: 31px; }
    .hero-verdict { grid-template-columns: 1fr; }
    .summary-band { margin: 14px 12px; }
    .pro-console { margin: 0 12px 14px; }
    .console-head { padding: 22px 18px 16px; }
    .console-head h2 { font-size: 22px; }
    .console-tabs { grid-template-columns: 1fr; }
    .console-tab { border-right: 0; border-bottom: 1px solid rgba(239,224,189,0.2); }
    .console-tab:last-child { border-bottom: 0; }
    .console-panel { padding: 18px; }
    .chart-side, .pillar-drill { grid-template-columns: 1fr; }
    .day-master-card strong { font-size: 54px; }
    .matrix-wrap { overflow-x: visible; }
    .bazi-matrix { min-width: 0; table-layout: fixed; }
    .bazi-matrix th, .bazi-matrix td { padding: 9px 4px; }
    .bazi-matrix tbody th { width: 45px; font-size: 11px; }
    .big-glyph {
      width: 42px;
      height: 42px;
      line-height: 38px;
      font-size: 27px;
      margin-bottom: 4px;
    }
    .star-badge, .nayin-pill {
      min-width: 0;
      padding: 3px 5px;
      font-size: 12px;
    }
    .hidden-stack { gap: 4px; }
    .hidden-chip {
      display: grid;
      justify-items: center;
      gap: 1px;
      padding: 3px 4px;
      font-size: 12px;
    }
    .hidden-chip small { font-size: 9px; }
    .sub-star-list { font-size: 11px; }
    .visual-story { margin: 14px 12px; }
    .visual-story-head,
    .visual-module {
      padding: 20px;
    }
    .visual-story-head h2,
    .module-title h3 {
      font-size: 22px;
    }
    .module-title {
      display: block;
    }
    .visual-nav,
    .birth-grid,
    .core-decision-grid,
    .decision-map-grid,
    .force-compare,
    .wangshuai-steps,
    .relation-grid,
    .shensha-grid,
    .year-grid,
    .month-heatmap {
      grid-template-columns: 1fr;
    }
    .ten-god-list article {
      grid-template-columns: 1fr;
    }
    .luck-timeline {
      grid-template-columns: repeat(9, 148px);
    }
    .pillar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .reader-layout { gap: 14px; }
    .toc-rail { margin: 0 12px; }
    .report-content { border-left: 0; border-right: 0; padding: 30px 20px 42px; }
    .report-content h2 { font-size: 22px; }
    .report-content h3 { font-size: 18px; }
    .report-content p { text-indent: 0; }
  }
  @media print {
    body { background: #fff; font-size: 13px; }
    .report-shell { width: 100%; padding: 0; }
    .report-hero, .summary-band, .report-content { box-shadow: none; }
    .toc-rail { display: none; }
    .reader-layout { display: block; }
    .report-content { border: 0; padding: 18mm 14mm; }
    .report-content h2 { page-break-before: always; }
    .report-content h2:first-child { page-break-before: avoid; }
    .table-scroll { overflow: visible; }
  }
"""


def _report_html_interaction_js() -> str:
    return """
  document.querySelectorAll('.pro-console').forEach((consoleEl) => {
    const tabs = Array.from(consoleEl.querySelectorAll('.console-tab'));
    const panels = Array.from(consoleEl.querySelectorAll('.console-panel'));

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.panel;
        tabs.forEach((item) => item.classList.toggle('is-active', item === tab));
        panels.forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.panel === target);
        });
      });
    });
  });
"""


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
        calendar_type = getattr(subject, "calendar_type", "公历") or "公历"
        results = await generate_reports(
            name=subject.name,
            birth_str=birth_str,
            gender=subject.gender,
            birth_place=birth_city,
            calendar_type=calendar_type,
            skip_consumer=False,
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
        report.consumer_report = results["consumer"] or ""
        report.wechat_report = results["wechat"]
        report.html_report = render_html_report(
            results["consumer"] or results["master"],
            subject,
            evidence_markdown=results["master"],
        )
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
