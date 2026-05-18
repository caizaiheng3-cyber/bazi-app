/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
/**
 * 跨模块一致性校验（P3.5）
 *
 * 命理学价值：
 *   一个真正的命理师不会把"事业 ★4 + 早年 30 年忌神大运"这两件事分开说。
 *   他会说："虽然事业格局上佳，但早年苦学难发，中年后大成"——这就是
 *   "命局静态"和"运势动态"必须互相校验的命理学原则。
 *
 *   引擎现在 8 个模块各算各的，会出现"事业 ★4-5 但 1-30 岁是忌神运 ★1-2"
 *   这种自相矛盾的输出。本模块负责检测这类矛盾，并在对应模块的 summary
 *   末尾追加"虽...但..."的修正解读。
 *
 * 检测规则（基于命理学常识）：
 *   规则 A：模块 ★ ≥ 4 + 1-30 岁段全部 ★ ≤ 2 → 早年压制型
 *     → "格局虽佳，早年蹉跎，X 岁后方显"
 *   规则 B：模块 ★ ≥ 4 + 当前所在大运 ★ ≤ 2 → 当前压制型
 *     → "本质虽好，眼下当令大运不利，宜守不宜攻"
 *   规则 C：模块 ★ ≤ 2 + 后段大运 ★ ≥ 4 → 晚成型
 *     → "原局虽弱，但 X 岁后用神运至，可期翻盘"
 *
 * 仅对：婚姻、财富、事业、学业 4 个"努力可见效"的模块做校验。
 * 健康/官非/出行：体质和性格根本盘不变，不适用此校验。
 */

import type {
  CareerAnalysis,
  DaYun,
  EducationAnalysis,
  MarriageAnalysis,
  WealthAnalysis,
} from '../types/bazi';

/** 早年大运范围：前 3 步（约 1-40 岁） */
const EARLY_DAYUN_COUNT = 3;
/** 高分模块阈值 */
const HIGH_SCORE_THRESHOLD = 4;
/** 低评分大运阈值 */
const LOW_DAYUN_SCORE_THRESHOLD = 2;

interface ModulesToEnhance {
  marriage: MarriageAnalysis;
  wealth: WealthAnalysis;
  career: CareerAnalysis;
  education: EducationAnalysis;
}

/**
 * 检测早年大运是否全部为低评分压制段。
 * 返回首个用神运起始年龄（用于"X 岁后方显"措辞）。
 */
function detectEarlySuppression(daYuns: readonly DaYun[]): {
  isEarlySuppressed: boolean;
  firstGoldenAge?: number;
  earlyAvgScore: number;
} {
  if (daYuns.length < EARLY_DAYUN_COUNT) {
    return { isEarlySuppressed: false, earlyAvgScore: 3 };
  }

  const earlyDayuns = daYuns.slice(0, EARLY_DAYUN_COUNT);
  const earlyScores = earlyDayuns
    .map(dy => dy.flowAnalysis?.score)
    .filter((s): s is number => typeof s === 'number');

  if (earlyScores.length === 0) {
    return { isEarlySuppressed: false, earlyAvgScore: 3 };
  }

  const earlyAvgScore = earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length;
  const allLow = earlyScores.every(s => s <= LOW_DAYUN_SCORE_THRESHOLD);

  // 找首个用神大运
  const firstGolden = daYuns.find(dy => {
    const role = dy.flowAnalysis?.wuxingRole;
    return (role === '用神' || role === '喜神') && (dy.flowAnalysis?.score ?? 0) >= 3;
  });

  return {
    isEarlySuppressed: allLow,
    firstGoldenAge: firstGolden?.startAge,
    earlyAvgScore,
  };
}

/**
 * 检测当前年龄所在大运是否为低评分（"当下不利"型）。
 * 默认按命主 30 岁估算（实际应用时可由调用方传入）。
 */
function detectCurrentSuppression(daYuns: readonly DaYun[], assumedAge = 30): {
  isCurrentlySuppressed: boolean;
  currentDaYunGanZhi?: string;
  nextGoldenAge?: number;
} {
  const currentDy = daYuns.find(dy => assumedAge >= dy.startAge && assumedAge <= dy.endAge);
  if (!currentDy) return { isCurrentlySuppressed: false };

  const currentScore = currentDy.flowAnalysis?.score ?? 3;
  if (currentScore > LOW_DAYUN_SCORE_THRESHOLD) {
    return { isCurrentlySuppressed: false, currentDaYunGanZhi: currentDy.ganZhi };
  }

  const nextGolden = daYuns.find(dy => {
    const role = dy.flowAnalysis?.wuxingRole;
    return dy.startAge > assumedAge && (role === '用神' || role === '喜神');
  });

  return {
    isCurrentlySuppressed: true,
    currentDaYunGanZhi: currentDy.ganZhi,
    nextGoldenAge: nextGolden?.startAge,
  };
}

/**
 * 为单个模块的 summary 追加"虽...但..."修正语。
 *
 * @param originalSummary 原 summary
 * @param moduleName      模块名（婚姻/财富/事业/学业）
 * @param qualityScore    模块评分
 * @param suppression     早年压制信息
 * @returns 修正后的 summary
 */
function appendConsistencyNote(
  originalSummary: string,
  moduleName: string,
  qualityScore: number,
  suppression: { isEarlySuppressed: boolean; firstGoldenAge?: number; earlyAvgScore: number },
): string {
  if (qualityScore < HIGH_SCORE_THRESHOLD) return originalSummary;
  if (!suppression.isEarlySuppressed) return originalSummary;
  if (!suppression.firstGoldenAge) return originalSummary;

  const prefix = `「但请注意运势节奏」`;
  const note = `${moduleName}格局虽佳（${qualityScore}星），但 1-${suppression.firstGoldenAge - 1} 岁早年大运不利（均分仅 ${suppression.earlyAvgScore.toFixed(1)} 星），努力多见挫败、收获滞后；${suppression.firstGoldenAge} 岁起入用神大运，方为${moduleName}真正起飞期，宜耐心积淀、择时而动。`;

  return `${originalSummary}
${prefix}：${note}`;
}

/**
 * 跨模块一致性校验主入口。
 *
 * 检测早年大运压制 + 模块高评分的反差，给婚姻/财富/事业/学业的 summary 加修正语。
 * 不修改原对象，返回浅拷贝（仅 summary 字段被替换）。
 *
 * @param modules  4 个易受运势影响的模块
 * @param daYuns   含 flowAnalysis 的大运数组
 */
export function enhanceWithCrossModuleConsistency(
  modules: ModulesToEnhance,
  daYuns: readonly DaYun[],
): ModulesToEnhance {
  const earlySuppression = detectEarlySuppression(daYuns);

  // 早年未压制 → 无需修正，直接返回原对象
  if (!earlySuppression.isEarlySuppressed) {
    return modules;
  }

  return {
    marriage: {
      ...modules.marriage,
      summary: appendConsistencyNote(modules.marriage.summary, '婚姻', modules.marriage.qualityScore, earlySuppression),
    },
    wealth: {
      ...modules.wealth,
      summary: appendConsistencyNote(modules.wealth.summary, '财富', modules.wealth.qualityScore, earlySuppression),
    },
    career: {
      ...modules.career,
      summary: appendConsistencyNote(modules.career.summary, '事业', modules.career.qualityScore, earlySuppression),
    },
    education: {
      ...modules.education,
      summary: appendConsistencyNote(modules.education.summary, '学业', modules.education.qualityScore, earlySuppression),
    },
  };
}

/**
 * 单独检测当前所在大运的"眼下不利"提示。
 * 此函数返回一段提示语，由调用方决定如何嵌入（如加到 reminders 数组）。
 *
 * @param daYuns      含 flowAnalysis 的大运数组
 * @param currentAge  命主当前年龄
 * @returns 提示语，无提示时返回 null
 */
export function detectCurrentDayunWarning(
  daYuns: readonly DaYun[],
  currentAge: number,
): string | null {
  const cur = detectCurrentSuppression(daYuns, currentAge);
  if (!cur.isCurrentlySuppressed) return null;

  if (cur.nextGoldenAge) {
    return `当下所处大运${cur.currentDaYunGanZhi}评分偏低（忌神段），各项"主动出击"宜暂缓，${cur.nextGoldenAge} 岁后入用神运可大展拳脚。`;
  }
  return `当下所处大运${cur.currentDaYunGanZhi}评分偏低（忌神段），各项"主动出击"宜暂缓，宜守不宜攻。`;
}