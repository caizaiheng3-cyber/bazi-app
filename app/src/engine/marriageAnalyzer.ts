/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 婚姻细论分析器（Marriage Analyzer）
//
// 命理学方法论严格对照《命理分析方法论.md》及子平传统：
//
//   §6.1 配偶星定义：
//     - 男命：正财=妻、偏财=次妻/情人
//     - 女命：正官=夫、七杀=次夫/情人
//   §6.2 配偶宫 = 日支：
//     - 日支藏干即"配偶画像"（配偶的性格类型）
//     - 日支被合 → 配偶易被夺 / 命主重感情
//     - 日支被冲 → 婚姻动荡 / 易分居
//     - 日支三刑 → 婚姻有官非纠纷 / 健康问题
//     - 日支自坐配偶星 → 配偶就在身边、感情紧密
//   §6.3 婚期信号（按强度排序）：
//     1. 大运合日支（最强信号，10 年级婚动期）
//     2. 流年合日支（当年应婚）
//     3. 配偶星到位年（流年=配偶星五行）
//     4. 桃花年/红艳年/天喜年（恋情/异性缘）
//     5. 反吟冲日支（婚变/分居/感情挫折）
//     6. 伏吟日柱（旧情复发/感情停滞）
//   §6.4 婚姻质量评分：
//     - 5 分：配偶星 manifest-strong + 日支用神 + 无冲刑
//     - 4 分：配偶星实质有力 + 风险<2
//     - 3 分：配偶星显象一般 + 有 1-2 个风险点
//     - 2 分：配偶星 absent-empty 或日支被冲
//     - 1 分：多重风险（官杀混杂 + 日支冲刑 + 配偶星空亡）

import type {
  BasicInfo,
  ChartRelations,
  DaYun,
  DiZhi,
  Gender,
  MarriageAnalysis,
  MarriageEvent,
  MarriageEventType,
  MarriageRisk,
  PeachBlossomInfo,
  Pillar,
  PillarPosition,
  ShenSha,
  ShiShen,
  ShiShenManifestation,
  SpousePalaceInfo,
  SpouseStarInfo,
  TianGan,
  WuXing,
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

/** 天干阴阳：阳干 + 阴干 */
const GAN_YIN_YANG: Record<TianGan, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};

/** 五行相克：克者 → 被克 */
const KE_MAP: Record<WuXing, WuXing> = {
  木: '土', 土: '水', 水: '火', 火: '金', 金: '木',
};
/** 五行相生：生者 → 被生 */
const SHENG_MAP: Record<WuXing, WuXing> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
};

/** 地支六合表（用于婚期推算：流年/大运合日支） */
const ZHI_LIU_HE: Record<DiZhi, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅',
  卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰',
  巳: '申', 申: '巳', 午: '未', 未: '午',
};

/** 地支六冲表 */
const ZHI_CHONG: Record<DiZhi, DiZhi> = {
  子: '午', 午: '子', 卯: '酉', 酉: '卯',
  寅: '申', 申: '寅', 巳: '亥', 亥: '巳',
  辰: '戌', 戌: '辰', 丑: '未', 未: '丑',
};

/** 三刑表（用于配偶宫风险判定） */
const SAN_XING_GROUPS: DiZhi[][] = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
  ['子', '卯'],
];

/** 红艳煞：日干 → 红艳支 */
const HONG_YAN: Record<TianGan, DiZhi> = {
  甲: '午', 乙: '午', 丙: '寅', 丁: '未',
  戊: '辰', 己: '辰', 庚: '戌', 辛: '酉',
  壬: '子', 癸: '申',
};

/** 桃花表（按年支或日支三合局起，沐浴位） */
const TAO_HUA_BY_GROUP: Array<{ group: DiZhi[]; taoHua: DiZhi }> = [
  { group: ['寅', '午', '戌'], taoHua: '卯' },
  { group: ['亥', '卯', '未'], taoHua: '子' },
  { group: ['申', '子', '辰'], taoHua: '酉' },
  { group: ['巳', '酉', '丑'], taoHua: '午' },
];

/** 天喜表（按年支起，月将之对宫，简化版：年支 → 天喜支） */
const TIAN_XI: Record<DiZhi, DiZhi> = {
  子: '酉', 丑: '申', 寅: '未', 卯: '午', 辰: '巳',
  巳: '辰', 午: '卯', 未: '寅', 申: '丑', 酉: '子',
  戌: '亥', 亥: '戌',
};

/** 60 甲子流年生成器（用于婚期推算遍历） */
const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI_LIST: DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getYearGanZhi(year: number): { gan: TianGan; zhi: DiZhi; ganZhi: string } {
  // 1864 年为甲子
  const offset = (year - 1864) 