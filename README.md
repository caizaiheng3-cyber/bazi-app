# 八字命理分析系统

> **新窗口首先读取本文件。** 需要详细引导信息读 `docs/README.md`，需要项目状态读 `PROJECT_STATUS.md`（如存在）。
> **最后更新**：2026-05-13

## 简介

帮命理师一键生成高质量消费者报告的双边八字排盘工具。核心价值：从专业推断到通俗表达的翻译。

## 三层架构

```
┌───────────────────────────────────────────────────┐
│  ③ 应用层  web/ · app/                            │
│     复用引擎层 + 报告层能力，不自己写 prompt        │
├───────────────────────────────────────────────────┤
│  ② 报告层  report/  ← 唯一真相源                  │
│     prompt · 模板 · 输出规范 · 优质案例             │
├───────────────────────────────────────────────────┤
│  ① 引擎层  engine/                                │
│     排盘计算 · 规则分析 · 纯数据，不涉及输出格式    │
└───────────────────────────────────────────────────┘
```

**铁律**：应用层生成报告时，必须引用 `report/` 下的 prompt 和模板，禁止自己硬编码 prompt。

## 目录速查

### ① 引擎层

| 路径 | 职责 |
|------|------|
| `engine/paipan.py` | 排盘计算（天干地支、十神、大运流年） |
| `engine/rules.py` | 规则分析（旺衰、格局、用神忌神、合冲刑害） |

### ② 报告层（唯一真相源）

| 路径 | 职责 |
|------|------|
| `report/prompts/judge.md` | AI 判读 prompt（核心） |
| `report/prompts/event_consult.md` | 事件咨询 prompt |
| `report/templates/*.md.j2` | Jinja2 骨架模板（master/consumer/wechat/index） |
| `report/spec/` | SOP、方法论、质量评估标准 |
| `report/examples/蔡命/` | 优质案例·蔡命（命理师版v4 + 消费者版v4 + 微信版v3） |
| `report/examples/陶命/` | 优质案例·陶命（命理师版v3 + 消费者版v3 + 微信版v3） |

### ③ 应用层

| 路径 | 职责 |
|------|------|
| `web/backend/` | Web 后端（FastAPI），入口 `app/services/report_service.py` |
| `web/frontend/` | Web 前端（React + Vite + TailwindCSS） |
| `app/` | CLI 应用（早期版本） |

### 其他

| 路径 | 职责 |
|------|------|
| `casework/` | 手工推算案例（过程数据，非正式标杆） |
| `docs/` | 项目文档（详细引导 `docs/README.md`、产品设计） |
| `deploy/` | 部署配置（Nginx、systemd） |
| `scripts/` | 辅助脚本 |

## 关键路径指引

| 你要做什么 | 从哪里开始 |
|-----------|-----------|
| 修改报告生成逻辑 | `report/prompts/judge.md` → `report/templates/` → `report/examples/` |
| 修改排盘/规则引擎 | `engine/paipan.py` / `engine/rules.py` |
| 了解产品设计 | `docs/README.md` → `docs/产品化设计-v5.md` |
| 做一次手工推算 | 产出放 `casework/{命主名}/`，优质者晋升 `report/examples/` |

## 优质案例晋升规则

`casework/` 中的案例需经人工评审确认"质量优于现有标杆"后才能晋升到 `report/examples/`。晋升时统一命名为 `{命主名}-{版本类型}.md`，并同步更新相关 prompt。
