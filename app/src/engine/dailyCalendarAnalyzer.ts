/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 日级吉凶日历分析器（Daily Calendar Analyzer）
//
// 命理学方法论：
//   §15.1 日干支推算：
//     - 给定公历日期 → 农历日干支
//     - 简化算法：以已知锚点日（如 1900-01-31 = 甲辰日）+ 偏移
//   §15.2 日级吉凶判断：
//     - 日干与命主日干：比肩=平 / 食伤=吉 / 财官=吉 / 印=吉 / 七杀冲=凶
//     - 日支与命主日支：合=吉 / 冲=凶 / 刑=凶 / 同=伏吟
//   §15.3 综合 fortune：
//     - great-auspicious：天合地合
//     - auspicious：合或同类十神
//     - neutral：无关
//     - inauspicious：单冲单刑
//     - great-inauspicious：天克地冲

import type {
  DailyCalendarAnalysis,
  DailyFortuneInfo,
  DiZhi,
  Pillar,
  ShiShen,
  TianGan,
  WuXing,
} from '../types/bazi';

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const GAN_YIN_YANG: Record<TianGan, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};
const KE_MAP: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const SHENG_MAP: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI_LIST: DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const ZHI_CHONG: Record<DiZhi, DiZhi> = {
  子: '午', 午: '子', 卯: '酉', 酉: '卯', 寅: '申', 申: '寅',
  巳: '亥', 亥: '巳', 辰: '戌', 戌: '辰', 丑: '未', 未: '丑',
};
const ZHI_LIU_HE: Record<DiZhi, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};
const GAN_HE: Record<TianGan, TianGan> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙',
  丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
};

function computeShiShen(dayGan: TianGan, otherGan: TianGan): ShiShen {
  if (dayGan === otherGan) return '比肩';
  const dayWx = GAN_TO_WX[dayGan];
  const otherWx = GAN_TO_WX[otherGan];
  const sameYy = GAN_YIN_YANG[dayGan] === GAN_YIN_YANG[otherGan];
  if (otherWx === dayWx) return sameYy ? '比肩' : '劫财';
  if (SHENG_MAP[dayWx] === otherWx) return sameYy ? '食神' : '伤官';
  if (KE_MAP[dayWx] === otherWx) return sameYy ? '偏财' : '正财';
  if (KE_MAP[otherWx] === dayWx) return sameYy ? '七杀' : '正官';
  if (SHENG_MAP[otherWx] === dayWx) return sameYy ? '偏印' : '正印';
  return '比肩';
}

/**
 * 公历日期 → 日干支
 * 锚点：2000-01-01 = 戊午日（实际为戊午日）
 * 算法：从锚点起偏移天数，对 60 取模
 */
const ANCHOR_DATE = new Date(Date.UTC(2000, 0, 1));
const ANCHOR_GAN_IDX = 4; // 戊
const ANCHOR_ZHI_IDX = 6; // 午

function getDateGanZhi(year: number, month: number, day: number): { gan: TianGan; zhi: DiZhi; ganZhi: string } {
  const target = new Date(Date.UTC(year, month - 1, day));
  const diffDays = Math.floor((target.getTime() - ANCHOR_DATE.getTime()) / (24 * 60 * 60 * 1000));
  const ganIdx = ((ANCHOR_GAN_IDX + diffDays) 