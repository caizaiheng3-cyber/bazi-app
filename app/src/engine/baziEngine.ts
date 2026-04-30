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

interface LunarInstance {
  getYearInChinese(): string;
  getMonthInChinese(): string;
  getDayInChinese(): string;
  getTimeZhi(): string;
  toString(): string;
  getJieQi(): string;
  getCurrentJie(): { getName(): string } | null;
  getPrevJie(): { getName(): string };
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

// ===== 输入处理 =====

interface ParsedInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  genderCode: 0 | 1; // lunar 约定：1=男, 0=女
  sect: 1 | 2; // 1=早子时换日（默认）, 2=晚子时
}

function parseInput(data: InputData): ParsedInput {
  // birthDate: YYYY-MM-DD
  const [yStr, mStr, dStr] = data.birthDate.split('-');
  // birthTime: HH:mm
  const [hStr, miStr] = data.birthTime.split(':');

  return {
    year: Number(yStr),
    month: Number(mStr),
    day: Number(dStr),
    hour: Number(hStr),
    minute: Number(miStr),
    genderCode: data.gender === '男' ? 1 : 0,
    sect: data.ziShiSchool === 'early' ? 1 : 2,
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
    trueSolarTime: data.useTrueSolarTime ? `${data.birthTime}（已修正）` : `${data.birthTime}（未修正）`,
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

// ===== 兜底：M1.1 阶段补齐分析字段 =====

/**
 * 完整排盘 + 全量分析：M1 排盘 + M2.1-M2.6 全部分析字段真实计算。
 *
 * 🎉 所有字段均由引擎计算，不再依赖任何 mock 数据！
 */
export function buildChartWithFallback(data: InputData): BaziChart {
  const engineOutput = computeBazi(data);
  const wuxingStats = analyzeWuxing(engineOutput.pillars);
  const wangShuai = analyzeWangShuai(engineOutput.pillars);
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

  return {
    basicInfo: engineOutput.basicInfo,
    pillars: engineOutput.pillars,
    daYuns: engineOutput.daYuns,
    startAge: engineOutput.startAge,
    qiYunDirection: engineOutput.qiYunDirection,
    wuxingStats,
    wangShuai,
    yongShen,
    geJu,
    shenShas,
    keyFindings,
  };
}

// ===== 工具 =====

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
