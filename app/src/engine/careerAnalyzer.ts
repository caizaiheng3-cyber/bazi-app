/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 事业细论分析器（Career Analyzer）
//
// 命理学方法论：
//   §8.1 事业贵人星：
//     - 正官：体制内、正派权威、按部就班升迁
//     - 七杀：实权派、创业魄力、挑战型职位、武职
//     - 官杀混杂：事业易反复，频繁换工作/职业方向
//   §8.2 事业宫 = 月柱（提纲）：
//     - 月柱十神决定事业基调
//     - 月柱五行决定行业大方向
//   §8.3 升迁/事业关键年：
//     - 大运/流年带正官 → 升职稳定
//     - 大运/流年带七杀通根 → 实权机遇
//     - 大运/流年带正印 → 平台/学历/资格证书
//     - 食神泄秀 → 才华表达期
//     - 伤官见官 → 大忌（官非/被贬/创业失败）
//   §8.4 创业 vs 打工：
//     - 官印两全 → 强烈打工
//     - 食伤生财 → 强烈创业
//     - 比劫旺 + 财弱 → 谨慎合伙

import type {
  CareerAnalysis,
  CareerEvent,
  CareerEventType,
  CareerPalaceInfo,
  CareerRisk,
  CareerType,
  ChartRelations,
  DaYun,
  DiZhi,
  ManifestLevel,
  OfficialStarInfo,
  Pillar,
  ShiShen,
  ShiShenManifestation,
  TianGan,
  WangShuai,
  WuXing,
  YongShen,
} from '../types/bazi';
import { filterAndRankEvents, MODULE_EVENT_LIMITS } from './eventsFilter';

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const ZHI_TO_WX: Record<DiZhi, WuXing> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 亥: '水', 子: '水',
  辰: '土', 未: '土', 戌: '土', 丑: '土',
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