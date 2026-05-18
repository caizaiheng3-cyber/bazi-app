// ============================================================
// 术语翻译器（B2 通俗化术语词典的查询接口）
//
// 职责：
//   - 输入：命理术语（可能是 termKey、literal、或 alias）
//   - 输出：三段式翻译（literal / lifeAnalogy / verifyHint）
//
// 设计原则：
//   - 多种查找入口：先按 termKey、再按 literal、最后按 alias
//   - 找不到时返回 null（不抛异常，调用方决定如何处理）
// ============================================================

import { loadTerminologyDict, type TerminologyTerm } from './ruleLoaders';

/** 术语词典实例（模块级缓存） */
let dictCache: ReturnType<typeof loadTerminologyDict> | null = null;

function getDict(): ReturnType<typeof loadTerminologyDict> {
  if (!dictCache) {
    dictCache = loadTerminologyDict();
  }
  return dictCache;
}

/**
 * 通过任意标识查找术语翻译
 *
 * 查找顺序：
 *   1. 精确匹配 termKey
 *   2. 精确匹配 literal（字面表达）
 *   3. 精确匹配 alias
 *   4. 模糊匹配：query 是否包含某个 literal/alias
 *
 * @param query 查询关键词
 * @returns 翻译结果，找不到返回 null
 */
export function translateTerm(query: string): TerminologyTerm | null {
  if (!query) return null;
  const { byKey, byAlias } = getDict();

  // 1. 精确匹配 termKey
  if (byKey.has(query)) {
    return byKey.get(query) ?? null;
  }
  // 2/3. 精确匹配 literal 或 alias（byAlias 同时存了 literal 和 aliases）
  if (byAlias.has(query)) {
    return byAlias.get(query) ?? null;
  }

  // 4. 模糊匹配：query 包含某个已知 literal
  // 例：query="比劫成群夺财" 应该能命中 alias="比劫成群" 对应的 biJieDuoCai
  let bestMatch: TerminologyTerm | null = null;
  let bestMatchLength = 0;
  byAlias.forEach((term, alias) => {
    if (query.includes(alias) && alias.length > bestMatchLength) {
      bestMatch = term;
      bestMatchLength = alias.length;
    }
  });

  return bestMatch;
}

/**
 * 批量从一段文本中提取所有可能的命理术语并翻译
 *
 * 用于：把 keyFinding.description 等长文本里出现的术语自动加上"折叠依据"
 *
 * @param text 要扫描的文本
 * @returns 文本中出现的所有术语翻译（去重，按出现顺序）
 */
export function extractAndTranslateTerms(text: string): TerminologyTerm[] {
  if (!text) return [];
  const { byAlias } = getDict();
  const found = new Map<string, TerminologyTerm>();

  byAlias.forEach((term, alias) => {
    if (text.includes(alias)) {
      // 用 termKey 去重（同一个术语可能因 alias 多次命中）
      if (!found.has(term.termKey)) {
        found.set(term.termKey, term);
      }
    }
  });

  return Array.from(found.values());
}

/**
 * 给定一组命理结论（如 keyFinding.title 列表），返回最相关的一个翻译
 *
 * 用于报告中"先生为什么这么说" → 选最匹配的术语解释
 *
 * @param conclusions 命理结论文本数组
 * @returns 第一个能匹配到的翻译，找不到返回 null
 */
export function pickPrimaryTranslation(conclusions: string[]): TerminologyTerm | null {
  for (const c of conclusions) {
    const t = translateTerm(c);
    if (t) return t;
    // 也尝试模糊提取
    const extracted = extractAndTranslateTerms(c);
    if (extracted.length > 0) return extracted[0];
  }
  return null;
}
