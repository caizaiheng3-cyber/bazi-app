// ============================================================
// 问题匹配器（B1 化解方案库的命中引擎）
//
// 职责：
//   - 输入：BaziChart + 化解方案模板列表
//   - 输出：命中的 RemedyTemplate[]（按 severity 排序）
//
// 设计原则：
//   - 显式枚举每种 triggerCondition.type 的判定逻辑
//   - 不解释 JSON 里的 match 表达式（避免 eval 风险）
//   - 所有匹配逻辑集中在此文件，便于维护
// ============================================================

import type {
  BaziChart,
  ManifestLevel,
  ShiShen,
} from '../../types/bazi';
import type { RemedyTemplate } from './ruleLoaders';

// ---------- 常量集合（用于解析 trigger 字符串时做枚举校验） ----------

const ALL_SHISHEN: readonly ShiShen[] = [
  '比肩', '劫财', '食神', '伤官', '偏财',
  '正财', '七杀', '正官', '偏印', '正印', '日主',
];

const ALL_MANIFEST_LEVELS: readonly ManifestLevel[] = [
  'manifest-strong',
  'manifest-weak',
  'hidden-strong',
  'hidden-weak',
  'absent-empty',
  'absent',
];

/** 匹配命中结果（含上下文，便于上层组装话术） */
export interface MatchedProblem {
  template: RemedyTemplate;
  /** 命中的具体证据（用于报告里展示"为什么先生这么说"） */
  evidence: string;
}

// ---------- 各类型的判定函数 ----------

/** 神煞匹配：从 chart.shenShas 中查找指定名称 */
function matchByShenSha(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  // 从 match 字符串中提取神煞名（约定格式：shenShas.some(s => s.name === '阴阳差错')）
  const nameMatch = template.triggerCondition.match.match(/s\.name === '([^']+)'/g);
  if (!nameMatch) return null;

  // 取出所有 '名称'，任一命中即可
  const targetNames = nameMatch.map((m) => {
    const inner = m.match(/'([^']+)'/);
    return inner ? inner[1] : '';
  });

  const hits = chart.shenShas.filter((s) => targetNames.includes(s.name));
  if (hits.length === 0) return null;

  const evidence = hits
    .map((h) => `${h.name}（${h.source}）`)
    .join('、');
  return {
    template,
    evidence: `命中神煞：${evidence}`,
  };
}

/** 关键发现匹配：从 chart.keyFindings 标题包含指定关键词 */
function matchByKeyFinding(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  // 提取所有 includes('关键词') 的关键词
  const keywordMatches = template.triggerCondition.match.match(/includes\('([^']+)'\)/g);
  if (!keywordMatches) return null;

  const keywords = keywordMatches.map((m) => {
    const inner = m.match(/'([^']+)'/);
    return inner ? inner[1] : '';
  });

  const hits = chart.keyFindings.filter((kf) =>
    keywords.some((kw) => kf.title.includes(kw)),
  );
  if (hits.length === 0) return null;

  const evidence = hits.map((h) => h.title).join('；');
  return {
    template,
    evidence: `命中关键发现：${evidence}`,
  };
}

/** 十神组合匹配：统计四柱十神频次，判断是否同时含某些十神 */
function matchByShiShen(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  // 统计十神频次（含天干和藏干）
  const counts: Partial<Record<ShiShen, number>> = {};
  chart.pillars.forEach((p) => {
    if (p.ganShiShen && p.ganShiShen !== '日主') {
      counts[p.ganShiShen] = (counts[p.ganShiShen] ?? 0) + 1;
    }
    p.diShiShen.forEach((ss) => {
      if (ss !== '日主') {
        counts[ss] = (counts[ss] ?? 0) + 1;
      }
    });
  });

  // 提取需要的十神条件（约定格式：shiShenCounts['伤官'] >= 1 && shiShenCounts['正官'] >= 1）
  const conditions = template.triggerCondition.match.match(/shiShenCounts\['([^']+)'\]\s*>=\s*(\d+)/g);
  if (!conditions) return null;

  const required = conditions.map((c) => {
    const m = c.match(/'([^']+)'\]\s*>=\s*(\d+)/);
    return m ? { shiShen: m[1] as ShiShen, min: parseInt(m[2], 10) } : null;
  }).filter((x): x is { shiShen: ShiShen; min: number } => x !== null);

  if (required.length === 0) return null;

  // 全部条件都满足才算命中
  const allMet = required.every((req) => (counts[req.shiShen] ?? 0) >= req.min);
  if (!allMet) return null;

  const evidence = required
    .map((r) => `${r.shiShen}×${counts[r.shiShen] ?? 0}`)
    .join(' + ');
  return {
    template,
    evidence: `命中十神组合：${evidence}`,
  };
}

/**
 * 显象层级匹配：从 chart.relations.manifestation 找虚位食伤等
 *
 * 解析协议：从 match 字符串中提取所有引号字符串，与权威枚举（ALL_SHISHEN /
 * ALL_MANIFEST_LEVELS）做精确匹配后，分别归类为「目标十神集合」和「目标层级集合」。
 *
 * 匹配语义：(任一十神 ∈ 目标十神) ∧ (level ∈ 目标层级)
 * 即每条 manifestation 必须同时满足两个集合，才算命中。
 */
function matchByManifestation(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  const tokens = template.triggerCondition.match.match(/'([^']+)'/g);
  if (!tokens) return null;

  const namesRaw = tokens.map((t) => t.replace(/'/g, ''));

  // 用类型化的枚举集合分类（避免字符串字面量数组漂移）
  const shiShens = namesRaw.filter((n): n is ShiShen =>
    (ALL_SHISHEN as readonly string[]).includes(n),
  );
  const levels = namesRaw.filter((n): n is ManifestLevel =>
    (ALL_MANIFEST_LEVELS as readonly string[]).includes(n),
  );

  if (shiShens.length === 0 || levels.length === 0) return null;

  const hits = chart.relations.manifestation.filter(
    (m) => shiShens.includes(m.shiShen) && levels.includes(m.level),
  );
  if (hits.length === 0) return null;

  const evidence = hits
    .map((h) => `${h.shiShen}（${h.level}）`)
    .join('、');
  return {
    template,
    evidence: `命中显象层级：${evidence}`,
  };
}

/**
 * 通用：从一段 match 表达式中提取「数组字面量」里的所有元素
 *
 * 例如：从 "['亥','子','丑'].includes(monthZhi)" 中提取 ['亥', '子', '丑']
 *      从 "pillars[2].tianGan in ['壬', '癸']" 中提取 ['壬', '癸']
 *
 * 注意：会排除掉 `pillars[2]` 这种「索引数组」，只取真正的字符串字面量数组。
 */
function extractStringArray(matchStr: string, anchorKeyword: string): string[] {
  // 找到 anchorKeyword 周围的数组字面量。例如 anchor='monthZhi' 找它前面的数组；
  // anchor='tianGan' 找它后面的数组。这里采用宽松策略：只要数组里全是字符串字面量即可。
  const arrayPattern = /\[(\s*'[^']+'\s*(?:,\s*'[^']+'\s*)*)\]/g;
  const candidates: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = arrayPattern.exec(matchStr)) !== null) {
    const items = (m[1].match(/'([^']+)'/g) ?? []).map((s) => s.replace(/'/g, ''));
    if (items.length > 0) candidates.push(items);
  }
  if (candidates.length === 0) return [];
  // 多个数组时：选与 anchorKeyword 物理位置最近的那一组
  const anchorIdx = matchStr.indexOf(anchorKeyword);
  if (anchorIdx < 0) return candidates[0];

  let best: { items: string[]; distance: number } | null = null;
  arrayPattern.lastIndex = 0;
  while ((m = arrayPattern.exec(matchStr)) !== null) {
    const items = (m[1].match(/'([^']+)'/g) ?? []).map((s) => s.replace(/'/g, ''));
    if (items.length === 0) continue;
    const distance = Math.abs(m.index - anchorIdx);
    if (!best || distance < best.distance) {
      best = { items, distance };
    }
  }
  return best ? best.items : candidates[0];
}

/** 五行占比匹配：处理「水占比 ≥ X」「冬月缺火」等 */
function matchByWuxingPercent(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  const matchStr = template.triggerCondition.match;

  // 模式 1：wuxingStats.find(s => s.wuxing === '水').percent >= 50
  const percentMatch = matchStr.match(/wuxing === '([^']+)'\)\.percent\s*(>=|<=|>|<)\s*(\d+)/);
  if (percentMatch) {
    const [, wuxingName, op, thresholdStr] = percentMatch;
    const threshold = parseInt(thresholdStr, 10);
    const stat = chart.wuxingStats.find((s) => s.wuxing === wuxingName);
    if (!stat) return null;

    let met = false;
    switch (op) {
      case '>=': met = stat.percent >= threshold; break;
      case '<=': met = stat.percent <= threshold; break;
      case '>':  met = stat.percent > threshold;  break;
      case '<':  met = stat.percent < threshold;  break;
    }
    if (!met) return null;

    // 处理可选的附加条件：日主天干在某集合 / 月支在某集合
    // 用通用 extractStringArray 兼容任意数量的元素（例如 ['亥','子','丑']）
    if (matchStr.includes('pillars[2].tianGan')) {
      const ganList = extractStringArray(matchStr, 'tianGan');
      if (ganList.length > 0 && !ganList.includes(chart.pillars[2].tianGan)) {
        return null;
      }
    }
    if (matchStr.includes('monthZhi')) {
      const zhiList = extractStringArray(matchStr, 'monthZhi');
      if (zhiList.length > 0 && !zhiList.includes(chart.pillars[1].diZhi)) {
        return null;
      }
    }

    return {
      template,
      evidence: `${wuxingName}占比 ${stat.percent}%（${op} ${threshold}%）`,
    };
  }

  return null;
}

/** 干支关系匹配：地支冲日支等 */
function matchByRelation(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  const matchStr = template.triggerCondition.match;

  // 当前支持：relations.zhiChong.some(c => (c.posA === 2 || c.posB === 2) && !c.resolvedByHe)
  if (matchStr.includes('zhiChong') && matchStr.includes('=== 2')) {
    const hits = chart.relations.zhiChong.filter(
      (c) => (c.posA === 2 || c.posB === 2) && !c.resolvedByHe,
    );
    if (hits.length === 0) return null;
    const evidence = hits
      .map((c) => `${c.zhiA}${c.zhiB}相冲`)
      .join('、');
    return {
      template,
      evidence: `命中地支冲日支：${evidence}`,
    };
  }

  return null;
}

/** 用神方法匹配：假专旺等 */
function matchByYongShen(
  chart: BaziChart,
  template: RemedyTemplate,
): MatchedProblem | null {
  const methodMatch = template.triggerCondition.match.match(/method === '([^']+)'/);
  if (!methodMatch) return null;

  if (chart.yongShen.method === methodMatch[1]) {
    return {
      template,
      evidence: `用神取法：${chart.yongShen.method}（${chart.yongShen.reason}）`,
    };
  }
  return null;
}

// ---------- 主入口 ----------

/** severity 排序权重 */
const SEVERITY_ORDER: Record<RemedyTemplate['severity'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * 在命局中匹配所有化解模板
 *
 * @param chart 排盘结果
 * @param templates 加载好的化解方案模板（来自 loadAllRemedyTemplates）
 * @returns 命中的问题列表（按 severity 降序）
 */
export function matchAllProblems(
  chart: BaziChart,
  templates: Map<string, RemedyTemplate>,
): MatchedProblem[] {
  const matched: MatchedProblem[] = [];

  templates.forEach((template) => {
    let result: MatchedProblem | null = null;

    switch (template.triggerCondition.type) {
      case 'shenSha':
        result = matchByShenSha(chart, template);
        break;
      case 'keyFinding':
        result = matchByKeyFinding(chart, template);
        break;
      case 'shiShen':
        result = matchByShiShen(chart, template);
        break;
      case 'manifestation':
        result = matchByManifestation(chart, template);
        break;
      case 'wuxingPercent':
        result = matchByWuxingPercent(chart, template);
        break;
      case 'relation':
        result = matchByRelation(chart, template);
        break;
      case 'yongShen':
        result = matchByYongShen(chart, template);
        break;
      default:
        // 未知类型：跳过（不报错，避免新增类型时阻断）
        result = null;
    }

    if (result) {
      matched.push(result);
    }
  });

  // 按严重度降序
  matched.sort(
    (a, b) =>
      SEVERITY_ORDER[b.template.severity] - SEVERITY_ORDER[a.template.severity],
  );

  return matched;
}

/**
 * 按领域过滤命中结果
 * @param matched matchAllProblems 的输出
 * @param domains 用户关注的领域（如 ['婚姻', '财富']）
 */
export function filterByDomains(
  matched: MatchedProblem[],
  domains: Array<RemedyTemplate['relatedDomain']>,
): MatchedProblem[] {
  if (domains.length === 0) return matched;
  return matched.filter((m) => domains.includes(m.template.relatedDomain));
}
