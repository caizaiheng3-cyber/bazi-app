/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 合婚分析器（Compatibility Analyzer）—— M13
//
// 命理学方法论（《三命通会·论合婚》《滴天髓》《子平真诠》）：
//   §16.1 年柱比较：
//     - 生肖六合（子丑/寅亥/卯戌/辰酉/巳申/午未）= 极佳
//     - 生肖三合（申子辰/寅午戌/巳酉丑/亥卯未）= 上吉
//     - 生肖六冲（子午/卯酉/寅申/巳亥/辰戌/丑未）= 大忌
//     - 生肖相刑/相害 = 次忌
//   §16.2 日柱比较（最重要，称"夫妻宫"）：
//     - 天合地合（如甲子↔己丑）= 至尊夫妻
//     - 日干天合 + 日支六合 / 三合 = 大吉
//     - 日支六冲 / 三刑 = 大忌
//   §16.3 用神互补：
//     - 一方喜神=另一方日主五行 → 互为贵人
//     - 一方忌神=另一方日主五行 → 互克
//   §16.4 命格搭配：
//     - 旺衰互补（一旺一弱）= 阴阳调和
//     - 同旺同弱 = 易冲突
//   §16.5 桃花/红艳叠加：
//     - 双方都带桃花 = 易感情纠纷
//     - 双方都带红艳 = 风流争夺

import type {
  BaziChart,
  CompatibilityAnalysis,
  CompatibilityScore,
  DiZhi,
  TianGan,
  WuXing,
} from '../types/bazi';

const SHENG_MAP: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE_MAP: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

const ZHI_LIU_HE: Record<DiZhi, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};

const ZHI_CHONG: Record<DiZhi, DiZhi> = {
  子: '午', 午: '子', 卯: '酉', 酉: '卯', 寅: '申', 申: '寅',
  巳: '亥', 亥: '巳', 辰: '戌', 戌: '辰', 丑: '未', 未: '丑',
};

const GAN_HE: Record<TianGan, TianGan> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙',
  丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
};

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const SAN_HE_GROUPS: DiZhi[][] = [
  ['申','子','辰'], ['寅','午','戌'], ['巳','酉','丑'], ['亥','卯','未'],
];

const ZHI_XING_GROUPS: DiZhi[][] = [
  ['寅','巳','申'], ['丑','戌','未'], ['子','卯'],
];

// ============================================================
// 维度 1：年柱（生肖）匹配
// ============================================================
function scoreYearMatch(manYearZhi: DiZhi, womanYearZhi: DiZhi): CompatibilityScore {
  let score = 5; // 中性基础分
  const reasons: string[] = [];

  // 生肖六合
  if (ZHI_LIU_HE[manYearZhi] === womanYearZhi) {
    score = 10;
    reasons.push(`生肖六合（${manYearZhi}↔${womanYearZhi}），主缘分极深`);
  }
  // 生肖三合
  else if (SAN_HE_GROUPS.some((g) => g.includes(manYearZhi) && g.includes(womanYearZhi) && manYearZhi !== womanYearZhi)) {
    score = 8;
    reasons.push(`生肖三合（${manYearZhi}↔${womanYearZhi}），主三观相合`);
  }
  // 生肖六冲
  else if (ZHI_CHONG[manYearZhi] === womanYearZhi) {
    score = 1;
    reasons.push(`生肖六冲（${manYearZhi}↔${womanYearZhi}），主家庭背景反差大、易争执`);
  }
  // 生肖相刑
  else if (ZHI_XING_GROUPS.some((g) => g.includes(manYearZhi) && g.includes(womanYearZhi))) {
    score = 3;
    reasons.push(`生肖相刑（${manYearZhi}↔${womanYearZhi}），主长辈代际有摩擦`);
  }
  // 同生肖（伏吟）
  else if (manYearZhi === womanYearZhi) {
    score = 6;
    reasons.push(`同生肖（伏吟），主性格相似，但易"同病相怜"缺新意`);
  } else {
    reasons.push(`生肖${manYearZhi}↔${womanYearZhi}，无显著合冲，平稳`);
  }

  return {
    dimension: '生肖年柱',
    score,
    maxScore: 10,
    detail: reasons.join('；'),
  };
}

// ============================================================
// 维度 2：日柱（夫妻宫）匹配
// ============================================================
function scoreDayMatch(
  manDayGan: TianGan, manDayZhi: DiZhi,
  womanDayGan: TianGan, womanDayZhi: DiZhi,
): CompatibilityScore {
  let score = 5;
  const reasons: string[] = [];

  const ganHe = GAN_HE[manDayGan] === womanDayGan;
  const zhiHe = ZHI_LIU_HE[manDayZhi] === womanDayZhi;
  const zhiSanHe = SAN_HE_GROUPS.some((g) => g.includes(manDayZhi) && g.includes(womanDayZhi) && manDayZhi !== womanDayZhi);
  const zhiChong = ZHI_CHONG[manDayZhi] === womanDayZhi;
  const zhiXing = ZHI_XING_GROUPS.some((g) => g.includes(manDayZhi) && g.includes(womanDayZhi));

  if (ganHe && zhiHe) {
    score = 10;
    reasons.push(`日柱天合地合（${manDayGan}${manDayZhi}↔${womanDayGan}${womanDayZhi}），至尊夫妻配`);
  } else if (ganHe && zhiSanHe) {
    score = 9;
    reasons.push(`日干合${ganHe ? '+' : ''}日支三合，缘分深厚`);
  } else if (ganHe) {
    score = 8;
    reasons.push(`日干合（${manDayGan}↔${womanDayGan}），夫妻情深`);
  } else if (zhiHe) {
    score = 7;
    reasons.push(`日支六合（${manDayZhi}↔${womanDayZhi}），夫妻和顺`);
  } else if (zhiSanHe) {
    score = 7;
    reasons.push(`日支三合（${manDayZhi}↔${womanDayZhi}），三观一致`);
  } else if (zhiChong) {
    score = 1;
    reasons.push(`日支六冲（${manDayZhi}↔${womanDayZhi}），夫妻宫互冲，主分居/争执频繁`);
  } else if (zhiXing) {
    score = 3;
    reasons.push(`日支相刑（${manDayZhi}↔${womanDayZhi}），主感情有刑伤`);
  } else if (manDayGan === womanDayGan && manDayZhi === womanDayZhi) {
    score = 4;
    reasons.push(`日柱完全相同（伏吟），主性格雷同但易厌倦`);
  } else {
    reasons.push(`日柱${manDayGan}${manDayZhi}↔${womanDayGan}${womanDayZhi}，平稳无显著合冲`);
  }

  return {
    dimension: '日柱夫妻宫',
    score,
    maxScore: 10,
    detail: reasons.join('；'),
  };
}

// ============================================================
// 维度 3：用神互补
// ============================================================
function scoreYongShenMatch(man: BaziChart, woman: BaziChart): CompatibilityScore {
  const manDayWx = GAN_TO_WX[man.pillars[2].tianGan as TianGan];
  const womanDayWx = GAN_TO_WX[woman.pillars[2].tianGan as TianGan];

  const manYongPrimary = man.yongShen.primary;
  const womanYongPrimary = woman.yongShen.primary;
  const manJi = man.yongShen.ji;
  const womanJi = woman.yongShen.ji;

  let score = 5;
  const reasons: string[] = [];

  // 一方喜神 = 另一方日主五行
  const manHelpsWoman = womanYongPrimary.includes(manDayWx);
  const womanHelpsMan = manYongPrimary.includes(womanDayWx);

  if (manHelpsWoman && womanHelpsMan) {
    score = 10;
    reasons.push(`双方互为对方用神（男${manDayWx}是女用，女${womanDayWx}是男用），互为贵人`);
  } else if (manHelpsWoman) {
    score = 8;
    reasons.push(`男方${manDayWx}是女方喜用神，男方对女方有助益`);
  } else if (womanHelpsMan) {
    score = 8;
    reasons.push(`女方${womanDayWx}是男方喜用神，女方旺夫`);
  } else if (manJi.includes(womanDayWx) || womanJi.includes(manDayWx)) {
    score = 2;
    reasons.push(`其中一方为另一方忌神，主性格冲突/相互削弱`);
  } else if (manYongPrimary.some((wx) => womanYongPrimary.includes(wx))) {
    score = 6;
    reasons.push(`双方用神同道（共喜${manYongPrimary.filter((wx) => womanYongPrimary.includes(wx)).join('/')}），同方向追求`);
  } else {
    reasons.push(`用神不冲不合，平稳`);
  }

  return {
    dimension: '用神互补',
    score,
    maxScore: 10,
    detail: reasons.join('；'),
  };
}

// ============================================================
// 维度 4：旺衰互补
// ============================================================
function scoreWangShuaiMatch(man: BaziChart, woman: BaziChart): CompatibilityScore {
  const manConclusion = man.wangShuai.conclusion;
  const womanConclusion = woman.wangShuai.conclusion;

  const isManWang = manConclusion.includes('旺') || manConclusion.includes('强');
  const isWomanWang = womanConclusion.includes('旺') || womanConclusion.includes('强');

  let score = 5;
  let detail = '';

  if (isManWang !== isWomanWang) {
    score = 8;
    detail = `一旺一弱（男${manConclusion}/女${womanConclusion}），阴阳调和，相辅相成`;
  } else if (isManWang && isWomanWang) {
    score = 4;
    detail = `双方均偏旺（男${manConclusion}/女${womanConclusion}），易争主导权`;
  } else {
    score = 5;
    detail = `双方均偏弱（男${manConclusion}/女${womanConclusion}），需共同努力`;
  }

  return {
    dimension: '旺衰互补',
    score,
    maxScore: 10,
    detail,
  };
}

// ============================================================
// 维度 5：桃花/红艳叠加
// ============================================================
function scorePeachBlossom(man: BaziChart, woman: BaziChart): CompatibilityScore {
  const manTaoHua = man.shenShas.some((s) => s.name === '桃花（咸池）');
  const womanTaoHua = woman.shenShas.some((s) => s.name === '桃花（咸池）');
  const manHongYan = man.shenShas.some((s) => s.name === '红艳煞');
  const womanHongYan = woman.shenShas.some((s) => s.name === '红艳煞');

  let score = 7;
  const reasons: string[] = [];

  if (manTaoHua && womanTaoHua) {
    score -= 2;
    reasons.push('双方均带桃花，需防外缘干扰');
  }
  if (manHongYan && womanHongYan) {
    score -= 2;
    reasons.push('双方均带红艳煞，易有第三者纠葛');
  }
  if (!manTaoHua && !womanTaoHua && !manHongYan && !womanHongYan) {
    score = 9;
    reasons.push('双方均无桃花/红艳，感情专一');
  }

  return {
    dimension: '桃花情感',
    score: Math.max(1, score),
    maxScore: 10,
    detail: reasons.length > 0 ? reasons.join('；') : '桃花情感平稳',
  };
}

// ============================================================
// 主入口
// ============================================================
/**
 * 合婚分析。
 *
 * 参数命名为 man/woman 仅是命理学传统口径（男方为天、女方为地，方便描述配偶宫互动），
 * 实际算法对性别并不敏感（合化/六合/三合/六冲/用神互补/旺衰互补 等规则都是对称的）。
 * 同性或非传统组合，将 partyA 传 man、partyB 传 woman 即可，结论同样有效。
 */
export function analyzeCompatibility(man: BaziChart, woman: BaziChart): CompatibilityAnalysis {
  const manYearZhi = man.pillars[0].diZhi as DiZhi;
  const womanYearZhi = woman.pillars[0].diZhi as DiZhi;
  const manDayGan = man.pillars[2].tianGan as TianGan;
  const manDayZhi = man.pillars[2].diZhi as DiZhi;
  const womanDayGan = woman.pillars[2].tianGan as TianGan;
  const womanDayZhi = woman.pillars[2].diZhi as DiZhi;

  const scores: CompatibilityScore[] = [
    scoreYearMatch(manYearZhi, womanYearZhi),
    scoreDayMatch(manDayGan, manDayZhi, womanDayGan, womanDayZhi),
    scoreYongShenMatch(man, woman),
    scoreWangShuaiMatch(man, woman),
    scorePeachBlossom(man, woman),
  ];

  // 5 个维度总分（每维度 10 分），归一化到 100
  const totalRaw = scores.reduce((sum, s) => sum + s.score, 0);
  const maxRaw = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const totalScore = Math.round((totalRaw / maxRaw) * 100);

  let overallLabel: CompatibilityAnalysis['overallLabel'];
  if (totalScore >= 90) overallLabel = '天作之合';
  else if (totalScore >= 75) overallLabel = '佳偶天成';
  else if (totalScore >= 60) overallLabel = '良缘可结';
  else if (totalScore >= 45) overallLabel = '需多磨合';
  else overallLabel = '不甚相宜';

  // 缘分类型
  const yongShenScore = scores[2].score;
  const wangShuaiScore = scores[3].score;
  let affinityType: CompatibilityAnalysis['affinityType'];
  if (yongShenScore >= 8 && wangShuaiScore >= 7) affinityType = '互补型（用神补忌神）';
  else if (yongShenScore >= 6) affinityType = '同道型（同用神）';
  else if (yongShenScore <= 3) affinityType = '冲突型（互为忌神）';
  else affinityType = '中和型（无明显冲合）';

  // 优势 + 提醒
  const highlights: string[] = [];
  const reminders: string[] = [];
  for (const s of scores) {
    if (s.score >= 8) highlights.push(`【${s.dimension}】${s.detail}`);
    if (s.score <= 3) reminders.push(`【${s.dimension}】${s.detail}`);
  }
  if (highlights.length === 0) highlights.push('双方各维度均无突出优势项，需用心经营');
  if (reminders.length === 0) reminders.push('双方各维度均无显著冲突，平稳可期');

  // 综合判词
  const summary = `${overallLabel}（${totalScore}分/100）。` +
    `缘分类型：【${affinityType}】。` +
    `日柱比较得分${scores[1].score}/10，年柱得分${scores[0].score}/10，` +
    `用神互补${scores[2].score}/10，旺衰搭配${scores[3].score}/10。` +
    (totalScore >= 75 ? '建议结合，相伴一生。' :
     totalScore >= 60 ? '可结良缘，需善加经营。' :
     totalScore >= 45 ? '存在挑战，需双方共同磨合。' :
     '命理上多有不合，建议深思熟虑。');

  return {
    manSummary: { ganZhi: man.pillars.map((p) => p.tianGan + p.diZhi).join(' '), dayMaster: man.pillars[2].tianGan },
    womanSummary: { ganZhi: woman.pillars.map((p) => p.tianGan + p.diZhi).join(' '), dayMaster: woman.pillars[2].tianGan },
    scores,
    totalScore,
    overallLabel,
    affinityType,
    summary,
    highlights,
    reminders,
  };
}