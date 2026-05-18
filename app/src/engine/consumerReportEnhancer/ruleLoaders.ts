// ============================================================
// 规则加载器（B1 + B2 配置库的入口）
//
// 职责：
//   - 加载 remedyTemplates.json（化解方案库）
//   - 加载 terminologyDict.json（通俗化术语词典）
//   - 提供类型安全的访问接口
//
// 设计原则：
//   - 单一数据源（不允许其他文件直接 import json）
//   - 提供类型化的 getter
//   - 不做缓存（Vite 会自动处理）
// ============================================================

import remedyTemplatesJson from '../rules/remedyTemplates.json';
import terminologyDictJson from '../rules/terminologyDict.json';

// ---------- remedyTemplates 类型 ----------

/** triggerCondition：用于程序化匹配命局 */
export interface RemedyTriggerCondition {
  /** 匹配类型 */
  type:
    | 'shenSha'           // 神煞匹配
    | 'keyFinding'        // 关键发现标题匹配
    | 'shiShen'           // 十神组合匹配
    | 'manifestation'     // 显象层级匹配
    | 'wuxingPercent'     // 五行占比匹配
    | 'relation'          // 干支关系匹配
    | 'yongShen';         // 用神方法匹配
  /** 匹配表达式（伪代码，实际由 problemMatcher 解释执行） */
  match: string;
}

/** 单条化解方案 */
export interface RemedyAction {
  action: string;
  reason: string;
  timing: string;
}

/** 单个问题模板 */
export interface RemedyTemplate {
  /** 问题标识（key） */
  problemKey: string;
  /** 问题中文名 */
  title: string;
  /** 触发条件（用于 problemMatcher 命中） */
  triggerCondition: RemedyTriggerCondition;
  /** 用户可感知的问题描述 */
  userFacingProblem: string;
  /** 严重度：high / medium / low */
  severity: 'high' | 'medium' | 'low';
  /** 关联领域：婚姻 / 财富 / 事业 / 健康 / 人际 */
  relatedDomain: '婚姻' | '财富' | '事业' | '健康' | '人际';
  /** 一句话依据 */
  coreReason: string;
  /** 缓解焦虑的话 */
  reassurance: string;
  /** 化解方案列表 */
  remedies: RemedyAction[];
}

interface RemedyTemplatesFile {
  problems: Record<string, Omit<RemedyTemplate, 'problemKey'>>;
}

// ---------- terminologyDict 类型 ----------

/** 单个术语的三段式翻译 */
export interface TerminologyTerm {
  /** 术语标识（key） */
  termKey: string;
  /** 字面表达 */
  literal: string;
  /** 生活类比 */
  lifeAnalogy: string;
  /** 验证方法 */
  verifyHint: string;
  /** 分类 */
  category: string;
  /** 同义术语 */
  aliases?: string[];
}

interface TerminologyDictFile {
  terms: Record<string, Partial<TerminologyTerm>>;
}

// ---------- 加载与索引构建 ----------

/** 加载所有化解方案模板（按 problemKey 索引） */
export function loadAllRemedyTemplates(): Map<string, RemedyTemplate> {
  const file = remedyTemplatesJson as unknown as RemedyTemplatesFile;
  const result = new Map<string, RemedyTemplate>();

  Object.entries(file.problems).forEach(([key, value]) => {
    // 跳过元信息字段（虽然这里不应该有，但防御性处理）
    if (key.startsWith('$') || key.startsWith('=')) return;
    result.set(key, {
      problemKey: key,
      ...value,
    });
  });

  return result;
}

/**
 * 加载所有术语词典（按 termKey 索引 + 按 alias 二级索引）
 * @returns { byKey: Map<termKey, TerminologyTerm>, byAlias: Map<alias, TerminologyTerm> }
 */
export function loadTerminologyDict(): {
  byKey: Map<string, TerminologyTerm>;
  byAlias: Map<string, TerminologyTerm>;
} {
  const file = terminologyDictJson as unknown as TerminologyDictFile;
  const byKey = new Map<string, TerminologyTerm>();
  const byAlias = new Map<string, TerminologyTerm>();

  Object.entries(file.terms).forEach(([key, value]) => {
    // 跳过分隔符条目（如 "============= 旺衰类 =============": {}）
    if (key.startsWith('=')) return;
    // 跳过元信息或 schema 示例
    if (key.startsWith('$')) return;

    // 必填字段校验：缺失则跳过（避免给上层注入空数据）
    if (!value.literal || !value.lifeAnalogy || !value.verifyHint || !value.category) {
      return;
    }

    const term: TerminologyTerm = {
      termKey: key,
      literal: value.literal,
      lifeAnalogy: value.lifeAnalogy,
      verifyHint: value.verifyHint,
      category: value.category,
      aliases: value.aliases ?? [],
    };

    byKey.set(key, term);

    // 字面表达本身也作为查找入口
    byAlias.set(term.literal, term);
    // 所有别名指向同一个 term
    (term.aliases ?? []).forEach((alias) => {
      byAlias.set(alias, term);
    });
  });

  return { byKey, byAlias };
}
