/**
 * API 适配器：将 Python 引擎返回的中文 key JSON 转换为前端 BaziChart 类型
 *
 * 设计原则：
 *   1. 核心字段（排盘+规则）从 API 返回值直接映射
 *   2. 领域分析字段（marriage/wealth/career 等）暂时生成空壳占位
 *   3. 所有映射逻辑集中在此文件，便于后续 Python 引擎扩展后逐步替换
 */

import type {
  BasicInfo,
  BaziChart,
  ChartRelations,
  DaYun,
  DailyCalendarAnalysis,
  DiZhi,
  EducationAnalysis,
  Gender,
  GeJu,
  HealthAnalysis,
  CareerAnalysis,
  CommandFactors,
  LegalRiskAnalysis,
  LifeTimeline,
  MarriageAnalysis,
  MonthlyForecastAnalysis,
  NarrativeBook,
  Persona,
  PersonaTrait,
  Pillar,
  RelativesAnalysis,
  RelativeInfo,
  ShenSha,
  ShiShen,
  TianGan,
  TravelAnalysis,
  WangShuai,
  WangShuaiStep,
  WealthAnalysis,
  WuXing,
  WuXingStat,
  YongShen,
} from '../types/bazi';
import type { EngineResponse } from './apiClient';
import type { InputData } from '../store/useBaziStore';

// ============================================================
// 命理常量映射表
// ============================================================

const TIANGAN_WUXING: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const DIZHI_WUXING: Record<string, WuXing> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};

/** 阳干：甲丙戊庚壬 */
const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);

// ============================================================
// 类型守卫 & 工具函数
// ============================================================

type AnyObj = Record<string, unknown>;

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asArr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObj(value: unknown): AnyObj {
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value as AnyObj : {};
}

// ============================================================
// 主入口
// ============================================================

/**
 * 将 Python 引擎的原始 JSON 转换为前端 BaziChart 类型
 */
export function adaptEngineResponse(response: EngineResponse, input: InputData): BaziChart {
  const paipan = asObj(response.paipan);
  const rules = asObj(response.rules);

  const basicInfo = adaptBasicInfo(paipan, input);
  const pillars = adaptPillars(paipan);
  const wuxingStats = adaptWuxingStats(paipan);
  const wangShuai = adaptWangShuai(rules);
  const yongShen = adaptYongShen(rules);
  const geJu = adaptGeJu(rules);
  const shenShas = adaptShenShas(rules);
  const daYuns = adaptDaYuns(paipan);

  return {
    basicInfo,
    pillars,
    wuxingStats,
    wangShuai,
    yongShen,
    geJu,
    shenShas,
    daYuns,
    // 以下字段暂时生成空壳，后续 Python 引擎扩展后替换
    keyFindings: [],
    commandFactors: emptyCommandFactors(),
    persona: emptyPersona(),
    relations: adaptRelations(rules, paipan),
    lifeTimeline: emptyLifeTimeline(),
    marriage: emptyMarriage(basicInfo.gender),
    wealth: emptyWealth(),
    career: emptyCareer(),
    health: emptyHealth(),
    relatives: adaptRelatives(rules, basicInfo.gender),
    education: emptyEducation(),
    travel: emptyTravel(),
    legalRisk: emptyLegalRisk(),
    monthlyForecast: adaptMonthlyForecast(rules),
    dailyCalendar: emptyDailyCalendar(),
    narrativeBook: emptyNarrativeBook(),
    startAge: adaptStartAge(paipan),
    qiYunDirection: inferQiYunDirection(paipan),
  };
}

// ============================================================
// BasicInfo
// ============================================================

function adaptBasicInfo(paipan: AnyObj, input: InputData): BasicInfo {
  const info = asObj(paipan['命主信息']);
  return {
    name: input.name || asStr(info['姓名']),
    gender: (input.gender || asStr(info['性别'], '男')) as Gender,
    solarDate: asStr(info['出生公历']),
    lunarDate: asStr(info['出生农历']),
    jieQiMonth: asStr(asObj(paipan['月令'])['月支']),
    birthPlace: input.birthPlace || asStr(info['出生地']),
  };
}

// ============================================================
// Pillars (四柱)
// ============================================================

const PILLAR_NAMES = ['年柱', '月柱', '日柱', '时柱'] as const;

function adaptPillars(paipan: AnyObj): [Pillar, Pillar, Pillar, Pillar] {
  const siZhu = asObj(paipan['四柱']);
  return PILLAR_NAMES.map((name) => {
    const raw = asObj(siZhu[name]);
    const cangGanRaw = asArr(raw['藏干']);
    return {
      name,
      tianGan: asStr(raw['天干']) as TianGan,
      diZhi: asStr(raw['地支']) as DiZhi,
      cangGan: cangGanRaw.map((cg) => {
        const item = asObj(cg);
        return {
          gan: asStr(item['天干']) as TianGan,
          type: mapQiType(asStr(item['气类'])),
          shiShen: asStr(item['十神']) as ShiShen,
        };
      }),
      naYin: asStr(raw['纳音']),
      ganShiShen: asStr(raw['天干十神']) as ShiShen,
      diShiShen: cangGanRaw.map((cg) => asStr(asObj(cg)['十神'])) as ShiShen[],
    };
  }) as [Pillar, Pillar, Pillar, Pillar];
}

function mapQiType(qi: string): '本气' | '中气' | '余气' {
  if (qi === '本气') return '本气';
  if (qi === '中气') return '中气';
  return '余气';
}

// ============================================================
// WuxingStats (五行统计)
// ============================================================

const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];

function adaptWuxingStats(paipan: AnyObj): WuXingStat[] {
  const stats = asObj(paipan['五行统计']);
  const scores = asObj(stats['得分']);
  const percents = asObj(stats['百分比']);

  // 从四柱数据统计各五行在天干/地支/藏干中的出现次数
  const tianGanCounts: Record<string, number> = {};
  const diZhiCounts: Record<string, number> = {};
  const cangGanCounts: Record<string, number> = {};
  const siZhu = asObj(paipan['四柱']);

  for (const pillarName of PILLAR_NAMES) {
    const pillar = asObj(siZhu[pillarName]);
    // 天干五行：从明细中获取或用简单映射
    const ganWx = TIANGAN_WUXING[asStr(pillar['天干'])];
    if (ganWx) tianGanCounts[ganWx] = (tianGanCounts[ganWx] || 0) + 1;

    const zhiWx = DIZHI_WUXING[asStr(pillar['地支'])];
    if (zhiWx) diZhiCounts[zhiWx] = (diZhiCounts[zhiWx] || 0) + 1;

    for (const cg of asArr(pillar['藏干'])) {
      const cgWx = TIANGAN_WUXING[asStr(asObj(cg)['天干'])];
      if (cgWx) cangGanCounts[cgWx] = (cangGanCounts[cgWx] || 0) + 1;
    }
  }

  return WUXING_ORDER.map((wx) => ({
    wuxing: wx,
    tianGanCount: tianGanCounts[wx] || 0,
    diZhiCount: diZhiCounts[wx] || 0,
    cangGanCount: cangGanCounts[wx] || 0,
    total: asNum(scores[wx]),
    percent: asNum(percents[wx]),
  }));
}

// ============================================================
// WangShuai (旺衰)
// ============================================================

function adaptWangShuai(rules: AnyObj): WangShuai {
  const raw = asObj(rules['旺衰']);
  const conclusion = asStr(raw['程度'], '中和');
  const ratio = asNum(raw['旺衰比'], 0.5);

  // Python 五层计分 → 前端四步展示（简化映射）
  const layers = asObj(raw['分层']);
  const steps: WangShuaiStep[] = [];

  // Layer1 → 得令
  const layer1 = asObj(layers['Layer1·月令']);
  const deLing = asNum(layer1['助力']) > 0;
  steps.push({
    step: '得令',
    title: '第一步：得令/失令（月令）',
    details: [`月令状态：${asStr(layer1['状态'])}，助力 ${asNum(layer1['助力'])}，泄耗 ${asNum(layer1['泄耗'])}`],
    result: deLing ? 'positive' : 'negative',
    score: deLing ? 1 : 0,
  });

  // Layer2 → 得地
  const layer2 = asObj(layers['Layer2·藏干']);
  const deDi = asNum(layer2['助力']) > asNum(layer2['泄耗']);
  steps.push({
    step: '得地',
    title: '第二步：得地/失地（藏干）',
    details: [`藏干助力 ${asNum(layer2['助力'])} vs 泄耗 ${asNum(layer2['泄耗'])}`],
    result: deDi ? 'positive' : 'negative',
    score: deDi ? 1 : 0,
  });

  // Layer3 → 得生
  const layer3 = asObj(layers['Layer3·天干']);
  const deSheng = asNum(layer3['助力']) >= asNum(layer3['泄耗']);
  steps.push({
    step: '得生',
    title: '第三步：得生/受克（天干）',
    details: [`天干助力 ${asNum(layer3['助力'])} vs 泄耗 ${asNum(layer3['泄耗'])}`],
    result: deSheng ? 'positive' : 'negative',
    score: deSheng ? 1 : 0,
  });

  // 综合
  steps.push({
    step: '综合',
    title: '综合判断',
    details: [
      `总分 ${asNum(raw['总分'])}，助力 ${asNum(raw['助力总分'])} vs 泄耗 ${asNum(raw['泄耗总分'])}`,
      `旺衰比 ${(ratio * 100).toFixed(1)}%`,
    ],
    result: ratio >= 0.5 ? 'positive' : 'negative',
    score: ratio >= 0.5 ? 1 : -1,
  });

  return {
    steps,
    conclusion,
    confidence: ratio > 0.6 ? 4 : ratio > 0.55 ? 3 : ratio > 0.45 ? 2 : 1,
  };
}

// ============================================================
// YongShen (用神忌神)
// ============================================================

function adaptYongShen(rules: AnyObj): YongShen {
  const raw = asObj(rules['用神忌神']);
  const yongList = asArr(raw['用神']);
  const jiList = asArr(raw['忌神']);

  const primaryWx = yongList
    .map((y) => asStr(asObj(y)['五行']))
    .filter((wx) => wx && wx !== '需AI判读') as WuXing[];
  const jiWx = jiList
    .map((j) => asStr(asObj(j)['五行']))
    .filter((wx) => wx && wx !== '需AI判读') as WuXing[];

  // 收集所有用神/忌神的理由
  const reasons = yongList
    .map((y) => asStr(asObj(y)['理由']))
    .filter(Boolean);

  return {
    primary: primaryWx,
    secondary: [],
    ji: jiWx,
    reason: reasons.length > 0 ? reasons.join('；') : '待AI判读',
    method: '扶抑',
  };
}

// ============================================================
// GeJu (格局)
// ============================================================

function adaptGeJu(rules: AnyObj): GeJu {
  const raw = asObj(rules['格局']);
  const gejuName = asStr(raw['格局'], '正格');

  // 从格局名推断 type/status/level
  const SPECIAL_PATTERNS = ['从', '化', '建禄', '羊刃', '专旺'];
  const isSpecial = SPECIAL_PATTERNS.some((p) => gejuName.includes(p));
  const geJuType = isSpecial ? '特殊格' as const : '正格' as const;
  const isBroken = gejuName.includes('破') || gejuName.includes('败');
  const geJuStatus = isBroken ? '破格' as const : '成格' as const;
  const geJuLevel = isBroken ? '低' as const : '中' as const;

  return {
    name: gejuName,
    type: geJuType,
    status: geJuStatus,
    level: geJuLevel,
    description: asStr(raw['依据']),
  };
}

// ============================================================
// ShenSha (神煞)
// ============================================================

function adaptShenShas(rules: AnyObj): ShenSha[] {
  return asArr(rules['神煞']).map((item) => {
    const raw = asObj(item);
    const jiXiong = asStr(raw['吉凶']);
    const sources = asArr(raw['原局来源']);
    return {
      name: asStr(raw['名称']),
      category: jiXiong.includes('吉') ? '吉神' as const : jiXiong.includes('凶') ? '凶神' as const : '中性' as const,
      source: sources.filter((s) => asStr(s) !== '原局无').join('、') || '无',
      description: asStr(raw['效应']),
    };
  });
}

// ============================================================
// DaYuns (大运)
// ============================================================

function adaptDaYuns(paipan: AnyObj): DaYun[] {
  const daYunData = asObj(paipan['大运']);
  const daYunList = asArr(daYunData['大运列表']);

  return daYunList.map((item, index) => {
    const raw = asObj(item);
    return {
      index,
      ganZhi: asStr(raw['干支']),
      startAge: asNum(raw['起始虚岁']),
      startYear: asNum(raw['起始公历年']),
      endYear: asNum(raw['结束公历年']),
      shiShen: asStr(raw['天干十神']) as ShiShen,
      brief: `${asStr(raw['天干十神'])}运`,
    };
  });
}

// ============================================================
// StartAge (起运信息)
// ============================================================

function adaptStartAge(paipan: AnyObj): string {
  const daYunData = asObj(paipan['大运']);
  const startAge = asNum(daYunData['起运虚岁']);
  return `${startAge} 岁起运`;
}

// ============================================================
// QiYunDirection (起运方向：顺行/逆行)
// ============================================================

/**
 * 命理规则：阳年干 + 男 = 顺行，阳年干 + 女 = 逆行
 *          阴年干 + 男 = 逆行，阴年干 + 女 = 顺行
 */
function inferQiYunDirection(paipan: AnyObj): '顺行' | '逆行' {
  const info = asObj(paipan['命主信息']);
  const gender = asStr(info['性别']);
  const siZhu = asObj(paipan['四柱']);
  const yearGan = asStr(asObj(siZhu['年柱'])['天干']);
  const isYangGan = YANG_GAN.has(yearGan);
  const isMale = gender === '男';
  return (isYangGan === isMale) ? '顺行' : '逆行';
}

// ============================================================
// Relations (合冲刑害) → ChartRelations
// ============================================================

/** 柱位名 → PillarPosition 数字映射 */
const PILLAR_POS_MAP: Record<string, 0 | 1 | 2 | 3> = {
  年柱: 0, 月柱: 1, 日柱: 2, 时柱: 3,
};

/** 从 Python "柱位" 字段解析两个柱位索引，如 "年柱+月柱" → [0, 1] */
function parsePillarPositions(zhuWei: string): [0 | 1 | 2 | 3, 0 | 1 | 2 | 3] {
  const parts = zhuWei.split('+').map((s) => s.trim());
  const posA = PILLAR_POS_MAP[parts[0]] ?? 0;
  const posB = PILLAR_POS_MAP[parts[1]] ?? 1;
  return [posA, posB];
}

/** 从 Python "地支" 字段解析出地支字符，如 "寅申冲" → ['寅', '申'] */
function parseZhiChars(diZhiStr: string): DiZhi[] {
  const allDiZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return allDiZhi.filter((dz) => diZhiStr.includes(dz)) as DiZhi[];
}

/** 两柱位间距 → Distance */
function pillarDistance(posA: number, posB: number): 'adjacent' | 'one-apart' | 'far-apart' {
  const diff = Math.abs(posA - posB);
  if (diff <= 1) return 'adjacent';
  if (diff === 2) return 'one-apart';
  return 'far-apart';
}

/**
 * 六十甲子旬空计算
 * 以日柱天干地支定旬，每旬末尾两支为空亡
 */
function computeXunKong(dayGan: string, dayZhi: string, fourZhi: DiZhi[]) {
  const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const ganIdx = ganOrder.indexOf(dayGan);
  const zhiIdx = zhiOrder.indexOf(dayZhi);
  if (ganIdx < 0 || zhiIdx < 0) {
    return { xunName: '', emptyZhi: ['' as DiZhi, '' as DiZhi] as [DiZhi, DiZhi], hitPositions: [] as Array<{ pos: 0|1|2|3; zhi: DiZhi; palaceImpact: string }>, description: '无法计算' };
  }
  // 旬首天干索引 = ganIdx 回退到甲（索引0）的距离
  const stepsFromXunHead = ganIdx; // 甲=0步, 乙=1步 ...
  // 旬首地支索引 = zhiIdx - stepsFromXunHead (mod 12)
  const xunHeadZhiIdx = ((zhiIdx - stepsFromXunHead) % 12 + 12) % 12;
  const xunName = `甲${zhiOrder[xunHeadZhiIdx]}旬`;
  // 空亡两支 = 旬首地支索引 + 10, +11 (mod 12)
  const empty1Idx = (xunHeadZhiIdx + 10) % 12;
  const empty2Idx = (xunHeadZhiIdx + 11) % 12;
  const emptyZhi: [DiZhi, DiZhi] = [zhiOrder[empty1Idx] as DiZhi, zhiOrder[empty2Idx] as DiZhi];

  const palaceImpacts: Record<number, string> = { 0: '祖荫空', 1: '父母兄弟空', 2: '配偶空', 3: '子女空' };
  const hitPositions = fourZhi
    .map((zhi, idx) => ({ pos: idx as 0|1|2|3, zhi, palaceImpact: palaceImpacts[idx] || '' }))
    .filter((item) => emptyZhi.includes(item.zhi));

  const desc = hitPositions.length > 0
    ? `${xunName}，空亡${emptyZhi.join('')}，命中${hitPositions.map((h) => `${PILLAR_NAMES[h.pos]}${h.zhi}`).join('、')}`
    : `${xunName}，空亡${emptyZhi.join('')}，四柱无空亡`;

  return { xunName, emptyZhi, hitPositions, description: desc };
}

function adaptRelations(rules: AnyObj, paipan: AnyObj): ChartRelations {
  const raw = asObj(rules['合冲刑害']);
  const siZhu = asObj(paipan['四柱']);
  const fourZhi = PILLAR_NAMES.map((name) => asStr(asObj(siZhu[name])['地支'])) as DiZhi[];
  const dayGan = asStr(asObj(siZhu['日柱'])['天干']);
  const dayZhi = asStr(asObj(siZhu['日柱'])['地支']);

  // 天干合
  const ganHeHua = asArr(raw['天干合']).map((item) => {
    const relation = asObj(item);
    const [posA, posB] = parsePillarPositions(asStr(relation['柱位']));
    const desc = asStr(relation['柱位']) + ' ' + asStr(relation['天干'] || relation['地支']);
    return {
      type: '天干合化' as const,
      ganA: '' as TianGan, posA, ganB: '' as TianGan, posB,
      hua: '' as WuXing, huaSuccess: false,
      distance: pillarDistance(posA, posB), strength: 'medium' as const, description: desc,
    };
  });

  // 三合 + 半合 → 都放入 zhiSanHe
  const sanHeItems = asArr(raw['三合']).map((item) => {
    const relation = asObj(item);
    const zhiChars = parseZhiChars(asStr(relation['地支']));
    const positions = asStr(relation['柱位']).split('+').map((s) => PILLAR_POS_MAP[s.trim()] ?? 0);
    const members = zhiChars.map((zhi, i) => ({ zhi, pos: (positions[i] ?? i) as 0|1|2|3 }));
    return {
      type: '地支三合' as const, members,
      hua: (asStr(relation['合化五行']) || '') as WuXing,
      strength: 'strong' as const,
      description: asStr(relation['柱位']) + ' ' + asStr(relation['地支']),
    };
  });
  const banHeItems = asArr(raw['半合']).map((item) => {
    const relation = asObj(item);
    const zhiChars = parseZhiChars(asStr(relation['地支']));
    const [posA, posB] = parsePillarPositions(asStr(relation['柱位']));
    const members = zhiChars.map((zhi, i) => ({ zhi, pos: (i === 0 ? posA : posB) as 0|1|2|3 }));
    return {
      type: '地支半三合' as const, members,
      hua: (asStr(relation['合化五行']) || '') as WuXing,
      banType: '生旺' as const,
      strength: 'medium' as const,
      description: asStr(relation['柱位']) + ' ' + asStr(relation['地支']),
    };
  });

  // 六合
  const zhiLiuHe = asArr(raw['六合']).map((item) => {
    const relation = asObj(item);
    const zhiChars = parseZhiChars(asStr(relation['地支']));
    const [posA, posB] = parsePillarPositions(asStr(relation['柱位']));
    return {
      type: '地支六合' as const,
      zhiA: (zhiChars[0] || '') as DiZhi, posA,
      zhiB: (zhiChars[1] || '') as DiZhi, posB,
      hua: '' as WuXing,
      distance: pillarDistance(posA, posB), strength: 'medium' as const,
      description: asStr(relation['柱位']) + ' ' + asStr(relation['地支']),
    };
  });

  // 六冲
  const zhiChong = asArr(raw['六冲']).map((item) => {
    const relation = asObj(item);
    const zhiChars = parseZhiChars(asStr(relation['地支']));
    const [posA, posB] = parsePillarPositions(asStr(relation['柱位']));
    return {
      type: '地支六冲' as const,
      zhiA: (zhiChars[0] || '') as DiZhi, posA,
      zhiB: (zhiChars[1] || '') as DiZhi, posB,
      distance: pillarDistance(posA, posB), strength: 'strong' as const,
      resolvedByHe: false,
      description: asStr(relation['柱位']) + ' ' + asStr(relation['地支']),
    };
  });

  // 三刑 + 自刑
  const zhiXing = [
    ...asArr(raw['三刑']).map((item) => {
      const relation = asObj(item);
      const zhiChars = parseZhiChars(asStr(relation['地支']));
      const positions = asStr(relation['柱位']).split('+').map((s) => PILLAR_POS_MAP[s.trim()] ?? 0);
      const members = zhiChars.map((zhi, i) => ({ zhi, pos: (positions[i] ?? i) as 0|1|2|3 }));
      return {
        type: '地支三刑' as const, xingType: '无恩之刑' as const,
        members, resolvedByHe: false,
        description: asStr(relation['柱位']) + ' ' + asStr(relation['地支']),
      };
    }),
    ...asArr(raw['自刑']).map((item) => {
      const relation = asObj(item);
      const zhiChars = parseZhiChars(asStr(relation['地支']));
      const positions = asStr(relation['柱位']).split('+').map((s) => PILLAR_POS_MAP[s.trim()] ?? 0);
      const members = zhiChars.map((zhi, i) => ({ zhi, pos: (positions[i] ?? i) as 0|1|2|3 }));
      return {
        type: '地支自刑' as const, xingType: '自刑' as const,
        members, resolvedByHe: false,
        description: asStr(relation['柱位']) + ' ' + asStr(relation['地支']),
      };
    }),
  ];

  // 旬空
  const xunKong = computeXunKong(dayGan, dayZhi, fourZhi);

  // keyThemes：从各类关系中提取
  const keyThemes: ChartRelations['keyThemes'] = [];
  for (const chong of zhiChong) {
    keyThemes.push({ title: '六冲', description: chong.description, weight: 'high', source: '合冲刑害分析' });
  }
  for (const item of asArr(raw['相害'])) {
    keyThemes.push({ title: '相害', description: asStr(asObj(item)['柱位']) + ' ' + asStr(asObj(item)['地支']), weight: 'medium', source: '合冲刑害分析' });
  }
  for (const xing of zhiXing) {
    keyThemes.push({ title: xing.type, description: xing.description, weight: 'high', source: '合冲刑害分析' });
  }

  return {
    ganHeHua, ganChong: [], zhiSanHui: [],
    zhiSanHe: [...sanHeItems, ...banHeItems],
    zhiLiuHe, zhiChong, zhiXing,
    zhengHeOrDuHe: [], anHe: [],
    xunKong, manifestation: [], keyThemes,
  };
}

// ============================================================
// Relatives (六亲) → RelativesAnalysis
// ============================================================

function adaptRelatives(rules: AnyObj, gender: Gender): RelativesAnalysis {
  const raw = asObj(rules['六亲']);

  return {
    gender,
    father: adaptOneRelative(asObj(raw['父亲']), '父亲'),
    mother: adaptOneRelative(asObj(raw['母亲']), '母亲'),
    siblings: adaptOneRelative(asObj(raw['兄弟姐妹']), '兄弟姐妹'),
    children: adaptOneRelative(asObj(raw['子女']), '子女'),
    qualityScore: 3 as const,
    qualityLabel: '亲缘一般',
    summary: '六亲分析待LLM深化',
    highlights: [],
    reminders: [],
  };
}

/**
 * 从 Python 引擎的六亲 `原局位置` 推断 ManifestLevel
 *
 * 规则：
 *   位置=天干 → manifest-strong（透干有力）
 *   位置=藏干 + 本气 → hidden-strong（内蕴实质）
 *   位置=藏干 + 中气/余气 → hidden-weak（内蕴潜藏）
 *   无原局位置 → absent（命中无此十神）
 */
function inferManifestLevel(raw: AnyObj): RelativeInfo['level'] {
  const positions = asArr(raw['原局位置']);
  if (positions.length === 0) return 'absent';

  // 先检查是否有天干透出（最高级）
  const hasTianGan = positions.some((pos) => asStr(asObj(pos)['位置']) === '天干');
  if (hasTianGan) return 'manifest-strong';

  // 再检查藏干中的最强气类
  const hasBenQi = positions.some((pos) => {
    const posObj = asObj(pos);
    return asStr(posObj['位置']) === '藏干' && asStr(posObj['气类']) === '本气';
  });
  return hasBenQi ? 'hidden-strong' : 'hidden-weak';
}

function adaptOneRelative(raw: AnyObj, role: string): RelativeInfo {
  const shiShenList = asArr(raw['对应十神']);
  const firstShiShen = shiShenList.length > 0 ? asStr(shiShenList[0]) : '比肩';
  const strength = asStr(raw['力量']);
  const palaceMatch = raw['宫位匹配'] === true;

  // 从力量描述推断亲疏度
  let closenessScore: 1 | 2 | 3 | 4 | 5 = 3;
  if (strength.includes('强') || strength.includes('本气')) closenessScore = 4;
  else if (strength.includes('弱') || strength.includes('余气')) closenessScore = 2;
  if (palaceMatch) closenessScore = Math.min(5, closenessScore + 1) as typeof closenessScore;

  const CLOSENESS_LABELS: Record<number, string> = {
    5: '极亲', 4: '亲密', 3: '一般', 2: '疏远', 1: '极疏/早离',
  };

  const palace = asStr(raw['宫位']);
  const PALACE_MAP: Record<string, '年柱' | '月柱' | '日支' | '时柱'> = {
    年柱: '年柱', 月柱: '月柱', 日支: '日支', 时柱: '时柱',
  };

  return {
    role: role as RelativeInfo['role'],
    shiShen: firstShiShen as ShiShen,
    level: inferManifestLevel(raw),
    palace: PALACE_MAP[palace] || '年柱',
    closenessScore,
    closenessLabel: CLOSENESS_LABELS[closenessScore] as RelativeInfo['closenessLabel'],
    description: `${asStr(raw['位置描述'])}，${strength}，${asStr(raw['宫位描述'])}`,
  };
}

// ============================================================
// MonthlyForecast (流月预测) → MonthlyForecastAnalysis
// ============================================================

function adaptMonthlyForecast(rules: AnyObj): MonthlyForecastAnalysis {
  const months = asArr(rules['流月']);
  const currentYear = new Date().getFullYear();

  const liuYues = months.map((m) => {
    const raw = asObj(m);
    const month = asNum(raw['公历月']);
    const ganRelations = asArr(raw['天干关系']).map((r) => asStr(r));
    const zhiRelations = asArr(raw['地支关系']).map((r) => asStr(r));
    const allRelations = [...ganRelations, ...zhiRelations];

    // 简单判断吉凶倾向
    const hasChong = allRelations.some((r) => r.includes('冲'));
    const hasXing = allRelations.some((r) => r.includes('刑'));
    const hasHe = allRelations.some((r) => r.includes('合'));
    let tendency: 'auspicious' | 'inauspicious' | 'neutral' = 'neutral';
    if (hasChong || hasXing) tendency = 'inauspicious';
    else if (hasHe) tendency = 'auspicious';

    return {
      ganZhi: asStr(raw['干支']),
      month,
      startDate: '',
      endDate: '',
      relations: allRelations,
      tendency,
      highlights: allRelations,
    };
  });

  // 找出最吉和最忌的月份
  const bestMonths = liuYues
    .filter((ly) => ly.tendency === 'auspicious')
    .map((ly) => ly.month)
    .slice(0, 3);
  const worstMonths = liuYues
    .filter((ly) => ly.tendency === 'inauspicious')
    .map((ly) => ly.month)
    .slice(0, 3);

  return {
    year: currentYear,
    yearGanZhi: '',
    inDaYunIndex: 0,
    inDaYunGanZhi: '',
    liuYues,
    summary: '流月分析待LLM深化',
    bestMonths,
    worstMonths,
  } as MonthlyForecastAnalysis;
}

// ============================================================
// 空壳生成器（领域分析字段，匹配真实类型定义）
// 这些字段需要 LLM 增强或 Python 引擎扩展后才能完整填充
// ============================================================

const EMPTY_PERSONA_TRAIT: PersonaTrait = {
  dimension: '',
  tag: '待分析',
  description: '待LLM深化分析',
};

function emptyCommandFactors(): CommandFactors {
  return {
    mainTheme: '待分析',
    topRisks: [],
    topAdvantages: [],
    allFactors: [],
  };
}

function emptyPersona(): Persona {
  return {
    oneLiner: '待分析',
    baseTone: { ...EMPTY_PERSONA_TRAIT, dimension: '旺衰基底' },
    innerNature: { ...EMPTY_PERSONA_TRAIT, dimension: '日主气质' },
    lifeTheme: { ...EMPTY_PERSONA_TRAIT, dimension: '用神主旋律' },
    socialRole: { ...EMPTY_PERSONA_TRAIT, dimension: '格局社会角色' },
    mentality: [],
    highlights: [],
    strengths: [],
    cautions: [],
    keywords: [],
    confidence: 1,
  };
}

function emptyLifeTimeline(): LifeTimeline {
  return {
    segments: [],
    summary: '待分析',
    goldenPeriods: [],
    cautionPeriods: [],
  };
}

function emptyMarriage(gender: Gender): MarriageAnalysis {
  return {
    gender,
    spouseStar: {
      primaryStar: '正财' as ShiShen,
      secondaryStar: '偏财' as ShiShen,
      primaryLevel: 'absent',
      secondaryLevel: 'absent',
      bothManifest: false,
      mixedMarriage: false,
      starWuXing: '木' as WuXing,
      starBeingHe: false,
      starBeingChong: false,
      description: '待分析',
    },
    spousePalace: {
      dayZhi: '子' as DiZhi,
      benQiShiShen: '比肩' as ShiShen,
      allShiShen: [],
      selfSeated: false,
      heRelations: [],
      chongRelations: [],
      xingRelations: [],
      anHeRelations: [],
      inXunKong: false,
      description: '待分析',
    },
    peachBlossom: {
      hasTaoHua: false,
      taoHuaPositions: [],
      taoHuaType: 'none',
      hasHongYan: false,
      hongYanPositions: [],
      hasTianXi: false,
      tianXiPositions: [],
      description: '待分析',
    },
    qualityScore: 3,
    qualityLabel: '平稳',
    events: [],
    risks: [],
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  } as MarriageAnalysis;
}

function emptyWealth(): WealthAnalysis {
  return {
    wealthStar: {
      primaryStar: '正财' as ShiShen,
      secondaryStar: '偏财' as ShiShen,
      primaryLevel: 'absent',
      secondaryLevel: 'absent',
      starWuXing: '木' as WuXing,
      bothManifest: false,
      starBeingHe: false,
      starBeingChong: false,
      description: '待分析',
    },
    wealthVault: {
      hasVault: false,
      vaultZhi: [],
      vaultShiShen: [],
      vaultOpened: false,
      description: '待分析',
    },
    sources: [],
    directions: [],
    industries: [],
    qualityScore: 3,
    qualityLabel: '小康',
    events: [],
    risks: [],
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  } as WealthAnalysis;
}

function emptyCareer(): CareerAnalysis {
  return {
    officialStar: {
      primaryStar: '正官' as ShiShen,
      secondaryStar: '七杀' as ShiShen,
      primaryLevel: 'absent',
      secondaryLevel: 'absent',
      mixedOfficial: false,
      yinHuOfficial: false,
      description: '待分析',
    },
    careerPalace: {
      monthGanZhi: '',
      monthGanShiShen: '比肩' as ShiShen,
      monthZhiBenQi: '比肩' as ShiShen,
      monthWuXing: '木' as WuXing,
      description: '待分析',
    },
    careerTypes: [],
    industries: [],
    entrepreneurVsEmployee: '可创可打',
    bossQuotient: 3,
    qualityScore: 3,
    qualityLabel: '稳健发展',
    events: [],
    risks: [],
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  } as CareerAnalysis;
}

function emptyHealth(): HealthAnalysis {
  return {
    organs: [],
    constitution: '五行均衡型',
    diseaseRisks: [],
    recommendations: { diet: [], exercise: [], lifestyle: [] },
    events: [],
    qualityScore: 3,
    qualityLabel: '平稳',
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  };
}

function emptyEducation(): EducationAnalysis {
  return {
    educationStar: {
      primaryStar: '正印' as ShiShen,
      secondaryStar: '偏印' as ShiShen,
      primaryLevel: 'absent',
      secondaryLevel: 'absent',
      starWuXing: '木' as WuXing,
      shiShenPeiYin: false,
      shangGuanPeiYin: false,
      guanYinSheng: false,
      description: '待分析',
    },
    shenSha: {
      hasWenChang: false,
      wenChangZhi: [],
      hasXueTang: false,
      xueTangZhi: [],
      hasCiGuan: false,
      ciGuanZhi: [],
      description: '待分析',
    },
    scholarType: '实用主义（印不显）',
    recommendedFields: [],
    qualityScore: 3,
    qualityLabel: '中规中矩',
    events: [],
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  } as EducationAnalysis;
}

function emptyTravel(): TravelAnalysis {
  return {
    yiMa: {
      hasYiMa: false,
      yiMaZhi: '寅' as DiZhi,
      hitPositions: [],
      yiMaBeingChong: false,
      yiMaBeingHe: false,
      description: '待分析',
    },
    travelType: '偶动',
    overseasAffinity: false,
    qualityScore: 3,
    qualityLabel: '动静相宜',
    events: [],
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  } as TravelAnalysis;
}

function emptyLegalRisk(): LegalRiskAnalysis {
  return {
    factors: [],
    overallRiskLevel: 'minimal',
    qualityScore: 5,
    qualityLabel: '平安无虞',
    events: [],
    summary: '待LLM深化分析',
    highlights: [],
    reminders: [],
  };
}

function emptyDailyCalendar(): DailyCalendarAnalysis {
  return {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
    bestDays: [],
    worstDays: [],
    summary: '待分析',
  };
}

function emptyNarrativeBook(): NarrativeBook {
  return {
    title: '待生成',
    chapters: [],
    markdown: '',
    narrative: '',
  };
}
