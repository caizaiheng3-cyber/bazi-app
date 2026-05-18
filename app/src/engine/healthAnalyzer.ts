/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 健康细论分析器（Health Analyzer）
//
// 命理学方法论：
//   §9.1 五行 → 脏腑映射（黄帝内经 + 子平传统）：
//     木 → 肝（脏）/ 胆（腑）
//     火 → 心（脏）/ 小肠（腑）
//     土 → 脾（脏）/ 胃（腑）
//     金 → 肺（脏）/ 大肠（腑）
//     水 → 肾（脏）/ 膀胱（腑）
//   §9.2 五行偏枯 → 脏腑虚弱原理：
//     - 某五行过弱（被克制 / 缺失）→ 对应脏腑虚弱
//     - 某五行过旺（独旺 / 党多）→ 对应脏腑亢盛/上火
//     - 五行均衡 → 健康基础好
//   §9.3 体质分类：
//     - 火旺：阳旺火热（易上火、心血管）
//     - 水旺：阴盛寒凉（易虚寒、肾水问题）
//     - 木旺：肝郁（易怒、神经系统）
//     - 土旺：脾湿（消化、湿气重）
//     - 金旺：肺燥（呼吸、皮肤干燥）
//   §9.4 危险年判定：
//     - 流年冲日支：身体波动年（日主代表自身）
//     - 大运为忌神 + 流年伏吟/反吟 → 慢性消耗
//     - 岁运并临 → 凶吉倍增
//   §9.5 调养方向：
//     - 食疗：用神五行所属食物（多食用神色/味）
//     - 运动：忌神五行需平衡的运动（火多则游泳、水多则慢跑）
//     - 起居：忌神五行对应作息时段需调整

import type {
  Constitution,
  DaYun,
  DiZhi,
  HealthAnalysis,
  HealthEvent,
  HealthEventType,
  OrganHealthInfo,
  Pillar,
  TianGan,
  WangShuai,
  WuXing,
  WuXingStat,
  YongShen,
} from '../types/bazi';
import { filterAndRankEvents, MODULE_EVENT_LIMITS } from './eventsFilter';

const ALL_WX: WuXing[] = ['木', '火', '土', '金', '水'];

const GAN_TO_WX_HEALTH: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const TIAN_GAN_LIST: TianGan[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI_LIST: DiZhi[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getYearGanZhi(year: number) {
  const offset = (year - 1864) 