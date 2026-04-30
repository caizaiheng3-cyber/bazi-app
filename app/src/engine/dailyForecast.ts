// 流年/流月/流日推算引擎（M7.1）
//
// 输入：日主天干 + 公历日期
// 输出：当日干支、农历、十神（相对日主）、地支与日支的关系（合/冲/刑/害）
//
// 核心 API：
//   - computeDayForecast(dayGan, date) → DayForecast
//   - computeWeekForecast(dayGan, anchorDate) → DayForecast[]（含 anchor 日，前后凑齐 7 日）
//   - computeCurrentLiuNian(date) / computeCurrentLiuYue(date) → 当前流年/流月干支
//   - relationOfDiZhi(zhiA, zhiB) → '合' | '冲' | '刑' | '害' | '无'

// @ts-expect-error - lunar-javascript 是纯 JS 库，无类型定义
import lunarPkg from 'lunar-javascript';
import type { DiZhi, ShiShen, TianGan } from '../types/bazi';

const { Solar, LunarUtil } = lunarPkg as {
  Solar: SolarStatic;
  LunarUtil: { SHI_SHEN: Record<string, string> };
};

interface SolarStatic {
  fromYmd(year: number, month: number, day: number): SolarInstance;
  fromDate(date: Date): SolarInstance;
}

interface SolarInstance {
  toYmd(): string;
  getYear(): number;
  getMonth(): number;
  getDay(): number;
  getWeek(): number; // 0=周日, 1=周一 ...
  next(days: number): SolarInstance;
  getLunar(): LunarInstance;
}

interface LunarInstance {
  getYearInChinese(): string;
  getMonthInChinese(): string;
  getDayInChinese(): string;
  getYearInGanZhi(): string;
  getMonthInGanZhi(): string;
  getDayInGanZhi(): string;
}

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

/** 地支六合 */
const LIU_HE: ReadonlyArray<readonly [DiZhi, DiZhi]> = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未'],
];

/** 地支六冲 */
const LIU_CHONG: ReadonlyArray<readonly [DiZhi, DiZhi]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

/** 三刑：寅巳申、丑戌未；自刑：辰辰、午午、酉酉、亥亥；相刑：子卯 */
const SAN_XING: ReadonlyArray<readonly DiZhi[]> = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
];
const ZI_XING: ReadonlyArray<DiZhi> = ['辰', '午', '酉', '亥'];
const XIANG_XING: ReadonlyArray<readonly [DiZhi, DiZhi]> = [['子', '卯']];

/** 六害 */
const LIU_HAI: ReadonlyArray<readonly [DiZhi, DiZhi]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

export type DiZhiRelation = '合' | '冲' | '刑' | '害' | '无';

/** 判断两个地支的关系（按优先级：冲 > 刑 > 害 > 合 > 无） */
export function relationOfDiZhi(a: DiZhi, b: DiZhi): DiZhiRelation {
  // 冲（最强烈）
  if (LIU_CHONG.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    return '冲';
  }
  // 刑
  if (SAN_XING.some((trio) => trio.includes(a) && trio.includes(b) && a !== b)) {
    return '刑';
  }
  if (XIANG_XING.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    return '刑';
  }
  if (a === b && ZI_XING.includes(a)) {
    return '刑';
  }
  // 害
  if (LIU_HAI.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    return '害';
  }
  // 合
  if (LIU_HE.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    return '合';
  }
  return '无';
}

/**
 * 计算"指定天干"相对"日主天干"的十神（复用 lunar 的 SHI_SHEN 表）
 *
 * @example shiShenOf('壬', '庚') === '偏印'
 */
export function shiShenOf(dayGan: TianGan, otherGan: TianGan): ShiShen {
  const ss = LunarUtil.SHI_SHEN[`${dayGan}${otherGan}`];
  if (!ss) {
    throw new Error(`[dailyForecast] SHI_SHEN 表缺失：${dayGan}+${otherGan}`);
  }
  return ss as ShiShen;
}

/** 单日推算结果 */
export interface DayForecast {
  /** ISO 日期：2026-04-26 */
  date: string;
  /** 短日期：04-26 */
  dateShort: string;
  /** 星期：日/一/二/三/四/五/六 */
  weekday: string;
  /** 农历日期：丙午年 三月初十 */
  lunarDate: string;
  /** 当日干支：庚午 */
  ganZhi: string;
  /** 当日天干 */
  tianGan: TianGan;
  /** 当日地支 */
  diZhi: DiZhi;
  /** 当日干对应日主的十神 */
  shiShen: ShiShen;
  /** 当日地支与命主日支的关系 */
  relationToDayZhi: DiZhiRelation;
  /** 流年干支 */
  liuNianGanZhi: string;
  /** 流月干支 */
  liuYueGanZhi: string;
}

/** 解析 Date 为 SolarInstance */
function toSolar(date: Date): SolarInstance {
  // lunar-javascript 的 fromDate 接受标准 Date 对象，按本地时区解析
  return Solar.fromDate(date);
}

/**
 * 推算单日预测信息
 *
 * @param dayGan 命主日干
 * @param dayZhi 命主日支（用于判断流日地支与命主日支的合/冲/刑/害）
 * @param date 公历日期（含时分，但仅用日历部分）
 */
export function computeDayForecast(
  dayGan: TianGan,
  dayZhi: DiZhi,
  date: Date,
): DayForecast {
  const solar = toSolar(date);
  const lunar = solar.getLunar();

  const ganZhi = lunar.getDayInGanZhi();
  if (!ganZhi || ganZhi.length < 2) {
    throw new Error(`[dailyForecast] 无法获取 ${date.toISOString()} 的日干支`);
  }
  const tianGan = ganZhi[0] as TianGan;
  const diZhi = ganZhi[1] as DiZhi;

  const y = solar.getYear();
  const m = solar.getMonth();
  const d = solar.getDay();
  const dateStr = `${y}-${pad2(m)}-${pad2(d)}`;
  const dateShort = `${pad2(m)}-${pad2(d)}`;

  return {
    date: dateStr,
    dateShort,
    weekday: WEEKDAY_CN[solar.getWeek()],
    lunarDate: `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganZhi,
    tianGan,
    diZhi,
    shiShen: shiShenOf(dayGan, tianGan),
    relationToDayZhi: relationOfDiZhi(dayZhi, diZhi),
    liuNianGanZhi: lunar.getYearInGanZhi(),
    liuYueGanZhi: lunar.getMonthInGanZhi(),
  };
}

/**
 * 推算一周（7 日）的预测：以 anchorDate 所在那一周为窗口（周一 → 周日）
 * 若 anchor 是周二，则返回 [本周一, 周二, ..., 周日]
 *
 * @param dayGan 命主日干
 * @param dayZhi 命主日支
 * @param anchorDate 锚点日期（默认为今日）
 */
export function computeWeekForecast(
  dayGan: TianGan,
  dayZhi: DiZhi,
  anchorDate: Date = new Date(),
): DayForecast[] {
  // 计算周一作为窗口起点：周日(0) → 回退 6 天，周一(1) → 回退 0 天
  const week = anchorDate.getDay(); // 0=日 ... 6=六
  const offsetToMonday = week === 0 ? -6 : 1 - week;
  const monday = new Date(anchorDate);
  monday.setHours(12, 0, 0, 0); // 用中午避免时区跨日
  monday.setDate(monday.getDate() + offsetToMonday);

  const result: DayForecast[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push(computeDayForecast(dayGan, dayZhi, d));
  }
  return result;
}

/**
 * 推算未来 N 日（含今日）的预测，用于"择吉"扫描
 */
export function computeFutureDays(
  dayGan: TianGan,
  dayZhi: DiZhi,
  days: number,
  startDate: Date = new Date(),
): DayForecast[] {
  const result: DayForecast[] = [];
  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push(computeDayForecast(dayGan, dayZhi, d));
  }
  return result;
}

/** 取当前流年干支（仅干支） */
export function computeCurrentLiuNian(date: Date = new Date()): string {
  return toSolar(date).getLunar().getYearInGanZhi();
}

/** 取当前流月干支（仅干支） */
export function computeCurrentLiuYue(date: Date = new Date()): string {
  return toSolar(date).getLunar().getMonthInGanZhi();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
