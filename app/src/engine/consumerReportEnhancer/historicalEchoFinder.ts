// ============================================================
// 历史相似运程查找器（B3 / consumerReportEnhancer）
//
// 设计目标：
//   给定一个目标大运（通常是未来某步运），从历史大运（已经走过的）中
//   找出"性质最相似"的那一步，并生成"用户可验证的人生锚点"。
//
// 用户价值：
//   "你 31-40 这步水印大运，性质和你 11-20 那步一模一样 ——
//    回想那段时间，你是不是也是 XXX？"
//   →  让用户用自己已经发生过的人生经历来验证未来预测，
//       这是建立信任最强的武器（不是相信"先生"，而是相信"自己的过去"）
//
// 设计原则：
//   - 纯函数、无副作用
//   - 不动 baziEngine、不动任何推理层
//   - 只消费 BaziChart.daYuns（已包含 flowAnalysis）
//   - 输出可以被 consumer 报告直接使用
// ============================================================

import type { DaYun, ShiShen, WuXing } from '../../types/bazi';

// ---------- 配置：相似性维度权重 ----------

/** 相似性判定维度的权重（总和 = 100） */
const SIMILARITY_WEIGHTS = {
  /** 用神角色完全一致是相似性的根本（用神 vs 忌神是质的差别） */
  wuxingRole: 40,
  /** 大运五行一致（如同样是水大运） */
  wuxing: 25,
  /** 十神类别一致（印类/比劫类/食伤类/财类/官杀类） */
  shiShenCategory: 20,
  /** 评分接近（差 ≤1） */
  scoreClose: 10,
  /** 关键事件类型相似（同样有伏吟/反吟/填空亡等） */
  eventSimilar: 5,
} as const;

/** 十神归类：5 大类（同类相互之间被认为"性质相近"） */
const SHISHEN_CATEGORY: Record<ShiShen, string> = {
  比肩: '比劫',
  劫财: '比劫',
  食神: '食伤',
  伤官: '食伤',
  偏财: '财',
  正财: '财',
  七杀: '官杀',
  正官: '官杀',
  偏印: '印',
  正印: '印',
  日主: '日主',
};

/** 用神角色的"友好度梯度"（用于判定是否同向） */
const ROLE_FRIENDLINESS: Record<string, number> = {
  用神: 5,
  喜神: 4,
  闲神: 3,
  仇神: 2,
  忌神: 1,
};

// ---------- 输出类型 ----------

/** 单条历史相似匹配 */
export interface HistoricalMatch {
  /** 被匹配的历史大运 */
  matchedDaYun: DaYun;
  /** 相似度分数（0-100） */
  similarityScore: number;
  /** 命中的相似维度 */
  matchedDimensions: Array<{
    dimension: '用神角色' | '大运五行' | '十神类别' | '评分接近' | '关键事件相似';
    note: string;
  }>;
  /** 友好的年份范围描述 */
  yearRangeLabel: string;
  /** 友好的虚岁范围描述 */
  ageRangeLabel: string;
  /**
   * "你那时是不是…？"型验证话术（2-3 句）
   * 用于让用户回忆人生经历来验证当前的预测
   */
  verifyPrompts: string[];
  /** 一句话总结：这段历史运 vs 目标运 的相似性 */
  summary: string;
}

/** 单个目标大运的"历史回响"分析结果 */
export interface HistoricalEcho {
  /** 目标大运 */
  targetDaYun: DaYun;
  /** 是否找到了任何历史匹配 */
  hasMatch: boolean;
  /** 所有候选匹配（按相似度降序，最多 3 个） */
  candidates: HistoricalMatch[];
  /** 最佳匹配（candidates[0]，便于直接消费） */
  bestMatch: HistoricalMatch | null;
  /**
   * 给消费者报告用的"一段话"
   * 形如："你 31-40 这步丁未运，性质和你 11-20 那步乙巳运一模一样 ——
   *        回想那段时间，你是不是…"
   */
  consumerNarrative: string | null;
}

// ---------- 工具函数 ----------

/** 大运段是否已经"走过了"（相对于参考年份） */
function isHistorical(daYun: DaYun, referenceYear: number): boolean {
  return daYun.endYear < referenceYear;
}

/** 大运段是否包含参考年份（即"现在正在走的"） */
function isCurrent(daYun: DaYun, referenceYear: number): boolean {
  return daYun.startYear <= referenceYear && referenceYear <= daYun.endYear;
}

/** 从干支中提取天干（用于后备五行推导） */
function getTianGanFromGanZhi(ganZhi: string): string {
  return ganZhi.length > 0 ? ganZhi[0] : '';
}

/** 天干 → 五行 备用映射（兜底，避免 flowAnalysis 缺失时无数据） */
const TIANGAN_WUXING: Record<string, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

/** 安全获取大运五行（优先用 flowAnalysis，否则从干支天干推导） */
function getDaYunWuxing(daYun: DaYun): WuXing | null {
  if (daYun.flowAnalysis?.wuxing) {
    return daYun.flowAnalysis.wuxing;
  }
  const gan = getTianGanFromGanZhi(daYun.ganZhi);
  return TIANGAN_WUXING[gan] ?? null;
}

// ---------- 相似性计算 ----------

/**
 * 计算两步大运的相似度（0-100）
 * @returns { score, matchedDimensions }
 */
function computeSimilarity(
  target: DaYun,
  candidate: DaYun,
): {
  score: number;
  matchedDimensions: HistoricalMatch['matchedDimensions'];
} {
  let score = 0;
  const matchedDimensions: HistoricalMatch['matchedDimensions'] = [];

  // 维度 1：用神角色（最重要）
  const targetRole = target.flowAnalysis?.wuxingRole;
  const candidateRole = candidate.flowAnalysis?.wuxingRole;
  if (targetRole && candidateRole) {
    if (targetRole === candidateRole) {
      // 完全一致：满分
      score += SIMILARITY_WEIGHTS.wuxingRole;
      matchedDimensions.push({
        dimension: '用神角色',
        note: `同为「${targetRole}」大运，性质完全一致`,
      });
    } else {
      // 友好度差距 ≤1（如用神 vs 喜神）：给一半分
      const diff = Math.abs(
        (ROLE_FRIENDLINESS[targetRole] ?? 3) - (ROLE_FRIENDLINESS[candidateRole] ?? 3),
      );
      if (diff === 1) {
        score += SIMILARITY_WEIGHTS.wuxingRole / 2;
        matchedDimensions.push({
          dimension: '用神角色',
          note: `「${targetRole}」与「${candidateRole}」性质相近`,
        });
      }
    }
  }

  // 维度 2：大运五行
  const targetWuxing = getDaYunWuxing(target);
  const candidateWuxing = getDaYunWuxing(candidate);
  if (targetWuxing && candidateWuxing && targetWuxing === candidateWuxing) {
    score += SIMILARITY_WEIGHTS.wuxing;
    matchedDimensions.push({
      dimension: '大运五行',
      note: `同为「${targetWuxing}」气大运`,
    });
  }

  // 维度 3：十神类别（合并五行属性）
  const targetCategory = SHISHEN_CATEGORY[target.shiShen];
  const candidateCategory = SHISHEN_CATEGORY[candidate.shiShen];
  if (targetCategory && targetCategory === candidateCategory) {
    score += SIMILARITY_WEIGHTS.shiShenCategory;
    matchedDimensions.push({
      dimension: '十神类别',
      note: `同为「${targetCategory}」类大运（${candidate.shiShen} ↔ ${target.shiShen}）`,
    });
  }

  // 维度 4：评分接近
  const targetScore = target.flowAnalysis?.score;
  const candidateScore = candidate.flowAnalysis?.score;
  if (typeof targetScore === 'number' && typeof candidateScore === 'number') {
    const diff = Math.abs(targetScore - candidateScore);
    if (diff === 0) {
      score += SIMILARITY_WEIGHTS.scoreClose;
      matchedDimensions.push({
        dimension: '评分接近',
        note: `吉凶分都是 ${targetScore}/5`,
      });
    } else if (diff === 1) {
      score += SIMILARITY_WEIGHTS.scoreClose / 2;
      matchedDimensions.push({
        dimension: '评分接近',
        note: `吉凶分接近（${candidateScore} vs ${targetScore}）`,
      });
    }
  }

  // 维度 5：关键事件相似（是否同样有伏吟/反吟/填空亡等）
  const targetEvents = new Set(
    (target.flowAnalysis?.keyLiuNian ?? []).map((ln) => ln.eventType),
  );
  const candidateEvents = new Set(
    (candidate.flowAnalysis?.keyLiuNian ?? []).map((ln) => ln.eventType),
  );
  const sharedEvents: string[] = [];
  targetEvents.forEach((e) => {
    if (candidateEvents.has(e)) sharedEvents.push(e);
  });
  if (sharedEvents.length > 0) {
    score += SIMILARITY_WEIGHTS.eventSimilar;
    matchedDimensions.push({
      dimension: '关键事件相似',
      note: `两段都触发了「${sharedEvents.join('/')}」`,
    });
  }

  return { score, matchedDimensions };
}

// ---------- 验证话术生成 ----------

/**
 * 根据匹配性质生成"你那时是不是…？"型验证话术
 *
 * 设计逻辑：根据用神角色 + 十神类别给出针对性的人生切面提问
 */
function generateVerifyPrompts(matchedDaYun: DaYun): string[] {
  const role = matchedDaYun.flowAnalysis?.wuxingRole;
  const shiShenCategory = SHISHEN_CATEGORY[matchedDaYun.shiShen];
  const prompts: string[] = [];

  // 按用神角色给基调
  if (role === '用神' || role === '喜神') {
    prompts.push('那段时间是不是做什么都顺，努力的回报远超预期？');
    prompts.push('回想一下那几年，是不是有几个"贵人"或"机会"出现，把你推到了一个新的位置？');
  } else if (role === '忌神' || role === '仇神') {
    prompts.push('那段时间是不是同样的事比别人费力，努力了却没什么回报？');
    prompts.push('回想一下那几年，是不是经历过一些挫折、损失、或者人际关系的低谷？');
  } else {
    prompts.push('那段时间是不是过得"不咸不淡"，没什么大波澜也没什么大突破？');
  }

  // 按十神类别给细节切面
  switch (shiShenCategory) {
    case '比劫':
      prompts.push('那时是不是和兄弟姐妹/同辈朋友的关系特别紧密，但也容易在金钱上吃亏？');
      break;
    case '食伤':
      prompts.push('那时是不是创造力特别旺盛，做了不少"输出型"的事（写、说、设计、教学）？');
      break;
    case '财':
      prompts.push('那时是不是开始接触理财、投资、或者实际开始挣钱？');
      break;
    case '官杀':
      prompts.push('那时是不是承担了很多责任、面对很多权威/规则上的压力？');
      break;
    case '印':
      prompts.push('那时是不是身边有长辈/老师/平台在帮你，学习能力也特别强？');
      break;
    default:
      break;
  }

  // 关键流年提示
  const keyLiuNian = matchedDaYun.flowAnalysis?.keyLiuNian ?? [];
  if (keyLiuNian.length > 0) {
    const significantYear = keyLiuNian[0];
    prompts.push(
      `特别是 ${significantYear.year} 年（${significantYear.age} 虚岁），是不是发生了什么让你印象深刻的事？`,
    );
  }

  // 最多保留 3 句，避免太啰嗦
  return prompts.slice(0, 3);
}

/**
 * 生成两段大运对比的一句话总结
 */
function generateMatchSummary(target: DaYun, matched: HistoricalMatch): string {
  const ageLabel = matched.ageRangeLabel;
  const targetAge = `${target.startAge}-${target.startAge + 9}虚岁`;
  const role = target.flowAnalysis?.wuxingRole;

  if (role === '用神' || role === '喜神') {
    return `你 ${targetAge} 这步 ${target.ganZhi} 运，性质和你 ${ageLabel} 那步 ${matched.matchedDaYun.ganZhi} 运一模一样 —— 都是命中难得的好运`;
  }
  if (role === '忌神' || role === '仇神') {
    return `你 ${targetAge} 这步 ${target.ganZhi} 运，性质和你 ${ageLabel} 那步 ${matched.matchedDaYun.ganZhi} 运很像 —— 都需要你格外谨慎`;
  }
  return `你 ${targetAge} 这步 ${target.ganZhi} 运，能量场和你 ${ageLabel} 那步 ${matched.matchedDaYun.ganZhi} 运近似`;
}

/**
 * 生成消费者报告用的整段叙述（一段话版本）
 */
function generateConsumerNarrative(
  target: DaYun,
  bestMatch: HistoricalMatch,
): string {
  const summary = bestMatch.summary;
  const firstPrompt = bestMatch.verifyPrompts[0] ?? '';
  return `${summary}。${firstPrompt}如果是 —— 那未来这十年，大概率会重演那段经历的"放大版"。`;
}

// ---------- 主入口 ----------

/**
 * 为目标大运查找历史相似的运程
 *
 * @param targetDaYun 目标大运（通常是未来某步）
 * @param allDaYuns 全部大运列表（一般是 chart.daYuns）
 * @param referenceYear 参考年份（默认今年），用于判定哪些是"历史的"
 * @param minSimilarityThreshold 最小相似度阈值（默认 50），低于此值不输出
 * @returns 历史回响分析结果
 */
export function findHistoricalEcho(
  targetDaYun: DaYun,
  allDaYuns: DaYun[],
  referenceYear: number = new Date().getFullYear(),
  minSimilarityThreshold: number = 50,
): HistoricalEcho {
  // 1. 筛选候选：必须是已经走过了的大运（不能用未来的预测来"验证"未来）
  const historicalCandidates = allDaYuns.filter(
    (d) =>
      d.index !== targetDaYun.index &&
      isHistorical(d, referenceYear),
  );

  // 2. 对每个候选计算相似度
  const scored = historicalCandidates
    .map((candidate) => {
      const { score, matchedDimensions } = computeSimilarity(targetDaYun, candidate);
      return { candidate, score, matchedDimensions };
    })
    .filter((item) => item.score >= minSimilarityThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // 最多保留 3 个候选

  // 3. 构造输出
  const candidates: HistoricalMatch[] = scored.map((item) => {
    const c = item.candidate;
    const ageRangeLabel = `${c.startAge}-${c.startAge + 9}虚岁`;
    const yearRangeLabel = `${c.startYear}-${c.endYear}`;
    const verifyPrompts = generateVerifyPrompts(c);

    const partial: HistoricalMatch = {
      matchedDaYun: c,
      similarityScore: item.score,
      matchedDimensions: item.matchedDimensions,
      ageRangeLabel,
      yearRangeLabel,
      verifyPrompts,
      summary: '', // 下面填充
    };
    partial.summary = generateMatchSummary(targetDaYun, partial);
    return partial;
  });

  const bestMatch = candidates[0] ?? null;
  const consumerNarrative = bestMatch
    ? generateConsumerNarrative(targetDaYun, bestMatch)
    : null;

  return {
    targetDaYun,
    hasMatch: candidates.length > 0,
    candidates,
    bestMatch,
    consumerNarrative,
  };
}

/**
 * 批量为所有"未来大运"查找历史相似运
 *
 * @param allDaYuns 全部大运
 * @param referenceYear 参考年份（默认今年）
 * @returns Map<大运索引, 历史回响>
 */
export function findEchoesForAllFutureDaYuns(
  allDaYuns: DaYun[],
  referenceYear: number = new Date().getFullYear(),
): Map<number, HistoricalEcho> {
  const result = new Map<number, HistoricalEcho>();

  // 找出"未来 + 当前"大运
  const futureOrCurrent = allDaYuns.filter(
    (d) => !isHistorical(d, referenceYear) || isCurrent(d, referenceYear),
  );

  futureOrCurrent.forEach((targetDaYun) => {
    const echo = findHistoricalEcho(targetDaYun, allDaYuns, referenceYear);
    if (echo.hasMatch) {
      result.set(targetDaYun.index, echo);
    }
  });

  return result;
}

/**
 * 便捷方法：找出"现在正在走的大运"的历史回响
 * 用于 dashboard / 当下决策建议
 */
export function findCurrentDaYunEcho(
  allDaYuns: DaYun[],
  referenceYear: number = new Date().getFullYear(),
): HistoricalEcho | null {
  const current = allDaYuns.find((d) => isCurrent(d, referenceYear));
  if (!current) return null;
  return findHistoricalEcho(current, allDaYuns, referenceYear);
}
