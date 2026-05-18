/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 每日宜忌引擎（M7.2）
//
// 输入：BaziChart（含 yongShen / pillars 等）+ 当日的 DayForecast
// 输出：DailyFortune（scoreLabel + summary + shiYi + jiHui + jiShi）
//
// 核心算法：
//   1. 算分（0-100）：基于流日天干十神 + 流日地支与日支关系 + 用神/忌神配合度
//   2. 映射档位：[0,35) 小凶 / [35,55) 平 / [55,75) 小吉 / [75,100] 大吉
//   3. 生成宜/忌：按档位 + 五行属性给出 3-5 个建议事项
//   4. 吉时：调用统一的 pickBestHours，根据用神挑选 2 个时辰
//
// 共享常量与时辰挑选工具集中在 dailyConstants.ts。

import type { BaziChart, DailyFortune, WuXing } from '../types/bazi';
import type { DayForecast } from './dailyForecast';
import {
  CONSERVATIVE_ACTIONS,
  DI_ZHI_TO_WUXING,
  TIAN_GAN_TO_WUXING,
  WUXING_TO_BAD_ACTIONS,
  WUXING_TO_GOOD_ACTIONS,
  formatHour,
  pickBestHours,
} from './dailyConstants';

// ===== 算分核心 =====

/**
 * 计算"流日天干"对命主的友好度（-25 ~ +25）
 * 规则：天干为用神 → +25；为次用 → +15；为忌神 → -25；中性 → 0
 */
function scoreOfDayGan(
  forecast: DayForecast,
  primary: readonly WuXing[],
  secondary: readonly WuXing[],
  ji: readonly WuXing[],
): number {
  const wx = TIAN_GAN_TO_WUXING[forecast.tianGan];
  if (primary.includes(wx)) return 25;
  if (secondary.includes(wx)) return 15;
  if (ji.includes(wx)) return -25;
  return 0;
}

/**
 * 计算"流日地支"对命主的友好度（-22 ~ +22）
 * 同样按用/忌神判定
 */
function scoreOfDayZhi(
  forecast: DayForecast,
  primary: readonly WuXing[],
  secondary: readonly WuXing[],
  ji: readonly WuXing[],
): number {
  const wx = DI_ZHI_TO_WUXING[forecast.diZhi];
  if (primary.includes(wx)) return 22;
  if (secondary.includes(wx)) return 12;
  if (ji.includes(wx)) return -22;
  return 0;
}

/**
 * 流日地支与日支关系打分（-20 ~ +12）
 * 合 → +12（柔和，利于配合）
 * 冲 → -20（动荡，需谨慎）
 * 刑 → -12（暗损，易出口舌）
 * 害 → -8（阴损，宜避锋芒）
 * 无 → 0
 */
function scoreOfRelation(forecast: DayForecast): number {
  switch (forecast.relationToDayZhi) {
    case '合': return 12;
    case '冲': return -20;
    case '刑': return -12;
    case '害': return -8;
    default: return 0;
  }
}

/** score → 文字档位 */
function scoreToLabel(score: number): DailyFortune['scoreLabel'] {
  if (score >= 75) return '大吉';
  if (score >= 55) return '小吉';
  if (score >= 35) return '平';
  return '小凶';
}

// ===== 宜/忌生成 =====

function buildShiYi(
  forecast: DayForecast,
  yongShen: BaziChart['yongShen'],
  scoreLabel: DailyFortune['scoreLabel'],
): string[] {
  const ganWx = TIAN_GAN_TO_WUXING[forecast.tianGan];
  const zhiWx = DI_ZHI_TO_WUXING[forecast.diZhi];

  const candidate = new Set<string>();

  // 1. 当日干支若为用神 → 取其活动池
  if (yongShen.primary.includes(ganWx)) {
    WUXING_TO_GOOD_ACTIONS[ganWx].slice(0, 2).forEach((a) => candidate.add(a));
  }
  if (yongShen.primary.includes(zhiWx) && zhiWx !== ganWx) {
    WUXING_TO_GOOD_ACTIONS[zhiWx].slice(0, 2).forEach((a) => candidate.add(a));
  }

  // 2. 兜底：若候选不足，从主用神活动池补
  if (candidate.size < 3) {
    for (const wx of yongShen.primary) {
      WUXING_TO_GOOD_ACTIONS[wx].forEach((a) => candidate.add(a));
      if (candidate.size >= 4) break;
    }
  }

  // 3. 凶日时只保留"保守类"
  let result = Array.from(candidate);
  if (scoreLabel === '小凶') {
    result = result.filter((a) => CONSERVATIVE_ACTIONS.includes(a));
    if (result.length === 0) result = ['复盘', '休养', '阅读'];
  }

  return result.slice(0, 4);
}

function buildJiHui(
  forecast: DayForecast,
  yongShen: BaziChart['yongShen'],
): string[] {
  const ganWx = TIAN_GAN_TO_WUXING[forecast.tianGan];
  const zhiWx = DI_ZHI_TO_WUXING[forecast.diZhi];

  const candidate = new Set<string>();

  if (yongShen.ji.includes(ganWx)) {
    WUXING_TO_BAD_ACTIONS[ganWx].slice(0, 2).forEach((a) => candidate.add(a));
  }
  if (yongShen.ji.includes(zhiWx) && zhiWx !== ganWx) {
    WUXING_TO_BAD_ACTIONS[zhiWx].slice(0, 2).forEach((a) => candidate.add(a));
  }

  if (forecast.relationToDayZhi === '冲') {
    candidate.add('远行');
    candidate.add('动土');
  } else if (forecast.relationToDayZhi === '刑') {
    candidate.add('与人争辩');
    candidate.add('硬性谈判');
  } else if (forecast.relationToDayZhi === '害') {
    candidate.add('过度操劳');
  }

  if (candidate.size < 2) {
    candidate.add('情绪失控');
    candidate.add('过度劳神');
  }

  return Array.from(candidate).slice(0, 3);
}

// ===== 吉时生成（统一调用 pickBestHours） =====

function buildJiShi(
  yongShen: BaziChart['yongShen'],
  forecast: DayForecast,
): DailyFortune['jiShi'] {
  // 排除：与流日地支冲日支的"敏感时辰"——若冲，则排除当日地支本身
  // （时辰若与命主日支再次构成关系，会增添冲突）
  const exclude = forecast.relationToDayZhi === '冲' ? [forecast.diZhi] : [];

  const picks = pickBestHours(yongShen, 2, { excludeZhi: exclude });

  return picks.map((zhi) => {
    const wx = DI_ZHI_TO_WUXING[zhi];
    const isPrimary = yongShen.primary.includes(wx);
    const isSecondary = yongShen.secondary.includes(wx);
    return {
      range: formatHour(zhi),
      reason: isPrimary
        ? `${zhi}（${wx}）正为您主用神，气场最合，宜重要决策`
        : isSecondary
          ? `${zhi}（${wx}）为您次用神，气场顺意，宜常规事务`
          : `${zhi}时人气活跃，宜常规事务`,
    };
  });
}

// ===== 总结句生成 =====

function buildSummary(
  forecast: DayForecast,
  scoreLabel: DailyFortune['scoreLabel'],
  yongShen: BaziChart['yongShen'],
): string {
  const ganWx = TIAN_GAN_TO_WUXING[forecast.tianGan];
  const isGanYong = yongShen.primary.includes(ganWx);
  const isGanJi = yongShen.ji.includes(ganWx);
  const rel = forecast.relationToDayZhi;

  const tone = scoreLabel === '大吉'
    ? '今日气场最合您'
    : scoreLabel === '小吉'
      ? '今日整体顺意'
      : scoreLabel === '平'
        ? '今日气场平稳'
        : '今日气场略有起伏';

  let detail = '';
  if (isGanYong) {
    detail = `${forecast.tianGan}（${ganWx}）正为您用神，宜出宜动`;
  } else if (isGanJi) {
    detail = `${forecast.tianGan}（${ganWx}）为您所忌，宜守不宜攻`;
  } else {
    detail = `${forecast.tianGan}${forecast.diZhi}日气场中性`;
  }

  let relExtra = '';
  if (rel === '冲') relExtra = '；地支与日支相冲，行事宜稳';
  else if (rel === '合') relExtra = '；地支与日支相合，宜配合谈事';
  else if (rel === '刑') relExtra = '；地支相刑，慎口舌';
  else if (rel === '害') relExtra = '；地支相害，避锋芒';

  return `先生看来，${tone}——${detail}${relExtra}。`;
}

// ===== 主入口 =====

export interface DayScore {
  total: number;
  parts: {
    gan: number;
    zhi: number;
    relation: number;
  };
}

/**
 * 计算单日打分（暴露给 weekly trend 复用）
 */
export function computeDayScore(
  chart: BaziChart,
  forecast: DayForecast,
): DayScore {
  const ys = chart.yongShen;
  const gan = scoreOfDayGan(forecast, ys.primary, ys.secondary, ys.ji);
  const zhi = scoreOfDayZhi(forecast, ys.primary, ys.secondary, ys.ji);
  const relation = scoreOfRelation(forecast);
  // 基础分 50；总分裁剪在 0-100
  const total = Math.max(0, Math.min(100, 50 + gan + zhi + relation));
  return { total, parts: { gan, zhi, relation } };
}

/**
 * 生成完整每日宜忌
 */
export function generateDailyFortune(
  chart: BaziChart,
  forecast: DayForecast,
): DailyFortune {
  const score = computeDayScore(chart, forecast);
  const scoreLabel = scoreToLabel(score.total);

  return {
    date: forecast.date,
    lunarDate: forecast.lunarDate,
    ganZhi: forecast.ganZhi,
    shiShen: forecast.shiShen,
    scoreLabel,
    summary: buildSummary(forecast, scoreLabel, chart.yongShen),
    shiYi: buildShiYi(forecast, chart.yongShen, scoreLabel),
    jiHui: buildJiHui(forecast, chart.yongShen),
    jiShi: buildJiShi(chart.yongShen, forecast),
  };
}