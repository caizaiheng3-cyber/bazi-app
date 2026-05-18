/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// M3 消费者报告生成引擎
//
// 基于 BaziChart 全字段 + 命理分析方法论 §5.7/§5.8 映射表，
// 自动生成 ConsumerReport 8 大段落：
//   1. imagery — 命格意象（日柱纳音→描述/关键词）
//   2. empathy — 共情段落（旺衰+用神+五行特征→2-3 段共情文案）
//   3. explanation — 解释段（keyFindings 通俗化 + 术语列表 + convergenceNotes）
//   4. guidance — 出路段（用神方向+keyFindings 中正面发现→3-5 条建议）
//   5. timeline — 时间节奏（大运→good/caution/turning）
//   6. luckyGuide — 开运指南（§5.7 五行映射表）
//   7. closing — 温暖结语
//   8. otherAreas — 其他领域简评
//
// 设计原则（对齐输出模板.md 模板二）：
//   - 共情 → 解释 → 出路
//   - 归因于命格（非个人缺陷）
//   - 指向未来（非回溯过去）
//   - 适度神秘感 + 术语点缀约 10