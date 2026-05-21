# Web 应用 — Claude 协作指南

> 本文件定义 `web/` 目录下 Web 应用的局部开发规范。全局规则见根目录 `CLAUDE.md`。

---

## 技术栈（已确认，不可更换）

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.14 + FastAPI + SQLite + SQLAlchemy |
| 前端 | Vite + React 19 + TypeScript + TailwindCSS 4 |
| AI | DeepSeek Chat API |
| 部署 | Docker + Nginx |

## 铁律

1. **前端不写命理逻辑**：所有命理计算和规则分析必须通过后端 API 调用 `engine/` 层，前端只负责展示
2. **报告生成必须走 report/ 层**：`web/backend/app/services/report_service.py` 必须引用 `report/prompts/` 和 `report/templates/` 中的 prompt 和模板，禁止在 service 中硬编码 prompt
3. **不要在 web 目录下复制引擎代码**：如果需要引擎能力，通过 Python import 引用 `engine/` 包

## 后端规范

### API 路由

```
/api/auth/       — 认证（登录/验证）
/api/subjects/   — 命主管理（CRUD）
/api/reports/    — 报告生成/查询
/api/chat/       — 对话功能
```

新增端点时保持这个前缀层级结构。

### 数据模型

- ORM 模型：`app/models/db_models.py`
- Pydantic 模型：`app/models/schemas.py`
- 新增字段必须两边同步

### 关键文件

| 文件 | 职责 |
|------|------|
| `backend/app/services/report_service.py` | 报告生成核心：调引擎 → 调 AI → 填模板 |
| `backend/app/api/reports.py` | 报告 API 端点 |
| `backend/app/api/chat.py` | 对话 API |
| `frontend/src/lib/api.ts` | 前端 API 调用层（axios 封装） |

## 前端规范

- 组件使用函数式组件 + TypeScript
- 样式使用 TailwindCSS，不写自定义 CSS 文件
- API 调用统一通过 `src/lib/api.ts`，不在组件中直接用 axios
- UI 修改后必须在浏览器中实际验证

## 开发命令

```bash
# 启动后端（从 web/ 目录）
cd web && bash dev.sh
# 或手动
cd web/backend && python main.py

# 启动前端
cd web/frontend && npm run dev

# 前端构建
cd web/frontend && npm run build
```

## 修改后的检查项

- [ ] 后端 API 变化 → 前端 `api.ts` 的接口定义同步更新了？
- [ ] 数据库 schema 变化 → db_models.py 和 schemas.py 都改了？
- [ ] UI 变化 → 在浏览器中验证了？
- [ ] 报告生成变化 → 至少用一个案例验证了输出质量？
