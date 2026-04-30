// 命理日记历史数据 · 20 条跨 2 个月份，覆盖四场景 / 四印章 / 各反馈状态
// 用于 JournalPage 效果展示

import type { QnaRecord, ShifuReply } from '../types/bazi';
import {
  replyDecisionInterview,
  replyDecisionInterviewFollowup,
  replyTimingSigning,
  replyDailyTips,
  replyOpenInsomnia,
} from './shifuReplies';

/** 轻量构造一个先生回话（用于填充更多历史条目） */
function buildReply(
  verdict: ShifuReply['verdict'],
  snippet: string,
): ShifuReply {
  return {
    empathy: '您愿意停下来问一问，先生已看到您的用心。',
    explanation: snippet,
    suggestion: '具体建议略（历史摘要）。',
    verdict,
    basis: { liuRi: '（历史日干支）', yongShen: '金土为用' },
  };
}

export const mockJournalRecords: QnaRecord[] = [
  // ───── 2026 · 4 月 ─────
  {
    id: 'qna-2026-04-26-01',
    scene: '开放',
    focusArea: '健康',
    question: '最近总是失眠，是不是流年不好？',
    reply: replyOpenInsomnia,
    askedAt: '2026-04-26T08:12:00+08:00',
    starred: true,
    feedback: 'pending',
  },
  {
    id: 'qna-2026-04-22-01',
    scene: '择吉',
    focusArea: '事业',
    question: '下周签约哪天最好？',
    reply: replyTimingSigning,
    askedAt: '2026-04-22T20:35:00+08:00',
    starred: true,
    feedback: 'confirmed',
    feedbackNote: '已签约 · 顺利',
  },
  {
    id: 'qna-2026-04-19-01',
    scene: '决策',
    focusArea: '事业',
    question: '下午面试要不要去？',
    reply: replyDecisionInterview,
    askedAt: '2026-04-19T14:02:00+08:00',
    feedback: 'skipped',
    feedbackNote: '改期',
  },
  {
    id: 'qna-2026-04-19-02',
    scene: '决策',
    focusArea: '事业',
    question: '那如果改约本周五呢？',
    reply: replyDecisionInterviewFollowup,
    askedAt: '2026-04-19T14:08:00+08:00',
    feedback: 'confirmed',
    feedbackNote: '周五面试顺利',
  },
  {
    id: 'qna-2026-04-18-01',
    scene: '宜忌',
    question: '今天一天该注意什么？',
    reply: replyDailyTips,
    askedAt: '2026-04-18T07:55:00+08:00',
    feedback: 'partial',
    feedbackNote: '上午顺利，下午有口舌',
  },
  {
    id: 'qna-2026-04-15-01',
    scene: '决策',
    focusArea: '财运',
    question: '朋友让我借一笔钱，借不借？',
    reply: buildReply(
      '忌',
      '流月癸卯，正印与财星相战，此时借贷易与亲友生嫌隙。若必借，可立字据明数目、明时限，勿做口头之约。',
    ),
    askedAt: '2026-04-15T21:30:00+08:00',
    starred: true,
    feedback: 'confirmed',
    feedbackNote: '听劝没借，后来朋友顺利解决',
  },
  {
    id: 'qna-2026-04-12-01',
    scene: '择吉',
    focusArea: '感情',
    question: '打算周末见家长，哪天比较合适？',
    reply: buildReply(
      '宜',
      '本周六戊戌日，戊土泄火、稳重之气，首选上午巳时，气氛亲和。',
    ),
    askedAt: '2026-04-12T19:10:00+08:00',
    feedback: 'confirmed',
  },
  {
    id: 'qna-2026-04-10-01',
    scene: '开放',
    focusArea: '事业',
    question: '我这个行业是不是还能做下去？',
    reply: buildReply(
      '中性',
      '您现处辛巳大运正财得地之期，本行业可做，但需主动调整方向，在"产品+服务"之间找到您自身的锚点。',
    ),
    askedAt: '2026-04-10T22:45:00+08:00',
    feedback: 'pending',
  },
  {
    id: 'qna-2026-04-07-01',
    scene: '宜忌',
    question: '清明假期想出游，去哪个方向？',
    reply: buildReply(
      '宜',
      '清明假期流日以甲辰、乙巳为主，您可选西南方向（用神方位），短途为宜，避免远行动土。',
    ),
    askedAt: '2026-04-07T09:00:00+08:00',
    feedback: 'confirmed',
    feedbackNote: '杭州周边 · 很舒适',
  },
  {
    id: 'qna-2026-04-05-01',
    scene: '决策',
    focusArea: '事业',
    question: '老板让我带个新项目，接不接？',
    reply: buildReply(
      '宜',
      '流月壬寅，印星得力，此时接新项目反而有贵人照应。重点是前三个月把架构立稳。',
    ),
    askedAt: '2026-04-05T15:20:00+08:00',
    starred: true,
    feedback: 'confirmed',
    feedbackNote: '已接，项目进展顺利',
  },
  {
    id: 'qna-2026-04-03-01',
    scene: '开放',
    focusArea: '人际',
    question: '为什么我总跟某个同事处不好？',
    reply: buildReply(
      '慎',
      '对方若为强木火之人，确与您五行相耗。建议保持专业距离，不必强求相融，合则共事、不合各走。',
    ),
    askedAt: '2026-04-03T12:10:00+08:00',
    feedback: 'partial',
  },
  {
    id: 'qna-2026-04-01-01',
    scene: '宜忌',
    question: '4 月整体运势如何？',
    reply: buildReply(
      '中性',
      '4 月流月壬寅，印星当令，利学习、签约、见贵人；忌冲动投资与大额借贷。',
    ),
    askedAt: '2026-04-01T08:30:00+08:00',
    feedback: 'pending',
  },

  // ───── 2026 · 3 月 ─────
  {
    id: 'qna-2026-03-28-01',
    scene: '决策',
    focusArea: '财运',
    question: '最近想买一支基金，这时候合适吗？',
    reply: buildReply(
      '慎',
      '流月辛丑，财星虽旺但伏吟，短期波动较大，建议分批买入、不宜重仓。',
    ),
    askedAt: '2026-03-28T20:15:00+08:00',
    feedback: 'confirmed',
    feedbackNote: '分批买入，避过一次下跌',
  },
  {
    id: 'qna-2026-03-25-01',
    scene: '择吉',
    focusArea: '事业',
    question: '公司开业选哪天？',
    reply: buildReply(
      '宜',
      '首选 4 月 5 日乙巳日巳时，木火通明，旺气开门；次选 4 月 12 日壬子日，水气通关。',
    ),
    askedAt: '2026-03-25T21:00:00+08:00',
    starred: true,
    feedback: 'confirmed',
    feedbackNote: '4 月 5 日开业 · 气场热烈',
  },
  {
    id: 'qna-2026-03-20-01',
    scene: '开放',
    focusArea: '健康',
    question: '最近总头痛，需要看医生吗？',
    reply: buildReply(
      '忌',
      '命理只是镜子，不能代医嘱。头痛持续请务必就医。命理上此月火气偏旺，建议清淡饮食、早睡。',
    ),
    askedAt: '2026-03-20T23:00:00+08:00',
    feedback: 'confirmed',
    feedbackNote: '已就医 · 颈椎问题',
  },
  {
    id: 'qna-2026-03-15-01',
    scene: '宜忌',
    question: '今天去见客户合适吗？',
    reply: buildReply(
      '宜',
      '今日庚午，庚金透干为您偏财当旺之日，利谈事，尤以午后申时最佳。',
    ),
    askedAt: '2026-03-15T10:20:00+08:00',
    feedback: 'confirmed',
  },
  {
    id: 'qna-2026-03-10-01',
    scene: '决策',
    focusArea: '感情',
    question: '和对象吵架冷战三天了，该谁先开口？',
    reply: buildReply(
      '宜',
      '命理讲"先动者得先机"，您为丙火日主，本是主动之气，先开口不是示弱，反而是解局之钥。',
    ),
    askedAt: '2026-03-10T22:50:00+08:00',
    feedback: 'confirmed',
    feedbackNote: '主动道歉 · 和好',
  },
  {
    id: 'qna-2026-03-05-01',
    scene: '开放',
    focusArea: '学业',
    question: '准备考个证书，今年考得过吗？',
    reply: buildReply(
      '宜',
      '流年丙午比肩助身，学习能专注；建议 5-8 月集中冲刺，9 月前后参考。',
    ),
    askedAt: '2026-03-05T19:40:00+08:00',
    starred: true,
    feedback: 'pending',
  },
  {
    id: 'qna-2026-03-02-01',
    scene: '择吉',
    focusArea: '财运',
    question: '搬家想挑个好日子',
    reply: buildReply(
      '宜',
      '首选 3 月 16 日辛未日，辛金为用神透干，未土收火气，搬家顺遂。',
    ),
    askedAt: '2026-03-02T14:25:00+08:00',
    feedback: 'confirmed',
    feedbackNote: '已搬 · 一切顺利',
  },
  {
    id: 'qna-2026-03-01-01',
    scene: '宜忌',
    question: '3 月需要注意什么？',
    reply: buildReply(
      '中性',
      '流月辛丑，财星得位但稍拘束，利稳健、忌冒进。感情上注意多倾听少争辩。',
    ),
    askedAt: '2026-03-01T08:10:00+08:00',
    feedback: 'partial',
  },
];
