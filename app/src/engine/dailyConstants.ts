// 每日命理对话引擎共享常量与工具（M7）
//
// 集中管理：
//   - 天干 / 地支 → 五行映射
//   - 地支 → 时辰范围
//   - 五行 → 适宜 / 不宜活动池
//   - 时辰挑选工具（pickBestHour）
//
// 多个引擎（dailyFortuneGenerator / shifuEngine）共用此文件，
// 避免散落在多处的"五行→活动表"维护时不同步。

import type { DiZhi, TianGan, WuXing, YongShen } from '../types/bazi';

// ===== 天干/地支 → 五行 =====

export const TIAN_GAN_TO_WUXING: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

export const DI_ZHI_TO_WUXING: Record<DiZhi, WuXing> = {
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
};

// ===== 地支 → 时辰范围 =====

export const ZHI_TO_HOUR_RANGE: Record<DiZhi, string> = {
  子: '23:00-01:00',
  丑: '01:00-03:00',
  寅: '03:00-05:00',
  卯: '05:00-07:00',
  辰: '07:00-09:00',
  巳: '09:00-11:00',
  午: '11:00-13:00',
  未: '13:00-15:00',
  申: '15:00-17:00',
  酉: '17:00-19:00',
  戌: '19:00-21:00',
  亥: '21:00-23:00',
};

/** 12 时辰固定顺序（按地支序） */
export const ALL_ZHI: readonly DiZhi[] = [
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
];

/** 白天活动主时段（07:00-19:00 覆盖辰/巳/午/未/申/酉） */
const DAYTIME_ZHI: ReadonlyArray<DiZhi> = ['辰', '巳', '午', '未', '申', '酉'];

// ===== 五行 → 活动池 =====

/** 五行 → 适宜活动（按"先白领化、后传统化"的优先级排序） */
export const WUXING_TO_GOOD_ACTIONS: Record<WuXing, readonly string[]> = {
  木: ['出行', '签约', '拜访', '种植', '阅读', '谋划新事'],
  火: ['见客', '宣讲', '推广', '社交聚会', '面谈', '展示成果'],
  土: ['整理账目', '居家安顿', '审阅文书', '稳定承诺', '复盘'],
  金: ['决断要事', '签约', '处理财务', '裁定纠纷', '修整器物'],
  水: ['学习', '思考长远', '调研', '沟通协商', '休养'],
};

/** 五行 → 不宜活动 */
export const WUXING_TO_BAD_ACTIONS: Record<WuXing, readonly string[]> = {
  木: ['过度操劳', '远途奔波', '强行推进'],
  火: ['夜宴熬夜', '与人争辩', '情绪失控', '冲动决策'],
  土: ['优柔寡断', '反复改主意', '推迟必要决定'],
  金: ['硬碰硬', '动手术', '签订有争议的合约'],
  水: ['过度思虑', '钻牛角尖', '深夜独处饮酒'],
};

/** "保守类"活动白名单（凶日仅保留这些"宜"项） */
export const CONSERVATIVE_ACTIONS: readonly string[] = [
  '复盘', '阅读', '休养', '思考长远', '整理账目', '审阅文书',
];

// ===== 时辰挑选 =====

export interface PickHourOptions {
  /** 是否仅在白天时段挑选（默认 true，避免推荐子/丑等深夜时辰给白领用户） */
  daytimeOnly?: boolean;
  /** 排除的地支（如要避开"流日地支冲日支"对应时辰，可传入冲日支或刑日支等） */
  excludeZhi?: readonly DiZhi[];
}

/**
 * 选取"最吉"的单个时辰：
 *   1. 优先：地支为命主主用神五行 ∩ 不在 excludeZhi
 *   2. 次选：地支为命主次用神五行 ∩ 不在 excludeZhi
 *   3. 兜底：白天活动时段（巳午未）任一不在 excludeZhi 的；都被排除则取整个白天的第 1 个；
 *           若 daytimeOnly=false 则取所有时辰中第 1 个不被排除的
 *
 * **该函数保证返回结果为 DiZhi 类型，永远不会返回 undefined。**
 *
 * @example
 *   // 蔡蔡日主壬水，用神金土，今日为冲日支（巳冲亥日支）→ 排除巳
 *   pickBestHour(yongShen, { excludeZhi: ['巳'] }); // → '申' 或 '酉'（金）/ '辰''未''戌''丑'（土，但偏好白天）
 */
export function pickBestHour(
  yongShen: YongShen,
  options: PickHourOptions = {},
): DiZhi {
  const daytimeOnly = options.daytimeOnly !== false;
  const excludeSet = new Set<DiZhi>(options.excludeZhi ?? []);

  const candidatePool = daytimeOnly ? DAYTIME_ZHI : ALL_ZHI;

  // 第 1 档：主用神 ∩ 不被排除
  const primaryZhi = candidatePool.filter(
    (z) => yongShen.primary.includes(DI_ZHI_TO_WUXING[z]) && !excludeSet.has(z),
  );
  if (primaryZhi.length > 0) return primaryZhi[0];

  // 第 2 档：次用神 ∩ 不被排除
  const secondaryZhi = candidatePool.filter(
    (z) => yongShen.secondary.includes(DI_ZHI_TO_WUXING[z]) && !excludeSet.has(z),
  );
  if (secondaryZhi.length > 0) return secondaryZhi[0];

  // 第 3 档：白天时段 ∩ 不被排除
  const safeDaytime = DAYTIME_ZHI.filter((z) => !excludeSet.has(z));
  if (safeDaytime.length > 0) {
    // 偏好巳午未（最佳人体活动时段）
    const preferred = (['巳', '午', '未'] as DiZhi[]).find(
      (z) => safeDaytime.includes(z),
    );
    return preferred ?? safeDaytime[0];
  }

  // 第 4 档：所有 12 时辰里随便挑一个不被排除的（极端兜底）
  const anyZhi = ALL_ZHI.find((z) => !excludeSet.has(z));
  if (anyZhi) return anyZhi;

  // 12 个全被排除？理论上不可能，按合约抛错以暴露调用方 bug
  throw new Error('[pickBestHour] 全部 12 时辰均被排除，请检查 excludeZhi 入参');
}

/**
 * 选取最多 N 个吉时（用于 DailyFortune.jiShi）
 *   - 严格按 pickBestHour 的优先级（主用→次用→白天兜底）依次挑选
 *   - 同一时辰不重复
 *   - 只在主用神枯竭时才下沉到次用 / 白天兜底
 *
 * @returns 长度 [1, count] 的地支数组（至少 1 个）
 */
export function pickBestHours(
  yongShen: YongShen,
  count = 2,
  options: Omit<PickHourOptions, 'excludeZhi'> & { excludeZhi?: DiZhi[] } = {},
): DiZhi[] {
  const result: DiZhi[] = [];
  const excludeSet = new Set<DiZhi>(options.excludeZhi ?? []);

  while (result.length < count) {
    const next = pickBestHour(yongShen, {
      daytimeOnly: options.daytimeOnly,
      excludeZhi: Array.from(excludeSet),
    });
    result.push(next);
    excludeSet.add(next);

    // 防御：若 pickBestHour 因极端兜底返回了已排除的时辰（不应发生），跳出
    if (result.length >= ALL_ZHI.length) break;
  }

  return result;
}

/**
 * 时辰格式化：'巳' → '巳时（09:00-11:00）'
 */
export function formatHour(zhi: DiZhi): string {
  return `${zhi}时（${ZHI_TO_HOUR_RANGE[zhi]}）`;
}
