# PROJECT_STATUS.md

## 项目概况

**项目名称**：我命由天挺好的（AI 命理工作台）
**当前版本**：v1.0 MVP
**最后更新**：2026-05-12

## 技术栈

- **后端**：Python 3.14 + FastAPI + SQLite + SQLAlchemy
- **前端**：Vite + React 19 + TypeScript + TailwindCSS 4
- **AI**：DeepSeek Chat API
- **部署**：本地开发（后续 Railway/Render）

## 目录结构

```
web/
  backend/              # FastAPI 后端
    main.py             # 主入口（端口 8000）
    app/
      core/             # config, database, auth
      models/           # db_models (ORM), schemas (Pydantic)
      api/              # auth, subjects, reports, chat
      services/         # report_service (排盘+规则+AI)
    data/               # SQLite 数据库（gitignore）
  frontend/             # Vite + React 前端
    src/
      App.tsx           # 路由
      main.tsx, index.css
      lib/api.ts        # API 层 + 类型定义
      pages/            # LoginPage, SubjectListPage, SubjectCreatePage, SubjectDetailPage
  dev.sh                # 一键启动脚本
  docs/prd/PRD-001.md   # 产品需求文档
```

## 核心复用模块

- `engine/paipan.py` — 排盘引擎（lunar-python）
- `engine/rules.py` — 规则引擎（旺衰/格局/用神推导）
- `templates/*.md.j2` — 报告 Jinja2 模板（命理师/消费者/微信版）
- `prompts/judge.md` — AI 判读 Prompt

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/health | GET | 健康检查 |
| /api/auth/login | POST | 密码登录，返回 JWT |
| /api/auth/verify | GET | 验证 token |
| /api/subjects | GET/POST | 命主列表/新增 |
| /api/subjects/:id | GET/PUT | 命主详情/更新 |
| /api/reports/:id | GET | 获取报告 |
| /api/reports/generate | POST | 触发报告生成 |
| /api/chat/:id/messages | GET | 获取问答历史 |
| /api/chat/:id/send | POST | 发送问题 |

## 启动方式

```bash
cd web
bash dev.sh
# 前端：http://localhost:5173
# 后端：http://localhost:8000/docs
# 默认密码：123456
```

## 环境变量

- AUTH_PASSWORD — 访问密码（默认 123456）
- DEEPSEEK_API_KEY — DeepSeek API Key（报告生成和问答必需）
- DEEPSEEK_BASE_URL — DeepSeek API 地址（默认 https://api.deepseek.com）

## 已完成

- [x] 后端骨架（FastAPI + SQLite + JWT 认证）
- [x] 密码验证 API
- [x] 命主 CRUD API
- [x] 报告生成 API（排盘 -> 规则 -> 模板 -> DeepSeek AI）
- [x] AI 问答 API
- [x] 前端骨架（Vite + React + TailwindCSS）
- [x] 四个页面（密码页/列表页/建档页/详情页含报告+问答）
- [x] 前后端联调验证通过

## 待办

- [ ] 配置 DEEPSEEK_API_KEY 后测试报告生成全流程
- [ ] 部署到 Railway/Render
- [ ] 视觉优化（用 Image 2 设计稿）
