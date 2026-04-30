// M2.2 旺衰判定引擎
//
// ⚠️ 算法严格遵循《命理分析方法论》§3.1 官方四步判断法：
//
//   第一步「得令/失令」（月令权重最大，约占 40%）：
//     基于「五行旺相休囚死」表（命理分析方法论 §1.2.3）：
//     - 旺、相 → 得令（✅）
//     - 休 → 中性（不得不失，按"接近哪边"决定，本算法保守计为 ❌）
//     - 囚、死 → 失令（❌）
//
//   第二步「得地/失地」：
//     - 日支藏干含日主本气 → 强力得地（✅，坐下有根）
//     - 其他地支藏干含日主同类（比劫）或生扶（印星） → 得地（✅）
//     - 全无 → 失地（❌）
//
//   第三步「得生/受克」（综合天干助力 vs 克泄力）：
//     - 印星（生我）+ 比劫（同我）：助力
//     - 食伤（我生）+ 财（我克）+ 官杀（克我）：克泄
//     - 助力 ≥ 克泄 → 得生（✅）；否则 → 受克（❌）
//
//   第四步「综合判断」（命理分析方法论 §3.1.1 投票表，7 种组合）：
//     得令 得地 得生 → 结论
//     ✅   ✅   ✅  → 日主极旺
//     ✅   ✅   ❌  → 日主偏旺
//     ✅   ❌   ✅  → 日主中和偏旺
//     ❌   ✅   ✅  → 日主中和偏旺
//     ❌   ✅   ❌  → 日主中和偏弱
//     ❌   ❌   ✅  → 日主偏弱
//     ❌   ❌   ❌  → 日主极弱
//
// 验证基线（蔡蔡 1993-12-07 06:00 男，命局：癸酉·癸亥·壬戌·癸卯）：
//   第一步「得令」：壬日生亥月，水在亥月当令五行=水，同我者「旺」 → ✅
//   第二步「得地」：日支戌(戊本辛中丁余)无水；
//     年支酉藏辛(正印本气)→生身有印 ✅
//     月支亥藏壬(比肩本气)→同水通根 ✅
//     时支卯藏乙(伤官)→不算助 → 综合 ✅ 得地
//   第三步「得生」（仅看天干，不含藏干）：
//     助力：年干癸+月干癸+时干癸 = 3 个劫财透干
//     克泄：天干无食伤财官 = 0
//     助力 3 ≥ 克泄 0 → ✅ 得生
//   ✅✅✅ → 极旺（三法同断），与 mock "日主极旺" 一致
//
// 参考：
//   - 文档 §1.2.3「五行旺相休囚死表」
//   - 文档 §3.1.1「四步判断法」+ §3.1.1 综合判断投票表（子平派标准简化模型）
//   - 文档 §3.1.1 末尾注："以上为简化模型，实际判断中需要考虑合化、冲刑等因素对力量的影响"
//     → 本算法走"标准简化模型"路线，不处理合化/冲刑/季节交界余气，进阶判定留待 M2.4 神煞 / M2.6 增强补

import type {
  Convergence,
  Pillar,
  ShiShen,
  TianGan,
  WangShuai,
  WangShuaiStep,
  WuXing,
} from '../types/bazi';
import { rulesLoader } from './rulesLoader';

// ===== 常量表 =====

const TIAN_GAN_TO_WUXING: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

/**
 * 五行旺相休囚死表（命理分析方法论 §1.2.3）
 * 行：日主五行；列：月令地支所属季节五行
 * 状态值：旺(同我) / 相(生我) / 休(我生) / 囚(我克) / 死(克我)
 */
type WangXiangStatus = '旺' | '相' | '休' | '囚' | '死';

/**
 * 给定日主五行 + 月令五行，返回旺衰状态
 *  - 同我者旺：日主与月令同五行
 *  - 生我者相：月令五行生日主五行
 *  - 我生者休：日主五行生月令五行
 *  - 我克者囚：日主五行克月令五行
 *  - 克我者死：月令五行克日主五行
 */
const SHENG_KE: Record<WuXing, { sheng: WuXing; ke: WuXing }> = {
  木: { sheng: '火', ke: '土' },
  火: { sheng: '土', ke: '金' },
  土: { sheng: '金', ke: '水' },
  金: { sheng: '水', ke: '木' },
  水: { sheng: '木', ke: '火' },
};

function getWangXiangStatus(dayWx: WuXing, monthWx: WuXing): WangXiangStatus {
  const rules = rulesLoader.getWangShuaiRules();
  const wangXiangTable = rules.rules.wangXiangTable.mapping;
  
  // 从配置表中获取旺相休囚死状态
  const status = wangXiangTable[dayWx]?.[monthWx];
  if (!status) {
    throw new Error(`[wangShuaiAnalyzer] 五行关系表中缺失：${dayWx} vs ${monthWx}`);
  }
  return status as WangXiangStatus;
}

/** 旺/相 → 得令；休/囚/死 → 失令（休按文档"中性"处理为失令，保守判定） */
function isDeling(status: WangXiangStatus): boolean {
  const rules = rulesLoader.getWangShuaiRules();
  const positive = rules.rules.deLingThreshold.positive;
  return positive.includes(status);
}

// ===== 工具：天干 → 五行 =====

function ganWx(gan: string): WuXing {
  const wx = TIAN_GAN_TO_WUXING[gan as TianGan];
  if (!wx) throw new Error(`[wangShuaiAnalyzer] 未知天干：${gan}`);
  return wx;
}

/** 判定一个十神是否对日主"有助" */
function isHelpfulShiShen(ss: ShiShen): boolean {
  return ss === '比肩' || ss === '劫财' || ss === '正印' || ss === '偏印' || ss === '日主';
}

/** 判定一个十神是否对日主"克泄" */
function isHarmfulShiShen(ss: ShiShen): boolean {
  return ss === '七杀' || ss === '正官' ||
         ss === '食神' || ss === '伤官' ||
         ss === '正财' || ss === '偏财';
}

// ===== 主入口 =====

/**
 * 旺衰判定：基于四柱 → 推断日主旺衰
 *
 * 严格遵循《命理分析方法论》§3.1 三步打勾投票判定法（不自创加权阈值）。
 *
 * @param pillars 严格 4 柱（[年,月,日,时]）；日柱 = pillars[2]
 * @returns 完整的 WangShuai 结构（4 步推理 + 结论 + 置信度 + 多法同断）
 * @throws 当 pillars 长度 ≠ 4 或日柱缺失时抛错
 */
export function analyzeWangShuai(pillars: readonly Pillar[]): WangShuai {
  // ===== 输入合法性 =====
  if (pillars.length !== 4) {
    throw new Error(`[wangShuaiAnalyzer] 必须传入恰好 4 柱，实际收到 ${pillars.length} 柱`);
  }
  const [yearP, monthP, dayP, hourP] = pillars;
  if (!dayP?.tianGan) {
    throw new Error('[wangShuaiAnalyzer] 日柱（pillars[2]）缺失或无天干');
  }
  for (const p of pillars) {
    if (!p.cangGan || p.cangGan.length === 0) {
      throw new Error(`[wangShuaiAnalyzer] ${p.name ?? '未知柱'} 的藏干列表为空`);
    }
  }

  const dayGan = dayP.tianGan;
  const dayWx = ganWx(dayGan);
  const monthZhi = monthP.diZhi;
  
  // 从配置中获取地支到季节五行的映射
  const rules = rulesLoader.getWangShuaiRules();
  const zhiToSeasonWuxing = rules.rules.zhiToSeasonWuxing.mapping;
  const monthSeasonWx = zhiToSeasonWuxing[monthZhi];
  if (!monthSeasonWx) {
    throw new Error(`[wangShuaiAnalyzer] 未知月令地支：${monthZhi}`);
  }

  // ===== 第一步：得令/失令（基于五行旺相休囚死） =====
  const wangXiangStatus = getWangXiangStatus(dayWx, monthSeasonWx);
  const deLing = isDeling(wangXiangStatus);
  const stepDeLing: WangShuaiStep = {
    step: '得令',
    title: '第一步：得令判断（月令权重最大）',
    details: [
      `日主${dayGan}${dayWx}，生于${monthZhi}月（当令五行：${monthSeasonWx}）`,
      `${dayWx}在${monthZhi}月处「${wangXiangStatus}」之地 → ${deLing ? '✅ 得令' : '❌ 失令'}`,
    ],
    result: deLing ? 'positive' : 'negative',
    score: deLing ? 1 : 0, // 投票制：得令=1，失令=0（非加权评分）
  };

  // ===== 第二步：得地/失地（地支藏干含本气/比劫/印星） =====
  const deDiDetails: string[] = [];
  let dayPillarHasOwnRoot = false; // 日支藏干是否含日主本气（强力得地）
  let otherPillarsHasRoot = false; // 其他地支藏干是否含日主同类或生扶

  // 检查日支
  for (const cg of dayP.cangGan) {
    if (ganWx(cg.gan) === dayWx) {
      dayPillarHasOwnRoot = true;
      deDiDetails.push(`日支${dayP.diZhi}藏${cg.gan}（${cg.shiShen}/${cg.type}），同${dayWx}本气 → 坐下强根`);
      break;
    }
  }

  // 检查年/月/时三支
  for (const p of [yearP, monthP, hourP]) {
    for (const cg of p.cangGan) {
      const ss = cg.shiShen;
      if (ganWx(cg.gan) === dayWx) {
        otherPillarsHasRoot = true;
        deDiDetails.push(`${p.name}${p.diZhi}藏${cg.gan}（${ss}/${cg.type}），同${dayWx}通根`);
      } else if (ss === '正印' || ss === '偏印') {
        otherPillarsHasRoot = true;
        deDiDetails.push(`${p.name}${p.diZhi}藏${cg.gan}（${ss}/${cg.type}），生身有印`);
      }
    }
  }

  const deDi = dayPillarHasOwnRoot || otherPillarsHasRoot;
  if (deDiDetails.length === 0) {
    deDiDetails.push('四柱地支藏干均无日主同类或印星 → ❌ 失地（无根无印）');
  } else {
    deDiDetails.push(`综合：${deDi ? '✅ 得地（有根/有印）' : '❌ 失地'}`);
  }

  const stepDeDi: WangShuaiStep = {
    step: '得地',
    title: '第二步：得地判断（地支藏干通根透印）',
    details: deDiDetails,
    result: deDi ? 'positive' : 'negative',
    score: deDi ? 1 : 0,
  };

  // ===== 第三步：得生/受克（天干助力 vs 克泄力对比） =====
  // 助力 = 比劫数 + 印星数；克泄 = 食伤数 + 财数 + 官杀数
  // 仅看天干（年/月/时干，日干本身=日主不计）
  const helpDetails: string[] = [];
  const harmDetails: string[] = [];
  let helpCount = 0;
  let harmCount = 0;

  for (const p of [yearP, monthP, hourP]) {
    const ss = p.ganShiShen;
    if (isHelpfulShiShen(ss)) {
      helpCount += 1;
      helpDetails.push(`${p.name}干${p.tianGan}（${ss}）助身`);
    } else if (isHarmfulShiShen(ss)) {
      harmCount += 1;
      harmDetails.push(`${p.name}干${p.tianGan}（${ss}）克泄`);
    }
  }

  const deSheng = helpCount >= harmCount;
  const stepDeSheng: WangShuaiStep = {
    step: '得生',
    title: '第三步：得生/受克判断（天干助力 vs 克泄力）',
    details: [
      helpDetails.length > 0 ? `助力（${helpCount}）：${helpDetails.join('；')}` : '助力（0）：天干无比劫无印',
      harmDetails.length > 0 ? `克泄（${harmCount}）：${harmDetails.join('；')}` : '克泄（0）：天干无食伤财官',
      `助力 ${helpCount} ${deSheng ? '≥' : '<'} 克泄 ${harmCount} → ${deSheng ? '✅ 得生' : '❌ 受克'}`,
    ],
    result: deSheng ? 'positive' : 'negative',
    score: deSheng ? 1 : 0,
  };

  // ===== 第四步：综合判断（投票表，7 种组合） =====
  const verdict = lookupVerdict(deLing, deDi, deSheng);
  const stepZongHe: WangShuaiStep = {
    step: '综合',
    title: '综合判断（命理方法论 §3.1.1 投票表）',
    details: [
      `得令${deLing ? '✅' : '❌'} + 得地${deDi ? '✅' : '❌'} + 得生${deSheng ? '✅' : '❌'}`,
      `→ 投票结论：${verdict.label}`,
    ],
    result: verdict.toneIsRich ? 'positive' : verdict.toneIsWeak ? 'negative' : 'neutral',
    score: verdict.toneScore, // -3..+3 仅供 UI 视觉强度参考，非命理评分
  };

  // ===== 多法同断识别 =====
  // 当三步「皆 ✅」或「皆 ❌」时，认定为多法同断（命理学公认的高置信局面）
  const convergence = detectConvergence({
    deLing, deDi, deSheng, verdict, dayWx,
  });

  return {
    steps: [stepDeLing, stepDeDi, stepDeSheng, stepZongHe],
    conclusion: `日主${verdict.label}（${dayWx}${verdict.suffix}）`,
    confidence: verdict.confidence,
    convergence,
  };
}

// ===== 投票表 → 结论映射 =====

interface Verdict {
  label: '极旺' | '偏旺' | '中和偏旺' | '中和偏弱' | '偏弱' | '极弱';
  suffix: string;
  toneIsRich: boolean;
  toneIsWeak: boolean;
  toneScore: number;     // -3..+3 仅 UI 用，无命理含义
  confidence: 1 | 2 | 3 | 4 | 5;
}

/**
 * 命理方法论 §3.1.1 综合判断投票表（7 种组合 → 5 档结论）
 * 注意「✅✅❌」与「❌✅❌」的区别：得令权重最大，故同样"少一票"时得令在的偏旺、不在的中和偏弱。
 */
function lookupVerdict(deLing: boolean, deDi: boolean, deSheng: boolean): Verdict {
  const rules = rulesLoader.getWangShuaiRules();
  const verdictTable = rules.rules.verdictTable.combinations;
  
  // 从配置表中查找匹配的结论
  const match = verdictTable.find(c => c.deLing === deLing && c.deDi === deDi && c.deSheng === deSheng);
  if (!match) {
    throw new Error(`[wangShuaiAnalyzer] 投票表中未找到匹配的组合：deLing=${deLing}, deDi=${deDi}, deSheng=${deSheng}`);
  }
  
  return {
    label: match.label,
    suffix: match.suffix,
    toneIsRich: match.toneIsRich,
    toneIsWeak: match.toneIsWeak,
    toneScore: match.toneScore,
    confidence: match.confidence,
  };
}

// ===== 多法同断识别 =====

interface ConvergenceInput {
  deLing: boolean;
  deDi: boolean;
  deSheng: boolean;
  verdict: Verdict;
  dayWx: WuXing;
}

/**
 * 多法同断：当「得令/得地/得生」三步全部✅或全部❌时，三种独立判定方法（月令法 / 通根法 / 干星法）
 * 共同指向同一结论，命理上视为最高置信度，标注为多法同断。
 *
 * 仅"全 ✅"或"全 ❌"两种极端组合会触发——这与 mock 中蔡蔡极旺的多法同断判定一致。
 */
function detectConvergence(input: ConvergenceInput): Convergence | undefined {
  const { deLing, deDi, deSheng, verdict, dayWx } = input;
  const rules = rulesLoader.getWangShuaiRules();
  const convergenceRules = rules.rules.convergenceRules;

  if (deLing && deDi && deSheng) {
    const template = convergenceRules.allPositive.consumerNoteTemplate;
    return {
      methods: convergenceRules.allPositive.methods,
      conclusion: `日主${dayWx}${verdict.label}`,
      consumerNote: template.replace('{wuxing}', dayWx).replace('{label}', verdict.label),
    };
  }

  if (!deLing && !deDi && !deSheng) {
    const template = convergenceRules.allNegative.consumerNoteTemplate;
    return {
      methods: convergenceRules.allNegative.methods,
      conclusion: `日主${dayWx}${verdict.label}`,
      consumerNote: template.replace('{wuxing}', dayWx).replace('{label}', verdict.label),
    };
  }

  return undefined;
}
