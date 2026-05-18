/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 出行/搬迁分析器（Travel Analyzer）
//
// 命理学方法论：
//   §12.1 驿马星：
//     - 申子辰 → 驿马在寅
//     - 寅午戌 → 驿马在申
//     - 巳酉丑 → 驿马在亥
//     - 亥卯未 → 驿马在巳
//   §12.2 命中驿马：好动、喜出门、易远行、海外有缘
//   §12.3 大运/流年带驿马 → 必有搬迁/出差/出国
//   §12.4 驿马逢冲 → 必动且急
//        驿马合住 → 想动不动

import type {
  DaYun,
  DiZhi,
  Pillar,
  PillarPosition,
  TianGan,
  TravelAnalysis,
  TravelEvent,
  YiMaInfo,
} from '../types/bazi';
import { filterAndRankEvents, MODULE_EVENT_LIMITS } from './eventsFilter';

const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI_LIST: DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getYearGanZhi(year: number) {
  const offset = (year - 1864) 