#!/usr/bin/env python3
"""扫描 git 仓库，生成项目架构 + 变更追踪数据。"""

import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = Path(__file__).resolve().parent / "public" / "data.json"

DEPENDENCY_MAP = {
    "engine/paipan.py": ["engine/rules.py", "report/generator.py", "web/backend/app/services/report_service.py"],
    "engine/rules.py": ["report/generator.py", "web/backend/app/services/report_service.py"],
    "report/generator.py": ["web/backend/app/services/report_service.py"],
    "report/prompts/judge.md": ["report/generator.py"],
    "report/templates/consumer_report.md.j2": ["report/generator.py", "web/backend/app/services/report_service.py"],
    "report/templates/master_report.md.j2": ["report/generator.py"],
    "report/templates/wechat_report.md.j2": ["report/generator.py"],
    "web/backend/app/services/report_service.py": ["web/frontend/"],
}

LAYER_CONFIG = [
    {
        "name": "Engine",
        "path": "engine/",
        "color": "#e74c3c",
        "description": "排盘计算 + 规则分析引擎",
        "modules": [
            {
                "file": "engine/paipan.py",
                "label": "排盘计算",
                "key_functions": ["paipan()", "compute_jieqi()", "compute_dayun()"],
            },
            {
                "file": "engine/rules.py",
                "label": "规则分析",
                "key_functions": [
                    "full_analysis()",
                    "judge_wangshuai()",
                    "adjust_wangshuai_by_relationships()",
                    "determine_geju()",
                    "arbitrate_yongshen()",
                    "analyze_events()",
                    "aggregate_domain_profiles()",
                    "_build_yongshen_strategy()",
                ],
            },
        ],
    },
    {
        "name": "Report",
        "path": "report/",
        "color": "#f39c12",
        "description": "报告生成层（模板 + Prompt + LLM 调用）",
        "modules": [
            {
                "file": "report/generator.py",
                "label": "报告生成器",
                "key_functions": [
                    "generate_reports()",
                    "render_skeletons()",
                    "extract_engine_summary()",
                    "generate_master_report()",
                    "generate_consumer_report()",
                    "generate_wechat_report()",
                ],
            },
            {
                "file": "report/prompts/judge.md",
                "label": "AI Prompt",
                "key_functions": ["judge.md (v4 直接架构)"],
            },
            {
                "file": "report/templates/consumer_report.md.j2",
                "label": "消费者版模板",
                "key_functions": ["6段决策结构"],
            },
            {
                "file": "report/templates/master_report.md.j2",
                "label": "命理师版模板",
                "key_functions": ["Part1-6 完整分析"],
            },
        ],
    },
    {
        "name": "Web",
        "path": "web/",
        "color": "#3498db",
        "description": "Web 服务层（FastAPI + React）",
        "modules": [
            {
                "file": "web/backend/app/services/report_service.py",
                "label": "报告渲染服务",
                "key_functions": [
                    "render_html_report()",
                    "_markdown_to_report_html()",
                    "_render_paid_decision_overview()",
                    "_section_theme_class()",
                    "generate_report_task()",
                ],
            },
            {
                "file": "web/frontend/",
                "label": "React 前端",
                "key_functions": ["报告展示页", "用户管理", "生成触发"],
            },
        ],
    },
]


def git_cmd(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def get_file_last_modified(filepath: str) -> str:
    log = git_cmd("log", "-1", "--format=%aI", "--", filepath)
    return log or ""


def get_file_status(filepath: str, recent_commits: list) -> str:
    """判断文件状态：modified / unchanged"""
    for commit in recent_commits[:5]:
        if filepath in commit.get("files_changed", []):
            return "modified"
        for f in commit.get("files_changed", []):
            if f.startswith(filepath):
                return "modified"
    return "unchanged"


def get_commits(limit: int = 30) -> list:
    log = git_cmd(
        "log", f"-{limit}",
        "--format=COMMIT_SEP%n%H%n%h%n%aI%n%s%n%an",
        "--name-only",
    )
    if not log:
        return []

    commits = []
    for block in log.split("COMMIT_SEP\n"):
        block = block.strip()
        if not block:
            continue
        lines = block.split("\n")
        if len(lines) < 5:
            continue
        full_hash = lines[0]
        short_hash = lines[1]
        date = lines[2]
        message = lines[3]
        author = lines[4]
        files = [f for f in lines[5:] if f.strip() and not f.startswith("COMMIT_SEP")]

        commits.append({
            "hash": short_hash,
            "full_hash": full_hash,
            "date": date[:10],
            "time": date,
            "message": message,
            "author": author,
            "files_changed": files,
        })
    return commits


def classify_file(filepath: str) -> str:
    if filepath.startswith("engine/"):
        return "engine"
    elif filepath.startswith("report/"):
        return "report"
    elif filepath.startswith("web/"):
        return "web"
    return "other"


def compute_impact(files_changed: list) -> dict:
    direct = set(files_changed)
    downstream = set()

    for f in files_changed:
        for pattern, deps in DEPENDENCY_MAP.items():
            if f == pattern or f.startswith(pattern):
                for dep in deps:
                    if dep not in direct:
                        downstream.add(dep)

    return {
        "direct": sorted(direct),
        "downstream": sorted(downstream),
    }


def build_architecture(commits: list) -> list:
    layers = []
    for layer_cfg in LAYER_CONFIG:
        modules = []
        for mod_cfg in layer_cfg["modules"]:
            filepath = mod_cfg["file"]
            last_modified = get_file_last_modified(filepath)
            status = get_file_status(filepath, commits)
            modules.append({
                "file": filepath,
                "label": mod_cfg["label"],
                "key_functions": mod_cfg["key_functions"],
                "last_modified": last_modified,
                "status": status,
            })
        layers.append({
            "name": layer_cfg["name"],
            "path": layer_cfg["path"],
            "color": layer_cfg["color"],
            "description": layer_cfg["description"],
            "modules": modules,
        })
    return layers


def get_diff_summary(commit_hash: str) -> dict:
    """获取单个 commit 的 diff 统计"""
    stat = git_cmd("diff", "--stat", f"{commit_hash}~1..{commit_hash}")
    return {"stat": stat[-500:] if stat else ""}


def main():
    print("Scanning git repository...")
    commits = get_commits(30)
    print(f"  Found {len(commits)} commits")

    for commit in commits:
        commit["impact"] = compute_impact(commit["files_changed"])
        commit["layer_breakdown"] = {}
        for f in commit["files_changed"]:
            layer = classify_file(f)
            commit["layer_breakdown"].setdefault(layer, []).append(f)

    architecture = build_architecture(commits)
    print(f"  Architecture: {sum(len(l['modules']) for l in architecture)} modules across {len(architecture)} layers")

    data = {
        "project_name": "八字命理分析系统",
        "scanned_at": datetime.now().isoformat(),
        "architecture": {"layers": architecture},
        "commits": commits,
        "dependency_map": {k: v for k, v in DEPENDENCY_MAP.items()},
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Output: {OUTPUT_PATH}")
    print("Done.")


if __name__ == "__main__":
    main()
