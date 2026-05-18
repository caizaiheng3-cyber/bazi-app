/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 财富细论分析器（Wealth Analyzer）
//
// 命理学方法论严格对照《命理分析方法论.md》及子平传统：
//
//   §7.1 财星定义：
//     - 正财（克日主之异性气，阴阳异）：工资/正业/妻财/稳定收入
//     - 偏财（克日主之同性气，阴阳同）：横财/创业/投机/情人财
//   §7.2 财库（辰戌丑未中藏正/偏财者）：
//     - 财库为命主"积累的财富仓库"
//     - 库逢冲则财气大动（吉凶看用神/忌神）
//   §7.3 财源类型：
//     - 食伤生财：日主旺 + 食伤透 + 财星藏 → 才华变现
//     - 官印化财：日主弱 + 财生官 + 印化官 → 权力变现
//     - 比劫破财：日主旺 + 财星弱 + 比劫强 → 危险信号
//     - 身财两停：日主旺 + 财星亦旺 → 最佳富格
//     - 财多身弱：日主弱 + 财星过旺 → 富屋贫人
//   §7.4 求财方位（用神五行 → 方位）：
//     - 木东、火南、金西、水北、土中
//   §7.5 财运周期（按强度）：
//     1. 大运为财星五行（10 年级财运高峰）
//     2. 流年正财通根（当年正业增收）
//     3. 流年偏财通根（当年横财机会）
//     4. 流年冲开财库（财气大动）
//     5. 流年比劫透出（破财警示）

import type {
  ChartRelations,
  DaYun,
  DiZhi,
  ManifestLevel,
  Pillar,
  ShenSha,
  ShiShen,
  ShiShenManifestation,
  TianGan,
  WangShuai,
  WealthAnalysis,
  WealthEvent,
  WealthEventType,
  WealthRisk,
  WealthSource,
  WealthStarInfo,
  WealthVaultInfo,
  WuXing,
  WuXingStat,
  YongShen,
} from '../types/bazi';
import { filterAndRankEvents, MODULE_EVENT_LIMITS } from './eventsFilter';

// ============================================================
// 静态规则表
// ============================================================

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

const KE_MAP: Record<WuXing, WuXing> = {
  木: '土', 土: '水', 水: '火', 火: '金', 金: '木',
};

const SHENG_MAP: Record<WuXing, WuXing> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
};

/** 五行 → 方位 */
const WX_TO_DIRECTION: Record<WuXing, '东' | '南' | '西' | '北' | '中'> = {
  木: '东', 火: '南', 金: '西', 水: '北', 土: '中',
};

/** 财库地支（辰戌丑未） */
const WEALTH_VAULT_ZHI: DiZhi[] = ['辰', '戌', '丑', '未'];

/** 60 甲子流年生成器 */
const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI_LIST: DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getYearGanZhi(year: number): { gan: TianGan; zhi: DiZhi; ganZhi: string } {
  const offset = (year - 1864) 