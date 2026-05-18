/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// Dashboard 整合生成器（M7.3 + M7.4）
//
// 输入：BaziChart + 锚点日期（默认今日）+ 历史日记记录
// 输出：DailyDashboard（fortune + weeklyTrend + quickScenes + recentQna）
//
// 设计要点：
//   - weeklyTrend 中 7 日打分复用 computeDayScore（保证与 fortune.scoreLabel 口径一致）
//   - quickScenes 当前为静态四件套（决策/择吉/宜忌/开放），后续可按 chart.focusAreas 个性化
//   - recentQna 由 store 层负责合并日记，本生成器只关心数据形态

import type {
  BaziChart,
  DailyDashboard,
  QnaRecord,
  WeeklyTrend,
} from '../types/bazi';
import { computeWeekForecast } from './dailyForecast';
import {
  computeDayScore,
  generateDailyFortune,
} from './dailyFortuneGenerator';

/** 数字 → 文字档位（与 dailyFortuneGenerator.scoreToLabel 同步） */
function scoreToLabel(score: number): WeeklyTrend['days'][number]['label'] {
  if (score >= 75) return '大吉';
  if (score >= 55) return '小吉';
  if (score >= 35) return '平';
  return '小凶';
}

/** 周区间字符串：04.20 - 04.26 */
function formatWeekRange(days: { date: string }[]): string {
  if (days.length === 0) return '';
  const first = days[0].date.slice(5).replace('-', '.');
  const last = days[days.length - 1].date.slice(5).replace('-', '.');
  return `${first} - ${last}`;
}

/** 默认快速场景四件套 */
const DEFAULT_QUICK_SCENES: DailyDashboard['quickScenes'] = [
  {
    scene: '决策',
    label: '决策建议',
    icon: '🤔',
    placeholder: '我该不该……',
  },
  {
    scene: '择吉',
    label: '时机择吉',
    icon: '📅',
    placeholder: '哪天最好……',
  },
  {
    scene: '宜忌',
    label: '每日宜忌',
    icon: '☀',
    placeholder: '今天宜/忌……',
  },
  {
    scene: '开放',
    label: '开放问答',
    icon: '💬',
    placeholder: '想问什么……',
  },
];

export interface GenerateDashboardOptions {
  /** 锚点日期，默认今日 */
  anchorDate?: Date;
  /** 已有日记，用于填充 recentQna（取最新 3 条） */
  journalRecords?: readonly QnaRecord[];
  /** 兜底 recentQna（journalRecords 为空时使用） */
  fallbackRecentQna?: readonly QnaRecord[];
}

/**
 * 生成完整 Daily Dashboard
 *
 * @example
 *   const dashboard = generateDailyDashboard(chart, {
 *     anchorDate: new Date('2026-04-26'),
 *     journalRecords: store.journalRecords,
 *   });
 */
export function generateDailyDashboard(
  chart: BaziChart,
  options: GenerateDashboardOptions = {},
): DailyDashboard {
  const anchor = options.anchorDate ?? new Date();
  const dayPillar = chart.pillars[2];
  const dayGan = dayPillar.tianGan;
  const dayZhi = dayPillar.diZhi;

  // —— 7 日推算（周一到周日） ——
  const weekForecasts = computeWeekForecast(dayGan, dayZhi, anchor);

  // —— 今日：定位锚点日所在的那一天 ——
  const anchorDateStr = formatYmd(anchor);
  const todayForecast =
    weekForecasts.find((f) => f.date === anchorDateStr) ?? weekForecasts[0];

  // —— 今日宜忌 ——
  const fortune = generateDailyFortune(chart, todayForecast);

  // —— 本周曲线 ——
  const weeklyTrend: WeeklyTrend = {
    weekRange: formatWeekRange(weekForecasts),
    days: weekForecasts.map((f) => {
      const score = computeDayScore(chart, f).total;
      return {
        date: f.dateShort,
        weekday: f.weekday,
        score,
        label: scoreToLabel(score),
        isToday: f.date === anchorDateStr,
      };
    }),
  };

  // —— 最近问答（取真实日记最新 3 条；无则走 fallback） ——
  const recentQna = pickRecentQna(
    options.journalRecords,
    options.fallbackRecentQna,
  );

  return {
    fortune,
    weeklyTrend,
    quickScenes: DEFAULT_QUICK_SCENES,
    recentQna,
  };
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pickRecentQna(
  journalRecords?: readonly QnaRecord[],
  fallback?: readonly QnaRecord[],
): QnaRecord[] {
  if (journalRecords && journalRecords.length > 0) {
    return [...journalRecords]
      .sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1))
      .slice(0, 3);
  }
  return fallback ? [...fallback] : [];
}