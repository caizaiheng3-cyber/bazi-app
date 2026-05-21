# 文档治理细则

> 本文件定义项目的文档归属规则、命名规范、更新流程。被 `CLAUDE.md` 引用，不需要每次会话主动读取——只在新建/移动/重命名文件时查阅。

---

## 一、目录归属规则

### 决策树：新文件应该放在哪里？

```
这个文件是……
├─ 命理计算逻辑（纯Python）→ engine/
├─ AI prompt / Jinja2模板 / 输出规范 → report/
│   ├─ prompt 文件 → report/prompts/
│   ├─ Jinja2 骨架模板 → report/templates/
│   ├─ 方法论 / SOP / 评估标准 → report/spec/
│   └─ 优质标杆案例（已晋升）→ report/examples/{命主名}/
├─ 手工推算的过程数据 → casework/{命主名}/
│   └─ 质量达标后晋升 → report/examples/
├─ 产品设计 / 项目文档 → docs/
├─ 自动化测试 → tests/
├─ Web 应用代码 → web/
├─ 部署配置 → deploy/
└─ 辅助脚本 → scripts/
```

### 各目录的文件类型限制

| 目录 | 允许的文件类型 | 不允许的 |
|------|--------------|---------|
| `engine/` | `.py` | prompt、模板、文档 |
| `report/prompts/` | `.md`（prompt 文件） | Python 代码 |
| `report/templates/` | `.md.j2`（Jinja2 模板） | — |
| `report/spec/` | `.md`（方法论/SOP） | — |
| `report/examples/` | `.md` + `.json`（排盘数据） | 骨架文件（骨架留在 casework） |
| `casework/` | `.md` + `.json` | — |
| `tests/` | `test_*.py` | — |
| `docs/` | `.md` + 图片 | 代码文件 |

---

## 二、命名规范

### 2.1 casework 文件命名

```
casework/{命主名}/
├── {命主名}-排盘数据.json
├── {命主名}-命理师版.md
├── {命主名}-命理师版-骨架.md
├── {命主名}-消费者版.md
├── {命主名}-消费者版-骨架.md
├── {命主名}-微信版.md
├── {命主名}-微信版-骨架.md
└── {命主名}-索引.md  或  {命主名}-索引-骨架.md
```

如有版本迭代，目录名加版本后缀：`casework/{命主名}-v2验证/`

### 2.2 测试文件命名

```
tests/
├── test_golden_cases.py      # 黄金案例回归（旺衰/格局/用神）
├── test_kongwang.py           # P0: 空亡/胎元/命宫
├── test_shenshas.py           # P2: 神煞扩展
├── test_liunian_relations.py  # P4: 流年合冲关系
├── test_precision.py          # P5: 精准度基准
└── test_{功能名}.py           # 未来新增按功能命名
```

规则：`test_` 前缀 + 功能名（非模块名）。一个测试文件对应一个独立的功能域。

### 2.3 report/examples 命名

晋升到 `report/examples/` 时统一命名：
```
report/examples/{命主名}/
├── {命主名}-命理师版.md
├── {命主名}-消费者版.md
├── {命主名}-微信版.md
└── {命主名}-索引.md
```

不保留骨架文件（骨架留在 casework 原目录中）。

---

## 三、版本迭代与文档更新

### 3.1 引擎层修改时

- 修改 `engine/rules.py` 的函数签名或返回值结构 → 检查并更新 `report/generator.py` 和 `web/backend/app/services/report_service.py`
- 新增命理能力（如新增神煞类型）→ 同步更新 `report/spec/命理分析方法论.md` 的对应章节
- 新增/修改 GOLDEN_CASES → 需要人工确认 expected 值

### 3.2 报告层修改时

- 修改 prompt → 用至少 2 个 casework 案例验证生成质量
- 修改模板结构 → 检查 `report_service.py` 的模板变量传递
- 新增优质案例 → 走晋升流程（casework → 人工评审 → report/examples）

### 3.3 应用层修改时

- 新增 API 端点 → 更新 `web/PROJECT_STATUS.md`
- 前端界面变化 → 浏览器中实际验证

---

## 四、casework 晋升 report/examples 流程

1. 在 `casework/{命主名}/` 中完成推算，生成完整的命理师版、消费者版、微信版
2. 人工评审：逐段审阅报告质量，确认优于现有标杆
3. 用户明确要求晋升后，Claude 执行：
   - 将最终版报告复制到 `report/examples/{命主名}/`
   - 去掉骨架文件（骨架留在 casework）
   - 更新 `report/prompts/` 中的案例引用（如有）
4. Claude **不主动**发起晋升操作

---

## 五、engine/rules.py 代码组织结构

文件按以下顺序组织（从上到下）：

```
1. 常量表和查表数据（TIANGAN, DIZHI, CANGGAN, WUXING_*, CHANGSHENG_*, 神煞表...）
2. 工具函数（_get_changsheng_state, _calc_tiangan_actual_score, _is_different_yinyang...）
3. 核心分析函数
   3a. judge_wangshuai() — 旺衰判定
   3b. adjust_wangshuai_by_relationships() — 合冲修正
   3c. analyze_relationships() — 合冲刑害检测
   3d. judge_geju() — 格局判定
   3e. judge_yongshen() — 用神忌神
   3f. analyze_shenshas() — 神煞分析
   3g. analyze_liunian() / analyze_liuyue() — 流年流月
   3h. analyze_events() — 事件推理引擎
4. EVENT_RULES 常量表
5. 文本生成函数（generate_*_text）
6. 领域画像聚合（aggregate_domain_profiles）
7. 顶层入口函数（full_analysis）
8. 命令行入口
```

新增代码应按此结构插入到合适的位置，不要随意追加到文件末尾。
