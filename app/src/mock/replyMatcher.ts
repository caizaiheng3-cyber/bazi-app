// 简易规则匹配引擎（Mock 阶段的"伪 AI"）
// 输入：{question, scene, focusArea?}
// 逻辑：在 replySamples 中找 scene 匹配且 question 命中任一关键词的样例
//      命中 → 返回对应 ShifuReply；未命中 → 返回兜底

import type { AskScene, ShifuReply } from '../types/bazi';
import { replyFallback, replySamples } from './shifuReplies';

export interface MatchInput {
  question: string;
  scene: AskScene;
}

/**
 * 规则匹配一条先生回话。
 * - 场景严格匹配
 * - 关键词任一命中即算命中
 * - 全部落空时返回 replyFallback
 */
export function matchShifuReply({ question, scene }: MatchInput): ShifuReply {
  const q = question.trim();
  if (!q) return replyFallback;

  const sameSceneSamples = replySamples.filter((s) => s.scene === scene);
  const hit = sameSceneSamples.find((s) =>
    s.keywords.some((kw) => q.includes(kw)),
  );
  if (hit) return hit.reply;

  return replyFallback;
}
