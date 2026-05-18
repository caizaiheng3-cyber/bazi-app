/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// "先生"对话引擎（M7.5）
//
// 输入：{ question, scene, chart, anchorDate? }
// 输出：ShifuReply（empathy + explanation + suggestion + verdict + basis + bestTiming?）
//
// 设计要点：
//   - 完全规则化，与命盘强绑定（不依赖 LLM）
//   - 4 种场景各有独立生成器：决策 / 择吉 / 宜忌 / 开放
//   - 决策类：判定 verdict 基于 当前流日干支 vs 用神/忌神 + 地支与日支关系
//   - 择吉类：扫描未来 14 日，找出最佳 1-2 个吉日
//   - 宜忌类：复用 dailyForecast 当日数据
//   - 开放类：引用命格 / 旺衰 / 大运 / 用神，给出与命局强绑定的回话
//
// 共享常量与时辰挑选工具集中在 dailyConstants.ts。

import type {
  AskScene,
  BaziChart,
  DaYun,
  DiZhi,
  FocusArea,
  ShifuReply,
  GenerateReplyInput,
} from '../types/bazi';
import {
  computeCurrentLiuNian,
  computeDayForecast,
  computeFutureDays,
  type DayForecast,
} from './dailyForecast';
import { computeDayScore } from './dailyFortuneGenerator';
import { TIAN_GAN_TO_WUXING, DI_ZHI_TO_WUXING } from './dailyConstants';
import { rulesLoader } from './rulesLoader';

// ===== 常量表 - 从配置加载 =====

function getWuxingToGoodActions(): Record<string, string[]> {
  const rules = rulesLoader.getConsumerReportRules();
  const wuxingGuide = rules.rules.wuxingGuide;
  const result: Record<string, string[]> = {};
  for (const wx of Object.keys(wuxingGuide) as Array<keyof typeof wuxingGuide>) {
    result[wx] = wuxingGuide[wx].industries;
  }
  return result;
}

function getWuxingToBadActions(): Record<string, string[]> {
  const rules = rulesLoader.getConsumerReportRules();
  const wuxingGuide = rules.rules.wuxingGuide;
  const result: Record<string, string[]> = {};
  for (const wx of Object.keys(wuxingGuide) as Array<keyof typeof wuxingGuide>) {
    // 反义词作为忌神活动
    const industries = wuxingGuide[wx].industries;
    result[wx] = industries.map(i => `过度${i}`);
  }
  return result;
}
const FOCUS_KEYWORDS: Record<FocusArea, string[]> = {
  事业: ['工作', '上班', '事业', '面试', '签约', '合作', '项目', '老板', '同事', '升职', '跳槽', '辞职'],
  感情: ['对象', '恋爱', '分手', '复合', '结婚', '相亲', '感情', '另一半', '伴侣'],
  财运: ['钱', '财', '投资', '理财', '股票', '生意', '收入', '亏', '赚', '贷款'],
  健康: ['身体', '健康', '生病', '失眠', '睡', '医院', '体检', '焦虑', '累'],
  学业: ['学习', '考试', '考研', '考公', '高考', '论文', '学校', '老师'],
  人际: ['朋友', '家人', '父母', '亲戚', '关系', '矛盾', '吵架'],
};

// ===== 输入 / 输出 =====

export interface GenerateReplyInput {
  question: string;
  scene: AskScene;
  chart: BaziChart;
  /** 锚点日期，默认今日；用于流日推算 */
  anchorDate?: Date;
}

// ===== 工具函数 =====

/** 从问题文本中提取关心领域；命中多个时取首个声明的领域 */
function detectFocusArea(question: string): FocusArea | undefined {
  const areas: FocusArea[] = ['事业', '感情', '财运', '健康', '学业', '人际'];
  for (const area of areas) {
    if (FOCUS_KEYWORDS[area].some((kw) => question.includes(kw))) {
      return area;
    }
  }
  return undefined;
}

/** 取当前大运（按今日年份匹配 startYear ≤ year ≤ endYear） */
function findCurrentDaYun(daYuns: readonly DaYun[], year: number): DaYun | undefined {
  return daYuns.find((d) => d.startYear <= year && year <= d.endYear);
}

/** 流日干支与命主用神配合度判定 */
type Compatibility = '相合' | '生扶' | '相冲' | '相克' | '中性';

function judgeCompatibility(
  forecast: DayForecast,
  yongShen: BaziChart['yongShen'],
): Compatibility {
  const ganWx = TIAN_GAN_TO_WUXING[forecast.tianGan];
  const zhiWx = DI_ZHI_TO_WUXING[forecast.diZhi];
  const isGanYong = yongShen.primary.includes(ganWx) || yongShen.secondary.includes(ganWx);
  const isZhiYong = yongShen.primary.includes(zhiWx) || yongShen.secondary.includes(zhiWx);
  const isGanJi = yongShen.ji.includes(ganWx);
  const isZhiJi = yongShen.ji.includes(zhiWx);

  // 冲日支 → 相冲（最重，无视用忌）
  if (forecast.relationToDayZhi === '冲') return '相冲';
  // 干支皆忌 → 相克
  if (isGanJi && isZhiJi) return '相克';
  // 干支皆用 + 关系合 → 相合
  if (isGanYong && isZhiYong && forecast.relationToDayZhi === '合') return '相合';
  // 干或支为用 → 生扶
  if (isGanYong || isZhiYong) return '生扶';
  // 干或支为忌 → 相克
  if (isGanJi || isZhiJi) return '相克';
  return '中性';
}

/** Compatibility → verdict */
function compatToVerdict(compat: Compatibility): ShifuReply['verdict'] {
  switch (compat) {
    case '相合': return '宜';
    case '生扶': return '宜';
    case '相冲': return '忌';
    case '相克': return '慎';
    default: return '中性';
  }
}

/** Compatibility → 整体一句话定性 */
function compatToOverall(c: Compatibility): string {
  switch (c) {
    case '相合': return '气场最合，宜出宜动';
    case '生扶': return '气场顺意，可主动行事';
    case '相冲': return '气场冲撞，宜守不宜攻';
    case '相克': return '气场相违，宜缓不宜急';
    default: return '气场平稳，量力而行';
  }
}

/**
 * 选取"指定 forecast 那一天"的最佳时辰
 *   - 排除：冲日时排除当日地支本身（避免推荐与日支再起冲突）
 *   - 排除：与命主日支构成冲/刑/害的时辰（额外加一层防护）
 */
function pickBestHourForDay(
  forecast: DayForecast,
  chart: BaziChart,
): DiZhi {
  const exclude: DiZhi[] = [];
  if (forecast.relationToDayZhi === '冲') {
    exclude.push(forecast.diZhi);
  }
  // 命主日支六冲对应时辰也避开（如日支亥则避开巳时）
  const dayZhi = chart.pillars[2].diZhi;
  const conflictMap: Partial<Record<DiZhi, DiZhi>> = {
    子: '午', 午: '子',
    丑: '未', 未: '丑',
    寅: '申', 申: '寅',
    卯: '酉', 酉: '卯',
    辰: '戌', 戌: '辰',
    巳: '亥', 亥: '巳',
  };
  const conflictHour = conflictMap[dayZhi];
  if (conflictHour && !exclude.includes(conflictHour)) {
    exclude.push(conflictHour);
  }

  return pickBestHour(chart.yongShen, { excludeZhi: exclude });
}

function buildEmpathy(input: GenerateReplyInput): string {
  const templates = rulesLoader.getShifuReplyTemplates();
  const empathyTemplates = templates.templates.empathy.scenes;
  return empathyTemplates[input.scene] || empathyTemplates['开放'];
}

// ===== 解释段（explanation）拼装 =====

function buildExplanationForToday(
  forecast: DayForecast,
  chart: BaziChart,
  compat: Compatibility,
): string {
  const templates = rulesLoader.getShifuReplyTemplates();
  const explanationTemplates = templates.templates.explanation;
  
  const dayPillar = chart.pillars[2];
  const dayGan = dayPillar.tianGan;
  const dayZhi = dayPillar.diZhi;
  const ganWx = TIAN_GAN_TO_WUXING[forecast.tianGan];
  const zhiWx = DI_ZHI_TO_WUXING[forecast.diZhi];

  const ganRole = chart.yongShen.primary.includes(ganWx)
    ? explanationTemplates.ganRoleTemplates.primary.replace('{wuxing}', ganWx)
    : chart.yongShen.secondary.includes(ganWx)
      ? explanationTemplates.ganRoleTemplates.secondary.replace('{wuxing}', ganWx)
      : chart.yongShen.ji.includes(ganWx)
        ? explanationTemplates.ganRoleTemplates.ji.replace('{wuxing}', ganWx)
        : explanationTemplates.ganRoleTemplates.neutral.replace('{wuxing}', ganWx);

  const zhiRole = chart.yongShen.primary.includes(zhiWx)
    ? explanationTemplates.zhiRoleTemplates.primary.replace('{zhi}', forecast.diZhi).replace('{wuxing}', zhiWx)
    : chart.yongShen.ji.includes(zhiWx)
      ? explanationTemplates.zhiRoleTemplates.ji.replace('{zhi}', forecast.diZhi).replace('{wuxing}', zhiWx)
      : explanationTemplates.zhiRoleTemplates.neutral.replace('{zhi}', forecast.diZhi).replace('{wuxing}', zhiWx);

  let relPart = '';
  switch (forecast.relationToDayZhi) {
    case '合':
      relPart = explanationTemplates.relationTemplates['合'].replace('{dayZhi}', dayZhi);
      break;
    case '冲':
      relPart = explanationTemplates.relationTemplates['冲'].replace('{dayZhi}', dayZhi);
      break;
    case '刑':
      relPart = explanationTemplates.relationTemplates['刑'].replace('{dayZhi}', dayZhi);
      break;
    case '害':
      relPart = explanationTemplates.relationTemplates['害'].replace('{dayZhi}', dayZhi);
      break;
    default:
      relPart = explanationTemplates.relationTemplates['无'].replace('{dayZhi}', dayZhi);
  }

  const overall = compatToOverall(compat);

  return explanationTemplates.template
    .replace('{ganZhi}', forecast.ganZhi)
    .replace('{dayGan}', dayGan)
    .replace('{ganRole}', ganRole)
    .replace('{zhiRole}', zhiRole)
    .replace('{relation}', relPart)
    .replace('{overall}', overall);
}

// ===== 建议段（suggestion）按 verdict 生成 =====

interface BestAlternative {
  date: string;
  ganZhi: string;
  hour: string;
}

function buildSuggestionForDecision(
  verdict: ShifuReply['verdict'],
  forecast: DayForecast,
  chart: BaziChart,
  bestAlt?: BestAlternative,
): string {
  const todayBestHour = pickBestHourForDay(forecast, chart);
  const lines: string[] = [];
  switch (verdict) {
    case '宜':
      lines.push(`① 今日可放心推进，时段首选 ${formatHour(todayBestHour)}；`);
      lines.push('② 行事前先把要点列清，避免临场漏项；');
      lines.push('③ 着装与场所方位以您用神之色为佳，借势而行。');
      break;
    case '慎':
      lines.push('① 今日如非紧要，建议放缓半步——先以电话/线上沟通为主；');
      if (bestAlt) {
        lines.push(`② 若可改期，推荐 ${bestAlt.date}（${bestAlt.ganZhi}日）${bestAlt.hour}，气场更合您；`);
      } else {
        lines.push('② 留意未来 3-5 日内更顺的窗口，过几日再问先生择吉；');
      }
      lines.push('③ 今日多饮温水、少思虑，傍晚早睡，养回精神再战。');
      break;
    case '忌':
      lines.push('① 今日强行不利，建议主动延期，礼貌说明并约下一档；');
      if (bestAlt) {
        lines.push(`② 推荐改至 ${bestAlt.date}（${bestAlt.ganZhi}日）${bestAlt.hour}，正为您气场所合；`);
      }
      lines.push('③ 今日宜居守、复盘、整理资料，为下一档做足功课。');
      break;
    case '中性':
    default:
      lines.push('① 今日气场无明显助力或阻力，按平日节奏做事即可；');
      lines.push(`② 关键时段建议放在 ${formatHour(todayBestHour)}；`);
      lines.push('③ 不必凡事求问，心安即是吉时。');
  }
  return lines.join('
');
}

// ===== 决策类生成 =====

function generateDecisionReply(input: GenerateReplyInput, anchor: Date): ShifuReply {
  const chart = input.chart;
  const dayP = chart.pillars[2];
  const todayForecast = computeDayForecast(dayP.tianGan, dayP.diZhi, anchor);
  const compat = judgeCompatibility(todayForecast, chart.yongShen);
  const verdict = compatToVerdict(compat);

  // 若今日为慎/忌，扫描未来 14 日找出更好的窗口
  let bestAlt: BestAlternative | undefined;
  if (verdict === '慎' || verdict === '忌') {
    const future = computeFutureDays(dayP.tianGan, dayP.diZhi, 14, anchor);
    const scored = future
      .slice(1) // 排除今天
      .map((f) => ({ forecast: f, score: computeDayScore(chart, f).total }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best && best.score >= 60) {
      const altHour = pickBestHourForDay(best.forecast, chart);
      bestAlt = {
        date: best.forecast.date,
        ganZhi: best.forecast.ganZhi,
        hour: formatHour(altHour),
      };
    }
  }

  const focus = detectFocusArea(input.question);
  const currentYear = anchor.getFullYear();
  const daYun = findCurrentDaYun(chart.daYuns, currentYear);
  const todayBestHour = pickBestHourForDay(todayForecast, chart);

  return {
    empathy: buildEmpathy(input),
    explanation: buildExplanationForToday(todayForecast, chart, compat),
    suggestion: buildSuggestionForDecision(verdict, todayForecast, chart, bestAlt),
    verdict,
    basis: {
      liuRi: `${todayForecast.ganZhi}日 · ${getLiuRiBrief(todayForecast)}`,
      liuNian: `${computeCurrentLiuNian(anchor)}流年`,
      yongShen: `用神${chart.yongShen.primary.join('+')}${chart.yongShen.ji.length ? `，忌${chart.yongShen.ji.join('+')}` : ''}`,
      daYun: daYun ? `${daYun.ganZhi}大运 · ${daYun.shiShen}` : undefined,
    },
    bestTiming: bestAlt
      ? `${bestAlt.date}（${bestAlt.ganZhi}日）${bestAlt.hour}`
      : `今日 ${formatHour(todayBestHour)}`,
    relatedFocus: focus,
  };
}

function getLiuRiBrief(f: DayForecast): string {
  const parts = [`天干${f.tianGan}（${f.shiShen}）`];
  if (f.relationToDayZhi !== '无') {
    parts.push(`地支与日支相${f.relationToDayZhi}`);
  } else {
    parts.push('地支与日支无显著相犯');
  }
  return parts.join('，');
}

// ===== 择吉类生成 =====

function generateTimingReply(input: GenerateReplyInput, anchor: Date): ShifuReply {
  const chart = input.chart;
  const dayP = chart.pillars[2];
  // 扫描未来 14 日，挑出 top 2 吉日
  const future = computeFutureDays(dayP.tianGan, dayP.diZhi, 14, anchor);
  const scored = future
    .map((f) => ({ forecast: f, score: computeDayScore(chart, f).total }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 2);
  const worst = [...scored].reverse()[0];

  const focus = detectFocusArea(input.question);
  const currentYear = anchor.getFullYear();
  const daYun = findCurrentDaYun(chart.daYuns, currentYear);

  // 解释段：列出 top1 + top2 的具体推断
  const explainParts: string[] = [];
  if (top[0]) {
    const f = top[0].forecast;
    explainParts.push(`首选 ${f.date}（${f.ganZhi}日）：${getLiuRiBrief(f)}，于您命局最合。`);
  }
  if (top[1]) {
    const f = top[1].forecast;
    explainParts.push(`次选 ${f.date}（${f.ganZhi}日）：${getLiuRiBrief(f)}，亦可备选。`);
  }
  if (worst && worst.score < 40) {
    const f = worst.forecast;
    explainParts.push(`需避开 ${f.date}（${f.ganZhi}日）：${getLiuRiBrief(f)}，气场不利。`);
  }

  // 建议段：明确日期 + 真实计算的最佳时辰 + 准备事项
  const sugLines: string[] = [];
  let bestTiming: string | undefined;
  if (top[0]) {
    const top1Hour = pickBestHourForDay(top[0].forecast, chart);
    const top1HourFmt = formatHour(top1Hour);
    bestTiming = `${top[0].forecast.date}（${top[0].forecast.ganZhi}日）${top1HourFmt}`;
    sugLines.push(`① 首选 ${top[0].forecast.date}（${top[0].forecast.ganZhi}日）${top1HourFmt} 正式落定；`);
    sugLines.push('② 前一日把所有附件、版本、材料整理好，避免临场改动；');
    sugLines.push('③ 场地方位尽量选与您用神同向，借势而行。');
  } else {
    sugLines.push('① 未来两周内未见显著吉日，建议再向后推一档；');
    sugLines.push('② 如必须近期落定，选最近一个气场平稳之日，避开冲日。');
  }

  const verdict: ShifuReply['verdict'] = top[0] && top[0].score >= 60 ? '宜' : '中性';

  return {
    empathy: buildEmpathy(input),
    explanation: explainParts.join(' '),
    suggestion: sugLines.join('
'),
    verdict,
    basis: {
      liuRi: top[0] ? `${top[0].forecast.ganZhi}日 · 当选最佳` : '14 日内无显著吉日',
      yongShen: `用神${chart.yongShen.primary.join('+')}`,
      daYun: daYun ? `${daYun.ganZhi}大运` : undefined,
    },
    bestTiming,
    relatedFocus: focus,
  };
}

// ===== 宜忌类生成 =====

function generateDailyTipsReply(input: GenerateReplyInput, anchor: Date): ShifuReply {
  const chart = input.chart;
  const dayP = chart.pillars[2];
  const f = computeDayForecast(dayP.tianGan, dayP.diZhi, anchor);
  const compat = judgeCompatibility(f, chart.yongShen);
  const verdict = compatToVerdict(compat);

  const ganWx = TIAN_GAN_TO_WUXING[f.tianGan];
  const isYongDay = chart.yongShen.primary.includes(ganWx);
  const isJiDay = chart.yongShen.ji.includes(ganWx);

  const bias = isYongDay
    ? '今日整体顺意，宜主动出击'
    : isJiDay
      ? '今日整体宜守，少动为佳'
      : '今日整体平稳，按常规节奏即可';

  const explanation = `今日${f.ganZhi}。${buildExplanationForToday(f, chart, compat).replace(/^.*?，/, '')} ${bias}。`;

  const todayBestHour = pickBestHourForDay(f, chart);
  const sugLines: string[] = [];
  sugLines.push(`① **宜**：${pickGoodActions(chart).join('、')}；`);
  sugLines.push(`② **忌**：${pickBadActions(chart, f).join('、')}；`);
  sugLines.push(`③ 吉时：${formatHour(todayBestHour)}。`);

  const focus = detectFocusArea(input.question);
  const currentYear = anchor.getFullYear();
  const daYun = findCurrentDaYun(chart.daYuns, currentYear);

  return {
    empathy: buildEmpathy(input),
    explanation,
    suggestion: sugLines.join('
'),
    verdict,
    basis: {
      liuRi: `${f.ganZhi}日 · ${getLiuRiBrief(f)}`,
      yongShen: `用神${chart.yongShen.primary.join('+')}`,
      daYun: daYun ? `${daYun.ganZhi}大运` : undefined,
    },
    bestTiming: formatHour(todayBestHour),
    relatedFocus: focus,
  };
}

function pickGoodActions(chart: BaziChart): string[] {
  const set = new Set<string>();
  const wuxingToGoodActions = getWuxingToGoodActions();
  for (const wx of chart.yongShen.primary) {
    wuxingToGoodActions[wx]?.forEach((a) => set.add(a));
    if (set.size >= 4) break;
  }
  return Array.from(set).slice(0, 4);
}

function pickBadActions(chart: BaziChart, f: DayForecast): string[] {
  const set = new Set<string>();
  const wuxingToBadActions = getWuxingToBadActions();
  for (const wx of chart.yongShen.ji) {
    wuxingToBadActions[wx]?.forEach((a) => set.add(a));
    if (set.size >= 3) break;
  }
  if (f.relationToDayZhi === '冲') {
    set.add('远行');
    set.add('动土');
  }
  if (set.size === 0) {
    set.add('过度劳神');
    set.add('情绪失控');
  }
  return Array.from(set).slice(0, 3);
}

// ===== 开放类生成（兜底）—— 真正引用命格 / 旺衰 / 大运 =====

function generateOpenReply(input: GenerateReplyInput, anchor: Date): ShifuReply {
  const chart = input.chart;
  const dayP = chart.pillars[2];
  const f = computeDayForecast(dayP.tianGan, dayP.diZhi, anchor);
  const compat = judgeCompatibility(f, chart.yongShen);
  const verdict = compatToVerdict(compat);

  const focus = detectFocusArea(input.question);
  const currentYear = anchor.getFullYear();
  const daYun = findCurrentDaYun(chart.daYuns, currentYear);

  const focusHint = focus
    ? `您问的是${focus}方面，`
    : '';

  const yongStr = chart.yongShen.primary.join('+');
  const jiStr = chart.yongShen.ji.length ? chart.yongShen.ji.join('+') : '无显著忌神';

  // —— 引用命格信息（geJu）让回话与命主"个性化"绑定 ——
  const geJuPart = chart.geJu
    ? `您命格为「${chart.geJu.name}」（${chart.geJu.status}，${chart.geJu.level}等），${chart.geJu.description.slice(0, 30)}…`
    : '';

  // —— 引用旺衰让回话有"立场" ——
  const wangShuaiPart = chart.wangShuai?.conclusion
    ? `日主${chart.wangShuai.conclusion}，`
    : '';

  const explanation =
    `${focusHint}先生先把您当下的气场理一理。` +
    `${geJuPart}${wangShuaiPart}` +
    `当前${daYun?.ganZhi ?? '当下'}大运（${daYun?.shiShen ?? ''}）、${computeCurrentLiuNian(anchor)}流年、${f.ganZhi}流日三者合参——` +
    `您命局以${yongStr}为用神（忌${jiStr}）。今日${getLiuRiBrief(f)}，整体${compatToOverall(compat)}。` +
    `具体到您问的事，多一份审慎、少一份冲动，方向便不会偏。`;

  // —— 建议段：基于用神 + 是否大运配合 + focus 给三条具体行动 ——
  const sugLines: string[] = [];

  // ① 基于用神的方位/颜色/活动建议
  const yongActions = pickGoodActions(chart).slice(0, 2).join('、');
  sugLines.push(`① 近期可多接触${yongStr}相关之物（颜色/方位/行业），以${yongActions}等事补气；`);

  // ② 基于忌神的避忌建议
  if (chart.yongShen.ji.length) {
    sugLines.push(`② 避开${jiStr}方位与活动，少耗心神；`);
  } else {
    sugLines.push('② 命局气场较平，按平日节奏做事即可；');
  }

  // ③ 基于 focus 的引导（如有）
  if (focus) {
    const sceneHint = focus === '健康'
      ? '③ 健康类问题命理只是一面镜子，若身体不适请务必先就医，不能代替医嘱。'
      : focus === '感情'
        ? '③ 感情之事三分天注定七分人为，先生只看大运起伏，具体进退请您自己拿主意。'
        : focus === '财运'
          ? '③ 财运起伏看大运不看流月，建议把眼光放长，不为一时得失乱了方寸。'
          : '③ 若有具体决策，可把场景换成「决策建议」再问一次，先生给您更精准的回话。';
    sugLines.push(sceneHint);
  } else {
    sugLines.push('③ 若有具体决策，可把场景换成「决策建议」再问一次，先生给您更精准的回话。');
  }

  return {
    empathy: buildEmpathy(input),
    explanation,
    suggestion: sugLines.join('
'),
    verdict,
    basis: {
      liuRi: `${f.ganZhi}日`,
      liuNian: `${computeCurrentLiuNian(anchor)}流年`,
      yongShen: `用神${yongStr}`,
      daYun: daYun ? `${daYun.ganZhi}大运 · ${daYun.shiShen}` : undefined,
    },
    relatedFocus: focus,
  };
}

// ===== 主入口 =====

/**
 * 生成"先生"回话
 *
 * @example
 *   const reply = generateShifuReply({
 *     question: '下午面试要不要去？',
 *     scene: '决策',
 *     chart,
 *     anchorDate: new Date(),
 *   });
 *   // → reply.verdict / reply.empathy / reply.explanation / reply.suggestion
 */
export function generateShifuReply(input: GenerateReplyInput): ShifuReply {
  const anchor = input.anchorDate ?? new Date();

  switch (input.scene) {
    case '决策':
      return generateDecisionReply(input, anchor);
    case '择吉':
      return generateTimingReply(input, anchor);
    case '宜忌':
      return generateDailyTipsReply(input, anchor);
    case '开放':
    default:
      return generateOpenReply(input, anchor);
  }
}