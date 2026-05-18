/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// M2.6 keyFindings 整合引擎
//
// ⚠️ 基于 wangShuai / yongShen / geJu / shenShas / wuxingStats / pillars 六大数据源，
// 按规则引擎模式逐条检测"条件→结论"，自动生成 KeyFinding[] + 多法同断 Convergence。
//
// 规则清单（按优先级排列）：
//   R1 旺衰异常（极旺/极弱）→ red + convergence
//   R2 调候急需（冬火/夏水等）→ yellow + convergence
//   R3 五行偏枯（某五行 ≥35