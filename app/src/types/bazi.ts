// 八字相关类型定义
//
// 多法同断（Convergence）说明：
// 在命理判断中，当 ≥2 个独立分析路径（如旺衰法/格局法/神煞法/调候法/大运法）
// 指向同一结论时，置信度大幅提升，相当于"交叉验证"。
// 使用 Convergence 字段标注此类结论，UI 会以金色双印章 + 金边强突出。

export type WuXing = '金' | '木' | '水' | '火' | '土';
export type TianGan =
  | '甲' | '乙' | '丙' | '丁' | '戊'
  | '己' | '庚' | '辛' | '壬' | '癸';
export type DiZhi =
  | '子' | '丑' | '寅' | '卯' | '辰' | '巳'
  | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type Gender = '男' | '女';
export type ShiShen =
  | '比肩' | '劫财' | '食神' | '伤官' | '偏财'
  | '正财' | '七杀' | '正官' | '偏印' | '正印' | '日主';

/** 一柱：天干 + 地支 + 藏干 + 纳音 + 十神 */
export interface Pillar {
  name: string; // 年柱/月柱/日柱/时柱
  tianGan: TianGan;
  diZhi: DiZhi;
  cangGan: Array<{
    gan: TianGan;
    type: '本气' | '中气' | '余气';
    shiShen: ShiShen;
  }>;
  naYin: string; // 如：路旁土
  ganShiShen: ShiShen; // 天干十神
  diShiShen: ShiShen[]; // 地支藏干十神
}

export interface BasicInfo {
  name: string;
  gender: Gender;
  solarDate: string; // 公历：1990年8月15日 14:30
  lunarDate: string; // 农历：庚午年 六月廿五 未时
  jieQiMonth: string; // 节气月
  trueSolarTime?: string; // 真太阳时
  birthPlace?: string;
}

export interface WuXingStat {
  wuxing: WuXing;
  tianGanCount: number;
  diZhiCount: number;
  cangGanCount: number;
  total: number;
  percent: number;
}

/** 旺衰推断步骤 */
export interface WangShuaiStep {
  step: '得令' | '得地' | '得生' | '受克' | '综合';
  title: string;
  details: string[];
  result: 'positive' | 'negative' | 'neutral'; // 利日主/不利/中性
  score: number; // 加减分
}

export interface WangShuai {
  steps: WangShuaiStep[];
  conclusion: string; // 日主偏旺（中等偏上）
  confidence: 1 | 2 | 3 | 4 | 5; // 置信度星级
  /** 多法同断说明：当 ≥2 个独立分析路径指向同一旺衰结论时填写 */
  convergence?: Convergence;
}

/** 用神 */
export interface YongShen {
  primary: WuXing[]; // 主用神（喜用）
  secondary: WuXing[]; // 次用神
  ji: WuXing[]; // 忌神
  reason: string; // 推断理由
  method: '扶抑' | '调候' | '通关' | '专旺';
  /** 多法同断说明：当 ≥2 种取用神方法（扶抑/调候/通关/专旺）皆指向同一组用神时填写 */
  convergence?: Convergence;
}

/**
 * 多法同断（命理判断的最高置信度标志）
 * 同一结论由 ≥2 个独立分析方法共同推出时使用，相当于"交叉验证"
 */
export interface Convergence {
  /** 各独立分析路径的简述（如"五行旺衰法"、"格局法"、"调候法"） */
  methods: string[];
  /** 共同指向的结论（专业模式展示） */
  conclusion: string;
  /** 消费者模式柔化呈现的一句话注脚（可选，未提供则不在消费者端展示） */
  consumerNote?: string;
}

/** 格局 */
export interface GeJu {
  name: string; // 如：偏财格
  type: '正格' | '偏格' | '特殊格';
  status: '成格' | '破格' | '半成';
  level: '高' | '中' | '低';
  description: string;
}

/** 神煞 */
export interface ShenSha {
  name: string; // 如：天乙贵人
  category: '吉神' | '凶神' | '中性';
  source: string; // 出现位置：日支
  description: string;
}

/** 大运 */
export interface DaYun {
  index: number; // 第几步
  ganZhi: string; // 干支：丁酉
  startAge: number; // 起运年龄
  startYear: number; // 起运年份
  endYear: number;
  shiShen: ShiShen;
  brief: string; // 简评
}

/** 关键发现（专业模式高亮） */
export interface KeyFinding {
  level: 'red' | 'yellow' | 'green'; // 红黄绿三级
  title: string;
  description: string;
  /** 多法同断证据链：当 ≥2 个独立路径指向同一结论时填写，命理最高置信度标志 */
  convergence?: Convergence;
}

/** 完整排盘+分析结果（专业模式数据） */
export interface BaziChart {
  basicInfo: BasicInfo;
  pillars: [Pillar, Pillar, Pillar, Pillar]; // 年月日时四柱
  wuxingStats: WuXingStat[];
  wangShuai: WangShuai;
  yongShen: YongShen;
  geJu: GeJu;
  shenShas: ShenSha[];
  daYuns: DaYun[];
  keyFindings: KeyFinding[];
  startAge: string; // 起运信息描述
  qiYunDirection: '顺行' | '逆行';
}

/** 关心领域 */
export type FocusArea = '事业' | '感情' | '财运' | '健康' | '学业' | '人际';

/** 消费者报告（用户模式数据） */
export interface ConsumerReport {
  // 命格意象（开篇）
  imagery: {
    title: string; // 你的命属：炉中火
    subtitle: string;
    description: string; // 形象化描述
    keywords: string[]; // 关键词
  };
  // 共情段落
  empathy: {
    title: string;
    paragraphs: string[];
  };
  // 解释段落（融入约 10% 术语）
  explanation: {
    title: string;
    paragraphs: string[];
    terms: Array<{ term: string; meaning: string }>; // 术语解释
    /** 多法同断小注脚：列出此段哪些核心结论是"先生从多个角度都印证了的" */
    convergenceNotes?: string[];
  };
  // 出路段落（重点领域 3-5 点）
  guidance: {
    focusArea: FocusArea;
    title: string;
    points: Array<{
      heading: string;
      content: string;
      /** 该建议是否为多法同断（≥2 路径共同推出，置信度最高） */
      isConvergent?: boolean;
    }>;
  };
  // 时间节奏
  timeline: {
    title: string;
    nodes: Array<{
      year: string; // 2028 年
      ageRange: string; // 38-47 岁
      ganZhi: string; // 丁亥大运
      summary: string; // 一句话概括
      type: 'good' | 'caution' | 'turning'; // 利好/警惕/转折
    }>;
  };
  // 开运指南
  luckyGuide: {
    colors: string[];
    directions: string[];
    numbers: number[];
    industries: string[];
    foods: string[];
    nobleman: string; // 贵人画像
  };
  // 温暖结语
  closing: {
    paragraphs: string[];
  };
  // 其他领域简评
  otherAreas: Array<{
    area: FocusArea;
    summary: string;
  }>;
}

// ===================== 每日命理对话相关类型 =====================

/** 提问场景类型 */
export type AskScene = '决策' | '择吉' | '宜忌' | '开放';

/** 今日宜忌（Daily Dashboard 顶部卡） */
export interface DailyFortune {
  date: string; // 2026-04-26
  lunarDate: string; // 丙午年 三月初九
  ganZhi: string; // 当日干支：丙寅
  shiShen: ShiShen; // 当日干对应日主的十神
  scoreLabel: '大吉' | '小吉' | '平' | '小凶'; // 文字化评级（避免数字评分伪科学）
  summary: string; // 一句话概括
  shiYi: string[]; // 宜
  jiHui: string[]; // 忌
  jiShi: Array<{ // 吉时
    range: string; // 巳时（09:00-11:00）
    reason: string;
  }>;
}

/** 命理师人设回话（三段式） */
export interface ShifuReply {
  empathy: string; // ① 共情段
  explanation: string; // ② 解释段（含命理依据）
  suggestion: string; // ③ 建议段（具体行动）
  verdict: '宜' | '忌' | '慎' | '中性'; // 核心判断标签（印章）
  basis: { // 命理依据（可追溯）
    liuNian?: string; // 流年
    liuYue?: string; // 流月
    liuRi?: string; // 流日
    yongShen?: string; // 用神配合度
    daYun?: string; // 当前大运
  };
  bestTiming?: string; // 推荐时间窗口
  relatedFocus?: FocusArea; // 关联领域
}

/** 实际反馈（日记回填） */
export type Feedback =
  | 'pending' // 待回填
  | 'confirmed' // 已应验
  | 'partial' // 部分应验
  | 'denied' // 未应验
  | 'skipped'; // 未执行/改期

/** 一次完整的问答记录 */
export interface QnaRecord {
  id: string;
  scene: AskScene;
  focusArea?: FocusArea;
  question: string;
  reply: ShifuReply;
  askedAt: string; // ISO 时间
  starred?: boolean; // 用户标记重要
  feedback?: Feedback; // 实际反馈
  feedbackNote?: string; // 反馈备注
}

/** 聊天流消息（ChatPage 使用） */
export type ChatRole = 'user' | 'shifu';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  scene: AskScene;
  /** 用户消息：文本问题；先生消息：三段式回话 */
  text?: string; // role=user
  reply?: ShifuReply; // role=shifu
  createdAt: string;
  /** 关联的 QnaRecord id（先生回话沉淀到日记时写入） */
  qnaId?: string;
  starred?: boolean;
}

/** 本周运势曲线数据 */
export interface WeeklyTrend {
  weekRange: string; // 04.20 - 04.26
  days: Array<{
    date: string; // 04-26
    weekday: string; // 周日
    score: number; // 0-100（仅用于曲线，不展示给用户）
    label: '大吉' | '小吉' | '平' | '小凶';
    isToday?: boolean;
  }>;
}

/** Daily Dashboard 完整数据 */
export interface DailyDashboard {
  fortune: DailyFortune;
  weeklyTrend: WeeklyTrend;
  quickScenes: Array<{
    scene: AskScene;
    label: string; // 显示文本
    icon: string; // emoji
    placeholder: string; // 输入框占位
  }>;
  recentQna: QnaRecord[]; // 最近问答
}
