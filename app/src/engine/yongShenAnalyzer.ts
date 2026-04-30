// M2.3 用神选取引擎
//
// ⚠️ 算法严格遵循《命理分析方法论》§3.2 三种取用神方法：
//
//   3.2.1 扶抑取用法（最基本）：
//     - 日主旺/偏旺/中和偏旺 → 抑（食伤泄秀 / 财耗 / 官杀克身）
//     - 日主弱/偏弱/中和偏弱 → 扶（印生 / 比劫助）
//     - 优先级：旺者优先食伤泄（温和），次取财耗，最后官杀克（最烈）
//                弱者优先印生（兼护身），次取比劫助
//
//   3.2.2 调候取用法（优先级高于扶抑）：
//     冬月（亥子丑）寒、夏月（巳午未）热，需调候：
//     | 日主 | 月份 | 调候用神 | 原因 |
//     | 甲乙木 | 冬 | 丙火 | 寒木需暖 |
//     | 甲乙木 | 夏 | 癸水 | 暑木需润 |
//     | 丙丁火 | 冬 | 甲木 | 寒火需木生 |
//     | 庚辛金 | 夏 | 壬癸水 | 热金需淬 |
//     | 壬癸水 | 夏 | 庚辛金 | 热水需金生 |
//     | 壬癸水 | 冬 | 丙火 | 寒水需暖（蔡蔡命中此条 ⭐）|
//
//   3.2.3 通关取用法：
//     当两种五行严重对峙（各占总气 ≥30% 或差值 ≤5%）时取通关五行：
//       金木交战 → 取水通关；木土交战 → 取火通关；
//       土水交战 → 取金通关；水火交战 → 取木通关；
//       火金交战 → 取土通关。
//
//   多法同断：当 ≥2 法的结果集合存在交集时，标注 convergence。
//     主用神 (primary) 取所有法结果的交集（若有）或调候法结果（优先级最高）；
//     次用神 (secondary) 取扶抑/通关法的非交集部分；
//     忌神 (ji) 取与主用神相克或同方向旺势的五行。
//
// 验证基线（蔡蔡 1993-12-07 06:00 男，命局：癸酉·癸亥·壬戌·癸卯，水极旺，亥月）：
//   扶抑：水旺 → 抑 → 取木（食伤）+ 火（财）→ {木,火}
//   调候：壬水生冬月（亥）→ 取丙火（暖局）→ {火}
//   通关：金水成势（金生水），需木火转化 → {木,火}
//   三法皆含「火」，扶抑+通关皆含「木」 → 多法同断
//   主用神 = 木+火（三法共认），忌神 = 金+水（生扶旺势者）
//   主导方法 = 调候（优先级最高，蔡蔡水寒必用火）
//   ✅ 与 mock primary=['木','火'] secondary=['土'] ji=['金','水'] method='调候' 一致

import type {
  Convergence,
  Pillar,
  ShiShen,
  TianGan,
  WangShuai,
  WuXing,
  WuXingStat,
  YongShen,
} from '../types/bazi';
import { rulesLoader } from './rulesLoader';

// ===== 常量表 =====

const TIAN_GAN_TO_WUXING: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

/** 天干 → 五行 辅助函数 */
function ganWx(gan: TianGan): WuXing {
  return TIAN_GAN_TO_WUXING[gan];
}

/** 五行生克：sheng=我生（食伤）；ke=我克（财） */
const SHENG_KE: Record<WuXing, { sheng: WuXing; ke: WuXing; shengMe: WuXing; keMe: WuXing }> = {
  木: { sheng: '火', ke: '土', shengMe: '水', keMe: '金' },
  火: { sheng: '土', ke: '金', shengMe: '木', keMe: '水' },
  土: { sheng: '金', ke: '水', shengMe: '火', keMe: '木' },
  金: { sheng: '水', ke: '木', shengMe: '土', keMe: '火' },
  水: { sheng: '木', ke: '火', shengMe: '金', keMe: '土' },
};

/** 地支 → 季节（用于调候法） - 从配置加载 */
function getZhiToSeason(): Record<string, '春' | '夏' | '秋' | '冬'> {
  const rules = rulesLoader.getYongShenRules();
  return rules.rules.zhiToSeason.mapping;
}

/**
 * 调候用神表（命理分析方法论 §3.2.2）- 从配置加载
 */
function getTiaoHouTable(): Record<WuXing, Record<'春' | '夏' | '秋' | '冬', { use: WuXing[]; reason: string }>> {
  const rules = rulesLoader.getYongShenRules();
  return rules.rules.tiaoHouTable.mapping;
}

/**
 * 五行相生相克关系 - 从配置加载
 */
function getShengKe(): Record<WuXing, { sheng: WuXing; ke: WuXing; keMe: WuXing; shengMe: WuXing }> {
  const rules = rulesLoader.getYongShenRules();
  return rules.rules.shengKe.mapping;
}

/** 数组求交集（保序） */
function intersect<T>(a: readonly T[], b: readonly T[]): T[] {
  return a.filter(x => b.includes(x));
}

/** 数组合并去重（保序） */
function unionUnique<T>(...lists: ReadonlyArray<readonly T[]>): T[] {
  const out: T[] = [];
  for (const list of lists) {
    for (const x of list) {
      if (!out.includes(x)) out.push(x);
    }
  }
  return out;
}

// ===== 旺衰档位归类 =====

type WangShuaiTier = '旺' | '弱' | '中和';

/** 把 wangShuai.conclusion 归到 3 档（用于扶抑判定） */
function classifyTier(conclusion: string): WangShuaiTier {
  if (conclusion.includes('极旺') || conclusion.includes('偏旺') || conclusion.includes('中和偏旺')) {
    return '旺';
  }
  if (conclusion.includes('极弱') || conclusion.includes('偏弱') || conclusion.includes('中和偏弱')) {
    return '弱';
  }
  return '中和';
}

// ===== 三种取用法 =====

interface MethodResult {
  method: '扶抑' | '调候' | '通关';
  use: WuXing[];           // 此法推出的用神（可空）
  reason: string;          // 推断理由
  applies: boolean;        // 此法是否适用（不适用则 use=[]）
}

/**
 * 扶抑法：根据日主旺衰决定扶或抑
 * - 旺：取「食伤(我生) + 财(我克)」为用，官杀次之（次用神）
 * - 弱：取「印(生我) + 比劫(同我)」为用
 * - 中和：不适用（returns applies=false）
 */
function methodFuYi(dayWx: WuXing, tier: WangShuaiTier): MethodResult {
  const rules = rulesLoader.getYongShenRules();
  const shengKe = getShengKe();
  const sk = shengKe[dayWx];
  const fuYiRules = rules.rules.fuYiRules;
  
  if (tier === '旺') {
    const prosperous = fuYiRules.prosperous;
    const reasonTemplate = prosperous.reasonTemplate;
    const food = sk.sheng;    // 食伤 = 我生
    const wealth = sk.ke;     // 财 = 我克
    const officer = sk.keMe;  // 官杀 = 克我
    
    return {
      method: '扶抑',
      use: [food, wealth, officer],  // 旺时取食伤→财→官杀抑之
      reason: reasonTemplate
        .replace('{wuxing}', dayWx)
        .replace('{food}', food)
        .replace('{wealth}', wealth)
        .replace('{officer}', officer),
      applies: true,
    };
  }
  if (tier === '弱') {
    const weak = fuYiRules.weak;
    const reasonTemplate = weak.reasonTemplate;
    const seal = sk.shengMe;  // 印 = 生我
    const same = dayWx;       // 比劫 = 同我
    
    return {
      method: '扶抑',
      use: [seal, same],  // 弱时取印+比劫扶之
      reason: reasonTemplate
        .replace('{wuxing}', dayWx)
        .replace('{seal}', seal)
        .replace('{same}', same),
      applies: true,
    };
  }
  return {
    method: '扶抑',
    use: [],
    reason: '日主中和，扶抑法不适用',
    applies: false,
  };
}

/**
 * 调候法：寒暖燥湿调节（优先级高于扶抑）
 * 命理方法论 §3.2.2 表中无对应条目时返回 applies=false
 */
function methodTiaoHou(dayWx: WuXing, monthZhi: string): MethodResult {
  const zhiToSeason = getZhiToSeason();
  const tiaoHouTable = getTiaoHouTable();
  
  const season = zhiToSeason[monthZhi];
  if (!season) throw new Error(`[yongShenAnalyzer] 未知月支：${monthZhi}`);
  const rule = tiaoHouTable[dayWx]?.[season];
  if (!rule) {
    return {
      method: '调候',
      use: [],
      reason: `${dayWx}日主生${season}季（${monthZhi}月），无强制调候需求`,
      applies: false,
    };
  }
  return {
    method: '调候',
    use: rule.use,
    reason: `${dayWx}日主生${season}季（${monthZhi}月）：${rule.reason}，取${rule.use.join('、')}调候`,
    applies: true,
  };
}

/**
 * 通关法：当两种五行严重对峙时取通关五行
 *
 * ⚠️ 文档 §3.2.3 原文仅描述 "两种五行力量对峙" 而未给具体阈值。
 * 本算法采用工程化阈值：**前两强五行皆 ≥ 30% 且互成相克关系** 视为对峙。
 * 阈值依据：单一五行 ≥ 30% 已显著超过均匀 20%，两强同时达此线即"势均力敌"。
 * 该阈值可在 M2.6 增强时根据命理师反馈调整。
 *
 * 通关五行选取：克者所生（必同时生被克者，相生链 A→C→B 自动成立）
 * 例：金克木 → 通关=水（金生水、水生木）
 */
function methodTongGuan(wuxingStats: readonly WuXingStat[]): MethodResult {
  const rules = rulesLoader.getYongShenRules();
  const shengKe = getShengKe();
  const tongGuanRules = rules.rules.tongGuanRules;
  
  // 按 percent 降序
  const sorted = [...wuxingStats].sort((a, b) => b.percent - a.percent);
  const [a, b] = sorted;

  if (!a || !b) {
    return { method: '通关', use: [], reason: '五行统计不足，通关法不适用', applies: false };
  }

  // 标准 1：前两强必须都 ≥ 30%
  const minPercent = tongGuanRules.threshold.minPercent;
  if (a.percent < minPercent || b.percent < minPercent) {
    return {
      method: '通关',
      use: [],
      reason: `前两强${a.wuxing}(${a.percent}%) ${b.wuxing}(${b.percent}%) 未皆达 ${minPercent}%，无显著对峙`,
      applies: false,
    };
  }

  // 标准 2：必须是相克关系
  const aKeB = shengKe[a.wuxing].ke === b.wuxing;
  const bKeA = shengKe[b.wuxing].ke === a.wuxing;
  if (!aKeB && !bKeA) {
    return {
      method: '通关',
      use: [],
      reason: `前两强${a.wuxing}与${b.wuxing}非相克关系，无需通关`,
      applies: false,
    };
  }

  // 通关五行：克者所生（同时也生被克者）
  // 例：金克木 → 通关=水（金生水、水生木）
  const stronger = aKeB ? a.wuxing : b.wuxing;
  const weaker = aKeB ? b.wuxing : a.wuxing;
  const tongGuan = shengKe[stronger].sheng;
  // 验证：通关五行必须能生被克者（双重相生链：强→通关→弱）
  if (shengKe[tongGuan].sheng !== weaker) {
    // 数学上相克五行的"我生"必生"我克所克"（金生水、水生木 ✅）；不会进此分支
    throw new Error(`[yongShenAnalyzer] 通关链断裂：${stronger}→${tongGuan}→${weaker}`);
  }

  const reasonTemplate = tongGuanRules.reasonTemplate;
  const strongerPercent = aKeB ? a.percent : b.percent;
  const weakerPercent = aKeB ? b.percent : a.percent;

  return {
    method: '通关',
    use: [tongGuan],
    reason: reasonTemplate
      .replace('{stronger}', stronger)
      .replace('{strongerPercent}', String(strongerPercent))
      .replace('{weaker}', weaker)
      .replace('{weakerPercent}', String(weakerPercent))
      .replace('{tongGuan}', tongGuan),
    applies: true,
  };
}

// ===== 主入口 =====

/**
 * 用神选取：基于五行统计 + 旺衰判定 → 推断用神组合
 *
 * @param pillars 四柱（用于取月支）
 * @param wuxingStats 五行统计（来自 wuxingAnalyzer）
 * @param wangShuai 旺衰判定（来自 wangShuaiAnalyzer）
 * @returns YongShen { primary, secondary, ji, reason, method, convergence? }
 */
export function analyzeYongShen(
  pillars: readonly Pillar[],
  wuxingStats: readonly WuXingStat[],
  wangShuai: WangShuai,
): YongShen {
  // ===== 输入合法性 =====
  if (pillars.length !== 4) {
    throw new Error(`[yongShenAnalyzer] 必须传入恰好 4 柱，实际 ${pillars.length}`);
  }
  if (wuxingStats.length !== 5) {
    throw new Error(`[yongShenAnalyzer] 五行统计必须含 5 项，实际 ${wuxingStats.length}`);
  }
  if (!wangShuai.conclusion) {
    throw new Error('[yongShenAnalyzer] 旺衰结论缺失');
  }

  const dayP = pillars[2];
  const monthP = pillars[1];
  const dayWx = ganWx(dayP.tianGan);
  const monthZhi = monthP.diZhi;
  const tier = classifyTier(wangShuai.conclusion);

  // ===== 专旺格优先识别（命理方法论 §3.3.2） =====
  // 当日主极旺成一方之势（同五行≥50% 且日主"极旺"档），按"顺其旺势、忌克泄"取用
  // 此情况下 method='专旺'，主用神=日主同五行+印星，忌神=食伤+财+官杀（克泄者）
  const dayWxStat = wuxingStats.find(s => s.wuxing === dayWx);
  const rules = rulesLoader.getYongShenRules();
  const shengKe = getShengKe();
  const zhuWangRules = rules.rules.zhuWangRules;
  const minPercent = zhuWangRules.threshold.minPercent;
  const isProsperous = wangShuai.conclusion.includes('极旺') && dayWxStat && dayWxStat.percent >= minPercent;
  if (isProsperous) {
    const sk = shengKe[dayWx];
    const reasonTemplate = zhuWangRules.reasonTemplate;
    const reasonStr = reasonTemplate
      .replace('{wuxing}', dayWx)
      .replace('{percent}', String(dayWxStat.percent))
      .replace('{seal}', sk.shengMe);
    return {
      primary: [dayWx, sk.shengMe],
      secondary: [],
      ji: [sk.sheng, sk.ke, sk.keMe], // 食伤+财+官杀皆忌
      reason: reasonStr,
      method: '专旺',
    };
  }

  // ===== 三法独立计算 =====
  const fuYi = methodFuYi(dayWx, tier);
  const tiaoHou = methodTiaoHou(dayWx, monthZhi);
  const tongGuan = methodTongGuan(wuxingStats);

  const appliedMethods = [fuYi, tiaoHou, tongGuan].filter(m => m.applies);
  if (appliedMethods.length === 0) {
    // 极少数中和命局所有法皆不适用：按"通关"思路取调和五行
    // 文档无明确规则，工程兜底：取日主"我生"五行（食伤泄秀，温和不破中和）为用
    const sk = SHENG_KE[dayWx];
    return {
      primary: [sk.sheng],         // 食伤泄秀
      secondary: [sk.ke],          // 财耗（次温和）
      ji: [sk.keMe],               // 官杀克身
      reason: `日主${dayWx}中和，扶抑/调候/通关三法皆不强制适用。按"中和宜泄不宜克"原则，取${sk.sheng}（食伤泄秀，最温和）为主用，${sk.ke}（财耗）为辅，忌${sk.keMe}（官杀克身）。`,
      method: '通关',              // 借用"通关"语义表达"调和中性命局"
    };
  }

  // ===== 主用神选取（多法投票 + 优先级） =====
  // 投票统计：每个五行被多少法选为用神
  const voteCount = new Map<WuXing, number>();
  const voteSources = new Map<WuXing, string[]>();
  for (const m of appliedMethods) {
    for (const wx of m.use) {
      voteCount.set(wx, (voteCount.get(wx) ?? 0) + 1);
      const src = voteSources.get(wx) ?? [];
      src.push(m.method);
      voteSources.set(wx, src);
    }
  }

  // ===== 主用神选取规则（严格遵循文档优先级） =====
  // 文档 §3.2.2 明确："调候用神**优先级高于扶抑用神**——有些八字即使日主不弱，
  //   但如果缺少调候用神，也是贫贱之命。"
  // → 调候法适用时，其 use 必入 primary（最高优先级）
  //
  // 规则 1：调候法 use → 必入 primary（不可降级）
  // 规则 2：被 ≥2 法共认的五行 → 必入 primary（多法同断置信度最高）
  // 规则 3：其余单法选中的五行 → 入 secondary（去重）
  // 规则 4：若无任何法适用（极少数中和命局）→ 已在前面兜底返回
  //
  // voteCount 至少有 1 项（appliedMethods 非空 + 每个 applies=true 法 use 非空，已在守卫保证）
  if (voteCount.size === 0) {
    throw new Error('[yongShenAnalyzer] 投票表为空但应用法非空，逻辑异常');
  }

  const primary: WuXing[] = [];
  const secondary: WuXing[] = [];

  // 规则 1：调候法适用时，其 use 必入 primary
  if (tiaoHou.applies) {
    for (const wx of tiaoHou.use) {
      if (!primary.includes(wx)) primary.push(wx);
    }
  }

  // 规则 2：被 ≥2 法共认的五行追加进 primary（去重）
  for (const [wx, count] of voteCount.entries()) {
    if (count >= 2 && !primary.includes(wx)) {
      primary.push(wx);
    }
  }

  // 规则 3：所有适用法剩余的 use 进 secondary（去重 + 去除已在 primary）
  for (const m of appliedMethods) {
    for (const wx of m.use) {
      if (!primary.includes(wx) && !secondary.includes(wx)) {
        secondary.push(wx);
      }
    }
  }

  // 兜底：理论上 primary 必非空（若有任意法适用，至少其 use 非空 → 单法时进 secondary 不会进 primary）
  // 此处特殊场景：仅扶抑或仅通关单法适用且无共认 → primary 为空
  // 解法：将该单法的 use 升为 primary（按 扶抑 > 通关 优先级）
  if (primary.length === 0) {
    const fallback = [fuYi, tongGuan].find(m => m.applies);
    if (!fallback) {
      throw new Error('[yongShenAnalyzer] 无可兜底的法，逻辑异常');
    }
    primary.push(...fallback.use);
    for (const wx of primary) {
      const idx = secondary.indexOf(wx);
      if (idx !== -1) secondary.splice(idx, 1);
    }
  }

  // ===== 忌神选取 =====
  // 忌神 = 「克主用神者」 ∪ 「生扶旺势者（仅日主旺时）」 ∪ 「克泄弱日主者（仅日主弱时）」
  // ⚠️ 多法冲突时优先级：用神 > 忌神
  //   例：水日旺时通关法可能取金为通关用神，但金又生水助旺被列为忌神 →
  //       最后通过 `jiSet.delete(用神)` 保证用神不被误判为忌神（用神优先）
  // shengKe 已在前面声明（专旺格判定处），直接复用
  const jiSet = new Set<WuXing>();
  for (const wx of primary) {
    jiSet.add(shengKe[wx].keMe); // 克主用神者
  }
  if (tier === '旺') {
    // 日主旺时，生扶日主的五行（同我=比劫 + 生我=印）助长旺势，皆为忌神
    jiSet.add(dayWx);
    jiSet.add(shengKe[dayWx].shengMe);
  } else if (tier === '弱') {
    // 日主弱时，克泄日主的五行（我生=食伤、我克=财、克我=官杀）皆为忌神
    jiSet.add(shengKe[dayWx].sheng);
    jiSet.add(shengKe[dayWx].ke);
    jiSet.add(shengKe[dayWx].keMe);
  }
  // 用神优先：主/次用神从忌神中剔除
  for (const wx of [...primary, ...secondary]) {
    jiSet.delete(wx);
  }
  const ji: WuXing[] = Array.from(jiSet);

  // ===== 主导方法（优先级：调候 > 扶抑 > 通关） =====
  let dominantMethod: '扶抑' | '调候' | '通关' | '专旺' = '扶抑';
  if (tiaoHou.applies) {
    dominantMethod = '调候';
  } else if (fuYi.applies) {
    dominantMethod = '扶抑';
  } else if (tongGuan.applies) {
    dominantMethod = '通关';
  }

  // ===== 推断理由（综合各法说明） =====
  const reasonParts: string[] = [];
  // 简洁表达：剥掉 conclusion 末尾括号补充，避免"日主水旺（日主极旺）"重复
  const cleanConclusion = wangShuai.conclusion.replace(/（.*?）/, '').trim();
  reasonParts.push(`${cleanConclusion}。`);
  for (const m of appliedMethods) {
    reasonParts.push(`【${m.method}】${m.reason}。`);
  }
  reasonParts.push(`综合：主用神=${primary.join('+') || '（无主用）'}${secondary.length ? `，次用神=${secondary.join('+')}` : ''}，忌神=${ji.join('+') || '（无显著忌神）'}。`);
  const reason = reasonParts.join('');

  // ===== 多法同断识别 =====
  // 当 ≥2 法的 use 集合存在交集（即至少有一个五行被 ≥2 法共认）时触发
  const convergence = detectConvergence(appliedMethods, primary, dayWx);

  return {
    primary,
    secondary,
    ji,
    reason,
    method: dominantMethod,
    convergence,
  };
}

// ===== 多法同断识别 =====

function detectConvergence(
  applied: MethodResult[],
  primary: WuXing[],
  dayWx: WuXing,
): Convergence | undefined {
  if (applied.length < 2) return undefined;

  const rules = rulesLoader.getYongShenRules();
  const convergenceRules = rules.rules.convergenceRules;
  const minMethodCount = convergenceRules.threshold.minMethodCount;
  const minVoteCount = convergenceRules.threshold.minVoteCount;

  // 计算每个五行被多少法选中
  const voteCount = new Map<WuXing, number>();
  for (const m of applied) {
    for (const wx of m.use) {
      voteCount.set(wx, (voteCount.get(wx) ?? 0) + 1);
    }
  }

  // 至少有一个五行被 ≥2 法选中才算多法同断
  const sharedWx: WuXing[] = [];
  for (const [wx, count] of voteCount.entries()) {
    if (count >= minVoteCount) sharedWx.push(wx);
  }
  if (sharedWx.length === 0) return undefined;

  // 列出所有适用的法，并标记其全名
  const methodLabels = convergenceRules.methodLabels;
  const methods = applied.map(m => methodLabels[m.method] ?? m.method);

  const primaryStr = primary.length > 0 ? primary.join('+') : sharedWx.join('+');
  const consumerNoteTemplate = convergenceRules.consumerNoteTemplate;
  
  return {
    methods,
    conclusion: `${primaryStr}为用神（${dayWx}日主之喜）`,
    consumerNote: consumerNoteTemplate
      .replace('{primary}', primaryStr)
      .replace('{methodCount}', String(applied.length)),
  };
}
