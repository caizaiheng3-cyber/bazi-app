/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
/**
 * 事件显著性过滤与排序工具（P3.2）
 *
 * 命理学背景：
 *   传统命理师一生论"应事年"最多 10-15 个，单领域（婚姻/财富/事业等）通常 3-8 个。
 *   引擎若把所有"流年触碰用神/忌神"的年份都列出来（如蔡命婚姻 36 个 events），
 *   会让命主无法识别真正关键的年份，反而"信号过多 = 没有信号"。
 *
 * 解决方案：
 *   ① 显著性过滤：剔除 weak strength + neutral tendency 的低噪事件
 *   ② 加权排序：strength × tendency × 时间临近度 → 综合分
 *   ③ Top-N 截断：每模块按命理学常识设置上限
 *
 * 设计原则：
 *   - 不破坏 events 字段结构（仍是同类型数组返回）
 *   - 不依赖 analyzer 内部的 events 生成逻辑（在 return 前后处理）
 *   - 排序保留时间序（先按权重过滤 Top-N，再按 year 升序还原）
 */

/** 事件最少应有的字段 */
interface ScorableEvent {
  year: number;
  age: number;
  strength?: 'strong' | 'medium' | 'weak';
  tendency?: 'auspicious' | 'inauspicious' | 'neutral';
  severity?: 'high' | 'medium' | 'low';
}

/** 过滤选项 */
export interface FilterOptions {
  /** Top-N 上限（必传，按各模块命理常识设置） */
  topN: number;
  /** 当前年份（用于时间临近度评分），默认 new Date().getFullYear() */
  currentYear?: number;
  /** 时间临近度衰减半径（年），默认 30。年份距今越近权重越高 */
  proximityRadius?: number;
  /** 是否保留 weak 事件，默认 false（剔除）。流月/日历类时间序数据应设 true */
  keepWeak?: boolean;
  /** 是否保留 neutral tendency，默认 false（剔除）。健康类无 tendency 字段时不影响 */
  keepNeutral?: boolean;
}

/** 单维度权重表 */
const STRENGTH_WEIGHT = { strong: 3, medium: 2, weak: 1 } as const;
const TENDENCY_WEIGHT = { auspicious: 2, inauspicious: 2, neutral: 0.5 } as const;
const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

/**
 * 计算单个事件的综合显著性分（用于排序）。
 *
 * 公式：基础分(strength|severity) × tendency 加成 × 时间临近度加成
 *
 * @param ev      事件
 * @param now     当前年份
 * @param radius  临近度衰减半径
 * @returns       0-30 之间的分数（越大越重要）
 */
function scoreEvent(ev: ScorableEvent, now: number, radius: number): number {
  // 基础分：优先 severity（官非类用），其次 strength
  let base = 1;
  if (ev.severity) {
    base = SEVERITY_WEIGHT[ev.severity];
  } else if (ev.strength) {
    base = STRENGTH_WEIGHT[ev.strength];
  }

  // tendency 加成（缺字段时按中性 1.0 倍）
  const tend = ev.tendency ? TENDENCY_WEIGHT[ev.tendency] : 1.0;

  // 时间临近度：距今 0 年=1.0，距今 radius 年 → 0.3，超出 → 0.2 兜底
  // 公式：max(0.2, 1 - 0.7 × |Δ| / radius)
  const yearDelta = Math.abs(ev.year - now);
  const proximity = Math.max(0.2, 1 - (0.7 * yearDelta) / radius);

  return base * tend * proximity;
}

/**
 * 事件显著性过滤 + 排序 + Top-N 截断。
 *
 * 流程：
 *   1. 按 keepWeak / keepNeutral 选项过滤低噪事件
 *   2. 计算每个事件的显著性分
 *   3. 按分数降序取 Top-N
 *   4. 按 year 升序还原（保留时间叙事性）
 *
 * @example
 *   // 婚姻：一生最多 5 个真信号，剔除 weak + neutral
 *   const filtered = filterAndRankEvents(events, { topN: 5 });
 *
 *   // 流月：保留全部 12 月（不过滤）
 *   const filtered = filterAndRankEvents(events, { topN: 12, keepWeak: true, keepNeutral: true });
 */
export function filterAndRankEvents<T extends ScorableEvent>(
  events: readonly T[],
  options: FilterOptions,
): T[] {
  const {
    topN,
    currentYear = new Date().getFullYear(),
    proximityRadius = 30,
    keepWeak = false,
    keepNeutral = false,
  } = options;

  if (topN <= 0) {
    throw new Error(`[eventsFilter] topN 必须 > 0，实际 ${topN}`);
  }
  if (events.length === 0) return [];
  if (events.length <= topN && keepWeak && keepNeutral) {
    // 无需过滤也无需截断，直接按 year 排序返回
    return [...events].sort((a, b) => a.year - b.year);
  }

  // ① 过滤
  const filtered = events.filter(ev => {
    if (!keepWeak && ev.strength === 'weak') return false;
    if (!keepNeutral && ev.tendency === 'neutral') return false;
    return true;
  });

  // ② 计算分数
  const scored = filtered.map(ev => ({
    event: ev,
    score: scoreEvent(ev, currentYear, proximityRadius),
  }));

  // ③ 按分数降序取 Top-N
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN);

  // ④ 按 year 升序还原
  return top.map(s => s.event).sort((a, b) => a.year - b.year);
}

/**
 * 各模块推荐的 Top-N 上限（基于命理学常识）。
 *
 * 这些数字反映"一个真正命理师在该领域会重点提示的关键年份数"，
 * 超出此数 → 信号被稀释，命主反而抓不住重点。
 */
export const MODULE_EVENT_LIMITS = {
  /** 婚姻：一生 3-5 个真信号（结婚/婚变/桃花高峰） */
  marriage: 5,
  /** 财富：发财/破财关键年 6-8 个 */
  wealth: 8,
  /** 事业：升迁/转型关键年 6-8 个 */
  career: 8,
  /** 健康：危险年 5-6 个（少而准） */
  health: 6,
  /** 学业：升学/考试关键年 4-5 个（人生学业窗口短） */
  education: 5,
  /** 出行/搬迁：驿马触发年 5-6 个 */
  travel: 6,
  /** 官非：高警惕年 4-6 个（少而准） */
  legalRisk: 6,
} as const;