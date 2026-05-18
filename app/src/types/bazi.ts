// 八字相关类型定义
//
// 多法同断（Convergence）说明：
// 在命理判断中，当 ≥2 个独立分析路径（如旺衰法/格局法/神煞法/调候法/大运法）
// 指向同一结论时，置信度大幅提升，相当于"交叉验证"。
// 使用 Convergence 字段标注此类结论，UI 会以金色双印章 + 金边强突出。

// ============================================================
// 模块影响 + 应对（E1 通用类型）
// ----------------------------------------------------------------
// 设计目标：每个 analyzer 输出"命理事实（What）"之外，附加：
//   - impact：对命主在多个生活维度的具体影响（So What）
//   - actions：趋利避害的可执行清单（Now What）
// 由 moduleEnhancer.ts 通过 LLM 增强生成，失败时为 undefined（兜底用规则模板）
// ============================================================

/**
 * 模块影响：键值对形式描述对命主多维度影响。
 * key = 影响维度（如"性格层面" / "事业层面" / "婚姻层面"）
 * value = 该维度的具体影响描述
 */
export type ModuleImpact = Record<string, string>;

/**
 * 模块应对：趋利避害的可执行清单。
 */
export interface ModuleActions {
  /** 趋利：怎么用好这张牌（3-5 条具体可执行） */
  dos: string[];
  /** 避害：怎么防住这张牌（3-5 条具体可执行） */
  donts: string[];
  /** 关键年份与具体动作（可选） */
  yearlyPlan?: Array<{ year: number; age?: number; action: string }>;
}

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

/** 五行调整明细（来自干支动态关系：合化/三合/六合/库冲等） */
export interface WuXingAdjustment {
  /** 调整来源（合化/三会/三合/半三合/六合/库冲/合而不化等） */
  source: '天干合化' | '天干合而不化' | '地支三会' | '地支三合' | '地支半三合' | '地支六合' | '库冲库开';
  /** 调整说明（如"戌卯六合化火 → 火 +0.3"） */
  description: string;
  /** 加减分数（正数=增加，负数=减少） */
  delta: number;
  /** 命理学依据（如"§1.4.3 地支六合"） */
  source_doc: string;
}

export interface WuXingStat {
  wuxing: WuXing;
  tianGanCount: number;
  diZhiCount: number;
  cangGanCount: number;
  /** 加权分数（已应用动态关系调整后的最终值，供下游使用） */
  total: number;
  /** 百分比（已应用动态关系调整后的最终值） */
  percent: number;
  /** 调整前的原始分数（仅用于 UI 对比展示） */
  originalTotal?: number;
  /** 调整前的原始百分比（仅用于 UI 对比展示） */
  originalPercent?: number;
  /** 调整明细列表（仅用于 UI 追溯展示，可能为空数组） */
  adjustments?: WuXingAdjustment[];
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
  /**
   * 动态关系修正环节（M2.7 新增）：
   * 当原局存在合化/三合/六合/库冲等关系时，记录这些关系如何影响日主旺衰的最终判定。
   * 缺省（undefined）表示原局无显著动态关系，旺衰判定按静态四步法即可。
   */
  relationAdjustment?: {
    /** 修正前的初步结论（按静态四步法的纯结论，不含关系修正） */
    rawConclusion: string;
    /** 关系修正项列表（按对日主的影响力排序：助身的列在前，克泄的列在后） */
    items: Array<{
      /** 关系类型描述（如"日支戌↔时支卯六合化火"） */
      relation: string;
      /** 该关系对日主旺衰的实际影响（'助身' = 增强日主，'克泄' = 削弱日主，'中性' = 仅改变五行结构不直接影响） */
      effect: '助身' | '克泄' | '中性';
      /** 影响强度：强 / 中 / 弱 */
      strength: '强' | '中' | '弱';
      /** 一句话解读 */
      description: string;
    }>;
    /**
     * 是否实际改变了最终结论（true=结论被修正，false=结论维持但仍展示分析过程）
     */
    changedConclusion: boolean;
    /** 综合解读（一段话总结关系修正后的最终判定） */
    summary: string;
  };
}

/** 用神 */
export interface YongShen {
  primary: WuXing[]; // 主用神（喜用）
  secondary: WuXing[]; // 次用神
  ji: WuXing[]; // 忌神
  reason: string; // 推断理由
  /**
   * 取用神方法：
   * - 扶抑：常规身旺/身弱用扶抑法
   * - 调候：寒暖燥湿调节
   * - 通关：两强对峙取通关五行
   * - 专旺：真专旺格（同五行 ≥ 70%，纯粹一气）
   * - 从旺：从旺/从强格（同+印 ≥ 75% 且天干一气）
   * - 假专旺：准从旺/假专旺（55-69% 接近成势但有破格隐患）
   */
  method: '扶抑' | '调候' | '通关' | '专旺' | '从旺' | '假专旺';
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
  /** M2.8 新增：大运与原局四柱的动态作用关系（合化/三合/六合/六冲/三刑/暗合/填实空亡等） */
  flowAnalysis?: DaYunFlow;
}

// ============================================================
// M2.8 大运流年关系联动
// 把动态关系系统应用到时间轴：大运/流年与原局发生作用 → 时间轴事件
// ============================================================

/**
 * 单步大运与原局的动态作用分析结果
 *
 * 命理学原理：大运是命运的"阶段背景"，每 10 年改写一次背景五行；
 * 大运干支与原局四柱发生作用 → 触发原本静态的命局格局变化。
 */
export interface DaYunFlow {
  /** 大运五行角色：用神 / 喜神 / 闲神 / 仇神 / 忌神 */
  wuxingRole: '用神' | '喜神' | '闲神' | '仇神' | '忌神';
  /** 大运吉凶分（5=黄金运，1=最凶运） */
  score: 1 | 2 | 3 | 4 | 5;
  /** 大运五行（取自大运天干） */
  wuxing: WuXing;
  /** 大运十神（取自大运天干 vs 日主） */
  shiShenLabel: ShiShen;
  /** 大运 vs 原局四柱产生的关系列表（复用原局关系类型，但 posA/posB 中 4 = 大运位） */
  relations: DaYunRelation[];
  /** 是否填实了原局空亡（命理学最关键的事件触发器之一） */
  fillsXunKong: Array<{
    zhi: DiZhi;
    description: string;
  }>;
  /** 这一运中最关键的几个流年（按重要性排序，最多 3-5 个） */
  keyLiuNian: LiuNianHint[];
  /** 一句话总结此运吉凶 */
  summary: string;
}

/**
 * 大运与原局柱位发生关系（统一封装）
 * 复用 ChartRelations 中的语义，但只对一个具体大运实例生效
 */
export interface DaYunRelation {
  /** 关系类型 */
  kind:
    | '大运合化'
    | '大运合而不化'
    | '大运天干相冲'
    | '大运地支三合'
    | '大运地支半三合'
    | '大运地支六合'
    | '大运地支六冲'
    | '大运地支三刑'
    | '大运地支暗合'
    | '大运填实空亡'
    | '大运伏吟'   // 大运地支与原局某地支相同
    | '大运反吟'; // 大运地支与日支相冲
  /** 与之发生关系的原局柱位 */
  withPos: PillarPosition;
  /** 关系所对应的化神/影响五行（无则空） */
  hua?: WuXing;
  /** 强度：紧贴日主 / 影响财官印 / 一般 */
  strength: RelationStrength;
  /** 一句话描述（含"对哪个十神/宫位的影响"） */
  description: string;
}

/**
 * 流年提示（重要事件年）
 *
 * 命理学原理：流年是临时变量，本身只 1 年，但与大运 + 原局叠加可触发关键事件。
 * 这里只输出"显著事件年"，不输出每年都有的常规干支关系。
 */
export interface LiuNianHint {
  /** 公历年份 */
  year: number;
  /** 流年干支 */
  ganZhi: string;
  /** 该年龄（虚岁） */
  age: number;
  /** 事件类型 */
  eventType:
    | '伏吟'         // 流年干支 == 日柱（自身重大变动）
    | '反吟'         // 流年地支冲日支（婚姻/自身波动）
    | '岁运并临'     // 流年 == 大运（吉凶倍增）
    | '填实空亡'     // 流年填实原局空亡
    | '加倍填空'     // 流年 + 大运同时填同一空亡支（双倍激活）
    | '流年合日支'   // 婚姻信号
    | '流年合大运'   // 流年与大运地支六合（环境联动）
    | '用神年'       // 流年五行 == 用神
    | '忌神年';      // 流年五行 == 忌神
  /** 吉凶倾向 */
  tendency: 'auspicious' | 'inauspicious' | 'neutral';
  /** 事件描述 */
  description: string;
}

/**
 * 人生时间轴事件（按大运分段，每段一个事件）
 *
 * 命理学原理：把 80 年人生切成 8 段大运，每段评估其用神角色和关键事件，
 * 形成"人生开运/避险时间表"。
 */
export interface LifeTimelineSegment {
  /** 大运索引（0=第一步运） */
  daYunIndex: number;
  /** 起止年龄（虚岁） */
  ageRange: [number, number];
  /** 起止公历年 */
  yearRange: [number, number];
  /** 大运干支 */
  daYunGanZhi: string;
  /** 大运五行角色 */
  wuxingRole: DaYunFlow['wuxingRole'];
  /** 大运吉凶分 */
  score: 1 | 2 | 3 | 4 | 5;
  /** 这一运的核心关键词（如 "用神大运/事业起飞" 或 "忌神大运/破财防灾"） */
  headline: string;
  /** 这一运的关键事件（来自 DaYunFlow.relations + fillsXunKong） */
  keyEvents: string[];
  /** 这一运中最关键的流年（来自 DaYunFlow.keyLiuNian） */
  topLiuNian: LiuNianHint[];
}

/**
 * 完整人生时间轴
 */
export interface LifeTimeline {
  /** 8 段大运 */
  segments: LifeTimelineSegment[];
  /** 一生总结：哪一段是黄金期、哪一段需谨慎 */
  summary: string;
  /** 人生黄金期（评分最高的大运索引列表） */
  goldenPeriods: number[];
  /** 人生需谨慎期（评分最低的大运索引列表） */
  cautionPeriods: number[];
}

/** 关键发现（专业模式高亮） */
export interface KeyFinding {
  level: 'red' | 'yellow' | 'green'; // 红黄绿三级
  title: string;
  description: string;
  /** 多法同断证据链：当 ≥2 个独立路径指向同一结论时填写，命理最高置信度标志 */
  convergence?: Convergence;
}

// ============================================================
// 主导因子（P3.4）：从全局信息抽取"对命主影响最大的 3-5 件事"
// ============================================================

/** 主导因子来源类别 */
export type DriverFactorSource =
  | '日主旺衰'      // 日主极旺/极弱（命运曲线根本）
  | '五行严重偏枯'  // 单一五行 ≥ 35% 或 ≤ 8%
  | '用神调候缺位'  // 调候用神在原局占比过低
  | '大运用神段'    // 一段大运是用神/忌神
  | '关键发现'      // 来自 keyFindings（红/黄/绿）
  | '格局成败'      // 成格/破格
  | '关系核心';     // 强力合化/三合/六冲等

/** 单个主导因子 */
export interface DriverFactor {
  /** 因子来源 */
  source: DriverFactorSource;
  /** 极性：positive 优势 / negative 风险 / neutral 中性 */
  polarity: 'positive' | 'negative' | 'neutral';
  /** 命理学影响权重（0-100，越高越关键） */
  weight: number;
  /** 一句话标题（≤ 14 字） */
  title: string;
  /** 详细解释（含命理学证据） */
  detail: string;
  /** 给命主的可执行建议（关键字段，区分"懂我"vs"算命") */
  actionableAdvice: string;
}

/** 主导因子分析结果 */
export interface CommandFactors {
  /** 命运主线（一句话定盘 ≤ 30 字，开篇即抛） */
  mainTheme: string;
  /** Top-N 风险因子（最多 3 个，按 weight 降序） */
  topRisks: DriverFactor[];
  /** Top-N 优势因子（最多 3 个，按 weight 降序） */
  topAdvantages: DriverFactor[];
  /** 全部候选因子（用于审计与扩展） */
  allFactors: DriverFactor[];
  /** LLM 增强：对命主的影响（多维度） */
  impact?: ModuleImpact;
  /** LLM 增强：趋利避害可执行清单 */
  actions?: ModuleActions;
}

// ============================================================
// 干支关系分析（动态作用层）
// 基于命理分析方法论 §1.3-§1.4 + §3.5
// ============================================================

/** 命盘四柱位置编号：0=年柱 1=月柱 2=日柱 3=时柱 */
export type PillarPosition = 0 | 1 | 2 | 3;

/** 远近亲疏：紧贴/隔一柱/隔两柱（用于决定关系作用力） */
export type Distance = 'adjacent' | 'one-apart' | 'far-apart';

/** 关系作用力档位 */
export type RelationStrength = 'strong' | 'medium' | 'weak';

/** 天干合化关系（甲己合土 / 乙庚合金 / 丙辛合水 / 丁壬合木 / 戊癸合火） */
export interface GanHeRelation {
  type: '天干合化';
  ganA: TianGan;
  posA: PillarPosition;
  ganB: TianGan;
  posB: PillarPosition;
  /** 化出五行 */
  hua: WuXing;
  /** 是否真合化（满足月令、邻位、化神有根等条件） */
  huaSuccess: boolean;
  /** 不能合化时的失败原因（如 '隔柱不合' / '化神无月令支持'） */
  failReason?: string;
  distance: Distance;
  strength: RelationStrength;
  description: string;
}

/** 天干相冲（甲庚 / 乙辛 / 丙壬 / 丁癸） */
export interface GanChongRelation {
  type: '天干相冲';
  ganA: TianGan;
  posA: PillarPosition;
  ganB: TianGan;
  posB: PillarPosition;
  distance: Distance;
  strength: RelationStrength;
  description: string;
}

/** 地支六合（含化向） */
export interface ZhiLiuHeRelation {
  type: '地支六合';
  zhiA: DiZhi;
  posA: PillarPosition;
  zhiB: DiZhi;
  posB: PillarPosition;
  hua: WuXing;
  distance: Distance;
  strength: RelationStrength;
  description: string;
}

/** 地支三合 / 半三合 */
export interface ZhiSanHeRelation {
  type: '地支三合' | '地支半三合';
  members: Array<{ zhi: DiZhi; pos: PillarPosition }>;
  hua: WuXing;
  /** 半三合细分：'生旺'(如亥卯) / '旺库'(如卯未) / '生库'(如亥未，力最弱) */
  banType?: '生旺' | '旺库' | '生库';
  strength: RelationStrength;
  description: string;
}

/** 地支三会（东方寅卯辰 / 南方巳午未 / 西方申酉戌 / 北方亥子丑） */
export interface ZhiSanHuiRelation {
  type: '地支三会';
  members: Array<{ zhi: DiZhi; pos: PillarPosition }>;
  hua: WuXing;
  strength: RelationStrength;
  description: string;
}

/** 地支六冲（子午 / 卯酉 / 寅申 / 巳亥 / 辰戌 / 丑未） */
export interface ZhiChongRelation {
  type: '地支六冲';
  zhiA: DiZhi;
  posA: PillarPosition;
  zhiB: DiZhi;
  posB: PillarPosition;
  distance: Distance;
  strength: RelationStrength;
  /** 是否被合解（合能解冲） */
  resolvedByHe: boolean;
  description: string;
}

/** 地支三刑 / 自刑 */
export interface ZhiXingRelation {
  type: '地支三刑' | '地支自刑';
  /** 刑的类型：寅巳申(无恩) / 丑戌未(恃势) / 子卯(无礼) / 自刑 */
  xingType: '无恩之刑' | '恃势之刑' | '无礼之刑' | '自刑';
  members: Array<{ zhi: DiZhi; pos: PillarPosition }>;
  /** 是否被合解 */
  resolvedByHe: boolean;
  description: string;
}

/** 单个干支的"外显/实质"层级 —— 用于判定一个十神是真有力还是虚位 */
export type ManifestLevel =
  | 'manifest-strong'   // 外显·实力派：透干 + 通根
  | 'manifest-weak'     // 外显·虚位：透干但无根（看似有实则空）
  | 'hidden-strong'     // 内蕴·实质：藏支本气有力但不透干
  | 'hidden-weak'       // 内蕴·潜藏：仅藏中余气，不透干
  | 'absent-empty'      // V2 新增：透干无根 且 落空亡，几乎完全不存在
  | 'absent';           // 命中无此十神

/** 十神显象信息（按十神聚合） */
export interface ShiShenManifestation {
  shiShen: ShiShen;
  level: ManifestLevel;
  /** 该十神所在的位置列表（天干透出的柱位） */
  ganPositions: PillarPosition[];
  /** 该十神的藏干位置 */
  cangPositions: Array<{ pos: PillarPosition; type: '本气' | '中气' | '余气' }>;
  /** V2 新增：该十神的关联地支是否落空亡（任一关联位空亡即为 true） */
  inXunKong?: boolean;
  /** V2 新增：原始（未应用空亡降级前）的层级 */
  originalLevel?: ManifestLevel;
  /** 一句话解读（外显/实质/虚位/隐藏 + 可能的空亡修正） */
  description: string;
}

/**
 * 争合 / 妒合（一对多 / 多对一的天干合）
 *
 * 命理学原理（《命理分析方法论》§3.5.2）：
 * - 争合：一干被两个或以上的干同时争合 → 合的力量分散，谁都合不住
 * - 妒合：两个或以上的干同时合一个干 → 被合方犹豫不决
 * 命理结果：参与争合/妒合的所有合关系都"合而不化"
 */
export interface ZhengHeOrDuHeRelation {
  type: '争合' | '妒合';
  /** 中心被合干（被多方争夺的对象） */
  centerGan: TianGan;
  centerPos: PillarPosition;
  /** 争合方（≥2 个） */
  competitors: Array<{ gan: TianGan; pos: PillarPosition }>;
  /** 化神（如果合化能成立的话） */
  hua: WuXing;
  description: string;
}

/**
 * 暗合（地支藏干之间的隐合关系）
 *
 * 命理学原理（《命理分析方法论》§3.5.5）：
 * 4 组主流暗合：
 * - 寅丑暗合（寅中甲与丑中己 → 甲己合）
 * - 卯申暗合（卯中乙与申中庚 → 乙庚合）
 * - 午亥暗合（午中丁与亥中壬 → 丁壬合）
 * - 巳酉暗合（巳中丙与酉中辛 → 丙辛合）
 * 命理含义：暗中关系/私情/隐秘的合作，在婚姻论断中尤为重要
 */
export interface AnHeRelation {
  type: '地支暗合';
  zhiA: DiZhi;
  posA: PillarPosition;
  zhiB: DiZhi;
  posB: PillarPosition;
  /** 暗合所对应的天干合关系（如 '甲己合'） */
  hiddenGanHe: string;
  /** 暗合化神 */
  hua: WuXing;
  distance: Distance;
  strength: RelationStrength;
  description: string;
}

/**
 * 旬空（空亡）信息
 *
 * 命理学原理（《命理分析方法论》§1.5 + 子平六十甲子表）：
 * 以日柱起六十甲子，确定属于哪一旬，每旬有两个空亡支。
 * 落空亡的地支：该位之神虚浮无力，对应十神显象降级。
 *
 * 例：
 * - 甲子旬（甲子-癸酉）→ 戌亥空
 * - 甲寅旬（甲寅-癸亥）→ 子丑空
 */
export interface XunKongInfo {
  /** 日柱所在的旬名（如 '甲寅旬'） */
  xunName: string;
  /** 该旬的空亡两支 */
  emptyZhi: [DiZhi, DiZhi];
  /** 命中实际落空亡的地支位置（按四柱位置查 emptyZhi 命中情况） */
  hitPositions: Array<{
    pos: PillarPosition;
    zhi: DiZhi;
    /** 该位空亡对宫位的命理含义（年=祖荫空、月=父母兄弟空、日=配偶空、时=子女空） */
    palaceImpact: string;
  }>;
  description: string;
}

/** 命盘动态关系分析结果 */
export interface ChartRelations {
  ganHeHua: GanHeRelation[];
  ganChong: GanChongRelation[];
  zhiSanHui: ZhiSanHuiRelation[];
  zhiSanHe: ZhiSanHeRelation[];
  zhiLiuHe: ZhiLiuHeRelation[];
  zhiChong: ZhiChongRelation[];
  zhiXing: ZhiXingRelation[];
  /** V2 新增：争合 / 妒合（来自后处理 ganHeHua） */
  zhengHeOrDuHe: ZhengHeOrDuHeRelation[];
  /** V2 新增：地支暗合（4 组主流暗合） */
  anHe: AnHeRelation[];
  /** V2 新增：旬空（按日柱起，命中四柱中的空亡支） */
  xunKong: XunKongInfo;
  /** 十神显象（外显/实质/虚位/隐藏 + 空亡修正）—— 用于性格画像和事件论断 */
  manifestation: ShiShenManifestation[];
  /** 命盘主题级关键事件（按权重最高的几个关系汇总，给上层模块直接消费） */
  keyThemes: Array<{
    title: string;
    description: string;
    weight: 'highest' | 'high' | 'medium';
    source: string;
  }>;
}

/**
 * 命格特征分析（基于滴天髓「天干十论」+ 子平真诠 + 三命通会）
 *
 * 6 维度交叉公式：
 *   命格画像 = 旺衰基底 × 日主气质 × 用神主旋律
 *            + 格局社会角色 + 十神组合心性 + 神煞亮点
 *
 * 设计原则：
 *   - 每个维度独立产出 PersonaTrait（一个标签 + 一段描述 + 经典出处）
 *   - 综合后产出一句话画像 + 优势/注意 + 关键词云
 *   - 严格基于经典命理规则映射，不自创性格学
 */
export interface PersonaTrait {
  /** 维度名（旺衰基底/日主气质/...） */
  dimension: string;
  /** 短标签，用于云图展示（如"太阳型人格""偏旺主见强"） */
  tag: string;
  /** 详细描述（一段话） */
  description: string;
  /** 经典命理出处（如《滴天髓·论壬水》） */
  source?: string;
}

export interface Persona {
  /** 一句话画像（核心结论） */
  oneLiner: string;
  /** 6 维度细分 */
  baseTone: PersonaTrait;        // 维度1：旺衰基底
  innerNature: PersonaTrait;     // 维度2：日主气质（滴天髓十干论）
  lifeTheme: PersonaTrait;       // 维度3：用神主旋律
  socialRole: PersonaTrait;      // 维度4：格局对应社会角色
  mentality: PersonaTrait[];     // 维度5：十神组合心性（多条）
  highlights: PersonaTrait[];    // 维度6：神煞亮点（多条）
  /** 优势天赋（3-5 条，命理依据汇总） */
  strengths: string[];
  /** 需要注意（2-4 条，忌神/凶神/破格预警） */
  cautions: string[];
  /** 关键词云（6-10 个标签） */
  keywords: string[];
  /** 综合置信度（5 颗星，6 维结论一致度越高，置信度越高） */
  confidence: 1 | 2 | 3 | 4 | 5;
  /** 多法同断（≥2 维度共同指向同一性格倾向时填写） */
  convergence?: Convergence;
}

/* ───────────────────────── M3 婚姻细论 类型 ───────────────────────── */

/**
 * 配偶星显象
 *
 * 命理学口径：
 * - 男命配偶星 = 正财（妻星）/ 偏财（次妻/情人）
 * - 女命配偶星 = 正官（夫星）/ 七杀（次夫/情人）
 * - 配偶星的"外显/实质/虚位/潜藏"决定配偶在命主生活中的存在感和稳定性
 */
export interface SpouseStarInfo {
  /** 主配偶星十神（男=正财，女=正官） */
  primaryStar: ShiShen;
  /** 次配偶星十神（男=偏财，女=七杀） */
  secondaryStar: ShiShen;
  /** 主配偶星的显象级别 */
  primaryLevel: ManifestLevel;
  /** 次配偶星的显象级别 */
  secondaryLevel: ManifestLevel;
  /** 是否两星齐透（混杂局，传统视为"婚姻易反复" / 多角关系信号） */
  bothManifest: boolean;
  /** 是否官杀混杂 / 财星混杂（女命官杀齐透 / 男命正偏财齐透） */
  mixedMarriage: boolean;
  /** 配偶星五行 */
  starWuXing: WuXing;
  /** 配偶星是否被合（被合则配偶易被他人争夺 / 自己重感情） */
  starBeingHe: boolean;
  /** 配偶星是否被冲（被冲则关系动荡） */
  starBeingChong: boolean;
  /** 一句话画像（基于 level + bothManifest + mixed） */
  description: string;
}

/**
 * 配偶宫（日支）状态
 *
 * 命理学口径：
 * - 日支 = 配偶宫，藏干十神 = 配偶画像
 * - 日支被合 → 配偶易被他人争夺，或命主重感情
 * - 日支被冲 → 婚姻动荡 / 易分居
 * - 日支三刑 → 婚姻有官非纠纷 / 健康问题
 * - 日支自坐配偶星 → 配偶就在命主身边，关系紧密
 */
export interface SpousePalaceInfo {
  /** 日支 */
  dayZhi: DiZhi;
  /** 日支藏干本气十神 */
  benQiShiShen: ShiShen;
  /** 日支所有藏干十神 */
  allShiShen: ShiShen[];
  /** 日支是否自坐配偶星（藏干含主配偶星） */
  selfSeated: boolean;
  /** 日支被合关系列表（描述） */
  heRelations: string[];
  /** 日支被冲关系列表 */
  chongRelations: string[];
  /** 日支被刑关系列表 */
  xingRelations: string[];
  /** 日支被暗合关系列表 */
  anHeRelations: string[];
  /** 日支是否落空亡 */
  inXunKong: boolean;
  /** 一句话画像 */
  description: string;
}

/** 桃花/红艳/天喜 综合统计 */
export interface PeachBlossomInfo {
  /** 是否带桃花（子午卯酉之一在四支中，且按年/日支起例） */
  hasTaoHua: boolean;
  /** 桃花地支位置 */
  taoHuaPositions: PillarPosition[];
  /** 桃花类型：墙内桃花（年月）/ 墙外桃花（日时）/ 倒插桃花（特殊位） */
  taoHuaType: '墙内桃花' | '墙外桃花' | '倒插桃花' | 'none';
  /** 是否带红艳煞（多情风流之星） */
  hasHongYan: boolean;
  /** 红艳所在位置 */
  hongYanPositions: PillarPosition[];
  /** 是否带天喜（婚喜临门之星） */
  hasTianXi: boolean;
  /** 天喜所在位置 */
  tianXiPositions: PillarPosition[];
  /** 综合解读 */
  description: string;
}

/** 婚期事件类型 */
export type MarriageEventType =
  | '大运合日支'         // 强信号：配偶宫被合 → 婚期/恋情启动
  | '流年合日支'         // 中强：流年合配偶宫 → 当年婚动
  | '配偶星到位年'       // 强信号：流年干支为配偶星且通根
  | '桃花年'             // 中：流年带桃花
  | '红艳年'             // 中：流年带红艳
  | '天喜年'             // 中：流年带天喜
  | '反吟冲日支'         // 警示：婚变/分居/感情受挫
  | '伏吟日柱'           // 警示：旧情复发/感情停滞
  | '官杀混杂年'         // 警示（女）：感情纠葛
  | '财星争合年';        // 警示（男）：感情纠葛

/** 婚期信号（某一年的预测事件） */
export interface MarriageEvent {
  year: number;
  ganZhi: string;
  age: number;
  /** 所在大运 */
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: MarriageEventType;
  /** 信号强度 */
  strength: 'strong' | 'medium' | 'weak';
  /** 倾向：吉=应婚 / 凶=婚变 / 中=暧昧 */
  tendency: 'auspicious' | 'inauspicious' | 'neutral';
  /** 一句话解读 */
  description: string;
}

/** 婚姻风险点 */
export interface MarriageRisk {
  /** 风险类型 */
  type:
    | '配偶星空亡'
    | '配偶星被冲'
    | '官杀混杂'
    | '财星混杂'
    | '日支被冲'
    | '日支三刑'
    | '配偶星合而不化'
    | '配偶宫坐忌神'
    | '反吟冲日支'
    | '比劫旺夺夫/夺妻';
  /** 风险等级 */
  level: 'high' | 'medium' | 'low';
  /** 命理学依据 */
  evidence: string;
  /** 建议 */
  advice: string;
}

/** 婚姻细论汇总 */
export interface MarriageAnalysis {
  /** 性别（决定配偶星定义） */
  gender: Gender;
  /** 配偶星画像 */
  spouseStar: SpouseStarInfo;
  /** 配偶宫画像 */
  spousePalace: SpousePalaceInfo;
  /** 桃花红艳天喜 */
  peachBlossom: PeachBlossomInfo;
  /**
   * 婚姻质量综合评分（1-5）
   * 5 = 婚姻和美 / 4 = 总体良好 / 3 = 平稳但有波动 / 2 = 易有阻碍 / 1 = 婚姻多坎坷
   */
  qualityScore: 1 | 2 | 3 | 4 | 5;
  /** 评分等级标签 */
  qualityLabel: '上佳' | '良好' | '平稳' | '波折' | '坎坷';
  /** LLM 增强：对命主婚姻的多维影响 */
  impact?: ModuleImpact;
  /** LLM 增强：婚姻趋利避害可执行清单（含配偶筛选） */
  actions?: ModuleActions;
  /** 婚期事件时间表（按 year 升序） */
  events: MarriageEvent[];
  /** 风险点列表 */
  risks: MarriageRisk[];
  /** 一段话综合判词（300字以内，命理学家口吻） */
  summary: string;
  /** 优势点（3-5 条） */
  highlights: string[];
  /** 关键提醒（2-4 条） */
  reminders: string[];
}

/* ───────────────────────── M4 财富细论 类型 ───────────────────────── */

/** 财星画像 */
export interface WealthStarInfo {
  /** 主财星：正财（工资/正业/妻财） */
  primaryStar: ShiShen;
  /** 偏财星：偏财（横财/创业/投资/情人财） */
  secondaryStar: ShiShen;
  /** 主财显象 */
  primaryLevel: ManifestLevel;
  /** 偏财显象 */
  secondaryLevel: ManifestLevel;
  /** 财星五行 */
  starWuXing: WuXing;
  /** 是否财星齐透（多财源 / 财气混杂） */
  bothManifest: boolean;
  /** 财星是否被合（被合则财气易被分流 / 也可主"得财"） */
  starBeingHe: boolean;
  /** 财星是否被冲（被冲主破财动荡） */
  starBeingChong: boolean;
  /** 一句话画像 */
  description: string;
}

/** 财库信息（辰戌丑未中藏正/偏财者） */
export interface WealthVaultInfo {
  /** 是否带财库 */
  hasVault: boolean;
  /** 财库地支位置 */
  vaultZhi: DiZhi[];
  /** 财库藏的财星类型 */
  vaultShiShen: ShiShen[];
  /** 财库是否被冲开（库逢冲则财出） */
  vaultOpened: boolean;
  /** 一句话画像 */
  description: string;
}

/** 财源类型（命理学口径） */
export type WealthSource =
  | '食伤生财'    // 才华/技能变现，文创/咨询/教育/手艺
  | '官印化财'    // 权力/平台变现，体制内/管理层/品牌
  | '比劫破财'    // 危险信号：兄弟朋友夺财
  | '财来就我'    // 财星弱但日主旺，需主动求财
  | '身财两停'    // 最佳格局：财源稳定丰厚
  | '财多身弱';   // 富屋贫人，有财守不住

/** 财富事件类型 */
export type WealthEventType =
  | '正财年'         // 流年带正财通根 → 工资/正业增收
  | '偏财年'         // 流年带偏财通根 → 横财/投机机会
  | '财库开年'       // 流年冲开财库 → 财气大动
  | '比劫夺财年'     // 流年比肩劫财 → 防破财
  | '食伤生财年'     // 流年食神伤官 → 才华变现
  | '财星到位运'     // 大运为财星五行
  | '比劫强夺运';    // 大运强比劫 → 守财年

export interface WealthEvent {
  year: number;
  ganZhi: string;
  age: number;
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: WealthEventType;
  strength: 'strong' | 'medium' | 'weak';
  tendency: 'auspicious' | 'inauspicious' | 'neutral';
  description: string;
}

/** 财富风险点 */
export interface WealthRisk {
  type:
    | '财星空亡'
    | '财星被冲'
    | '比劫旺夺财'
    | '财多身弱'
    | '财库被冲（漏财）'
    | '财星合而不化'
    | '财星藏支不透（有财难显）';
  level: 'high' | 'medium' | 'low';
  evidence: string;
  advice: string;
}

/** 财富细论汇总 */
export interface WealthAnalysis {
  /** 财星画像 */
  wealthStar: WealthStarInfo;
  /** 财库画像 */
  wealthVault: WealthVaultInfo;
  /** 财源主类型（按优先级排序，最多 3 个） */
  sources: WealthSource[];
  /** 求财方位（用神五行的方位） */
  directions: Array<'东' | '南' | '西' | '北' | '中'>;
  /** 适合行业（基于财星五行 + 用神五行） */
  industries: string[];
  /** 财运评分（1-5） */
  qualityScore: 1 | 2 | 3 | 4 | 5;
  qualityLabel: '巨富' | '富足' | '小康' | '平稳' | '清贫';
  /** 财富事件时间表 */
  events: WealthEvent[];
  /** 风险点 */
  risks: WealthRisk[];
  /** 综合判词 */
  summary: string;
  /** 优势点 */
  highlights: string[];
  /** 关键提醒 */
  reminders: string[];
}

/* ───────────────────────── M5 事业细论 类型 ───────────────────────── */

/** 官星（事业贵人星）画像 */
export interface OfficialStarInfo {
  /** 正官：体制内/正派权威 */
  primaryStar: ShiShen;
  /** 七杀：实权/创业魄力/挑战 */
  secondaryStar: ShiShen;
  primaryLevel: ManifestLevel;
  secondaryLevel: ManifestLevel;
  /** 官杀混杂（事业易反复） */
  mixedOfficial: boolean;
  /** 印星护官（官印相生 = 升官稳定） */
  yinHuOfficial: boolean;
  description: string;
}

/** 事业宫（月柱）画像 */
export interface CareerPalaceInfo {
  /** 月柱干支 */
  monthGanZhi: string;
  /** 月柱天干十神 */
  monthGanShiShen: ShiShen;
  /** 月柱地支本气十神 */
  monthZhiBenQi: ShiShen;
  /** 月柱五行 */
  monthWuXing: WuXing;
  description: string;
}

/** 事业类型 */
export type CareerType =
  | '体制内（公务员/事业单位）'
  | '管理层（团队/项目）'
  | '专业技术（工程师/医生/律师）'
  | '文创/教育/咨询'
  | '商业/销售/创业'
  | '艺术/演艺'
  | '自由职业';

export type CareerEventType =
  | '正官到位年'
  | '七杀到位年'
  | '印星到位年'
  | '食神泄秀年'
  | '伤官见官年'
  | '比劫合伙年'
  | '事业宫被冲年';

export interface CareerEvent {
  year: number;
  ganZhi: string;
  age: number;
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: CareerEventType;
  strength: 'strong' | 'medium' | 'weak';
  tendency: 'auspicious' | 'inauspicious' | 'neutral';
  description: string;
}

export interface CareerRisk {
  type:
    | '官杀混杂'
    | '伤官见官'
    | '官星空亡'
    | '事业宫被冲'
    | '无印化官杀（压力无解）'
    | '比劫夺权';
  level: 'high' | 'medium' | 'low';
  evidence: string;
  advice: string;
}

/** 事业细论汇总 */
export interface CareerAnalysis {
  officialStar: OfficialStarInfo;
  careerPalace: CareerPalaceInfo;
  /** 推荐事业类型（按匹配度排序） */
  careerTypes: CareerType[];
  /** 推荐行业 */
  industries: string[];
  /** 创业 vs 打工建议 */
  entrepreneurVsEmployee: '强烈建议创业' | '适合创业' | '可创可打' | '适合打工' | '强烈建议打工';
  /** 老板气质 / 员工气质评分（1-5） */
  bossQuotient: 1 | 2 | 3 | 4 | 5;
  /** 事业评分 */
  qualityScore: 1 | 2 | 3 | 4 | 5;
  qualityLabel: '位极人臣' | '步步高升' | '稳健发展' | '平稳就业' | '事业坎坷';
  events: CareerEvent[];
  risks: CareerRisk[];
  summary: string;
  highlights: string[];
  reminders: string[];
  /** LLM 增强：事业多维影响 */
  impact?: ModuleImpact;
  /** LLM 增强：事业趋利避害可执行清单 */
  actions?: ModuleActions;
}

/* ───────────────────────── M6 健康细论 类型 ───────────────────────── */

/** 五行 → 脏腑映射 */
export interface OrganHealthInfo {
  wuxing: WuXing;
  /** 主脏（五脏） */
  organ: '肝' | '心' | '脾' | '肺' | '肾';
  /** 副腑（六腑） */
  bowel: '胆' | '小肠' | '胃' | '大肠' | '膀胱';
  /** 此五行在命中的强弱评分（基于 wuxingStats） */
  wuxingScore: number;
  /** 健康风险等级：low=平衡 / medium=偏失 / high=严重偏枯 */
  riskLevel: 'low' | 'medium' | 'high';
  /** 风险描述 */
  description: string;
}

export type HealthEventType =
  | '冲日支年（健康波动）'
  | '伏吟日柱年（旧疾复发）'
  | '反吟流年（手术/意外）'
  | '忌神大运（慢性消耗）'
  | '岁运并临年（凶吉倍增）';

export interface HealthEvent {
  year: number;
  ganZhi: string;
  age: number;
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: HealthEventType;
  strength: 'strong' | 'medium' | 'weak';
  description: string;
}

/** 体质类型 */
export type Constitution =
  | '阳旺火热型'
  | '阴盛寒凉型'
  | '木旺肝郁型'
  | '土旺脾湿型'
  | '金旺肺燥型'
  | '水旺肾寒型'
  | '五行均衡型';

/** 健康细论汇总 */
export interface HealthAnalysis {
  /** 各脏腑健康状态（5 个五行） */
  organs: OrganHealthInfo[];
  /** 体质类型 */
  constitution: Constitution;
  /** 易患疾病方向（基于偏枯五行） */
  diseaseRisks: string[];
  /** 调养方向 */
  recommendations: {
    /** 食疗：用神五行所属食物 */
    diet: string[];
    /** 运动建议 */
    exercise: string[];
    /** 起居/作息 */
    lifestyle: string[];
  };
  /** 健康事件时间表（危险年） */
  events: HealthEvent[];
  /** 健康评分（1-5） */
  qualityScore: 1 | 2 | 3 | 4 | 5;
  qualityLabel: '强健' | '良好' | '平稳' | '亚健康' | '需调养';
  summary: string;
  highlights: string[];
  reminders: string[];
  /** LLM 增强：健康多维影响 */
  impact?: ModuleImpact;
  /** LLM 增强：健康趋利避害可执行清单（饮食/运动/作息/关注年） */
  actions?: ModuleActions;
}

/* ───────────────────────── M8 学业细论 类型 ───────────────────────── */

export interface EducationStarInfo {
  /** 主印星：正印（学历/正派学问/导师） */
  primaryStar: ShiShen;
  /** 次印星：偏印（偏才/技艺/玄学/创意） */
  secondaryStar: ShiShen;
  primaryLevel: ManifestLevel;
  secondaryLevel: ManifestLevel;
  /** 印星五行 */
  starWuXing: WuXing;
  /** 食神配印（学问家组合） */
  shiShenPeiYin: boolean;
  /** 伤官佩印（偏才组合） */
  shangGuanPeiYin: boolean;
  /** 官印相生（升学有平台） */
  guanYinSheng: boolean;
  description: string;
}

export interface EducationShenSha {
  /** 是否带文昌贵人 */
  hasWenChang: boolean;
  /** 文昌贵人位置 */
  wenChangZhi: DiZhi[];
  /** 是否带学堂 */
  hasXueTang: boolean;
  xueTangZhi: DiZhi[];
  /** 是否带词馆 */
  hasCiGuan: boolean;
  ciGuanZhi: DiZhi[];
  description: string;
}

export type EducationEventType =
  | '正印到位年'      // 升学/拿学位/平台加持
  | '偏印到位年'      // 进修/转专业/获专项资质
  | '食神生印年'      // 学术成果/作品获奖
  | '伤官佩印年'      // 偏才显露/创意奖项
  | '官印相生年'      // 升学+平台双吉
  | '印星受冲年';    // 学业受阻/考试失利

export interface EducationEvent {
  year: number;
  ganZhi: string;
  age: number;
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: EducationEventType;
  strength: 'strong' | 'medium' | 'weak';
  tendency: 'auspicious' | 'inauspicious' | 'neutral';
  description: string;
}

export interface EducationAnalysis {
  educationStar: EducationStarInfo;
  shenSha: EducationShenSha;
  /** 学业类型 */
  scholarType:
    | '学问家（食神配印）'
    | '才艺学者（伤官佩印）'
    | '正统学历（正印有力）'
    | '偏才异学（偏印有力）'
    | '官学双修（官印相生）'
    | '苦读型（印弱需努力）'
    | '实用主义（印不显）';
  /** 推荐学习方向 */
  recommendedFields: string[];
  /** 学业评分 */
  qualityScore: 1 | 2 | 3 | 4 | 5;
  qualityLabel: '学富五车' | '学有所成' | '中规中矩' | '勉强达标' | '学业坎坷';
  events: EducationEvent[];
  summary: string;
  highlights: string[];
  reminders: string[];
  /** LLM 增强：学业多维影响 */
  impact?: ModuleImpact;
  /** LLM 增强：学业趋利避害可执行清单（教育路径/进修关键年） */
  actions?: ModuleActions;
}

/* ───────────────────────── M9 出行/搬迁 类型 ───────────────────────── */

export interface YiMaInfo {
  /** 是否原局带驿马 */
  hasYiMa: boolean;
  /** 命主驿马支（按年支/日支三合局对冲位） */
  yiMaZhi: DiZhi;
  /** 实际命中位置 */
  hitPositions: PillarPosition[];
  /** 驿马是否被冲（驿马逢冲则动得急） */
  yiMaBeingChong: boolean;
  /** 驿马是否被合（被合则不动） */
  yiMaBeingHe: boolean;
  description: string;
}

export type TravelEventType =
  | '驿马大运'         // 大运带驿马 → 10年内多动荡
  | '流年驿马'         // 流年驿马 → 当年出行
  | '驿马逢冲年'       // 驿马逢冲 → 必动且急
  | '驿马合住年'       // 驿马合住 → 想动不动
  | '日支被冲年';     // 日支冲 → 搬迁/换居

export interface TravelEvent {
  year: number;
  ganZhi: string;
  age: number;
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: TravelEventType;
  strength: 'strong' | 'medium' | 'weak';
  description: string;
}

export interface TravelAnalysis {
  yiMa: YiMaInfo;
  /** 出行类型偏好 */
  travelType: '常远行/海外有缘' | '商旅频繁' | '安土重迁' | '偶动';
  /** 是否有海外/远方缘分 */
  overseasAffinity: boolean;
  qualityScore: 1 | 2 | 3 | 4 | 5;
  qualityLabel: '动如脱兔' | '常出常入' | '动静相宜' | '安居乐业' | '不喜远行';
  events: TravelEvent[];
  summary: string;
  highlights: string[];
  reminders: string[];
  /** LLM 增强：出行/居住地选择多维影响 */
  impact?: ModuleImpact;
  /** LLM 增强：城市优选/出行避险可执行清单 */
  actions?: ModuleActions;
}

/* ───────────────────────── M10 官非/牢狱 类型 ───────────────────────── */

export interface LegalRiskFactor {
  /** 风险因子类型 */
  type:
    | '羊刃'
    | '劫煞'
    | '三刑齐全'
    | '伤官见官'
    | '官杀混杂'
    | '日支三刑'
    | '日柱反吟'
    | '魁罡逢冲';
  /** 命中位置 */
  positions: string[];
  /** 严重程度 */
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export type LegalRiskEventType =
  | '伤官见官年'       // 流年伤官冲命中正官
  | '羊刃逢冲年'       // 羊刃被冲
  | '三刑流年'         // 流年构成三刑齐
  | '官杀混杂年'       // 流年加重官杀混杂
  | '日柱反吟年';     // 日柱反吟

export interface LegalRiskEvent {
  year: number;
  ganZhi: string;
  age: number;
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  eventType: LegalRiskEventType;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface LegalRiskAnalysis {
  /** 原局风险因子（静态） */
  factors: LegalRiskFactor[];
  /** 综合风险等级 */
  overallRiskLevel: 'high' | 'medium' | 'low' | 'minimal';
  qualityScore: 1 | 2 | 3 | 4 | 5;
  /** 5=平安无虞 / 1=高危 */
  qualityLabel: '平安无虞' | '低风险' | '中等关注' | '高度警惕' | '官非缠身';
  /** 大运/流年级风险事件 */
  events: LegalRiskEvent[];
  summary: string;
  highlights: string[];
  reminders: string[];
  /** LLM 增强：风险性质判定 + 高发场景 */
  impact?: ModuleImpact;
  /** LLM 增强：终生避险可执行清单 */
  actions?: ModuleActions;
}

/* ───────────────────────── M11 流月/流日 类型 ───────────────────────── */

export interface LiuYueInfo {
  /** 流月干支 */
  ganZhi: string;
  /** 农历月份 */
  month: number;
  /** 月份起讫公历日期（粗略：节气分月） */
  startDate: string;
  endDate: string;
  /** 流月与日柱的关系标签 */
  relations: string[];
  /** 流月吉凶倾向 */
  tendency: 'auspicious' | 'inauspicious' | 'neutral';
  /** 重点提示（合冲刑害） */
  highlights: string[];
}

export interface MonthlyForecastAnalysis {
  /** 论命年份（默认当前年） */
  year: number;
  yearGanZhi: string;
  /** 论命年所在大运 */
  inDaYunIndex: number;
  inDaYunGanZhi: string;
  /** 12 个流月 */
  liuYues: LiuYueInfo[];
  summary: string;
  /** 当年最吉的 3 个月 */
  bestMonths: number[];
  /** 当年最忌的 3 个月 */
  worstMonths: number[];
  /** LLM 增强：当年节奏 */
  impact?: ModuleImpact;
  /** LLM 增强：12 个月每月动作清单 */
  actions?: ModuleActions;
}

/* ───────────────────────── M12 日级吉凶 类型 ───────────────────────── */

export interface DailyFortuneInfo {
  date: string; // YYYY-MM-DD
  ganZhi: string; // 日干支
  /** 日干支与命主的关系 */
  shiShenGan: ShiShen;
  shiShenZhi: ShiShen;
  /** 与日支关系 */
  zhiRelationToDayPalace: '合' | '冲' | '刑' | '害' | '同' | '无';
  /** 日级吉凶 */
  fortune: 'great-auspicious' | 'auspicious' | 'neutral' | 'inauspicious' | 'great-inauspicious';
  /** 宜 */
  suitable: string[];
  /** 忌 */
  avoid: string[];
}

export interface DailyCalendarAnalysis {
  year: number;
  month: number; // 公历月份
  days: DailyFortuneInfo[];
  /** 当月最吉的 3 天 */
  bestDays: string[];
  /** 当月最忌的 3 天 */
  worstDays: string[];
  summary: string;
}

/* ───────────────────────── M13 合婚类型 ───────────────────────── */

export interface CompatibilityScore {
  /** 维度名 */
  dimension: string;
  /** 该维度评分（0-10） */
  score: number;
  /** 满分 */
  maxScore: number;
  /** 详细判断 */
  detail: string;
}

export interface CompatibilityAnalysis {
  /** 男方简要信息 */
  manSummary: { ganZhi: string; dayMaster: string };
  womanSummary: { ganZhi: string; dayMaster: string };
  /** 各维度得分 */
  scores: CompatibilityScore[];
  /** 总分（0-100） */
  totalScore: number;
  /** 总评 */
  overallLabel: '天作之合' | '佳偶天成' | '良缘可结' | '需多磨合' | '不甚相宜';
  /** 缘分类型 */
  affinityType:
    | '互补型（用神补忌神）'
    | '同道型（同用神）'
    | '冲突型（互为忌神）'
    | '中和型（无明显冲合）';
  summary: string;
  highlights: string[];
  reminders: string[];
}

/* ───────────────────────── M14/M15 命书类型 ───────────────────────── */

export interface NarrativeBook {
  /** 标题 */
  title: string;
  /** 章节列表 */
  chapters: NarrativeChapter[];
  /** Markdown 全文 */
  markdown: string;
  /** 自然语言长文版 */
  narrative: string;
}

export interface NarrativeChapter {
  title: string;
  content: string;
  /** 子章节 */
  subChapters?: NarrativeChapter[];
}

/* ───────────────────────── M7 六亲细论 类型 ───────────────────────── */

/** 单个亲缘画像 */
export interface RelativeInfo {
  /** 亲缘角色 */
  role: '父亲' | '母亲' | '兄弟姐妹' | '配偶' | '子女';
  /** 对应十神 */
  shiShen: ShiShen;
  /** 显象级别 */
  level: ManifestLevel;
  /** 所在宫位 */
  palace: '年柱' | '月柱' | '日支' | '时柱';
  /** 亲缘厚薄评分（1-5：5=极亲、1=极疏） */
  closenessScore: 1 | 2 | 3 | 4 | 5;
  /** 厚薄标签 */
  closenessLabel: '极亲' | '亲密' | '一般' | '疏远' | '极疏/早离';
  /** 一句话画像 */
  description: string;
}

/** 六亲细论汇总 */
export interface RelativesAnalysis {
  gender: Gender;
  /** 父亲 */
  father: RelativeInfo;
  /** 母亲 */
  mother: RelativeInfo;
  /** 兄弟姐妹 */
  siblings: RelativeInfo;
  /** 子女 */
  children: RelativeInfo;
  /** 综合评分 */
  qualityScore: 1 | 2 | 3 | 4 | 5;
  qualityLabel: '六亲俱全' | '亲缘和睦' | '亲缘一般' | '亲缘较疏' | '六亲缘薄';
  summary: string;
  highlights: string[];
  reminders: string[];
  /** LLM 增强：各亲缘关系真相 */
  impact?: ModuleImpact;
  /** LLM 增强：与各亲缘相处策略 */
  actions?: ModuleActions;
}

/* ──────────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
/* P9 命理动力学引擎 类型定义（DynamicsAnalysis）                          */
/* ═══════════════════════════════════════════════════════════════════ */
//
// 设计目标：从"分维度独立分析"升级到"原局动力图分析"
// 核心理念：先看每个因子单独的强弱（旧），再看因子之间如何联动夺力 / 救助 / 流转（新）
//
// 10 个维度（D1-D7 核心 + D8-D10 用户补充）：
//   D1 用神/忌神 × 位置  → 一生哪段时期最受影响 + 身体哪个部位
//   D2 十神组合          → 性格 & 命运的连锁反应
//   D3 关键合化冲刑      → 哪些天生力量被夺走 / 激活
//   D4 五行流通链        → 一生顺逆的根源
//   D5 强弱 vs 喜忌反差   → 命主一生在跟什么"对抗"
//   D6 虚透 vs 通根      → 哪些能力是"看起来有其实没有"
//   D7 位置 + 身体部位    → 健康风险定位
//   D8 纳音深度          → 六十甲子纳音两两关系
//   D9 神煞联动          → 多个神煞叠加效应
//   D10 节气深度          → 出生节气距离 + 月令深浅
// ============================================================

/** 柱位标识 */
export type PillarPos = '年柱' | '月柱' | '日柱' | '时柱';

/** 影响时期 */
export type LifeStage =
  | '少年（1-16）'
  | '青年（17-32）'
  | '壮年（33-48）'
  | '老年（49+）';

/** 身体部位（位置 → 部位映射） */
export type BodyPart =
  | '头颈/脑神经'
  | '胸腹/呼吸消化'
  | '腰腹/泌尿生殖'
  | '四肢/末梢循环';

/** 影响极性 */
export type ImpactPolarity = 'positive' | 'negative' | 'neutral';

// ─────────── D1 用神/忌神 × 位置 ───────────

/** 单个用/忌神的位置画像 */
export interface YongJiPosition {
  /** 五行 */
  wuxing: WuXing;
  /** 角色 */
  role: '主用神' | '次用神/喜神' | '忌神' | '仇神';
  /** 透干位置（多个） */
  ganPositions: PillarPos[];
  /** 藏支位置（多个） */
  zhiPositions: PillarPos[];
  /** 是否完全藏（无任何透干） */
  isFullyHidden: boolean;
  /** 是否被合化/被冲克 */
  isAttacked: boolean;
  /** 攻击说明（如"日支戌中辛金被戌卯六合化火夺走"） */
  attackDescription?: string;
  /** 主要影响时期（基于位置） */
  primaryLifeStage: LifeStage;
  /** 一句话影响判语 */
  judgment: string;
}

export interface D1_YongJiByPosition {
  /** 主用神位置画像 */
  primaryYong: YongJiPosition[];
  /** 次用神/喜神位置画像 */
  secondaryYong: YongJiPosition[];
  /** 忌神位置画像 */
  ji: YongJiPosition[];
  /** 综合判语：用神 vs 忌神在原局的"势力对比" */
  summary: string;
  /** 关键发现（如"用神火土皆藏 + 忌神水金透干 → 命主一生在'想做的没人支持'中拉扯"） */
  keyInsights: string[];
}

// ─────────── D2 十神组合 ───────────

/** 十神组合类型 */
export type ShiShenComboType =
  | '官杀混杂'
  | '伤官见官'
  | '食伤泄秀'
  | '比劫夺财'
  | '印重身轻'
  | '财多身弱'
  | '杀印相生'
  | '伤官佩印'
  | '食神制杀'
  | '财官双美'
  | '七杀虚透'
  | '正官孤立';

export interface ShiShenCombo {
  type: ShiShenComboType;
  /** 命中位置（哪些柱出现） */
  positions: string[];
  /** 强度：strong=明显成立 / medium=有迹象 / weak=轻微 */
  strength: 'strong' | 'medium' | 'weak';
  /** 极性 */
  polarity: ImpactPolarity;
  /** 命理学含义（What） */
  meaning: string;
  /** 性格连锁反应（So What） */
  personalityChain: string;
  /** 命运连锁反应（So What） */
  destinyChain: string;
}

export interface D2_ShiShenCombos {
  combos: ShiShenCombo[];
  /** 综合判语：本盘最关键的 1-2 个十神组合 */
  summary: string;
  keyInsights: string[];
}

// ─────────── D3 关键合化冲刑 ───────────

export type TransformType =
  | '天干合化'
  | '天干合而不化'
  | '地支三合'
  | '地支三会'
  | '地支半三合'
  | '地支六合'
  | '地支六冲'
  | '地支三刑'
  | '地支相害';

export interface KeyTransform {
  type: TransformType;
  /** 涉及的干支 */
  participants: string[];
  /** 涉及的位置 */
  positions: PillarPos[];
  /** 化出/夺出的五行（如"戊癸合化火" → 火） */
  resultWuXing?: WuXing;
  /** 哪些原局力量被影响（"七杀戊土" / "正印辛金"） */
  affectedRoles: string[];
  /** 影响性质 */
  effect: '夺走' | '激活' | '增强' | '削弱' | '中性';
  /** 命理学含义 */
  meaning: string;
  /** 对命主的具体影响（So What） */
  impact: string;
}

export interface D3_KeyTransforms {
  transforms: KeyTransform[];
  /** 哪些"原配置"被改变（核心） */
  alteredConfigurations: string[];
  summary: string;
  keyInsights: string[];
}

// ─────────── D4 五行流通链 ───────────

export interface FlowLink {
  /** 起始五行 */
  from: WuXing;
  /** 终点五行 */
  to: WuXing;
  /** 关系：生 / 克 */
  relation: '生' | '克';
  /** 是否流通顺畅（from 有足够能量 + to 能承接） */
  isFlowing: boolean;
  /** 阻塞原因（如果 isFlowing=false） */
  blockReason?: string;
}

export interface D4_FlowChain {
  /** 完整链条（金生水生木生火生土生金 五段） */
  links: FlowLink[];
  /** 流通最顺畅的环节 */
  bestSegments: string[];
  /** 流通最阻塞的环节（核心：一生顺逆的根源） */
  worstSegments: string[];
  /** 流通模式 */
  pattern:
    | '全流通（罕见上格）'
    | '主线流通+1环阻塞'
    | '主线流通+2环阻塞'
    | '主线断流（半残）'
    | '完全堵死（孤立局）';
  summary: string;
  keyInsights: string[];
}

// ─────────── D5 强弱 vs 喜忌反差 ───────────

export interface XiJiContrastItem {
  /** 反差类型 */
  type:
    | '忌神过旺'
    | '用神受伤'
    | '调候缺位'
    | '日主与喜忌方向相反'
    | '用神被合走'
    | '喜神被克';
  /** 命理证据 */
  evidence: string;
  /** 严重程度 */
  severity: 'high' | 'medium' | 'low';
  /** 命主一生在跟什么"对抗" */
  lifelongStruggle: string;
}

export interface D5_XiJiContrast {
  items: XiJiContrastItem[];
  /** 一句话总结：命主一生最大的"对抗" */
  primaryStruggle: string;
  summary: string;
  keyInsights: string[];
}

// ─────────── D6 虚透 vs 通根 ───────────

export interface XuTouItem {
  /** 透出的天干 */
  gan: TianGan;
  /** 所在柱 */
  position: PillarPos;
  /** 十神 */
  shiShen: ShiShen;
  /** 是否通根（地支藏干含本气/中气/余气） */
  hasRoot: boolean;
  /** 通根的位置（如["月支亥本气"]） */
  rootPositions?: string[];
  /** 通根强度
   * - 通强根：地支藏本气根 ≥ 1 处，力量满，名实相符
   * - 通中根：地支藏中气根 ≥ 1 处但无本气根
   * - 通弱根（多重余气）：仅藏余气根 ≥ 2 处 — 多处余气拼起来可顶半个中根（《子平真诠·配气候得失》）
   * - 通弱根：仅藏余气根 1 处 — 名不副实
   * - 完全无根（虚透）：地支无任何同五行藏干 */
  rootStrength: '通强根' | '通中根' | '通弱根（多重余气）' | '通弱根' | '完全无根（虚透）';
  /** 实质判定：能力是"真有"还是"虚有" */
  reality: '名实相符' | '虚有其表' | '实力远超表象';
  /** 影响 */
  impact: string;
}

export interface D6_XuTouVsRoot {
  items: XuTouItem[];
  /** 哪些能力"看起来有其实没有" */
  illusoryAbilities: string[];
  /** 哪些能力"看起来弱其实强" */
  hiddenStrengths: string[];
  summary: string;
  keyInsights: string[];
}

// ─────────── D7 位置 + 身体部位映射 ───────────

export interface PositionBodyMapping {
  position: PillarPos;
  /** 该柱主要身体部位 */
  bodyPart: BodyPart;
  /** 该柱五行 */
  wuxing: WuXing;
  /** 该柱当前是用神/忌神/中性 */
  yongJiNature: '用神助身' | '忌神耗身' | '中性';
  /** 健康风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
  /** 风险描述 */
  riskDescription: string;
  /** 影响时期 */
  lifeStage: LifeStage;
}

export interface D7_PositionMeaning {
  mappings: PositionBodyMapping[];
  /** 一生健康风险时间轴 */
  healthTimeline: Array<{ stage: LifeStage; mainRisk: string; bodyPart: BodyPart }>;
  summary: string;
  keyInsights: string[];
}

// ─────────── D7+ 位置力学 PositionForce ───────────
//
// 设计目的：把"四柱八字"翻译成可计算的力学模型。同样一个"癸水"出现在年干和时干，
// 对命主的影响差 2-3 倍。本结构按 5 维量化每个字（含主要藏干）的净影响力，
// 输出后可直接驱动报告中的"位置力学全景图"章节。
//
// 影响力公式：
//   netForce = baseScore × distanceCoef × triggerCoef × interactionCoef × yongJiSign
// 各维度系数详见下方枚举注释。

/** 八字宫位含义（按命理学六亲/时间轴）*/
export type GongWei =
  | '祖宗宫'      // 年干
  | '父母宫'      // 月柱（特别是月支）
  | '兄弟姐妹宫'  // 月支（部分流派）
  | '本命主'      // 日干
  | '夫妻宫'      // 日支
  | '子女宫'      // 时柱
  | '事业宫'      // 时干（部分流派）
  | '晚景宫';     // 时支

/** 字在原局中的位置类型 */
export type CharSlot =
  | '天干'
  | '地支本气'
  | '地支中气'
  | '地支余气';

/** 贴日主距离（《滴天髓·形象》：远不及近）
 *
 * 取值与已有 `Distance` 类型保持一致，复用同一组语义：
 * - adjacent: 紧贴日柱（与日柱同柱或左右相邻：日柱本身、月柱、时柱）→ 系数 1.0
 * - one-apart: 隔一柱（年柱 → 日柱中间隔月柱；时柱 → 年柱中间隔日柱）→ 系数 0.6
 * - far-apart: 隔两柱及以上（年柱 ↔ 时柱）→ 系数 0.3
 *
 * 备注：本字段衡量"该字与日干（坐标原点）的跨柱距离"，按四柱索引差判定：
 *   |i − 2| = 0 → adjacent；= 1 → adjacent；= 2 → one-apart；= 3 → far-apart
 *   （月、时与日柱相邻按紧贴；年柱距日柱跨 2 柱按 one-apart）
 */
export type DistanceLevel = 'adjacent' | 'one-apart' | 'far-apart';

/** 触发模式（《子平真诠·配气候》）
 * - always-active: 透干常态发力 → 系数 1.0
 * - dormant-benqi: 藏支本气，半显，常态参与但需同根透才满力 → 系数 0.7
 * - dormant-zhongqi: 藏中气，潜伏，等大运/流年透出引动 → 系数 0.4
 * - dormant-yuqi: 藏余气，种子状态，多需双重触发（合化/透出）→ 系数 0.2
 */
export type TriggerMode =
  | 'always-active'
  | 'dormant-benqi'
  | 'dormant-zhongqi'
  | 'dormant-yuqi';

/** 互动关系修正（《滴天髓·化象》）
 * - independent: 独立 → 系数 1.0
 * - light-combine: 弱合（虚拱、半合不化）→ 1.1
 * - strong-combine: 强合（紧贴成合但未化）→ 1.3
 * - transformed: 化神成立（被合化易主）→ 0.0（按化出五行重算）
 * - clashed: 被冲克（远冲减半，紧冲归零）→ 0.5
 * - punished: 被刑害 → 0.7
 */
export type InteractionType =
  | 'independent'
  | 'light-combine'
  | 'strong-combine'
  | 'transformed'
  | 'clashed'
  | 'punished';

/** 单个字（天干 / 地支藏干）的位置力学画像 */
export interface PositionForce {
  /** 显示用：字本身（如"癸"、"戌（戊）"） */
  charLabel: string;
  /** 字的实际五行（取该字本身五行；若 transformed 则保持原五行，化出五行另算） */
  wuxing: WuXing;
  /** 字的十神角色（vs 日主） */
  shiShen: ShiShen;
  /** 所在柱位 */
  pillar: PillarPos;
  /** 该位置的宫位含义（年/月/日/时各对应不同宫位） */
  gongWei: GongWei;
  /** 字所在槽位类型 */
  slot: CharSlot;
  /** 距离日主等级 */
  distance: DistanceLevel;
  /** 距离系数（adjacent=1.0 / one-apart=0.6 / far-apart=0.3） */
  distanceCoef: number;
  /** 触发模式 */
  triggerMode: TriggerMode;
  /** 触发系数（1.0 / 0.7 / 0.4 / 0.2） */
  triggerCoef: number;
  /** 与原局其他字的互动关系 */
  interaction: InteractionType;
  /** 互动系数（见 InteractionType 注释） */
  interactionCoef: number;
  /** 互动详情说明（如"日支戌+时支卯六合化火，戊土用神被夺归零"） */
  interactionDetail?: string;
  /** 用忌神角色（基于该字五行 vs yongShen） */
  yongJiRole: '主用神' | '次用神/喜神' | '忌神' | '仇神' | '中性';
  /** 用忌神符号：用神=+1 / 忌神=-1 / 中性=0；最终 netForce 乘此符号 */
  yongJiSign: 1 | -1 | 0;
  /** 基础分（不考虑系数与喜忌时的"原始重量"，月令字双倍权重）
   * - 透干 = 6 / 本气 = 5（月令 = 10）/ 中气 = 3 / 余气 = 2
   */
  baseScore: number;
  /** 净影响力 = baseScore × distanceCoef × triggerCoef × interactionCoef × yongJiSign
   * 范围约 −10 ~ +10，正分 = 助命主，负分 = 耗命主
   */
  netForce: number;
  /** 主要影响时期 */
  primaryLifeStage: LifeStage;
  /** 一句话判语（用于报告） */
  judgment: string;
  /** 标签：用于报告排序（🔴致命 / 🟠重要 / 🟡次要 / 🟢正向 / ⚪中性） */
  badge: '🔴' | '🟠' | '🟡' | '🟢' | '⚪';
}

/** 位置力学全景输出（蔡命场景下应有 8 字 + 主要藏干，共 10-12 项） */
export interface PositionForceMatrix {
  /** 所有字的位置力学画像（按 |netForce| 降序） */
  items: PositionForce[];
  /** 忌神侧总分（所有 yongJiSign=-1 的 netForce 求和） */
  jiTotalForce: number;
  /** 用神侧总分（所有 yongJiSign=+1 的 netForce 求和） */
  yongTotalForce: number;
  /** 用神被合化/被冲走的"潜在损失"（如戌中戊本应+6.3 → 实际0.0） */
  lostYongForce: number;
  /** 全局净力 = yongTotalForce + jiTotalForce − lostYongForce
   * 负值越大 → 命主越需调候/制忌 */
  globalNetForce: number;
  /** 全场最毒位（|netForce| 最大且为负的那个字） */
  worstChar: PositionForce | null;
  /** 全场最强助力（netForce 最大且为正） */
  bestChar: PositionForce | null;
  /** 关键发现（5 条以内，对应报告 §1.5.3 真相 1-5） */
  keyInsights: string[];
  /** 一段话总论（用于报告 §1.5 引言或卡片摘要） */
  summary: string;
}

// ─────────── D8 纳音深度 ───────────

export interface NaYinAnalysis {
  position: PillarPos;
  naYin: string;
  /** 纳音五行 */
  naYinWuXing: WuXing;
  /** 与日柱纳音的关系 */
  relationToDay: '相同' | '相生' | '相克' | '泄气' | '中性';
}

export interface D8_NaYinDepth {
  pillars: NaYinAnalysis[];
  /** 纳音组合判语（如"砂中金 + 大溪水 → 金水相生但水大金沉"） */
  combinationMeaning: string;
  /** 关键发现 */
  keyInsights: string[];
  summary: string;
}

// ─────────── D9 神煞联动 ───────────

export interface ShenShaChain {
  /** 联动的神煞名称 */
  shenShaNames: string[];
  /** 联动类型 */
  type: '相互增强' | '相互抵消' | '叠加致凶' | '叠加致吉';
  /** 联动效应 */
  combinedEffect: string;
}

export interface D9_ShenShaInteraction {
  /** 神煞联动链 */
  chains: ShenShaChain[];
  /** 关键发现 */
  keyInsights: string[];
  summary: string;
}

// ─────────── D10 节气深度 ───────────

export interface D10_JieQiDepth {
  /** 出生时所在节气 */
  jieQiName: string;
  /** 距离节气交接的天数（正=节气后第N天，负=节气前N天） */
  daysFromJieQi: number;
  /** 月令深浅判定 */
  monthLingDepth: '初气（节气头）' | '中气（节气中）' | '末气（节气尾）';
  /** 月令本气强度 */
  benQiStrength: 'strong' | 'medium' | 'weak';
  /** 调候判定 */
  tiaoHouNeed: string;
  /** 关键发现 */
  keyInsights: string[];
  summary: string;
}

// ─────────── D11 大运联动 ───────────

/**
 * 单步大运对原局结构的动态影响
 *
 * 命理学原理：大运是"10 年背景五行"，会与原局发生：
 *   1. 用忌神角色：直接决定这 10 年整体吉凶（用神运 = 顺，忌神运 = 逆）
 *   2. 透出原局藏神：用神原本藏地支不显，大运透出 → 用神"激活"
 *   3. 加剧原局忌神：忌神原本透干已猛，大运再加 → 忌神"叠加爆发"
 *   4. 解除/加固原局合化：大运地支冲走原局合方 → 合解开（用神复活）
 *   5. 引动原局十神组合：大运为印星 → 杀印相生通道激活
 */
export interface DaYunDynamics {
  /** 第几步（1-8） */
  index: number;
  /** 干支（如"丁酉"） */
  ganZhi: string;
  /** 起运年龄 */
  startAge: number;
  /** 起讫年份 */
  yearRange: [number, number];
  /** 大运十神（取自大运天干 vs 日主） */
  shiShen: ShiShen;
  /** 大运五行角色：用神 / 喜神 / 闲神 / 仇神 / 忌神 */
  wuxingRole: '用神' | '喜神' | '闲神' | '仇神' | '忌神';
  /** 整体吉凶分（5=黄金运，1=最凶运） */
  score: 1 | 2 | 3 | 4 | 5;
  /** 这一运对原局产生的关键触发事件（按重要性排序） */
  triggers: DaYunTrigger[];
  /** 一句话总结此运的"动力学含义" */
  headline: string;
}

/**
 * 大运对原局的单个触发事件
 */
export interface DaYunTrigger {
  /** 触发类型 */
  kind:
    | '透出用神'      // 大运天干 = 原局藏支用神 → 用神激活
    | '加剧忌神'      // 大运五行 = 原局忌神主属性 → 忌神叠加
    | '冲解原局合'    // 大运地支冲走原局合方一员 → 解合
    | '加固原局合'    // 大运地支与原局形成新合 → 合更实
    | '直冲日主'      // 大运天干/地支 直接冲克日主
    | '激活十神组合'  // 大运为印星 → 杀印相生通道激活
    | '调候补救'      // 大运五行正好补调候缺位
    | '伏吟反吟';     // 大运地支 = 原局某地支 / 与日支相冲
  /** 受影响的原局柱位 */
  withPos?: PillarPos;
  /** 影响的强度：高 / 中 / 低 */
  intensity: 'high' | 'medium' | 'low';
  /** 一句话描述（含命理事实 + 对命主的影响） */
  description: string;
}

export interface D11_DaYunDynamics {
  /** 起运信息（描述性） */
  startAgeInfo: string;
  /** 大运排列方向 */
  direction: '顺行' | '逆行';
  /** 8 步大运的动力学分析 */
  daYuns: DaYunDynamics[];
  /** 黄金大运段（score >= 4，按时序排列） */
  goldenWindows: Array<{ index: number; ganZhi: string; ageRange: [number, number]; reason: string }>;
  /** 凶险大运段（score <= 2） */
  riskyWindows: Array<{ index: number; ganZhi: string; ageRange: [number, number]; reason: string }>;
  /** 关键转折点（用神被合走解开 / 用神首次透出 / 忌神彻底清空 等） */
  turningPoints: Array<{ index: number; ganZhi: string; age: number; description: string }>;
  /** 关键发现（topN，用于动力学总论） */
  keyInsights: string[];
  summary: string;
}

// ─────────── 动力学引擎总输出 ───────────

export interface DynamicsAnalysis {
  /** D1 用神/忌神 × 位置 */
  yongJiByPosition: D1_YongJiByPosition;
  /** D2 十神组合 */
  shiShenCombos: D2_ShiShenCombos;
  /** D3 关键合化冲刑 */
  keyTransforms: D3_KeyTransforms;
  /** D4 五行流通链 */
  flowChain: D4_FlowChain;
  /** D5 强弱 vs 喜忌反差 */
  xiJiContrast: D5_XiJiContrast;
  /** D6 虚透 vs 通根 */
  xuTouVsRoot: D6_XuTouVsRoot;
  /** D7 位置 + 身体部位 */
  positionMeaning: D7_PositionMeaning;
  /** D7+ 位置力学全景矩阵（八字 + 主要藏干逐字净影响力打分） */
  positionForce: PositionForceMatrix;
  /** D8 纳音深度 */
  naYinDepth: D8_NaYinDepth;
  /** D9 神煞联动 */
  shenShaInteraction: D9_ShenShaInteraction;
  /** D10 节气深度 */
  jieQiDepth: D10_JieQiDepth;
  /** D11 大运联动 */
  daYunDynamics: D11_DaYunDynamics;
  /**
   * 动力学总论：一段话讲清"这盘的核心动力"
   * 例如："本盘以水为骨（53%专旺壬水），以火土为情（用神调候），但用神火土皆藏地支不透，
   *       忌神水金反而透干主事——一生在'想做的没人支持，被环境逼着做不喜欢的'拉扯中，
   *       直到 40 岁后己未运用神透出，才能真正活成自己。"
   */
  summary: string;
  /** 全维度合并的关键发现（用于 keyFindings 升级） */
  topInsights: string[];
}

/* ═══════════════════════════════════════════════════════════════════ */

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
  /** P3.4 主导因子（Top 3 红 + Top 3 绿 + 命运主线） */
  commandFactors: CommandFactors;
  /** 命格特征（6 维交叉画像） */
  persona: Persona;
  /** 干支动态关系（合化/三合/六合/六冲/三刑 + 外显实质标注） */
  relations: ChartRelations;
  /** M2.8 新增：人生时间轴（80 年 8 段大运 + 关键流年标注） */
  lifeTimeline: LifeTimeline;
  /** M3 新增：婚姻细论（配偶星/配偶宫/桃花/婚期/质量/风险） */
  marriage: MarriageAnalysis;
  /** M4 新增：财富细论（财星/财库/财源/方位/行业/财运/风险） */
  wealth: WealthAnalysis;
  /** M5 新增：事业细论（官星/事业宫/创业打工/行业/升迁/风险） */
  career: CareerAnalysis;
  /** M6 新增：健康细论（脏腑/体质/疾病风险/调养/危险年） */
  health: HealthAnalysis;
  /** M7 新增：六亲细论（父母/兄弟/子女三宫位 + 亲缘厚薄） */
  relatives: RelativesAnalysis;
  /** M8 学业细论 */
  education: EducationAnalysis;
  /** M9 出行/搬迁 */
  travel: TravelAnalysis;
  /** M10 官非/牢狱 */
  legalRisk: LegalRiskAnalysis;
  /** M11 流月预测（默认当前年） */
  monthlyForecast: MonthlyForecastAnalysis;
  /** M12 日级吉凶日历（默认当前月） */
  dailyCalendar: DailyCalendarAnalysis;
  /** M14/M15 命书 */
  narrativeBook: NarrativeBook;
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
