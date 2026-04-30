// 每日 Dashboard 数据 · 基于蔡蔡（壬水日主）
// 与 mock/baziChart.ts 的日主设定一致；假定今日为 2026-04-26 庚午日（lunar-javascript 实算）

import type {
  DailyDashboard,
  DailyFortune,
  WeeklyTrend,
  QnaRecord,
} from '../types/bazi';
import {
  replyDecisionInterview,
  replyOpenInsomnia,
  replyTimingSigning,
} from './shifuReplies';

// 蔡蔡日主壬水，今日庚午日：庚金为偏印（生身助旺，无益），午火为正财（用神，调候暖局），整体偏吉
export const mockDailyFortune: DailyFortune = {
  date: '2026-04-26',
  lunarDate: '丙午年 三月初十',
  ganZhi: '庚午',
  shiShen: '偏印',
  scoreLabel: '小吉',
  summary: '先生看来，午火财星当令暖身，今日宜出宜动，巳午时最佳。',
  shiYi: ['见客', '签约', '出行', '处理财务'],
  jiHui: ['夜宴', '与人争辩', '过度劳神'],
  jiShi: [
    { range: '巳时（09:00-11:00）', reason: '巳火助午、财星最旺，宜谈合作' },
    { range: '午时（11:00-13:00）', reason: '当令之时，心气最暖，宜重要决策' },
  ],
};

export const mockWeeklyTrend: WeeklyTrend = {
  weekRange: '04.20 - 04.26',
  days: [
    { date: '04-20', weekday: '一', score: 68, label: '小吉' },
    { date: '04-21', weekday: '二', score: 55, label: '平' },
    { date: '04-22', weekday: '三', score: 78, label: '小吉' },
    { date: '04-23', weekday: '四', score: 52, label: '平' },
    { date: '04-24', weekday: '五', score: 40, label: '小凶' },
    { date: '04-25', weekday: '六', score: 45, label: '小凶' },
    { date: '04-26', weekday: '日', score: 58, label: '平', isToday: true },
  ],
};

/** 最近问答（Dashboard 底部列表展示 2-3 条） */
const recentQna: QnaRecord[] = [
  {
    id: 'qna-recent-1',
    scene: '开放',
    focusArea: '健康',
    question: '最近总是失眠，是不是流年不好？',
    reply: replyOpenInsomnia,
    askedAt: '2026-04-26T08:12:00+08:00',
    starred: true,
    feedback: 'pending',
  },
  {
    id: 'qna-recent-2',
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
    id: 'qna-recent-3',
    scene: '决策',
    focusArea: '事业',
    question: '下午面试要不要去？',
    reply: replyDecisionInterview,
    askedAt: '2026-04-19T14:02:00+08:00',
    feedback: 'skipped',
    feedbackNote: '改期',
  },
];

export const mockDailyDashboard: DailyDashboard = {
  fortune: mockDailyFortune,
  weeklyTrend: mockWeeklyTrend,
  quickScenes: [
    {
      scene: '决策',
      label: '决策建议',
      icon: '🤔',
      placeholder: '我该不该……',
    },
    {
      scene: '择吉',
      label: '时机择吉',
      icon: '📅',
      placeholder: '哪天最好……',
    },
    {
      scene: '宜忌',
      label: '每日宜忌',
      icon: '☀',
      placeholder: '今天宜/忌……',
    },
    {
      scene: '开放',
      label: '开放问答',
      icon: '💬',
      placeholder: '想问什么……',
    },
  ],
  recentQna,
};
