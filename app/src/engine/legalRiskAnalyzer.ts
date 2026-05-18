/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 官非/牢狱风险分析器（Legal Risk Analyzer）
//
// 命理学方法论：
//   §13.1 风险因子：
//     - 羊刃（阳干禄前一支）：甲见卯、丙戊见午、庚见酉、壬见子
//     - 劫煞（三合局对面）
//     - 三刑齐：寅巳申/丑戌未/子卯/辰午酉亥自刑
//     - 伤官见官：命有正官 + 流年/大运伤官
//     - 官杀混杂
//     - 日支三刑
//     - 日柱反吟
//   §13.2 流年触发：
//     - 流年伤官冲命中正官 → 极凶（官非/牢狱）
//     - 流年羊刃逢冲 → 流血/手术/官非
//     - 流年构成三刑齐 → 法律纠纷

import type {
  ChartRelations,
  DaYun,
  DiZhi,
  LegalRiskAnalysis,
  LegalRiskEvent,
  LegalRiskFactor,
  ManifestLevel,
  Pillar,
  ShenSha,
  ShiShen,
  ShiShenManifestation,
  TianGan,
  WuXing,
} from '../types/bazi';
import { filterAndRankEvents, MODULE_EVENT_LIMITS } from './eventsFilter';

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

function getYearGanZhi(year: number) {
  const offset = (year - 1864) 