// ============================================================
// 预警增强器（方案 2 主入口）
//
// 职责：把 chart 里的"问题点"转换成带依据的 EnhancedWarning[]
//
// 数据流：
//   chart
//     ↓
//   problemMatcher.matchAllProblems → MatchedProblem[]
//     ↓
//   for each MatchedProblem:
//     - 从 problemKey 推导主术语 → termTranslator.translateTerm
//     - 从 chart 推导是否涉及未来大运 → historicalEchoFinder.findHistoricalEcho
//     - 组装 EnhancedWarning
//     ↓
//   EnhancedWarning[]
//
// 这是「带依据折叠层」消费者报告的核心生产者。
// ============================================================

import type { BaziChart } from '../../types/bazi';
import { loadAllRemedyTemplates, type RemedyAction, type TerminologyTerm } from './ruleLoaders';
import {
  matchAllProblems,
  filterByDomains,
  type MatchedProblem,
} from './problemMatcher';
import { translateTerm } from './termTranslator';
import {
  findHistoricalEcho,
  type HistoricalEcho,
} from './historicalEchoFinder';

// ---------- 输出类型 ----------

/** 折叠层依据（三段式） */
export interface WarningEvidence {
  /** 📜 命理上：标准命理学说法 */
  literal: string;
  /** 💡 通俗讲：生活类比 */
  lifeAnalogy: string;
  /** 🔁 验证方法：让用户用经历验证 */
  verifyHint: string;
}

/** 历史回响摘要（折叠层） */
export interface WarningHistoricalEcho {
  /** 一段话叙述（已组装好可直接显示） */
  narrative: string;
  /** 验证话术列表 */
  verifyPrompts: string[];
}

/** 增强后的预警块（消费者报告"必须告诉你的事"屏的最小单元） */
export interface EnhancedWarning {
  // ---- 标题层（默认展示） ----
  /** 用户友好的问题标题 */
  title: string;
  /** 严重度 */
  severity: 'high' | 'medium' | 'low';
  /** 关联领域 */
  relatedDomain: '婚姻' | '财富' | '事业' | '健康' | '人际';
  /** 一句话依据（默认展开，让用户先看到一句不空话的依据） */
  oneLineReason: string;
  /** 缓解焦虑的话（紧跟标题，避免用户看了就崩溃） */
  reassurance: string;

  // ---- 折叠层 1：依据 ----
  /** 命理依据（命中证据 + 三段式术语翻译） */
  evidence: {
    /** 命中证据：先生从命局中看到了什么（如"日柱壬戌带阴阳差错"） */
    matchedFrom: string;
    /** 三段式翻译（可能为 null，表示该问题无对应词典条目） */
    translation: WarningEvidence | null;
  };

  // ---- 折叠层 2：化解方案 ----
  /** 化解方案列表 */
  remedies: RemedyAction[];

  // ---- 折叠层 3：历史回响（仅特定问题适用） ----
  /** 历史回响（不适用时为 null） */
  historicalEcho: WarningHistoricalEcho | null;
}

// ---------- problemKey → 主术语 termKey 的映射 ----------
//
// 当 problemKey 与术语 termKey 不一致时，在这里建立桥梁。
// 用于让"问题"能找到对应的"通俗化翻译"。
//
const PROBLEM_TO_TERM: Record<string, string> = {
  yinYangChaCuo: 'yinYangChaCuo',
  biJieDuoCai: 'biJieDuoCai',
  shangGuanJianGuan: 'shangGuanJianGuan',
  yinKeShiShang: 'yinXingKeShiShang', // 注意：术语 key 比 problemKey 多了"Xing"
  shuiTaiWang: 'shuiTaiWang',
  guChenGuaSu: 'guChen', // 优先解释孤辰
  yangRen: 'yangRen',
  wangShenJieSha: 'wangShen', // 优先解释亡神
  diZhiChongRiZhi: 'diZhiLiuChong',
  huoQueDiaoHou: 'huoQueDiaoHou',
  jiaZhuanWang: 'jiaZhuanWang',
};

/**
 * 判断问题是否适合搭配「历史回响」依据
 *
 * 判定原则：只有「跨大运周期才能体现的问题」才适合用历史运程对比来验证。
 * 这类问题的共同特点：
 *   - 用户只在特定大运段才会强烈感受到
 *   - 命主过去走过类似性质的大运 → 可以用过去的真实经历来验证未来预测
 *
 * 排除的问题类型（即使命中也不附加历史回响，避免信息过载）：
 *   - 神煞类（阴阳差错/孤辰寡宿/羊刃/亡神劫煞）：是命局先天属性，
 *     一生稳定存在，没有"过去某段没有/某段有"的对比意义
 *   - 关系类（地支冲日支）：同样是命局静态结构
 *
 * 适合附加历史回响的问题类型：
 *   - 用神方法相关（jiaZhuanWang）：直接关联大运吉凶判定
 *   - 五行偏盛偏衰（shuiTaiWang / huoQueDiaoHou）：五行能量在不同大运
 *     里有"被补/被泄"的强弱变化，过往大运的经历最能验证
 */
function shouldAttachHistoricalEcho(problemKey: string): boolean {
  const ECHO_RELEVANT_KEYS = new Set([
    'jiaZhuanWang',     // 假专旺格 —— 一生顺逆周期感强
    'shuiTaiWang',      // 水气过旺 —— 用神运/忌神运反差最大
    'huoQueDiaoHou',    // 冬令缺火 —— 火运/水运体感差异明显
  ]);
  return ECHO_RELEVANT_KEYS.has(problemKey);
}

/**
 * 为"涉及未来大运"的问题挑选目标大运
 *
 * 当前策略：取参考年份后第一个评分 ≤2 的大运（最需要预警的未来运）
 */
function pickTargetDaYunForEcho(
  chart: BaziChart,
  referenceYear: number,
): HistoricalEcho | null {
  // 找出所有未来大运
  const futureDaYuns = chart.daYuns.filter((d) => d.endYear >= referenceYear);
  if (futureDaYuns.length === 0) return null;

  // 优先取忌神/仇神运（评分 ≤2）
  const cautiousDaYun = futureDaYuns.find(
    (d) => d.flowAnalysis && d.flowAnalysis.score <= 2,
  );
  // 否则取下一步运
  const target = cautiousDaYun ?? futureDaYuns[0];

  const echo = findHistoricalEcho(target, chart.daYuns, referenceYear);
  return echo.hasMatch ? echo : null;
}

// ---------- 单条预警的组装 ----------

function buildOneEnhancedWarning(
  matched: MatchedProblem,
  chart: BaziChart,
  referenceYear: number,
): EnhancedWarning {
  const { template, evidence: matchedFrom } = matched;

  // 1. 找术语翻译
  const termKey = PROBLEM_TO_TERM[template.problemKey];
  let translation: WarningEvidence | null = null;
  if (termKey) {
    const term: TerminologyTerm | null = translateTerm(termKey);
    if (term) {
      translation = {
        literal: term.literal,
        lifeAnalogy: term.lifeAnalogy,
        verifyHint: term.verifyHint,
      };
    }
  }

  // 2. 历史回响（仅特定问题）
  let historicalEcho: WarningHistoricalEcho | null = null;
  if (shouldAttachHistoricalEcho(template.problemKey)) {
    const echo = pickTargetDaYunForEcho(chart, referenceYear);
    if (echo && echo.bestMatch && echo.consumerNarrative) {
      historicalEcho = {
        narrative: echo.consumerNarrative,
        verifyPrompts: echo.bestMatch.verifyPrompts,
      };
    }
  }

  return {
    title: template.userFacingProblem,
    severity: template.severity,
    relatedDomain: template.relatedDomain,
    oneLineReason: template.coreReason,
    reassurance: template.reassurance,
    evidence: {
      matchedFrom,
      translation,
    },
    remedies: template.remedies,
    historicalEcho,
  };
}

// ---------- 主入口 ----------

/** 增强参数 */
export interface EnhanceOptions {
  /** 用户关注的领域（用于过滤）；空数组 = 全部 */
  focusedDomains?: Array<EnhancedWarning['relatedDomain']>;
  /** 最多输出多少条预警（按 severity 降序）；默认 6 */
  maxWarnings?: number;
  /** 参考年份（用于历史回响判定）；默认今年 */
  referenceYear?: number;
}

/**
 * 主入口：从 chart 生成"必须告诉你的事"屏的所有预警块
 *
 * @param chart 排盘结果
 * @param options 增强选项
 * @returns 带完整依据的预警列表（按 severity 降序）
 */
export function buildEnhancedWarnings(
  chart: BaziChart,
  options: EnhanceOptions = {},
): EnhancedWarning[] {
  const {
    focusedDomains = [],
    maxWarnings = 6,
    referenceYear = new Date().getFullYear(),
  } = options;

  // 1. 加载化解方案模板
  const templates = loadAllRemedyTemplates();

  // 2. 命中所有问题
  let matched = matchAllProblems(chart, templates);

  // 3. 按领域过滤
  if (focusedDomains.length > 0) {
    matched = filterByDomains(matched, focusedDomains);
  }

  // 4. 截断
  matched = matched.slice(0, maxWarnings);

  // 5. 组装 EnhancedWarning
  return matched.map((m) => buildOneEnhancedWarning(m, chart, referenceYear));
}
