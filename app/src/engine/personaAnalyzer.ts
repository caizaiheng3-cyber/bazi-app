/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 命格特征分析引擎（Persona Analyzer）
//
// 方法论标尺（严格遵循经典命理体系，禁止自创性格学）：
//   - 维度1（baseTone）旺衰基底  → 滴天髓 / 子平真诠
//   - 维度2（innerNature）日主气质 → 滴天髓「天干十论」（甲木参天、乙木花藤……）
//   - 维度3（lifeTheme）用神主旋律 → 子平真诠「用神配合论」
//   - 维度4（socialRole）格局对应社会角色 → 三命通会 + 子平真诠「八格」
//   - 维度5（mentality）十神组合心性 → 三命通会「十神论」
//   - 维度6（highlights）神煞亮点 → 三命通会神煞篇
//
// 综合公式：
//   命格画像 = 旺衰基底 × 日主气质 × 用神主旋律
//            + 格局社会角色 + 十神组合心性 + 神煞亮点
//
// ⚠ 所有规则均能映射到经典依据（写在 source 字段），不做心理学外推。

import type {
  BaziChart,
  ChartRelations,
  GeJu,
  ManifestLevel,
  Persona,
  PersonaTrait,
  Pillar,
  ShenSha,
  ShiShen,
  ShiShenManifestation,
  TianGan,
  WangShuai,
  WuXing,
  WuXingStat,
  YongShen,
} from '../types/bazi';

// ============================================================
// 维度2 数据库：滴天髓「天干十论」 — 日主气质模板
// ============================================================
//
// 来源：滴天髓·原注（任铁樵）「论十干」
// 每个日干 × 强弱 = 一段经典气质描述

interface InnerNatureTemplate {
  /** 滴天髓原句意象 */
  imagery: string;
  /** 强（旺）态描述 */
  whenStrong: string;
  /** 弱态描述 */
  whenWeak: string;
  /** 中和态描述 */
  whenBalanced: string;
}

const INNER_NATURE: Record<TianGan, InnerNatureTemplate> = {
  甲: {
    imagery: '参天大树',
    whenStrong: '正直挺拔，有担当、重原则，但易固执刚硬，不肯屈伸；适合做开创性事业。',
    whenWeak: '虽有抱负但根基不稳，需借木火之助方能成器；性温和而内蕴志气。',
    whenBalanced: '正气凛然，能屈能伸，有领袖之资。',
  },
  乙: {
    imagery: '藤蔓花草',
    whenStrong: '生机勃发，敏锐、善变通，能以柔克刚；但也易钻营、缺乏专注。',
    whenWeak: '柔弱易折，易随境而动，需贵人扶持；多才多艺却易心绪起伏。',
    whenBalanced: '柔中带刚，巧而不诈，宜文艺、外交、营销。',
  },
  丙: {
    imagery: '太阳之火',
    whenStrong: '热情磅礴、博爱外向，自带光环；但易燥烈伤人，喜出风头。',
    whenWeak: '太阳被云遮，温和谦让，内有光明而不张扬；宜借木助火。',
    whenBalanced: '阳光普照，正直无私，有领袖魅力。',
  },
  丁: {
    imagery: '灯烛文明',
    whenStrong: '内秀专注，思维细腻，有文采、近艺术；过旺则易心思过密、敏感多疑。',
    whenWeak: '光弱易灭，需甲木相生；性沉静、宜专业领域深耕。',
    whenBalanced: '心细如发，外柔内刚，文明礼让，宜技艺、传媒、教育。',
  },
  戊: {
    imagery: '高山厚土',
    whenStrong: '厚重稳健，有担当、能聚财；过旺则保守固执、缺乏变通。',
    whenWeak: '土薄难承万物，处事易摇摆；需火生土。',
    whenBalanced: '诚信厚德，是天然的协调者与守护者。',
  },
  己: {
    imagery: '田园湿土',
    whenStrong: '包容务实、勤勉踏实；过旺则计较琐碎、易自我设限。',
    whenWeak: '土湿不能植物，行事拖延、易被人左右。',
    whenBalanced: '中正温厚，善体人意，宜服务、教育、农业。',
  },
  庚: {
    imagery: '顽金未炼',
    whenStrong: '刚毅果断、敢作敢当，肃杀有威；过旺则刚愎、易冲突。',
    whenWeak: '金质不纯，需火炼方成器；外强中干、易冲动失误。',
    whenBalanced: '义气磊落，能成大事，宜军警、武职、机械。',
  },
  辛: {
    imagery: '珠玉之金',
    whenStrong: '精致敏锐、爱面子、重品质；过旺则尖刻挑剔、不易满足。',
    whenWeak: '玉质易碎，需水洗其华；外柔内刚、心思细腻。',
    whenBalanced: '清贵高雅，审美出众，宜珠宝、设计、金融。',
  },
  壬: {
    imagery: '江河汪洋',
    whenStrong: '智慧奔放、胸怀宽广，喜变化、不羁；过旺则桀骜难驯、漂泊不定。',
    whenWeak: '水浅难行舟，性温和但易随波；需金生水。',
    whenBalanced: '智深若海，能容能纳，有谋略，宜外交、商业、传媒。',
  },
  癸: {
    imagery: '雨露之水',
    whenStrong: '柔和缜密、思虑周全；过旺则多愁善感、犹豫不决。',
    whenWeak: '雨露不及，性内敛但缺主张；需金为源。',
    whenBalanced: '聪慧清纯，外柔内韧，宜咨询、研究、学术。',
  },
};

// ============================================================
// 维度4 数据库：八格对应社会角色
// 来源：子平真诠「论八格」+ 三命通会
// ============================================================

interface GeJuRoleTemplate {
  trait: string;     // 性格倾向
  roles: string[];   // 适合的社会角色
}

const GEJU_ROLE: Record<string, GeJuRoleTemplate> = {
  正官格: { trait: '端方守矩、重名誉、尊规则', roles: ['公职', '管理者', '专业人士'] },
  七杀格: { trait: '魄力果决、敢冒险、有威权', roles: ['军警', '创业者', '执行型管理'] },
  正印格: { trait: '学识慈悲、近文教、依长辈', roles: ['学者', '教师', '医师', '宗教文化'] },
  偏印格: { trait: '思路独到、孤傲敏锐、近偏门', roles: ['设计', '玄学', '研究', '专业技艺'] },
  食神格: { trait: '才艺温和、口福广、有雅趣', roles: ['文艺', '餐饮', '教育', '幕僚'] },
  伤官格: { trait: '才华横溢、叛逆灵动、不喜约束', roles: ['表演', '创新', '自媒体', '艺术'] },
  正财格: { trait: '务实勤俭、顾家守信', roles: ['工薪稳健', '中小经营', '财务'] },
  偏财格: { trait: '人脉广、灵活敢为、能聚能散', roles: ['商业', '投资', '销售', '贸易'] },
  比肩格: { trait: '自立刚强、重情义、独立', roles: ['自由职业', '合伙创业', '运动员'] },
  劫财格: { trait: '行动力强、好竞争、易破财', roles: ['销售拓展', '体育竞技', '武职'] },
  建禄格: { trait: '自立自强、有韧性、白手起家', roles: ['创业', '专业岗位'] },
  羊刃格: { trait: '刚烈果断、有冲劲、利武不利文', roles: ['军警', '运动', '外科'] },
  从财格: { trait: '随财而动、富贵借势', roles: ['依附大平台经商'] },
  从杀格: { trait: '化压力为动力、借势成名', roles: ['权贵之路'] },
  从儿格: { trait: '才华外显、靠技艺成名', roles: ['艺术、技术'] },
  从旺格: { trait: '一气专旺、独立成事', roles: ['独立专业'] },
  化气格: { trait: '善借时势转化', roles: ['顺势而为的领域'] },
};

// ============================================================
// 工具函数
// ============================================================

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const WX_GENERIC_TRAIT: Record<WuXing, string> = {
  木: '主仁，性直，喜生发',
  火: '主礼，性急，喜光明',
  土: '主信，性厚，喜稳定',
  金: '主义，性刚，喜决断',
  水: '主智，性聪，喜变通',
};

/** 五行对应方位 / 颜色 / 行业（开运指引概要） */
const WX_LIFE_THEME: Record<WuXing, { direction: string; color: string; industry: string }> = {
  木: { direction: '东方', color: '青绿', industry: '教育/文化/植物/出版' },
  火: { direction: '南方', color: '红紫', industry: '能源/电子/餐饮/传媒' },
  土: { direction: '中宫/西南', color: '黄棕', industry: '房产/农业/陶瓷/建筑' },
  金: { direction: '西方/西北', color: '白金', industry: '金融/法律/IT/机械' },
  水: { direction: '北方', color: '黑蓝', industry: '物流/航运/咨询/水利' },
};

/** 统计十神出现次数（含天干十神 + 藏干十神） */
function countShiShen(pillars: readonly Pillar[]): Record<ShiShen, number> {
  const counts: Record<string, number> = {};
  for (const p of pillars) {
    if (p.ganShiShen && p.ganShiShen !== '日主') {
      counts[p.ganShiShen] = (counts[p.ganShiShen] || 0) + 1;
    }
    for (const ss of p.diShiShen || []) {
      counts[ss] = (counts[ss] || 0) + 0.5; // 藏干十神权重 0.5
    }
  }
  return counts as Record<ShiShen, number>;
}

/** 获取某类十神的合计权重 */
function sumShiShenGroup(counts: Record<ShiShen, number>, group: ShiShen[]): number {
  return group.reduce((sum, ss) => sum + (counts[ss] || 0), 0);
}

/** 获取某五行占比 */
function getWxPercent(stats: readonly WuXingStat[], wx: WuXing): number {
  return stats.find((s) => s.wuxing === wx)?.percent || 0;
}

/** 旺衰结论归类 */
type WangShuaiTone = 'extreme-strong' | 'strong' | 'balanced' | 'weak' | 'extreme-weak' | 'follow';

function classifyWangShuai(conclusion: string): WangShuaiTone {
  if (/(从|化)/.test(conclusion)) return 'follow';
  if (/极旺|身旺极/.test(conclusion)) return 'extreme-strong';
  if (/旺|强/.test(conclusion)) return 'strong';
  if (/极弱/.test(conclusion)) return 'extreme-weak';
  if (/弱|衰/.test(conclusion)) return 'weak';
  return 'balanced';
}

const WANGSHUAI_BASE_TONE: Record<WangShuaiTone, { tag: string; description: string }> = {
  'extreme-strong': {
    tag: '专旺刚强',
    description: '日主一气独旺，自我意志极强、独立性高，宜顺其势而非逆之；忌他人压制，易刚愎自用。',
  },
  strong: {
    tag: '偏旺主见强',
    description: '主见明确、行动力足，进取心强；适合开拓型事业，但需注意刚柔平衡，避免一意孤行。',
  },
  balanced: {
    tag: '中和稳健',
    description: '能量分布均衡，性格平衡稳健、适应力强，进退有度，是难得的"通才"型命格。',
  },
  weak: {
    tag: '偏弱内敛',
    description: '性格谨慎内敛、依赖性较强，适合协作、辅助、专业岗位；遇贵人扶持时表现最佳。',
  },
  'extreme-weak': {
    tag: '极弱借势',
    description: '日主无根，需借外力，宜随势而行；过度强求反易受挫。',
  },
  follow: {
    tag: '从格借势',
    description: '日主弃命从势，性格顺势而为，遇贵则贵、遇环境助力则成事，独立硬抗反而失利。',
  },
};

// ============================================================
// 主入口
// ============================================================

/**
 * 分析输入：只取 personaAnalyzer 实际依赖的字段，避免与 BaziChart 完整结构耦合
 */
export interface PersonaAnalyzerInput {
  pillars: readonly Pillar[];
  wuxingStats: readonly WuXingStat[];
  wangShuai: WangShuai;
  yongShen: YongShen;
  geJu: GeJu;
  shenShas: readonly ShenSha[];
  /** 干支动态关系（合化/三合/六合/六冲/三刑 + 外显实质）—— 可选，缺省时退化为静态画像 */
  relations?: ChartRelations;
}

export function analyzePersona(input: PersonaAnalyzerInput): Persona {
  const { pillars, wuxingStats, wangShuai, yongShen, geJu, shenShas, relations } = input;
  const dayPillar = pillars[2];
  const dayGan = dayPillar.tianGan;
  const dayWx = GAN_TO_WX[dayGan];

  // ===== 维度1：旺衰基底 =====
  const tone = classifyWangShuai(wangShuai.conclusion);
  const baseToneDef = WANGSHUAI_BASE_TONE[tone];
  const baseTone: PersonaTrait = {
    dimension: '旺衰基底',
    tag: baseToneDef.tag,
    description: `${wangShuai.conclusion}。${baseToneDef.description}`,
    source: '《滴天髓·论旺衰》《子平真诠·论用神成败》',
  };

  // ===== 维度2：日主气质（滴天髓十干论）=====
  const tpl = INNER_NATURE[dayGan];
  let innerDesc: string;
  if (tone === 'extreme-strong' || tone === 'strong') {
    innerDesc = tpl.whenStrong;
  } else if (tone === 'extreme-weak' || tone === 'weak') {
    innerDesc = tpl.whenWeak;
  } else {
    innerDesc = tpl.whenBalanced;
  }
  const innerNature: PersonaTrait = {
    dimension: '日主气质',
    tag: `${dayGan}${dayWx} · ${tpl.imagery}`,
    description: `日主${dayGan}${dayWx}如${tpl.imagery}：${innerDesc}（${WX_GENERIC_TRAIT[dayWx]}）`,
    source: '《滴天髓·论十干》',
  };

  // ===== 维度3：用神主旋律 =====
  const primaryWx = yongShen.primary[0];
  const themeInfo = WX_LIFE_THEME[primaryWx];
  const allYongStr = [...yongShen.primary, ...yongShen.secondary].join('、');
  const allJiStr = yongShen.ji.join('、');
  const lifeTheme: PersonaTrait = {
    dimension: '用神主旋律',
    tag: `用${allYongStr}·忌${allJiStr}`,
    description:
      `一生需借${allYongStr}之气化解命局失衡（取用法：${yongShen.method}）。` +
      `主开运方向 → 方位${themeInfo.direction}、色调${themeInfo.color}、行业${themeInfo.industry}。` +
      `需规避过度的${allJiStr}之气与对应人事环境。`,
    source: '《子平真诠·论用神配合》',
  };

  // ===== 维度4：格局社会角色 =====
  const socialRole = buildSocialRole(geJu);

  // ===== 维度5：十神组合心性（多条）=====
  const shiShenCounts = countShiShen(pillars);
  const mentality = buildMentality(shiShenCounts, pillars, dayWx);

  // ===== 维度5增强：用「外显/实质/虚位/隐藏」标注修正性格画像 =====
  // 这是命理学的核心精度提升点：
  //   - 一个十神"外显实力派"会成为外人能看到的核心特质
  //   - "外显虚位"代表"看似有但实际虚浮"，需要降低描述强度
  //   - "内蕴实质"代表"内心真实的诉求/能力"，但外人不易察觉
  //   - "内蕴潜藏"代表潜意识层面的影响
  if (relations?.manifestation && relations.manifestation.length > 0) {
    const manifestTraits = buildManifestationTraits(relations.manifestation);
    mentality.push(...manifestTraits);
  }

  // ===== 维度6：神煞亮点（多条）=====
  const highlights = buildHighlights(shenShas);

  // ===== 维度7（NEW）：干支动态关系 —— 命格主题级关键事件 =====
  // 严格按命理学优先级：三会 > 三合 > 合化 > 六冲 > 三刑 > 六合 > 半三合 > 天干冲
  const relationTraits = relations ? buildRelationTraits(relations) : [];

  // ===== 综合：优势 / 注意 / 关键词 / 一句话画像 =====
  const strengths = buildStrengths({ tone, dayGan, geJu, mentality, highlights, yongShen, relations });
  const cautions = buildCautions({ tone, dayGan, geJu, shiShenCounts, shenShas, wuxingStats, dayWx, relations });
  const keywords = buildKeywords({ baseTone, innerNature, socialRole, mentality, highlights, relationTraits });
  const oneLiner = buildOneLiner({
    dayGan,
    dayWx,
    tpl,
    tone,
    geJuName: geJu.name,
    geJuRoles: GEJU_ROLE[geJu.name]?.roles || [],
    primaryWx,
  });

  // ===== 综合置信度 =====
  // 规则：6 维都有有效输出 → 5★；缺 1 维 → 4★；缺 2+ → 3★
  const filledDims = [
    baseTone, innerNature, lifeTheme, socialRole,
    mentality.length > 0 ? mentality[0] : null,
    highlights.length > 0 ? highlights[0] : null,
  ].filter(Boolean).length;
  const confidence = (Math.max(3, Math.min(5, filledDims - 1)) as 1 | 2 | 3 | 4 | 5);

  // ===== 多法同断：旺衰 / 格局 / 用神 三者方向一致时标注 =====
  const convergence = buildConvergence({ tone, geJu, yongShen, dayWx });

  return {
    oneLiner,
    baseTone,
    innerNature,
    lifeTheme,
    socialRole,
    mentality,
    highlights,
    strengths,
    cautions,
    keywords,
    confidence,
    convergence,
  };
}

// ============================================================
// 子构造器
// ============================================================

function buildSocialRole(geJu: GeJu): PersonaTrait {
  const def = GEJU_ROLE[geJu.name];
  if (!def) {
    return {
      dimension: '社会角色',
      tag: geJu.name || '格局未明',
      description: geJu.description || '格局判定信息不足，建议综合大运细化。',
      source: '《子平真诠·论八格》',
    };
  }
  const statusText =
    geJu.status === '成格'
      ? '此格已成（结构清晰）'
      : geJu.status === '半成'
        ? '此格半成（需大运配合方显）'
        : '此格有破（需以行运修补）';
  return {
    dimension: '社会角色',
    tag: `${geJu.name}（${geJu.status}·${geJu.level}格）`,
    description: `${statusText}。${def.trait}；适合方向：${def.roles.join('、')}。`,
    source: '《子平真诠·论八格》《三命通会·论格局》',
  };
}

function buildMentality(
  counts: Record<ShiShen, number>,
  pillars: readonly Pillar[],
  _dayWx: WuXing
): PersonaTrait[] {
  const out: PersonaTrait[] = [];

  // 各组十神
  const printCount = sumShiShenGroup(counts, ['正印', '偏印']);
  const foodCount = sumShiShenGroup(counts, ['食神', '伤官']);
  const wealthCount = sumShiShenGroup(counts, ['正财', '偏财']);
  const officerCount = sumShiShenGroup(counts, ['正官', '偏官']);
  const peerCount = sumShiShenGroup(counts, ['比肩', '劫财']);

  // 阈值：≥2 视为旺
  const TH = 2;

  if (printCount >= TH) {
    out.push({
      dimension: '十神心性',
      tag: '印星旺·学习沉淀',
      description: `命中印星偏旺（合计 ${printCount.toFixed(1)} 位）：好学多思、近文教、有长辈缘；但易被动、依赖。`,
      source: '《三命通会·正偏印篇》',
    });
  }
  if (foodCount >= TH) {
    out.push({
      dimension: '十神心性',
      tag: '食伤旺·才华外显',
      description: `命中食伤偏旺（合计 ${foodCount.toFixed(1)} 位）：表达欲强、想象力丰富、不喜约束、宜以才艺谋生。`,
      source: '《三命通会·食神伤官篇》',
    });
  }
  if (wealthCount >= TH) {
    out.push({
      dimension: '十神心性',
      tag: '财星旺·重物质',
      description: `命中财星偏旺（合计 ${wealthCount.toFixed(1)} 位）：有商业嗅觉、追求实效；但需食伤为源、印星节制。`,
      source: '《三命通会·正偏财篇》',
    });
  }
  if (officerCount >= TH) {
    out.push({
      dimension: '十神心性',
      tag: '官杀旺·责任压力',
      description: `命中官杀偏旺（合计 ${officerCount.toFixed(1)} 位）：自律有担当、压力感重；身弱时易受制于人，身强反而能掌权。`,
      source: '《三命通会·正官七杀篇》',
    });
  }
  if (peerCount >= TH) {
    out.push({
      dimension: '十神心性',
      tag: '比劫旺·朋友易聚易散',
      description: `命中比劫偏旺（合计 ${peerCount.toFixed(1)} 位）：自立有主见、朋友圈活跃；但易争财、合伙宜慎，财运起伏。`,
      source: '《三命通会·比肩劫财篇》《滴天髓·论比劫》',
    });
  }

  // ===== 经典组合规则 =====
  // 1) 伤官见官：叛逆冲突
  const hasShangGuan = (counts['伤官'] || 0) > 0;
  const hasZhengGuan = (counts['正官'] || 0) > 0;
  if (hasShangGuan && hasZhengGuan) {
    out.push({
      dimension: '十神组合',
      tag: '伤官见官',
      description: '命局伤官见官：才华横溢却易与权威/规则冲突，主叛逆、易招是非；宜化不宜战。',
      source: '《子平真诠·论伤官》"伤官见官，为祸百端"',
    });
  }

  // 2) 财印相战 / 财印兼用：根据透干情况严格区分
  // 经典依据：《子平真诠·论财》「财印相碍，宜行运通关」/《三命通会·财印论》
  // - 财印同柱透干 → 财印相战（最强冲突）
  // - 财印异柱透干 → 财印兼用（拉扯但可调和）
  // - 仅藏支不透 → 影响轻微，不单独提示
  const printOnGan = pillars.some((p) =>
    p.ganShiShen === '正印' || p.ganShiShen === '偏印'
  );
  const wealthOnGan = pillars.some((p) =>
    p.ganShiShen === '正财' || p.ganShiShen === '偏财'
  );
  // 同柱透干：找一个柱中天干十神既属财又属印（不可能，一柱一干），
  // 真正的"同柱"指相邻两柱天干同时透财与印（最易相战）
  let adjacentClash = false;
  for (let i = 0; i < pillars.length - 1; i++) {
    const a = pillars[i].ganShiShen;
    const b = pillars[i + 1].ganShiShen;
    const aIsP = a === '正印' || a === '偏印';
    const aIsW = a === '正财' || a === '偏财';
    const bIsP = b === '正印' || b === '偏印';
    const bIsW = b === '正财' || b === '偏财';
    if ((aIsP && bIsW) || (aIsW && bIsP)) {
      adjacentClash = true;
      break;
    }
  }
  if (printOnGan && wealthOnGan && adjacentClash) {
    out.push({
      dimension: '十神组合',
      tag: '财印相战',
      description: '财印于天干相邻而立、互相制衡：物质追求与精神/学问追求剧烈拉扯，常面临"赚钱"与"清静做事"的两难抉择，宜行官杀运通关。',
      source: '《子平真诠·论财》"财印相碍"《三命通会·财印论》',
    });
  } else if (printOnGan && wealthOnGan) {
    out.push({
      dimension: '十神组合',
      tag: '财印兼透',
      description: '财与印同透天干但不相邻：物质追求与精神追求并存，能在二者间寻求平衡，但需把握节奏避免顾此失彼。',
      source: '《三命通会·财印论》',
    });
  } else if (
    (wealthCount >= 1 && printCount >= 1) &&
    !printOnGan && !wealthOnGan
  ) {
    out.push({
      dimension: '十神组合',
      tag: '财印藏支',
      description: '财与印仅见于地支藏干、不透天干：物质与精神追求皆有但不显著，影响多体现于内心而非外在选择。',
      source: '《三命通会·财印论》',
    });
  }

  // 3) 食神制杀：以柔克刚
  const hasFoodGod = (counts['食神'] || 0) > 0;
  const hasQiSha = (counts['偏官'] || 0) > 0;
  if (hasFoodGod && hasQiSha) {
    out.push({
      dimension: '十神组合',
      tag: '食神制杀',
      description: '食神制七杀：能以才华化解压力与权威冲突，外柔内韧、临危不乱，主贵格之一。',
      source: '《子平真诠·论食神》"食神制杀，英雄独立"',
    });
  }

  // 4) 月令为比劫且天干透出多 → 比劫成势
  const monthZhi = pillars[1].diZhi;
  const monthZhiWx = ZHI_TO_WX[monthZhi];
  const dayGanWx = GAN_TO_WX[pillars[2].tianGan];
  if (monthZhiWx === dayGanWx && peerCount >= 3) {
    out.push({
      dimension: '十神组合',
      tag: '比劫成势',
      description: `日主${dayGanWx}行得月令${monthZhi}（${monthZhiWx}），且天干比劫多透：兄弟朋友众多、自立性极强；财星易被劫，宜走食伤泄秀路线。`,
      source: '《滴天髓·论比劫》',
    });
  }

  return out;
}

const ZHI_TO_WX: Record<string, WuXing> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 亥: '水', 子: '水',
  辰: '土', 未: '土', 戌: '土', 丑: '土',
};

function buildHighlights(shenShas: readonly ShenSha[]): PersonaTrait[] {
  const out: PersonaTrait[] = [];

  // 每个吉神/凶神都做映射，按重要性排序
  const PRIORITY = [
    '天乙贵人', '天德贵人', '月德贵人', '文昌贵人', '将星',
    '魁罡', '禄神', '驿马', '桃花', '华盖',
    '羊刃', '亡神', '劫煞', '孤辰', '寡宿', '阴阳差错',
  ];

  const dedup = new Map<string, ShenSha>();
  for (const s of shenShas) {
    if (!dedup.has(s.name)) dedup.set(s.name, s);
  }

  for (const name of PRIORITY) {
    const s = dedup.get(name);
    if (!s) continue;
    const tag = s.category === '吉神' ? `★ ${name}` : s.category === '凶神' ? `△ ${name}` : `· ${name}`;
    out.push({
      dimension: '神煞亮点',
      tag,
      description: `${name}（${s.source}）：${s.description}`,
      source: '《三命通会·神煞篇》',
    });
    if (out.length >= 4) break; // 最多展示 4 个最重要
  }

  return out;
}

// ============================================================
// 维度增强：「外显/实质/虚位/隐藏」标注 → 性格画像精度修正
// 命理学依据：天干透出主"外显"，地支藏干主"内蕴"；通根决定虚实
// ============================================================

const SHISHEN_OUTER_ROLE: Record<ShiShen, string> = {
  比肩: '自我意识',
  劫财: '冒险冲劲',
  食神: '温和才情',
  伤官: '锋芒才华',
  偏财: '商业嗅觉',
  正财: '稳健理财',
  七杀: '权威压力',
  正官: '规则秩序',
  偏印: '另类思维',
  正印: '学问庇护',
  日主: '',
};

function buildManifestationTraits(
  manifestations: readonly ShiShenManifestation[]
): PersonaTrait[] {
  const out: PersonaTrait[] = [];

  // 优先展示"外显·实力派"和"内蕴·实质"——这是命格画像精度最高的两类
  const sorted = [...manifestations].sort((a, b) => {
    const order: ManifestLevel[] = ['manifest-strong', 'hidden-strong', 'manifest-weak', 'hidden-weak', 'absent'];
    return order.indexOf(a.level) - order.indexOf(b.level);
  });

  let manifestStrongCount = 0;
  let hiddenStrongCount = 0;
  let manifestWeakCount = 0;

  for (const m of sorted) {
    if (m.level === 'absent') break;
    const role = SHISHEN_OUTER_ROLE[m.shiShen];
    if (m.level === 'manifest-strong' && manifestStrongCount < 3) {
      out.push({
        dimension: '显象·外显',
        tag: `外显★${m.shiShen}（${role}）`,
        description: m.description,
        source: '《滴天髓·论用神》"透干通根，方为真神"',
      });
      manifestStrongCount++;
    } else if (m.level === 'hidden-strong' && hiddenStrongCount < 2) {
      out.push({
        dimension: '显象·内蕴',
        tag: `内蕴☆${m.shiShen}（${role}）`,
        description: m.description,
        source: '《子平真诠·论藏干》"藏支本气，主内之诉求"',
      });
      hiddenStrongCount++;
    } else if (m.level === 'manifest-weak' && manifestWeakCount < 1) {
      // 虚位仅展示一个，作为提示
      out.push({
        dimension: '显象·虚位',
        tag: `虚位△${m.shiShen}（${role}）`,
        description: m.description,
        source: '《滴天髓·论无根》"透干无根，假神也"',
      });
      manifestWeakCount++;
    }
  }

  return out;
}

// ============================================================
// 维度7（NEW）：干支动态关系 —— 命格主题级关键事件
// 严格按命理学优先级输出，每个 keyTheme 转化为一个 PersonaTrait
// ============================================================

function buildRelationTraits(relations: ChartRelations): PersonaTrait[] {
  const out: PersonaTrait[] = [];
  const themes = relations.keyThemes;
  if (themes.length === 0) {
    out.push({
      dimension: '干支关系',
      tag: '无显著作用关系',
      description: '原局四柱之间无明显的合化、冲、刑等强力作用关系，命局结构稳定，事件触发主要依赖大运流年引动。',
      source: '《命理分析方法论·§3.5》',
    });
    return out;
  }

  // 按权重展示：highest 全部 + high 前 3 + medium 前 2，最多 6 条
  const highest = themes.filter((t) => t.weight === 'highest');
  const high = themes.filter((t) => t.weight === 'high').slice(0, 3);
  const medium = themes.filter((t) => t.weight === 'medium').slice(0, 2);
  const picked = [...highest, ...high, ...medium].slice(0, 6);

  for (const theme of picked) {
    const tag = theme.weight === 'highest' ? `★ ${theme.title}` : theme.weight === 'high' ? `▲ ${theme.title}` : `· ${theme.title}`;
    out.push({
      dimension: '干支关系',
      tag,
      description: theme.description,
      source: theme.source,
    });
  }

  return out;
}

interface BuildStrengthsInput {
  tone: WangShuaiTone;
  dayGan: TianGan;
  geJu: GeJu;
  mentality: PersonaTrait[];
  highlights: PersonaTrait[];
  yongShen: YongShen;
  relations?: ChartRelations;
}

function buildStrengths(input: BuildStrengthsInput): string[] {
  const list: string[] = [];
  const { tone, dayGan, geJu, mentality, highlights, yongShen, relations } = input;
  const tpl = INNER_NATURE[dayGan];

  // 1. 日主气质优势
  if (tone === 'strong' || tone === 'extreme-strong') {
    list.push(`${tpl.imagery}之气旺：执行力强、能独当一面`);
  } else if (tone === 'balanced') {
    list.push(`${tpl.imagery}得中和：进退有度、能屈能伸`);
  } else {
    list.push(`${tpl.imagery}虽弱但灵活：擅借力、善协作`);
  }

  // 2. 格局优势
  const role = GEJU_ROLE[geJu.name];
  if (role && geJu.status !== '破格') {
    list.push(`${geJu.name}成格：${role.trait}`);
  }

  // 3. 十神积极组合
  for (const m of mentality) {
    if (m.tag.includes('食神制杀') || m.tag.includes('才华外显')) {
      list.push(`${m.tag}：核心成就方向`);
    }
  }

  // 4. 吉神
  for (const h of highlights) {
    if (h.tag.startsWith('★')) {
      const name = h.tag.replace('★ ', '');
      if (name === '天乙贵人') list.push('天乙贵人在命：逢凶化吉、贵人多助');
      if (name === '文昌贵人') list.push('文昌入命：聪敏好学、利文职考试');
      if (name === '将星') list.push('将星临身：有领导力与威望');
      if (name === '魁罡') list.push('魁罡临身：性刚果决、文武兼备');
    }
  }

  // 5. 用神方向带来的天然适合
  const wx = yongShen.primary[0];
  if (wx) {
    const theme = WX_LIFE_THEME[wx];
    list.push(`用神为${wx}：行${theme.industry}方向得心应手`);
  }

  return list.slice(0, 5);
}

interface BuildCautionsInput {
  tone: WangShuaiTone;
  dayGan: TianGan;
  geJu: GeJu;
  shiShenCounts: Record<ShiShen, number>;
  shenShas: readonly ShenSha[];
  wuxingStats: readonly WuXingStat[];
  dayWx: WuXing;
  relations?: ChartRelations;
}

function buildCautions(input: BuildCautionsInput): string[] {
  const list: string[] = [];
  const { tone, dayGan, geJu, shiShenCounts, shenShas, wuxingStats, dayWx, relations } = input;
  const tpl = INNER_NATURE[dayGan];

  // 1. 旺衰极端
  if (tone === 'extreme-strong') {
    list.push(`${tpl.imagery}过旺：易刚愎自用、独断独行，需学会倾听与放权`);
  } else if (tone === 'extreme-weak') {
    list.push(`${tpl.imagery}极弱：独自硬抗易受挫，需懂借势与接受帮助`);
  }

  // 2. 比劫旺 → 财不聚 / 合伙慎
  const peer = sumShiShenGroup(shiShenCounts, ['比肩', '劫财']);
  if (peer >= 3) {
    list.push('比劫成势：财来财去难积累，合伙易破财，宜独立掌财、量入为出');
  }

  // 3. 伤官见官
  if ((shiShenCounts['伤官'] || 0) > 0 && (shiShenCounts['正官'] || 0) > 0) {
    list.push('伤官见官：易与权威/规则正面冲突，宜以化解代替对抗');
  }

  // 4. 五行偏枯
  for (const stat of wuxingStats) {
    if (stat.percent >= 40 && stat.wuxing !== dayWx) {
      list.push(`${stat.wuxing}过旺（${stat.percent}