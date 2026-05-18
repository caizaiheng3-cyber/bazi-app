/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 学业细论分析器（Education Analyzer）
//
// 命理学方法论：
//   §11.1 印星 = 学历/导师/平台/学问
//     - 正印：正规学历、师长、文凭、官方背书
//     - 偏印：偏才异学、技艺、玄学、独特悟性
//   §11.2 学业组合：
//     - 食神 + 正印 = 学问家（最佳组合，宜深造）
//     - 伤官 + 正印 = 才艺学者（有创意有名气）
//     - 官印相生 = 升学+平台双吉
//     - 印星空亡 = 学业坎坷
//   §11.3 文昌贵人（按日干起）：
//     甲日见巳、乙日见午、丙戊日见申、丁己日见酉
//     庚日见亥、辛日见子、壬日见寅、癸日见卯
//   §11.4 学堂 = 长生位（按日干）
//     §11.5 词馆 = 临官位（按日干）

import type {
  ChartRelations,
  DaYun,
  DiZhi,
  EducationAnalysis,
  EducationEvent,
  EducationShenSha,
  EducationStarInfo,
  ManifestLevel,
  Pillar,
  ShiShen,
  ShiShenManifestation,
  TianGan,
  WuXing,
  YongShen,
} from '../types/bazi';
import { filterAndRankEvents, MODULE_EVENT_LIMITS } from './eventsFilter';

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const ZHI_TO_WX: Record<DiZhi, WuXing> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金',
  亥: '水', 子: '水', 辰: '土', 未: '土', 戌: '土', 丑: '土',
};
const GAN_YIN_YANG: Record<TianGan, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};
const KE_MAP: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const SHENG_MAP: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

void SHENG_MAP; // 保留以备扩展（其他规则可能用到）

const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI_LIST: DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getYearGanZhi(year: number) {
  const offset = (year - 1864) 