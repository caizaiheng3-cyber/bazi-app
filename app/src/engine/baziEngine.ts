/**
 * @deprecated 本文件为旧版前端 TS 排盘引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 API 不可用时的 fallback 保留，请勿新增逻辑。
 * 调用入口：useBaziStore.ts submit() 中 API 失败时的降级路径。
 */
// 排盘引擎：lunar-javascript → BaziChart 全字段
//
// 范围（M1 + M2.1-M2.6 全部完成）：
//   ✅ basicInfo / pillars（含藏干十神纳音）/ daYuns / startAge / qiYunDirection
//   ✅ wuxingStats（M2.1）
//   ✅ wangShuai（M2.2）
//   ✅ yongShen（M2.3）
//   ✅ geJu（M2.4）
//   ✅ shenShas（M2.5）
//   ✅ keyFindings（M2.6）
//
// 🎉 所有分析字段均已由引擎真实计算，不再依赖任何 mock 数据！
//
// API 参考：根目录 verify-bazi.mjs（已用蔡蔡 1993-12-07 06:00 案例验证全部输出准确）

// @ts-expect-error - lunar-javascript 是纯 JS 库，无类型定义
import lunarPkg from 'lunar-javascript';
import type {
  BasicInfo,
  BaziChart,
  DaYun,
  DiZhi,
  Pillar,
  ShiShen,
  TianGan,
} from '../types/bazi';
import type { InputData } from '../store/useBaziStore';
import { analyzeWuxing } from './wuxingAnalyzer';
import { analyzeWangShuai } from './wangShuaiAnalyzer';
import { analyzeYongShen } from './yongShenAnalyzer';
import { analyzeGeJu } from './geJuAnalyzer';
import { analyzeShenSha } from './shenShaAnalyzer';
import { analyzeKeyFindings } from './keyFindingsAnalyzer';
import { analyzePersona } from './personaAnalyzer';
import { analyzeRelations } from './relationAnalyzer';
import { applyRelationAdjustments } from './relationAdjuster';
import { analyzeAllDaYuns } from './dayunFlowAnalyzer';
import { analyzeMarriage } from './marriageAnalyzer';
import { analyzeWealth } from './wealthAnalyzer';
import { analyzeCareer } from './careerAnalyzer';
import { analyzeHealth } from './healthAnalyzer';
import { analyzeRelatives } from './relativesAnalyzer';
import { analyzeEducation } from './educationAnalyzer';
import { analyzeTravel } from './travelAnalyzer';
import { analyzeLegalRisk } from './legalRiskAnalyzer';
import { analyzeMonthlyForecast } from './monthlyForecastAnalyzer';
import { analyzeDailyCalendar } from './dailyCalendarAnalyzer';
import { analyzeCommandFactors } from './commandFactorsAnalyzer';
import { enhanceWithCrossModuleConsistency } from './crossModuleConsistency';
import { analyzeDynamics } from './dynamicsEngine';
import { generateNarrativeBook } from './narrativeBookGenerator';

const { Solar, LunarUtil } = lunarPkg as {
  Solar: SolarStatic;
  LunarUtil: { SHI_SHEN: Record<string, string> };
};

// ===== 最小化类型包装（覆盖本文件用到的 lunar API） =====

interface SolarStatic {
  fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): SolarInstance;
}

interface SolarInstance {
  toYmd(): string;
  getLunar(): LunarInstance;
}

interface JieInstance {
  getName(): string;
  /** 节气对应公历日期（lunar-javascript: getSolar() 返回 Solar 实例） */
  getSolar?(): { toYmd(): string };
}

interface LunarInstance {
  getYearInChinese(): string;
  getMonthInChinese(): string;
  getDayInChinese(): string;
  getTimeZhi(): string;
  toString(): string;
  getJieQi(): string;
  getCurrentJie(): JieInstance | null;
  getPrevJie(): JieInstance;
  getEightChar(): EightCharInstance;
}

interface EightCharInstance {
  setSect(sect: 1 | 2): void;
  getYear(): string; // 完整干支字符串如 "癸酉"
  getMonth(): string;
  getDay(): string;
  getTime(): string;
  getYearGan(): string;
  getMonthGan(): string;
  getDayGan(): string;
  getTimeGan(): string;
  getYearZhi(): string;
  getMonthZhi(): string;
  getDayZhi(): string;
  getTimeZhi(): string;
  getYearHideGan(): string[];
  getMonthHideGan(): string[];
  getDayHideGan(): string[];
  getTimeHideGan(): string[];
  getYearShiShenGan(): string;
  getMonthShiShenGan(): string;
  getTimeShiShenGan(): string;
  getYearShiShenZhi(): string[];
  getMonthShiShenZhi(): string[];
  getDayShiShenZhi(): string[];
  getTimeShiShenZhi(): string[];
  getYearNaYin(): string;
  getMonthNaYin(): string;
  getDayNaYin(): string;
  getTimeNaYin(): string;
  getYun(genderCode: 0 | 1, sect?: 1 | 2): YunInstance;
}

interface YunInstance {
  getStartYear(): number;
  getStartMonth(): number;
  getStartDay(): number;
  getStartSolar(): SolarInstance;
  getDaYun(): DaYunInstance[];
}

interface DaYunInstance {
  getGanZhi(): string; // 第 0 个是出生大运，可能为空字符串
  getStartAge(): number;
  getStartYear(): number;
  getEndYear(): number;
}

// ===== 工具：天干阴阳 + 十神映射 + 大运简评 =====

const TIAN_GAN_ORDER = '甲乙丙丁戊己庚辛壬癸';

/** 天干阴阳：甲丙戊庚壬为阳，乙丁己辛癸为阴 */
function isYangGan(gan: string): boolean {
  return TIAN_GAN_ORDER.indexOf(gan) % 2 === 0;
}

/**
 * 计算"指定天干"相对"日主天干"的十神
 * 直接使用 lunar-javascript 内置的 SHI_SHEN 表（10×10=100 项映射，
 * 已通过 verify-bazi.mjs / verify-engine.mjs / verify-m1.3.mjs 多组案例验证）
 *
 * @example getShiShen('壬', '庚') === '偏印'
 */
function getShiShen(dayGan: string, otherGan: string): ShiShen {
  const ss = LunarUtil.SHI_SHEN[`${dayGan}${otherGan}`];
  if (!ss) {
    // 防御：lunar 内部 100 项表对所有天干组合都有定义；走到此分支说明输入不是合法天干
    throw new Error(`[baziEngine] SHI_SHEN 表缺失映射：${dayGan}+${otherGan}（输入非合法天干）`);
  }
  return ss as ShiShen;
}

/**
 * 大运简评兜底文案：仅基于天干十神给出一句话定性。
 * 当前为 M1.1 阶段实现，仅按十神分类映射；
 * M2.3 用神选取完成后将升级为「结合用神/忌神 + 大运地支五行」的更具体评语。
 */
const SHI_SHEN_BRIEF: Record<string, string> = {
  比肩: '比肩坐运，自立独行之时',
  劫财: '劫财当令，需防破耗',
  食神: '食神大运，闲适生发之期',
  伤官: '伤官泄秀，才华显露之时',
  偏财: '偏财大运，机缘横财并至',
  正财: '正财得地，务实稳健之运',
  七杀: '七杀临身，压力与机遇并存',
  正官: '正官当令，事业贵气之运',
  偏印: '偏印生身，思虑深沉之时',
  正印: '正印护身，长辈/平台之助',
  日主: '同主之运，自我深化之期',
};

function buildDaYunBrief(shiShen: ShiShen): string {
  return SHI_SHEN_BRIEF[shiShen] ?? '此运待详察';
}

// ===== 工具：藏干 type 推断（本气/中气/余气） =====

/**
 * lunar-javascript 返回的藏干数组顺序固定为：
 *   - 单藏干（如 子=癸、午=丁、卯=乙、酉=辛）：[本气]
 *   - 双藏干（如 亥=壬甲、巳=丙庚、申=庚壬戊）：按经典子平派为 [本气, 中气, ...]
 *   - 三藏干（如 寅=甲丙戊、辰=戊乙癸 等）：[本气, 中气, 余气]
 *
 * 此处遵循 lunar 官方文档的语义：第 1 个为本气、第 2 个为中气、第 3 个为余气。
 */
function inferCangGanType(index: number): '本气' | '中气' | '余气' {
  if (index === 0) return '本气';
  if (index === 1) return '中气';
  return '余气';
}

// ===== 真太阳时修正 =====

// 中国主要城市经度映射（覆盖省会+常用城市+港澳台）
// 真太阳时修正公式：修正分钟 = (经度 - 120) × 4
const CITY_LONGITUDE: Record<string, number> = {
  // 直辖市
  北京: 116.4, 天津: 117.2, 上海: 121.5, 重庆: 106.5,
  // 华东
  南京: 118.8, 杭州: 120.2, 合肥: 117.3, 福州: 119.3, 南昌: 115.9,
  济南: 117.0, 青岛: 120.4, 苏州: 120.6, 无锡: 120.3, 宁波: 121.6,
  温州: 120.7, 厦门: 118.1, 泉州: 118.6, 扬州: 119.4, 徐州: 117.2,
  常州: 119.9, 绍兴: 120.6, 嘉兴: 120.8, 金华: 119.6, 台州: 121.4,
  // 华南
  广州: 113.3, 深圳: 114.1, 珠海: 113.6, 佛山: 113.1, 东莞: 113.7,
  中山: 113.4, 惠州: 114.4, 汕头: 116.7, 湛江: 110.4, 茂名: 110.9,
  南宁: 108.3, 桂林: 110.3, 柳州: 109.4, 海口: 110.3, 三亚: 109.5,
  // 华中
  武汉: 114.3, 长沙: 113.0, 郑州: 113.6, 洛阳: 112.4, 岳阳: 113.1,
  宜昌: 111.3, 襄阳: 112.1, 株洲: 113.1, 衡阳: 112.6,
  // 华北
  石家庄: 114.5, 太原: 112.5, 呼和浩特: 111.7, 包头: 109.8,
  唐山: 118.2, 秦皇岛: 119.6, 大同: 113.3, 邯郸: 114.5,
  // 东北
  沈阳: 123.4, 大连: 121.6, 长春: 125.3, 吉林: 126.6,
  哈尔滨: 126.6, 齐齐哈尔: 124.0, 鞍山: 123.0, 抚顺: 123.9,
  // 西南
  成都: 104.1, 贵阳: 106.7, 昆明: 102.7, 拉萨: 91.1,
  绵阳: 104.7, 德阳: 104.4, 泸州: 105.4, 遵义: 106.9, 大理: 100.2, 安顺: 105.9,
  // 西北
  西安: 108.9, 兰州: 103.8, 西宁: 101.8, 银川: 106.3, 乌鲁木齐: 87.6,
  咸阳: 108.7, 宝鸡: 107.1, 喀什: 75.9, 吐鲁番: 89.2,
  // 港澳台
  香港: 114.2, 澳门: 113.5, 台北: 121.5, 台中: 120.7, 高雄: 120.3,
};

/**
 * 根据出生地名称查找经度（模糊匹配）
 * 支持"广东广州"、"广州市"、"广州"等格式
 */
function findCityLongitude(birthPlace: string): number | null {
  if (!birthPlace) return null;
  const place = birthPlace.trim();
  for (const [city, longitude] of Object.entries(CITY_LONGITUDE)) {
    if (place.includes(city)) return longitude;
  }
  return null;
}

/**
 * 真太阳时修正：根据出生地经度修正北京时间
 * 公式：修正分钟 = (经度 - 120) × 4
 * 例如：乌鲁木齐(87.6°) → (87.6-120)×4 = -129.6分钟 ≈ 晚2小时10分
 */
function applyTrueSolarTimeCorrection(
  year: number, month: number, day: number,
  hour: number, minute: number,
  longitude: number,
): { year: number; month: number; day: number; hour: number; minute: number; correctionMinutes: number } {
  const correctionMinutes = Math.round((longitude - 120) * 4);
  let totalMinutes = hour * 60 + minute + correctionMinutes;

  let dayOffset = 0;
  if (totalMinutes < 0) {
    dayOffset = Math.ceil(-totalMinutes / 1440);
    totalMinutes += dayOffset * 1440;
    dayOffset = -dayOffset;
  } else if (totalMinutes >= 1440) {
    dayOffset = Math.floor(totalMinutes / 1440);
    totalMinutes -= dayOffset * 1440;
  }

  let correctedDay = day + dayOffset;
  let correctedMonth = month;
  let correctedYear = year;

  // 简单日期溢出处理（月末/月初边界）
  const daysInMonth = new Date(correctedYear, correctedMonth, 0).getDate();
  if (correctedDay > daysInMonth) {
    correctedDay -= daysInMonth;
    correctedMonth++;
    if (correctedMonth > 12) { correctedMonth = 1; correctedYear++; }
  } else if (correctedDay < 1) {
    correctedMonth--;
    if (correctedMonth < 1) { correctedMonth = 12; correctedYear--; }
    correctedDay += new Date(correctedYear, correctedMonth, 0).getDate();
  }

  return {
    year: correctedYear,
    month: correctedMonth,
    day: correctedDay,
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
    correctionMinutes,
  };
}

// ===== 输入处理 =====

interface ParsedInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  genderCode: 0 | 1; // lunar 约定：1=男, 0=女
  sect: 1 | 2; // 1=早子时换日（默认）, 2=晚子时
  trueSolarCorrectionMinutes: number; // 真太阳时修正分钟数（0=未修正）
}

function parseInput(data: InputData): ParsedInput {
  // birthDate: YYYY-MM-DD
  const [yStr, mStr, dStr] = data.birthDate.split('-');
  // birthTime: HH:mm
  const [hStr, miStr] = data.birthTime.split(':');

  let year = Number(yStr);
  let month = Number(mStr);
  let day = Number(dStr);
  let hour = Number(hStr);
  let minute = Number(miStr);
  let correctionMinutes = 0;

  // 真太阳时修正：当用户开启且有出生地时，根据经度修正
  if (data.useTrueSolarTime && data.birthPlace) {
    const longitude = findCityLongitude(data.birthPlace);
    if (longitude !== null) {
      const corrected = applyTrueSolarTimeCorrection(year, month, day, hour, minute, longitude);
      year = corrected.year;
      month = corrected.month;
      day = corrected.day;
      hour = corrected.hour;
      minute = corrected.minute;
      correctionMinutes = corrected.correctionMinutes;
    }
  }

  return {
    year, month, day, hour, minute,
    genderCode: data.gender === '男' ? 1 : 0,
    sect: data.ziShiSchool === 'early' ? 1 : 2,
    trueSolarCorrectionMinutes: correctionMinutes,
  };
}

// ===== 核心：单柱构建 =====

interface PillarRaw {
  name: string;
  ganZhi: string;
  gan: string;
  zhi: string;
  hideGan: string[];
  shiShenGan: string; // 日柱时为空字符串
  shiShenZhi: string[];
  naYin: string;
  isDayPillar: boolean;
}

function buildPillar(raw: PillarRaw): Pillar {
  const cangGan = raw.hideGan.map((gan, idx) => ({
    gan: gan as TianGan,
    type: inferCangGanType(idx),
    shiShen: raw.shiShenZhi[idx] as ShiShen,
  }));

  return {
    name: raw.name,
    tianGan: raw.gan as TianGan,
    diZhi: raw.zhi as DiZhi,
    cangGan,
    naYin: raw.naYin,
    ganShiShen: (raw.isDayPillar ? '日主' : raw.shiShenGan) as ShiShen,
    diShiShen: raw.shiShenZhi as ShiShen[],
  };
}

// ===== 主入口 =====

/** 排盘引擎计算结果（M1.1 范围内可由 lunar 直接算出的字段） */
export interface BaziEngineOutput {
  basicInfo: BasicInfo;
  pillars: BaziChart['pillars'];
  daYuns: DaYun[];
  startAge: string;
  qiYunDirection: '顺行' | '逆行';
}

/**
 * 主排盘函数：输入用户表单数据 → 输出可由 lunar 计算的部分
 *
 * @example
 *   const out = computeBazi({ name: '蔡蔡', gender: '男', birthDate: '1993-12-07', birthTime: '06:00', ... });
 *   out.pillars[2].tianGan === '壬'; // true
 */
export function computeBazi(data: InputData): BaziEngineOutput {
  const parsed = parseInput(data);

  const solar = Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(parsed.sect);

  // —— 基础信息 ——
  const solarDate = `${parsed.year}年${parsed.month}月${parsed.day}日 ${pad2(parsed.hour)}:${pad2(parsed.minute)}`;
  const lunarDate = `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`;
  const currentJie = lunar.getCurrentJie();
  const jieName = currentJie ? currentJie.getName() : lunar.getPrevJie().getName();
  const jieQiMonth = `${jieName}后（已入${eightChar.getMonthZhi()}月）`;

  const basicInfo: BasicInfo = {
    name: data.name || '匿名',
    gender: data.gender,
    solarDate,
    lunarDate,
    jieQiMonth,
    trueSolarTime: (() => {
      if (!data.useTrueSolarTime) return `${data.birthTime}（未修正）`;
      if (parsed.trueSolarCorrectionMinutes === 0) return `${data.birthTime}（已开启·未匹配到城市经度）`;
      const sign = parsed.trueSolarCorrectionMinutes > 0 ? '+' : '';
      return `${pad2(parsed.hour)}:${pad2(parsed.minute)}（真太阳时·${sign}${parsed.trueSolarCorrectionMinutes}分钟）`;
    })(),
    birthPlace: data.birthPlace || undefined,
  };

  // —— 四柱 ——
  const yearPillar = buildPillar({
    name: '年柱',
    ganZhi: eightChar.getYear(),
    gan: eightChar.getYearGan(),
    zhi: eightChar.getYearZhi(),
    hideGan: eightChar.getYearHideGan(),
    shiShenGan: eightChar.getYearShiShenGan(),
    shiShenZhi: eightChar.getYearShiShenZhi(),
    naYin: eightChar.getYearNaYin(),
    isDayPillar: false,
  });
  const monthPillar = buildPillar({
    name: '月柱',
    ganZhi: eightChar.getMonth(),
    gan: eightChar.getMonthGan(),
    zhi: eightChar.getMonthZhi(),
    hideGan: eightChar.getMonthHideGan(),
    shiShenGan: eightChar.getMonthShiShenGan(),
    shiShenZhi: eightChar.getMonthShiShenZhi(),
    naYin: eightChar.getMonthNaYin(),
    isDayPillar: false,
  });
  const dayPillar = buildPillar({
    name: '日柱',
    ganZhi: eightChar.getDay(),
    gan: eightChar.getDayGan(),
    zhi: eightChar.getDayZhi(),
    hideGan: eightChar.getDayHideGan(),
    shiShenGan: '', // 日柱不算十神（自身是日主）
    shiShenZhi: eightChar.getDayShiShenZhi(),
    naYin: eightChar.getDayNaYin(),
    isDayPillar: true,
  });
  const hourPillar = buildPillar({
    name: '时柱',
    ganZhi: eightChar.getTime(),
    gan: eightChar.getTimeGan(),
    zhi: eightChar.getTimeZhi(),
    hideGan: eightChar.getTimeHideGan(),
    shiShenGan: eightChar.getTimeShiShenGan(),
    shiShenZhi: eightChar.getTimeShiShenZhi(),
    naYin: eightChar.getTimeNaYin(),
    isDayPillar: false,
  });

  const pillars: BaziChart['pillars'] = [yearPillar, monthPillar, dayPillar, hourPillar];

  // —— 大运 ——
  const dayGan = eightChar.getDayGan();
  const yun = eightChar.getYun(parsed.genderCode);
  const rawDaYuns = yun.getDaYun();

  // lunar 返回的第 0 个是"出生大运"（干支为空），从第 1 个开始才是真正的运
  const daYuns: DaYun[] = rawDaYuns
    .filter((d, i) => i > 0 && d.getGanZhi())
    .slice(0, 8) // 取前 8 步，约 80 年
    .map((d, idx) => {
      const ganZhi = d.getGanZhi();
      const dayunGan = ganZhi[0]; // 大运天干
      const shiShen = getShiShen(dayGan, dayunGan); // 真实十神（M1.1 即实现，非占位）
      return {
        index: idx + 1,
        ganZhi,
        startAge: d.getStartAge(),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        shiShen,
        brief: buildDaYunBrief(shiShen), // 兜底简评，M2.3 用神完成后升级
      };
    });

  // —— 起运信息 ——
  const startSolar = yun.getStartSolar();
  const startAge = `${rawDaYuns[1]?.getStartAge() ?? '?'} 岁起运（精确为出生后 ${yun.getStartYear()} 年 ${yun.getStartMonth()} 个月 ${yun.getStartDay()} 天，即 ${startSolar.toYmd()} 交脱）`;

  // —— 大运排序方向 ——
  // 命理学规则：年干阳性 + 男命 / 年干阴性 + 女命 → 顺行；其余 → 逆行
  const yearGan = eightChar.getYearGan();
  const direction = computeDirection(yearGan, data.gender);

  return {
    basicInfo,
    pillars,
    daYuns,
    startAge,
    qiYunDirection: direction,
  };
}

/**
 * 大运排序方向（命理标准规则）：
 *   - 阳年男命 / 阴年女命 → 顺行（按 60 甲子下一位排）
 *   - 阴年男命 / 阳年女命 → 逆行（按 60 甲子上一位排）
 */
function computeDirection(yearGan: string, gender: '男' | '女'): '顺行' | '逆行' {
  const yangYear = isYangGan(yearGan);
  const isMale = gender === '男';
  return (yangYear === isMale) ? '顺行' : '逆行';
}

/**
 * 计算出生时刻距离当前节气的天数 + 节气名（用于动力学引擎 D10 节气深度分析）
 *
 * 命理学依据：穷通宝鉴·调候用神 — 月令本气透足/未足直接影响日主强弱判定
 *   - 节气头（0-10 天）：本气未足，旁神气势可能盖过本气
 *   - 节气中（11-20 天）：本气透足，全盘格局以月支本气为主导
 *   - 节气尾（21+ 天）：本气退气，下一节气将至
 *
 * 兜底：lunar 库未返回 getSolar() 时，daysFromJieQi 退回 15（中段）
 */
function computeJieQiInfo(data: InputData): { jieName: string; daysFromJieQi: number } {
  const parsed = parseInput(data);
  const solar = Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, 0);
  const lunar = solar.getLunar();
  const currentJie = lunar.getCurrentJie();
  const jie = currentJie ?? lunar.getPrevJie();
  const jieName = jie.getName();

  let daysFromJieQi = 15; // 兜底中段值
  if (typeof jie.getSolar === 'function') {
    try {
      const jieSolarYmd = jie.getSolar()!.toYmd(); // "YYYY-MM-DD"
      const [yStr, mStr, dStr] = jieSolarYmd.split('-');
      const jieDate = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
      const birthDate = new Date(parsed.year, parsed.month - 1, parsed.day);
      const diffMs = birthDate.getTime() - jieDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      daysFromJieQi = diffDays; // 可能为正（节气后）或 0
    } catch {
      // 保留兜底
    }
  }

  return { jieName, daysFromJieQi };
}

// ===== 兜底：M1.1 阶段补齐分析字段 =====

/**
 * 完整排盘 + 全量分析：M1 排盘 + M2.1-M2.6 全部分析字段真实计算。
 *
 * 🎉 所有字段均由引擎计算，不再依赖任何 mock 数据！
 */
export function buildChartWithFallback(data: InputData): BaziChart {
  const engineOutput = computeBazi(data);

  // ===== M2.7 激进方案：动态关系优先，五行统计随之联动 =====
  // 执行顺序：
  //   1. relations 仅依赖 pillars，先算（无循环依赖）
  //   2. wuxing 先算原始统计，再叠加 relations 带来的调整（合化/三合/六合/库冲）
  //   3. wangShuai / yongShen / geJu 等下游全部基于"调整后的 wuxing"运算，命理学一致性更高
  // 1) 干支动态关系（合化/三合/六合/六冲/三刑 + 外显实质）
  const relations = analyzeRelations(engineOutput.pillars);
  // 2) 五行原始统计 → 叠加动态关系修正（产出 originalTotal/adjustments 用于追溯）
  const rawWuxingStats = analyzeWuxing(engineOutput.pillars);
  const wuxingStats = applyRelationAdjustments(rawWuxingStats, relations);
  // 3) 旺衰：把 relations 也传入（用于在推断链中展示动态修正环节）
  const wangShuai = analyzeWangShuai(engineOutput.pillars, relations);
  const yongShen = analyzeYongShen(engineOutput.pillars, wuxingStats, wangShuai);
  const geJu = analyzeGeJu(engineOutput.pillars, wuxingStats, wangShuai, yongShen);
  const shenShas = analyzeShenSha(engineOutput.pillars);
  const keyFindings = analyzeKeyFindings({
    pillars: engineOutput.pillars,
    wuxingStats,
    wangShuai,
    yongShen,
    geJu,
    shenShas,
    daYuns: engineOutput.daYuns,
  });
  // 命格特征（6 维交叉画像）：在所有基础分析完成后，做综合性格画像
  const persona = analyzePersona({
    pillars: engineOutput.pillars,
    wuxingStats,
    wangShuai,
    yongShen,
    geJu,
    shenShas,
    relations,
  });

  // M2.8：大运流年关系联动 + 人生时间轴
  // 给每步大运补 flowAnalysis（合化/六冲/反吟/伏吟/填实空亡 + 关键流年），并构建 80 年人生时间轴
  const { enrichedDaYuns, lifeTimeline } = analyzeAllDaYuns(
    engineOutput.daYuns,
    engineOutput.pillars,
    yongShen,
    relations.xunKong,
  );

  // M3：婚姻细论（必须在 daYuns 已含 flowAnalysis 后做，因为婚期推算遍历所有大运的 startYear/endYear）
  // 7 维分析：配偶星 + 配偶宫 + 桃花红艳天喜 + 婚期事件时间表 + 风险点 + 综合质量评分 + 优势/提醒
  const marriage = analyzeMarriage(
    engineOutput.basicInfo,
    engineOutput.pillars,
    enrichedDaYuns,
    yongShen,
    relations,
    shenShas,
  );

  // M4 财富细论
  const wealth = analyzeWealth(
    engineOutput.pillars,
    enrichedDaYuns,
    wuxingStats,
    wangShuai,
    yongShen,
    relations,
    shenShas,
  );

  // M5 事业细论
  const career = analyzeCareer(
    engineOutput.pillars,
    enrichedDaYuns,
    wangShuai,
    yongShen,
    relations,
  );

  // M6 健康细论
  const health = analyzeHealth(
    engineOutput.pillars,
    enrichedDaYuns,
    wuxingStats,
    wangShuai,
    yongShen,
  );

  // M7 六亲细论
  const relatives = analyzeRelatives(
    engineOutput.basicInfo.gender,
    engineOutput.pillars,
    relations,
  );

  // M8 学业细论
  const education = analyzeEducation(
    engineOutput.pillars,
    enrichedDaYuns,
    relations,
    yongShen,
  );

  // M9 出行/搬迁
  const travel = analyzeTravel(
    engineOutput.pillars,
    enrichedDaYuns,
  );

  // M10 官非/牢狱风险
  const legalRisk = analyzeLegalRisk(
    engineOutput.pillars,
    enrichedDaYuns,
    relations,
    shenShas,
  );

  // M11 流月预测（默认当前年份）
  const currentYear = new Date().getFullYear();
  const monthlyForecast = analyzeMonthlyForecast(
    currentYear,
    engineOutput.pillars,
    enrichedDaYuns,
  );

  // M12 日级吉凶日历（默认当前月份）
  const currentMonth = new Date().getMonth() + 1;
  const dailyCalendar = analyzeDailyCalendar(
    currentYear,
    currentMonth,
    engineOutput.pillars,
  );

  // P3.5 跨模块一致性校验：检测早年大运压制 + 模块高评分的反差，给婚姻/财富/事业/学业的 summary 加修正语
  const enhanced = enhanceWithCrossModuleConsistency(
    { marriage, wealth, career, education },
    enrichedDaYuns,
  );

  // P3.4 主导因子（必须在 keyFindings + 所有维度算完后做，因为它依赖 keyFindings + wangShuai + yongShen + daYuns）
  const commandFactors = analyzeCommandFactors(
    engineOutput.pillars,
    wuxingStats,
    wangShuai,
    yongShen,
    enrichedDaYuns,
    keyFindings,
  );

  // P9 命理动力学引擎（11 维：D1-D10 + D11 大运联动）
  // 必须在 wuxingStats / wangShuai / yongShen / relations / shenShas / enrichedDaYuns 全部算完后做
  const { jieName, daysFromJieQi } = computeJieQiInfo(data);
  const dynamics = analyzeDynamics(
    engineOutput.pillars,
    wuxingStats,
    wangShuai,
    yongShen,
    relations,
    shenShas,
    jieName,
    daysFromJieQi,
    enrichedDaYuns,
    engineOutput.startAge,
    engineOutput.qiYunDirection,
  );

  // 完整 chart（除 narrativeBook 外）
  const chartWithoutBook = {
    basicInfo: engineOutput.basicInfo,
    pillars: engineOutput.pillars,
    daYuns: enrichedDaYuns,
    startAge: engineOutput.startAge,
    qiYunDirection: engineOutput.qiYunDirection,
    wuxingStats,
    wangShuai,
    yongShen,
    geJu,
    shenShas,
    keyFindings,
    commandFactors,
    persona,
    relations,
    lifeTimeline,
    marriage: enhanced.marriage,
    wealth: enhanced.wealth,
    career: enhanced.career,
    health,
    relatives,
    education: enhanced.education,
    travel,
    legalRisk,
    monthlyForecast,
    dailyCalendar,
    dynamics,
  };

  // M14/M15 命书：基于完整 chart 生成
  const narrativeBook = generateNarrativeBook(chartWithoutBook as BaziChart);

  return {
    ...chartWithoutBook,
    narrativeBook,
  };
}

// ============================================================
// P4.5 异步排盘入口（启用 LLM 增强 mainTheme）
// ============================================================
//
// 与 buildChartWithFallback 区别：
//   - 同步版本：mainTheme 由模板生成（"以X为骨，以Y为情..."）
//   - 异步版本：mainTheme 由 DeepSeek LLM 重写（千人千面的开篇判词）
//   - 异步版本：每个生活模块（婚姻/财富/事业等 11 个）由 LLM 增强出
//     impact（对命主的影响）+ actions（趋利避害清单）
//   - LLM 失败时自动退回模板版本，不影响排盘可用性
//
// 使用建议：
//   - 命主导出命书时调用异步版本（用户能等几秒）
//   - 实时预览 / 测试场景调用同步版本（更快）

import { enhanceTextsWithLLM } from './commandFactorsAnalyzer';
import { enhanceAllModulesWithLLM, type ModuleType } from './moduleEnhancer';

export async function buildChartWithFallbackAsync(
  data: InputData,
  options: { llmApiKey?: string } = {},
): Promise<BaziChart> {
  // 先按同步流程生成完整 chart
  const chart = buildChartWithFallback(data);

  // ============================================================
  // 准备 LLM 增强所需的"命主基础上下文"（11 模块共用）
  // ============================================================
  const wuxingPercentStr = chart.wuxingStats
    .map(w => `${w.wuxing}${w.percent.toFixed(0)}`)
    .join('/');
  const dayWxMap: Record<string, string> = {
    甲: '甲木', 乙: '乙木', 丙: '丙火', 丁: '丁火', 戊: '戊土',
    己: '己土', 庚: '庚金', 辛: '辛金', 壬: '壬水', 癸: '癸水',
  };
  const dayGan = chart.pillars[2].tianGan;
  const monthZhi = chart.pillars[1].diZhi;

  // 找当前所处的大运
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - new Date(chart.basicInfo.solarDate.replace(/[年月日]/g, '-').replace(/-$/, '')).getFullYear() + 1;
  const currentDaYun = chart.daYuns.find(
    d => currentAge >= d.startAge && currentAge < d.startAge + 10,
  );
  const nextDaYuns = chart.daYuns.slice(
    currentDaYun ? chart.daYuns.indexOf(currentDaYun) + 1 : 0,
  ).slice(0, 3).map(d => ({
    ageRange: `${d.startAge}-${d.startAge + 9}`,
    ganZhi: d.ganZhi,
    nature: d.shiShen ?? '中性',
  }));

  const moduleCtx = {
    dayGan,
    dayWuXing: dayWxMap[dayGan]?.replace(dayGan, '') ?? '',
    monthZhi,
    yongShenPrimary: chart.yongShen.primary,
    yongShenSecondary: chart.yongShen.secondary,
    yongShenJi: chart.yongShen.ji,
    wangShuai: chart.wangShuai.conclusion,
    currentDaYun: currentDaYun ? `${currentDaYun.ganZhi}（${currentDaYun.shiShen ?? ''}）` : undefined,
    nextDaYuns,
  };

  // ============================================================
  // 并行启动两类 LLM 增强（最大化吞吐）
  //   1. 老的 3-in-1：mainTheme + oneLiner + narrative（保留向后兼容）
  //   2. 新的 11 模块：每个 analyzer 的 impact + actions
  // ============================================================
  const modulePayload: Partial<Record<ModuleType, Record<string, unknown>>> = {
    commandFactors: chart.commandFactors as unknown as Record<string, unknown>,
    marriage: chart.marriage as unknown as Record<string, unknown>,
    wealth: chart.wealth as unknown as Record<string, unknown>,
    career: chart.career as unknown as Record<string, unknown>,
    health: chart.health as unknown as Record<string, unknown>,
    relatives: chart.relatives as unknown as Record<string, unknown>,
    education: chart.education as unknown as Record<string, unknown>,
    travel: chart.travel as unknown as Record<string, unknown>,
    legalRisk: chart.legalRisk as unknown as Record<string, unknown>,
    monthlyForecast: chart.monthlyForecast as unknown as Record<string, unknown>,
  };

  const [enhanced3in1, moduleEnhancements] = await Promise.all([
    enhanceTextsWithLLM(
      {
        commandFactors: chart.commandFactors,
        fallbackOneLiner: chart.persona.oneLiner,
        baziSummary: {
          dayGanWx: dayWxMap[dayGan] ?? dayGan,
          pillars: chart.pillars.map(p => p.tianGan + p.diZhi).join(' '),
          wuxingPercent: wuxingPercentStr,
          yongShenPrimary: chart.yongShen.primary.join('+'),
          wangShuaiLabel: chart.wangShuai.conclusion,
          geJuName: chart.geJu.name,
        },
      },
      { apiKey: options.llmApiKey },
    ),
    enhanceAllModulesWithLLM(
      { context: moduleCtx, modules: modulePayload },
      { apiKey: options.llmApiKey },
    ),
  ]);

  // ============================================================
  // 注入增强结果（即使 LLM 全部失败也返回 chart，保证可用性）
  // ============================================================
  const newChart: BaziChart = {
    ...chart,
    // 1. 老的 3-in-1 增强（如有）
    commandFactors: enhanced3in1
      ? {
        ...chart.commandFactors,
        mainTheme: enhanced3in1.mainTheme,
        ...({ llmNarrative: enhanced3in1.narrative } as object),
        // 2. 模块增强（如有）
        ...(moduleEnhancements.commandFactors ?? {}),
      }
      : {
        ...chart.commandFactors,
        ...(moduleEnhancements.commandFactors ?? {}),
      },
    persona: enhanced3in1
      ? { ...chart.persona, oneLiner: enhanced3in1.oneLiner }
      : chart.persona,
    // 3. 11 个生活模块依次注入 impact + actions
    marriage: { ...chart.marriage, ...(moduleEnhancements.marriage ?? {}) },
    wealth: { ...chart.wealth, ...(moduleEnhancements.wealth ?? {}) },
    career: { ...chart.career, ...(moduleEnhancements.career ?? {}) },
    health: { ...chart.health, ...(moduleEnhancements.health ?? {}) },
    relatives: { ...chart.relatives, ...(moduleEnhancements.relatives ?? {}) },
    education: { ...chart.education, ...(moduleEnhancements.education ?? {}) },
    travel: { ...chart.travel, ...(moduleEnhancements.travel ?? {}) },
    legalRisk: { ...chart.legalRisk, ...(moduleEnhancements.legalRisk ?? {}) },
    monthlyForecast: { ...chart.monthlyForecast, ...(moduleEnhancements.monthlyForecast ?? {}) },
  };

  // 重新生成命书（第 14 章会优先用 llmNarrative，其他章节会用各模块的 impact/actions）
  newChart.narrativeBook = generateNarrativeBook(newChart);
  return newChart;
}

/**
 * 基于已有的 BaziChart 做 LLM 增强，不重新排盘。
 * 用于 store 中已通过 Python API 拿到排盘结果后的增强场景。
 */
export async function enhanceExistingChartWithLLM(
  existingChart: BaziChart,
  options: { llmApiKey?: string } = {},
): Promise<BaziChart> {
  const chart = existingChart;

  const wuxingPercentStr = chart.wuxingStats
    .map(w => `${w.wuxing}${w.percent.toFixed(0)}`)
    .join('/');
  const dayWxMap: Record<string, string> = {
    甲: '甲木', 乙: '乙木', 丙: '丙火', 丁: '丁火', 戊: '戊土',
    己: '己土', 庚: '庚金', 辛: '辛金', 壬: '壬水', 癸: '癸水',
  };
  const dayGan = chart.pillars[2].tianGan;
  const monthZhi = chart.pillars[1].diZhi;

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - new Date(chart.basicInfo.solarDate.replace(/[年月日]/g, '-').replace(/-$/, '')).getFullYear() + 1;
  const currentDaYun = chart.daYuns.find(
    d => currentAge >= d.startAge && currentAge < d.startAge + 10,
  );
  const nextDaYuns = chart.daYuns.slice(
    currentDaYun ? chart.daYuns.indexOf(currentDaYun) + 1 : 0,
  ).slice(0, 3).map(d => ({
    ageRange: `${d.startAge}-${d.startAge + 9}`,
    ganZhi: d.ganZhi,
    nature: d.shiShen ?? '中性',
  }));

  const moduleCtx = {
    dayGan,
    dayWuXing: dayWxMap[dayGan]?.replace(dayGan, '') ?? '',
    monthZhi,
    yongShenPrimary: chart.yongShen.primary,
    yongShenSecondary: chart.yongShen.secondary,
    yongShenJi: chart.yongShen.ji,
    wangShuai: chart.wangShuai.conclusion,
    currentDaYun: currentDaYun ? `${currentDaYun.ganZhi}（${currentDaYun.shiShen ?? ''}）` : undefined,
    nextDaYuns,
  };

  const modulePayload: Partial<Record<ModuleType, Record<string, unknown>>> = {
    commandFactors: chart.commandFactors as unknown as Record<string, unknown>,
    marriage: chart.marriage as unknown as Record<string, unknown>,
    wealth: chart.wealth as unknown as Record<string, unknown>,
    career: chart.career as unknown as Record<string, unknown>,
    health: chart.health as unknown as Record<string, unknown>,
    relatives: chart.relatives as unknown as Record<string, unknown>,
    education: chart.education as unknown as Record<string, unknown>,
    travel: chart.travel as unknown as Record<string, unknown>,
    legalRisk: chart.legalRisk as unknown as Record<string, unknown>,
    monthlyForecast: chart.monthlyForecast as unknown as Record<string, unknown>,
  };

  const [enhanced3in1, moduleEnhancements] = await Promise.all([
    enhanceTextsWithLLM(
      {
        commandFactors: chart.commandFactors,
        fallbackOneLiner: chart.persona.oneLiner,
        baziSummary: {
          dayGanWx: dayWxMap[dayGan] ?? dayGan,
          pillars: chart.pillars.map(p => p.tianGan + p.diZhi).join(' '),
          wuxingPercent: wuxingPercentStr,
          yongShenPrimary: chart.yongShen.primary.join('+'),
          wangShuaiLabel: chart.wangShuai.conclusion,
          geJuName: chart.geJu.name,
        },
      },
      { apiKey: options.llmApiKey },
    ),
    enhanceAllModulesWithLLM(
      { context: moduleCtx, modules: modulePayload },
      { apiKey: options.llmApiKey },
    ),
  ]);

  const newChart: BaziChart = {
    ...chart,
    commandFactors: enhanced3in1
      ? {
        ...chart.commandFactors,
        mainTheme: enhanced3in1.mainTheme,
        ...({ llmNarrative: enhanced3in1.narrative } as object),
        ...(moduleEnhancements.commandFactors ?? {}),
      }
      : {
        ...chart.commandFactors,
        ...(moduleEnhancements.commandFactors ?? {}),
      },
    persona: enhanced3in1
      ? { ...chart.persona, oneLiner: enhanced3in1.oneLiner }
      : chart.persona,
    marriage: { ...chart.marriage, ...(moduleEnhancements.marriage ?? {}) },
    wealth: { ...chart.wealth, ...(moduleEnhancements.wealth ?? {}) },
    career: { ...chart.career, ...(moduleEnhancements.career ?? {}) },
    health: { ...chart.health, ...(moduleEnhancements.health ?? {}) },
    relatives: { ...chart.relatives, ...(moduleEnhancements.relatives ?? {}) },
    education: { ...chart.education, ...(moduleEnhancements.education ?? {}) },
    travel: { ...chart.travel, ...(moduleEnhancements.travel ?? {}) },
    legalRisk: { ...chart.legalRisk, ...(moduleEnhancements.legalRisk ?? {}) },
    monthlyForecast: { ...chart.monthlyForecast, ...(moduleEnhancements.monthlyForecast ?? {}) },
  };

  newChart.narrativeBook = generateNarrativeBook(newChart);
  return newChart;
}

// ===== 工具 =====

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
