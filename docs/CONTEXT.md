# 项目上下文速查（CONTEXT）

> **🚀 新对话只读这一个文件！** 不要读 README.md、PRD.md 全文。
> **最后更新**：2026-04-26

---

## 🤖 AI 协作铁律（每次新对话先读这里）

### 铁律 1：任务结束必须更新 CONTEXT
当任何一个任务完成时（即使用户没要求），必须主动执行：
- 更新「当前进度」表格中对应阶段的状态（✅ 完成 / 🚧 进行中）
- 在「变更记录」末尾追加一行（日期 + 一句话变更说明）
- 在回复末尾**用一句话提醒用户**：「已同步 CONTEXT.md 进度」

### 铁律 2：大任务必须提醒拆分会话
开始新任务前，先估算复杂度。**符合下列任一条件即为「大任务」**，必须先提醒用户拆分到独立会话：
- 涉及 ≥ 3 个核心模块（如 排盘引擎 + UI + 状态管理）
- 预估需要读取 ≥ 5 个文档章节或 ≥ 10 个源码文件
- 预估上下文占用 > 30%（如 M1/M2/M4 整个里程碑）
- 涉及"重写/重构整个 X"

**提醒模板**：
> ⚠️ 这是一个大任务（预估涉及 X 个模块、读取 Y 个文件，上下文占用约 Z%）。
> 强烈建议拆到独立会话进行，开启新对话使用启动模板：
> `请只读 docs/CONTEXT.md，开始 [任务名]`
> 是否继续在当前会话执行？(y/n)

### 铁律 3：禁止整文件读取大文档
- ❌ 禁止：`read_file(README.md, entire=true)` / `read_file(PRD.md, entire=true)`
- ✅ 允许：按行号范围读取具体章节（参见下方「文档按需读取索引」）
- 例外：CONTEXT.md 本身、源码文件 < 200 行

---

## 一句话项目定位

帮命理师一键生成高质量消费者报告的双边八字排盘工具（命理师端 MVP 优先）。

---

## 当前进度（重要）

| 阶段 | 状态 | 说明 |
|------|------|------|
| 文档体系 | ✅ 完成 | README/PRD/需求说明书/输出模板/命理分析方法论/CONTEXT |
| **UI 原型（M3 提前）** | ✅ 完成 | 整体报告页：中式古典风 + 双视角切换 + Mock 数据 |
| **上下文管理机制** | ✅ 完成 | CONTEXT.md + 任务结束自动更新 + 大任务拆分提醒 |
| **架构图** | ✅ 完成 | architecture.html（开发用）+ architecture-pitch.html（投资人版）|
| **每日对话设计层（文档）** | ✅ 完成 | PRD M7 章节 + 需求说明书 2.10 + 输出模板·模板三 + 架构图 ⑨ M7 模块 |
| **每日对话类型层（代码）** | ✅ 完成 | `app/src/types/bazi.ts` 已定义 AskScene/DailyDashboard/ShifuReply/QnaRecord 等 |
| **每日对话设计蓝图** | ✅ 完成 | 输出模板.md「模板四」：页面流转 + 4 页线框图 + 组件清单 + 路由表 + Mock 清单 + 7 步交付里程碑 |
| **每日对话 UI 原型** | ✅ 完成 | 路由化改造 + 4 个新页面（Dashboard/Chat/Journal/ResultPage CTA）+ 21 个新组件 + Mock 数据 4 件 + Store 扩展 + localStorage 持久化，全部 lint/tsc 零错误 |
| **lunar-javascript 选型验证** | ✅ 完成 | 已装 npm 包；蔡蔡 1993-12-07 06:00 男案例验证 100% 通过（四柱/藏干/十神/纳音/大运/流年流日全准）；保留 `app/verify-bazi.mjs` 供 M1 引擎封装参考 |
| **Mock 数据迁移到蔡蔡** | ✅ 完成 | mockBaziChart/mockConsumerReport/mockDailyFortune/InputForm 默认值 全部从张三（丙火）迁到蔡蔡（壬水极旺、调候用神木火）；旺衰/用神/格局/神煞/keyFindings/消费者报告 8 段全文重写以匹配命局 |
| **多法同断（Convergence）** | ✅ 完成 | 类型/数据/样式/UI 四层全覆盖，专业模式金色双印章+证据链、消费者模式 📿 念珠注脚 |
| **执行计划文档** | ✅ 完成 | `docs/EXECUTION_PLAN.md`：8 周 7 里程碑，B 命理师 MVP + 标准引擎 + 规则模板路线，含三点估时与缓冲 |
| **M1 排盘引擎（含 M1.1/1.2/1.3）** | ✅ 完成 | engine/baziEngine.ts 封装 lunar-javascript；store.submit 接 `buildChartWithFallback`；3 个自验脚本全绿（M1.1=68 项 / M1.2=端到端 3 组 / M1.3=5 组边界 10 项断言） |
| **M2.1 五行统计引擎** | ✅ 完成 | engine/wuxingAnalyzer.ts 严格按 mock 口径（地支本气在 diZhi 和 cangGan 各计一次）；蔡蔡基线 100% 对齐 mock；接入 buildChartWithFallback；verify-m2.1.mjs 6 项断言全绿 |
| **M2.2 旺衰判定引擎** | ✅ 完成 | engine/wangShuaiAnalyzer.ts 三步打勾投票表（得令/得地/得生/受克）→ 5 档结论；蔡蔡基线"日主极旺"；verify-m2.2.mjs 5 组全绿 |
| **M2.3 用神选取引擎** | ✅ 完成 | engine/yongShenAnalyzer.ts 扶抑/调候/通关三法 + 多法同断；蔡蔡基线"火主用+木次用+调候主导+忌金水+二法同断"；verify-m2.3.mjs 5 组全绿 |
| **M2.4 格局判定引擎** | ✅ 完成 | engine/geJuAnalyzer.ts 三层判定（特殊格>正格>比劫偏格）；蔡蔡基线"比劫格(润下倾向)·偏格·半成·中"；verify-m2.4.mjs 5 组全绿 |
| **M2.5 神煞匹配引擎** | ✅ 完成 | engine/shenShaAnalyzer.ts 5 类查法 15+ 种神煞全覆盖，驿马/桃花/华盖日支+年支双路径去重；蔡蔡命中 9 项（天乙+禄神+华盖+将星+驿马+桃花+魁罡+孤辰+阴阳差错）；verify-m2.5.mjs 4 组全绿 |
| **M2.6 keyFindings 整合引擎** | ✅ 完成 | engine/keyFindingsAnalyzer.ts 9 条规则引擎（旺衰异常/调候急需/五行偏枯/格局特征/食伤泄秀/比劫夺财/高价值神煞/警示神煞/大运窗口），基于 wangShuai/yongShen/geJu/shenShas/wuxingStats/pillars 六大数据源自动生成 keyFindings + convergence 多法同断证据链；蔡蔡命中 7 条（1 red+3 yellow+3 green），5 条带 convergence（最高 4 法同断）；接入 buildChartWithFallback 替换最后一块 mock；verify-m2.6.mjs 5 组测试全绿 |
| **M3 消费者报告生成引擎** | ✅ 完成 | engine/consumerReportGenerator.ts 基于 BaziChart 全字段 + §5.7 五行映射表 + §5.8 纳音意象库（30 种纳音全覆盖）自动生成 ConsumerReport 8 大段（imagery/empathy/explanation/guidance/timeline/luckyGuide/closing/otherAreas）；接入 store/useBaziStore.ts 替换 mockConsumerReport；verify-m3.mjs 6 组测试全绿（蔡蔡=大海水、4 条建议、6 节点 timeline、5 convergence 注脚） |
| M6 增强 | ⏳ 未开始 | 历史记录/导出/响应式 |
| **M7 每日命理对话（引擎+UI）** | ⏳ 未开始 | 流年流日推算 + 意图解析 + 每日宜忌 + "先生"对话引擎 + 命理日记 + Dashboard/Ask/Answer/Journal 四页面 |

**🎉 M1 排盘 + M2 分析引擎 + M3 消费者报告 全部完工！** 从排盘到分析到报告生成，**全链路由引擎真实计算，不再依赖任何 mock 数据**！

| 字段 | 引擎模块 | 状态 |
|---|---|---|
| basicInfo/pillars/daYuns | M1 baziEngine | ✅ |
| wuxingStats | M2.1 wuxingAnalyzer | ✅ |
| wangShuai | M2.2 wangShuaiAnalyzer | ✅ |
| yongShen | M2.3 yongShenAnalyzer | ✅ |
| geJu | M2.4 geJuAnalyzer | ✅ |
| shenShas | M2.5 shenShaAnalyzer | ✅ |
| keyFindings | M2.6 keyFindingsAnalyzer | ✅ |
| ConsumerReport | M3 consumerReportGenerator | ✅ |

**下一步建议**：
1. **M3 消费者报告生成引擎**：基于 BaziChart 全字段，按 `docs/输出模板.md` 模板二自动生成 ConsumerReport（imagery/empathy/explanation/luckyGuide 等段落）。**启动语**：`请只读 docs/CONTEXT.md + docs/输出模板.md 模板二 + mock/baziChart.ts 的 mockConsumerReport 字段，开始 M3 消费者报告生成引擎。`
2. **M4 UI 联调优化**：将引擎输出对接 ProfessionalView / ConsumerView 组件，确保端到端视觉效果与 mock 一致
3. **M7 每日命理对话**：流年流日推算 + "先生"对话引擎 + 四页面 UI

**M2.6 keyFindings 整合引擎技术决策（已对齐，不再讨论）**：
- 9 条规则引擎：R1 旺衰异常(red) / R2 调候急需(yellow) / R3 五行偏枯(yellow) / R4 格局特征(yellow/green) / R5 食伤泄秀天赋(green) / R6 比劫夺财(yellow) / R7 高价值神煞(green) / R8 警示神煞(yellow) / R9 大运窗口(green)
- 每条规则内部自行构建 convergence（≥2 条独立证据即触发）
- 输出排序：red > yellow > green
- 大运窗口优先选 ≥31 岁的后半段大运
- 蔡蔡命中 7 条（超出 mock 6 条），5 条带 convergence（最高 4 法同断）

**M2.2 旺衰判定引擎技术决策（已对齐，不再讨论）**：
- 算法严格遵循文档 §3.1.1「三步打勾投票表」（7 行表 → 5 档结论），**不自创加权阈值**
- 「得令」基于五行旺相休囚死表：旺/相→✅，休/囚/死→❌（"休"按文档"中性"保守归入失令）
- 「得地」二元投票：日支藏干含本气 OR 其他地支含同类/印星 → ✅
- 「得生」助力数 vs 克泄数：助力≥克泄→✅
- 「多法同断」**仅在三步全✅或全❌触发**（命理学公认的高置信局面）
- 5 档结论：极旺/偏旺/中和偏旺/中和偏弱/偏弱/极弱（confidence 5/4/3/3/4/5）
- step.score 用 0/1（投票制）+ 综合 step.score 用 ±3..±1（仅 UI 视觉强度，非命理评分）
- ❌ 不处理合化、冲刑、季节交界余气（文档 §3.1.1 已说明"以上为简化模型"，进阶判定留给 M2.4 神煞 + M2.6 增强）

**M2.4 格局判定引擎技术决策（已对齐，不再讨论）**：
- 三层判定按优先级：特殊格 > 正格 > 比劫偏格（避免冲突）
- **特殊格阈值**（工程化，文档未给死数值）：
  - 专旺格：日主"极旺"档 + 同五行 ≥50%（与 yongShenAnalyzer 专旺判定阈值保持一致）
  - 从强格：极旺 + 印比合计 ≥75% + 财官食伤合计 ≤15%
  - 从财/从官/从儿：极弱 + 对应五行 ≥40%
  - 从弱格：极弱 + 日主≤10% + 印星≤10%（无单一五行成势的兜底）
- **正格取格**：月令藏干本气 > 中气 > 余气优先级取**透出**天干 → 8 格之一；均不透出则取本气定格
- **比劫不立正格**（文档 §3.3.1 明确"正格八格不含比劫"）：透出干为比肩或劫财时归偏格，name 用统称「比劫格（XX 倾向）」（XX = 该五行专旺名：曲直/炎上/稼穑/从革/润下）
- **成格条件工程化**（按文档 §3.3.1 表内每格"成格条件"列）：
  - 正官：印≥1 OR 财≥1
  - 偏官（七杀）：食神≥1 OR 印≥1
  - 正/偏印：官杀≥1 AND 财＜2 (偏印额外要求食神=0)
  - 正/偏财：食伤≥1 AND 比劫＜2
  - 食神：财≥1 AND 偏印=0
  - 伤官：印≥1 OR 财≥1
- **层次评估**（§3.3.3）：成格 + 用神 primary 含格神五行 → 高；成格但不含 → 中；半成 → 中；破格 → 低
- 蔡蔡基线：月令亥本气壬透日干（比肩） + 水气40%未达专旺50% → 「比劫格（润下倾向）」·偏格·半成·中

**M2.3 用神选取引擎技术决策（已对齐，不再讨论）**：
- 算法严格遵循文档 §3.2 三法：扶抑（§3.2.1）+ 调候（§3.2.2）+ 通关（§3.2.3）
- **调候法 use 必入 primary**（文档 §3.2.2 明确"调候优先级高于扶抑"），不可降级
- ≥2 法共认五行追加进 primary（多法同断置信度最高）
- 单法选中的五行入 secondary
- 扶抑法旺者优先级 use=[食伤, 财, 官杀]（按文档 §3.2.1 温和→烈）；弱者 use=[印, 比劫]
- 调候表完全对齐文档 §3.2.2 6 行（土日主无强制调候规则）
- 通关法采用工程化阈值：**前两强五行皆 ≥30% 且互成相克** → 触发，通关 = 克者所生
- 忌神 = 克主用神者 ∪ 旺者助势(同我+生我) ∪ 弱者克泄(我生+我克+克我)；用神优先于忌神（冲突时主/次用神从忌神剔除）
- 主导方法（method 字段）优先级：调候 > 扶抑 > 通关
- 蔡蔡基线：扶抑 use=[木,火,土] + 调候 use=[火] + 通关不适用（金20%+水40%，金未达30%）
  - 火被扶抑+调候共认 2 票 → primary=[火]；木、土单票 → secondary=[木,土]
  - 主导方法=调候（壬水冬月寒水必用火）；忌神=[水,金]（同我+生我）
  - convergence=2 法（扶抑+调候）

**lunar-javascript 验证关键 API 速查（M1 直接用）**：
- `Solar.fromYmdHms(y,m,d,h,mi,s).getLunar().getEightChar()` → 拿到 EightChar 对象
- `eightChar.setSect(1)` → 早子时换日（业务规则）
- `eightChar.getYear()/getMonth()/getDay()/getTime()` → 四柱干支字符串（如 "癸酉"）
- `eightChar.getYearGan()/getYearZhi()/getYearHideGan()/getYearShiShenGan()/getYearShiShenZhi()` → 拆出干/支/藏干/十神
- `eightChar.getYearNaYin()` 等 → 纳音
- `eightChar.getYun(1).getDaYun()` → 大运数组（含 `getGanZhi/getStartAge/getStartYear/getEndYear`），第 0 个是出生大运
- `daYun.getLiuNian()` → 该大运下的流年数组
- `Solar.fromYmd(y,m,d).getLunar().getDayInGanZhi()` → 任意日期的当日干支（每日对话引擎用）
- `lunar.getDayGan()/getDayZhi()/getDayNaYin()` → 当日日干/日支/纳音
- ❌ 神煞 API：库不直接按"柱"提供神煞，需自行写映射表（按命理分析方法论·第五章）

**M7 关键设计决策**（2026-04-26 已对齐，不再讨论）：
- 老用户重开 App → 直接进 Dashboard（首页变 Dashboard，整体报告降为「我的命盘」二级入口）
- 提问采用**聊天流式单页**（类 ChatGPT），非两页式，连续追问体验好
- 4 类场景在 ChatPage 内可切换，Dashboard 上以快捷卡呈现

**M7 UI 原型落地清单**（2026-04-26 已交付）：
- 路由：`/` · `/onboarding` · `/dashboard` · `/chat` · `/journal` · `/chart`（react-router-dom v7）
- 页面：`DashboardPage` · `ChatPage` · `JournalPage` · `ResultPage`（加 CTA）
- Chat 子组件：`ChatHeaderBar` · `UserBubble` · `ShifuBubble` · `VerdictSeal` · `ChatInputBar` · `BasisFootnote`
- Daily 子组件：`TodayFortuneCard` · `SceneQuickGrid` · `AskInputBar` · `WeeklyTrendChart`（纯 SVG 折线）· `RecentQnaList`
- Journal 子组件：`JournalFilterBar` · `JournalItem` · `FeedbackSelector`
- 通用组件：`TopNavBar` · `AppRouter` · `EntryToDailyChat`
- Mock 四件套：`dailyDashboard.ts` · `shifuReplies.ts`（4 场景 + 追问 + 兜底共 6 条）· `journalRecords.ts`（20 条）· `replyMatcher.ts`
- Store：`useBaziStore` 扩展 `DailyState + DailyActions`，`bazi:chart` / `bazi:journal` 双键持久化，日记 200 条容量 + starred 不淘汰策略
- 类型补齐：`ChatMessage` / `Feedback` 类型已在 `types/bazi.ts` 定义

---

## 已确认的关键决策（不要重新讨论）

### 产品方向
- 双边平台（命理师 + 消费者），不是纯工具/纯 C 端/教育产品
- MVP 先做命理师端（专业模式）

### 技术栈
- **React 18 + TypeScript + Vite + Ant Design + Tailwind CSS v3 + Zustand**
- 历法：`lunar-javascript` ✅ 已装（package.json，2026-04-26）
- 图表：纯 CSS 条形图（已实现）；ECharts 留给 P2
- 部署：纯前端，Vercel / GitHub Pages

### 视觉风格
- **中式古典风**：宣纸米黄 `#F5EFE0` + 朱砂红 `#C5392F` + 水墨黑 `#2C2A28` + 金色 `#B8860B`
- 标题宋体（Noto Serif SC），正文黑体
- 印章圆形 + 朱砂竖条 + 双线分隔 + 五行字着色

### 业务规则
- 日期范围 1900-2100；时辰双模式；子时默认早子时换日；月柱以节气定月
- 真太阳时高级选项默认关闭；仅中文；localStorage 最多 20 条历史

### UI 布局
- 单页长滚动（移动端友好）
- 顶部 Segmented 视角切换：专业模式 ⟷ 消费者模式

### 高频化设计（每日对话 · M7 核心）
- 把八字从**低频深度报告**升级为**高频日常陪伴**
- 4 类提问场景：决策建议 / 时机择吉 / 每日宜忌 / 开放问答
- 回答采用 **"先生"人设对话**（共情→解释→建议三段，宋体大字 + 古典气泡）
- 每个回答必须有命理依据（流年/流月/流日 + 原局用神 + 大运），保留 10% 术语原则
- 设计禁区：禁止伪科学评分、禁止恐吓措辞、禁止脱离命盘的泛泛建议、禁止鸡汤化

### 多法同断（Convergence · 命理判断置信度标志）
- **定义**：当 ≥2 个独立分析路径（旺衰/格局/神煞/调候/大运/五行占比/十神等）指向同一结论时，置信度大幅提升，相当于"交叉验证"
- **数据载体**：`Convergence { methods, conclusion, consumerNote? }`，已挂在 `KeyFinding / WangShuai / YongShen / ConsumerReport.explanation / ConsumerReport.guidance.points` 上
- **专业模式视觉**（强突出）：金色双印章 `⊙⊙ 多法同断` 徽章 + 金边卡片 `.convergence-card` + 默认展开证据链 `.convergence-methods`
- **消费者模式视觉**（柔和）：`📿` 念珠注脚 `.convergence-note-soft`（解释段）+ 金色侧边线 + 右上角 `⊙⊙ 多法同断` 角标（出路段）
- **样式**：`.convergence-seal` `.convergence-card` `.convergence-methods` `.convergence-note-soft` `.convergence-corner-mark`（global.css）
- 蔡蔡 mock 已标注：日主极旺(4法)/卯木伤官(4法)/缺火调候(3法)/比劫夺财(3法)/2033起飞(4法)/旺衰判断(4法)/用神判断(3法)；消费者出路 5 点中标 4 点为多法同断

---

## 关键文件路径地图

### 项目结构
```
/Users/caizaiheng/vscode/八字项目/
├── docs/                           ← 所有文档
│   ├── CONTEXT.md                  ← 本文件（速查）
│   ├── README.md                   ← 项目引导（按需读）
│   ├── PRD.md                      ← 功能/技术/里程碑（按需读章节）
│   ├── 需求说明书.md                ← 产品定位/命理特质（按需读章节）
│   ├── 输出模板.md                  ← 双视角输出结构（按需读章节）
│   ├── 命理分析方法论.md             ← 命理规则/对照表（M1/M2 时按需读）
│   └── architecture.html           ← 🎨 可视化架构总览图（浏览器打开查看）
└── app/                            ← 代码（避开中文路径相对引用问题）
    ├── package.json
    ├── tailwind.config.js
    ├── src/
    │   ├── App.tsx                 ← 入口 + AntD ConfigProvider 主题
    │   ├── main.tsx
    │   ├── pages/
    │   │   ├── HomePage.tsx        ← 首页
    │   │   └── ResultPage.tsx      ← 结果页（含视角切换）
    │   ├── components/
    │   │   ├── InputForm/InputForm.tsx
    │   │   ├── ProfessionalView/
    │   │   │   ├── ProfessionalView.tsx      ← 8 个分区主容器
    │   │   │   ├── PillarsTable.tsx          ← 四柱表
    │   │   │   ├── WuxingChart.tsx           ← 五行条形图
    │   │   │   ├── WangShuaiChain.tsx        ← 旺衰推断链
    │   │   │   └── DayunTimeline.tsx         ← 大运时间轴
    │   │   ├── ConsumerView/ConsumerView.tsx ← 消费者报告 8 段
    │   │   └── common/
    │   │       ├── ClassicCard.tsx
    │   │       ├── SectionTitle.tsx
    │   │       ├── ClassicDivider.tsx
    │   │       └── wuxing.ts                 ← 五行→颜色映射
    │   ├── engine/baziEngine.ts               ← M1.1 排盘引擎：lunar-javascript → BaziChart（basicInfo/pillars/daYuns/qiYunDirection）
    │   ├── engine/wuxingAnalyzer.ts           ← M2.1 五行统计引擎：pillars → WuXingStat[]（严格对齐 mock 口径）
    │   ├── store/useBaziStore.ts             ← Zustand + localStorage 持久化（命盘 + 日记）
    │   ├── types/bazi.ts                     ← 完整类型定义（含 ChatMessage/Feedback/DailyDashboard/ShifuReply）
    │   ├── mock/
    │   │   ├── baziChart.ts                  ← 蔡蔡排盘 Mock（壬水日主，2026-04-26 替换）
    │   │   ├── dailyDashboard.ts             ← 庚午日 Dashboard Mock（对齐蔡蔡命局）
    │   │   ├── shifuReplies.ts               ← 4 场景先生回话样例库
    │   │   ├── journalRecords.ts             ← 20 条命理日记历史
    │   │   └── replyMatcher.ts               ← 场景+关键词匹配引擎（伪 AI）
    │   ├── pages/
    │   │   ├── HomePage.tsx / ResultPage.tsx        ← 已路由化
    │   │   ├── DashboardPage.tsx                    ← 每日主页
    │   │   ├── ChatPage.tsx                         ← 聊天流式对话
    │   │   └── JournalPage.tsx                      ← 命理日记
    │   ├── components/
    │   │   ├── Daily/   (TodayFortuneCard / SceneQuickGrid / AskInputBar / WeeklyTrendChart / RecentQnaList)
    │   │   ├── Chat/    (ChatHeaderBar / UserBubble / ShifuBubble / VerdictSeal / ChatInputBar / BasisFootnote)
    │   │   ├── Journal/ (JournalFilterBar / JournalItem / FeedbackSelector)
    │   │   └── common/  (ClassicCard / ClassicDivider / SectionTitle / wuxing.ts / TopNavBar / AppRouter / EntryToDailyChat)
    │   └── styles/global.css                 ← 古典风全局样式
```

### 启动命令
```bash
cd /Users/caizaiheng/vscode/八字项目/app
npm run dev   # http://localhost:5173/
```

---

## 文档按需读取索引（不要整文件读！）

需要做某件事时，**只读对应章节**：

| 任务 | 读哪个文档的哪一段 |
|------|-------------------|
| 修改 PRD 功能点 | `PRD.md` 第二章 |
| 调整里程碑 | `PRD.md` 第四章 |
| 实现公历转农历 / 排盘 | `命理分析方法论.md` 第二章 |
| 实现旺衰/用神/格局 | `命理分析方法论.md` 第三章 |
| 查藏干/纳音/十神/神煞表 | `命理分析方法论.md` 第五章 |
| 写消费者报告文案模板 | `需求说明书.md` 1.6 + `输出模板.md` 模板二 |
| 写专业模式数据展示 | `输出模板.md` 模板一 |

---

## 新对话启动模板（复制即用）

```
请只读 /Users/caizaiheng/vscode/八字项目/docs/CONTEXT.md 了解上下文，
然后开始 [具体任务]。
需要细节时再读对应文档章节，禁止读取任何文档全文。
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-25 | 创建 CONTEXT.md，UI 原型已完成 |
| 2026-04-26 | M7 文档完整化：输出模板.md 新增模板三（4 场景 + 先生三段式 + 张三案例）、PRD.md 补 M7.1-M7.6 详细里程碑、需求说明书.md 补 2.10 字段级需求 |
| 2026-04-26 | architecture.html ⑨ M7 模块补强：新增 M7.1-M7.6 子模块卡、违禁词硬拦截清单、健康/法律免责自动注入、命理日记数据结构与容量策略 |
| 2026-04-26 | 修正本表「每日对话」进度的错误记录：UI 原型实际只完成类型定义层，组件/页面为 0，已拆分为 3 行如实呈现 |
| 2026-04-26 | 输出模板.md 新增「模板四：M7 实施蓝图」：完整页面流转图 + Dashboard/Chat/Journal/ResultPage 低保真线框图 + 21 个新建组件清单 + 路由表 + Store 扩展 + Mock 清单 + 7 步交付里程碑（约 5.5 天）。对齐 3 项关键设计：Dashboard 为默认主页 / 聊天流式单页 / 4 场景快捷入口 |
| 2026-04-26 | **M7 UI 原型全量落地**：按「模板四」7 步里程碑逐步交付完成 — ①路由化改造（react-router-dom + 6 条路由 + AppRouter 中转）②Mock 四件套（dailyDashboard/shifuReplies/journalRecords/replyMatcher）③DashboardPage + 6 组件 ④ChatPage + 6 组件（聊天流 + 三段式印章气泡）⑤JournalPage + 3 组件（时间线 + 筛选 + 反馈回填）⑥Store 扩展 DailyState + localStorage 双键持久化（bazi:chart / bazi:journal）+ 200 条容量策略 ⑦联调 & tsc/lint 零错误。类型补齐 ChatMessage / Feedback。预估 5.5 天实际一次会话完成。 |
| 2026-04-26 | **lunar-javascript 选型验证 + Mock 迁移到蔡蔡**：①npm 装 lunar-javascript（替代自研排盘）②写 `app/verify-bazi.mjs` 用蔡蔡（1993-12-07 06:00 男）跑通四柱「癸酉·癸亥·壬戌·癸卯」+ 藏干十神纳音 + 大运 8 步 + 流年（2026 丙午）+ 流日（2026-04-26 庚午），全部精度通过 ③mockBaziChart 从张三整体重写为蔡蔡（壬水极旺 / 调候用神木火 / 比劫格 / 11 岁逆行起运），mockConsumerReport 8 段全文重写以匹配水极旺命局 ④mockDailyFortune 同步迁到庚午日、InputForm 默认值改为蔡蔡 ⑤tsc/lint 零错误。verify-bazi.mjs 保留供 M1 引擎封装参考。 |
| 2026-04-26 | **多法同断（Convergence）特殊标记上线**：①types/bazi.ts 新增 `Convergence` 接口，挂载到 `KeyFinding / WangShuai / YongShen / ConsumerReport.explanation / ConsumerReport.guidance.points` 五处 ②蔡蔡 mock 标注 7 处多法同断（含 6 条 keyFindings 中的 5 条 + 旺衰 4 法 + 用神 3 法 + 消费者出路 4 点）③global.css 新增金色印章/金边/证据链/柔和注脚共 5 套样式 ④专业模式：金色双印章 `⊙⊙ 多法同断` + 金边卡 + 默认展开证据链（KeyFindings/WangShuaiChain/YongShen 全覆盖）⑤消费者模式：解释段加 `📿` 念珠柔和注脚，出路段加金色右上角标 `⊙⊙ 多法同断` ⑥tsc/lint 零错误 |
| 2026-04-26 | **执行计划落盘**：`docs/EXECUTION_PLAN.md` v1，B 命理师 MVP + 标准引擎 + 规则模板路线，8 周 7 里程碑（M1 排盘 / M2 分析 / M3 报告 / M4 神煞 / M5 大运 / M6 增强 / M7 每日对话），含三点估时 ×1.5 缓冲，总工期 46 个工作日 |
| 2026-04-26 | **M1.1 排盘引擎封装完成**：`app/src/engine/baziEngine.ts` 封装 lunar-javascript → BaziChart 基础字段（basicInfo/pillars/daYuns/qiYunDirection），核心 API `computeBazi(input)` + `buildChartWithFallback(input)`（fallback 保留 mock 字段不破坏 UI）。三处关键修复：①大运十神用 `LunarUtil.SHI_SHEN` 真实计算（非占位）②大运简评 `buildDaYunBrief()` 兜底文案 ③大运方向用标准命理规则 `computeDirection(yearGan, gender)`（非相邻天干差）。`app/verify-engine.mjs` 自验脚本对蔡蔡案例 **68 项字段（basicInfo×3 + pillars×24 + daYuns×40 + qiYunDirection×1）100% 对齐 mock 静态字段**，tsc/lint 零错误。 |
| 2026-04-26 | **M1.2 useBaziStore 接入 engine**：`store.submit` 从 `{...mockBaziChart, basicInfo: {覆盖几个字段}}` 改为 `buildChartWithFallback(data)`，让 InputForm 的真实输入端到端流到 UI。`app/verify-m1.2.mjs` 跑 3 组生辰（蔡蔡基线 + 1990-06-15 14:30 女 + 2000-01-01 00:30 男）确认四柱真的随输入变化（不再固定蔡蔡）。lint 零错。 |
| 2026-04-26 | **M1.3 真实生辰回归 5 组全绿**：`app/verify-m1.3.mjs` 覆盖 5 组命理边界场景共 10 项断言全部通过 — ①C1 蔡蔡基线（4 项断言）②C2 早子时换日（23:30 → 次日日柱）③C3 节气交界（大雪当天前后月支切换）④C4 1949-10-01 跨世纪老案（年柱己丑 + 月支酉验证）⑤C5 阳年女命大运逆行（1992 壬申年女）。lunar-javascript 在所有边界场景下表现稳定，可放心进入 M2。 |
| 2026-04-26 | **M2.1 五行统计引擎完成**：`app/src/engine/wuxingAnalyzer.ts` 实现 `analyzeWuxing(pillars) → WuXingStat[]`。严格对齐 mock/baziChart.ts 既定口径：tianGanCount=4 天干本气、diZhiCount=4 地支本气、cangGanCount=所有藏干（含本气，故地支本气在 diZhi 和 cangGan 各计一次）。蔡蔡基线 100% 对齐 mock（金3/木3/水6/火1/土2，% 20/20/40/7/13）。已接入 `buildChartWithFallback`，wuxingStats 字段从 mock 兜底改为真实计算。`app/verify-m2.1.mjs` 6 项断言全绿（C1 基线对齐 / C2 强火局火≥3 / C3 百分比合=100 / C4 百分比舍入修正）。lint 零错。**关键经验**：①自检发现初版按"地支本气 ≠ 藏干"算法与 mock 不匹配，遂回头读 mock 注释反推真实口径并对齐——避免了"我认为更准确"的假设实现污染数据。②加固防御：`pillars.length !== 4` 或藏干为空时显式抛错，避免静默产出错误数据。同步修正 baziEngine 中陈旧注释（M4 → M2.3）。 |
