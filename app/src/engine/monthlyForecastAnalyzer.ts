/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 流月预测分析器（Monthly Forecast Analyzer）
//
// 命理学方法论：
//   §14.1 流月推算：
//     - 节气分月（立春-惊蛰=寅月，惊蛰-清明=卯月，依此类推）
//     - 流月干支按"五虎遁"口诀：
//       甲己之年丙作首、乙庚之岁戊为头、
//       丙辛必定寻庚起、丁壬壬位顺行流、
//       戊癸甲寅之上去
//   §14.2 流月吉凶：
//     - 流月与日支合 → 当月顺利
//     - 流月与日支冲 → 当月动荡
//     - 流月与日支刑 → 当月口舌
//     - 流月与日支同 → 伏吟，旧事重提

import type {
  DaYun,
  DiZhi,
  LiuYueInfo,
  MonthlyForecastAnalysis,
  Pillar,
  TianGan,
} from '../types/bazi';

const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

const ZHI_CHONG: Record<DiZhi, DiZhi> = {
  子: '午', 午: '子', 卯: '酉', 酉: '卯', 寅: '申', 申: '寅',
  巳: '亥', 亥: '巳', 辰: '戌', 戌: '辰', 丑: '未', 未: '丑',
};
const ZHI_LIU_HE: Record<DiZhi, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};

/** 地支六害：子未、丑午、寅巳、卯辰、申亥、酉戌 */
const ZHI_LIU_HAI: Record<DiZhi, DiZhi> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉',
};

/** 三刑组对查找：返回 zhi 参与的三刑伙伴；自刑直接返回自身 */
function getXingPartners(zhi: DiZhi): DiZhi[] {
  // 寅巳申、丑戌未三刑组
  if (['寅','巳','申'].includes(zhi)) return (['寅','巳','申'] as DiZhi[]).filter((z) => z !== zhi);
  if (['丑','戌','未'].includes(zhi)) return (['丑','戌','未'] as DiZhi[]).filter((z) => z !== zhi);
  // 子卯相刑
  if (zhi === '子') return ['卯'];
  if (zhi === '卯') return ['子'];
  // 自刑
  if (['辰','午','酉','亥'].includes(zhi)) return [zhi];
  return [];
}

/** 三合局组：申子辰水、寅午戌火、巳酉丑金、亥卯未木 */
const SAN_HE_GROUPS: DiZhi[][] = [
  ['申','子','辰'], ['寅','午','戌'], ['巳','酉','丑'], ['亥','卯','未'],
];
function getSanHePartners(zhi: DiZhi): DiZhi[] {
  for (const group of SAN_HE_GROUPS) {
    if (group.includes(zhi)) return group.filter((z) => z !== zhi);
  }
  return [];
}

/** 三会方：寅卯辰东方木、巳午未南方火、申酉戌西方金、亥子丑北方水 */
const SAN_HUI_GROUPS: DiZhi[][] = [
  ['寅','卯','辰'], ['巳','午','未'], ['申','酉','戌'], ['亥','子','丑'],
];
function getSanHuiPartners(zhi: DiZhi): DiZhi[] {
  for (const group of SAN_HUI_GROUPS) {
    if (group.includes(zhi)) return group.filter((z) => z !== zhi);
  }
  return [];
}

/** 五虎遁年起月：年干 → 寅月（正月）的天干 */
const WU_HU_DUN: Record<TianGan, TianGan> = {
  甲: '丙', 己: '丙',
  乙: '戊', 庚: '戊',
  丙: '庚', 辛: '庚',
  丁: '壬', 壬: '壬',
  戊: '甲', 癸: '甲',
};

/** 12 月份对应地支（节气分月，正月=寅） */
const MONTH_ZHI: DiZhi[] = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];

/** 节气大致公历日期（每月节气起点，简化版） */
const SOLAR_TERM_START: Array<{ month: number; day: number; name: string }> = [
  { month: 2,  day: 4,  name: '立春' }, // 寅月
  { month: 3,  day: 6,  name: '惊蛰' }, // 卯月
  { month: 4,  day: 5,  name: '清明' }, // 辰月
  { month: 5,  day: 6,  name: '立夏' }, // 巳月
  { month: 6,  day: 6,  name: '芒种' }, // 午月
  { month: 7,  day: 7,  name: '小暑' }, // 未月
  { month: 8,  day: 8,  name: '立秋' }, // 申月
  { month: 9,  day: 8,  name: '白露' }, // 酉月
  { month: 10, day: 8,  name: '寒露' }, // 戌月
  { month: 11, day: 7,  name: '立冬' }, // 亥月
  { month: 12, day: 7,  name: '大雪' }, // 子月
  { month: 1,  day: 6,  name: '小寒' }, // 丑月（属上一年最末）
];

function getYearGanZhi(year: number) {
  const offset = (year - 1864) 