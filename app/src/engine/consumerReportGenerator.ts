// M3 消费者报告生成引擎
//
// 基于 BaziChart 全字段 + 命理分析方法论 §5.7/§5.8 映射表，
// 自动生成 ConsumerReport 8 大段落：
//   1. imagery — 命格意象（日柱纳音→描述/关键词）
//   2. empathy — 共情段落（旺衰+用神+五行特征→2-3 段共情文案）
//   3. explanation — 解释段（keyFindings 通俗化 + 术语列表 + convergenceNotes）
//   4. guidance — 出路段（用神方向+keyFindings 中正面发现→3-5 条建议）
//   5. timeline — 时间节奏（大运→good/caution/turning）
//   6. luckyGuide — 开运指南（§5.7 五行映射表）
//   7. closing — 温暖结语
//   8. otherAreas — 其他领域简评
//
// 设计原则（对齐输出模板.md 模板二）：
//   - 共情 → 解释 → 出路
//   - 归因于命格（非个人缺陷）
//   - 指向未来（非回溯过去）
//   - 适度神秘感 + 术语点缀约 10%

import type {
  BaziChart,
  ConsumerReport,
  DaYun,
  FocusArea,
  KeyFinding,
  WuXing,
} from '../types/bazi';
import { rulesLoader } from './rulesLoader';

// ====================================================================
// 纳音意象描述库 - 从配置加载
// ====================================================================

interface NaYinInfo {
  subtitle: string;
  description: string;
  keywords: string[];
}

function getNaYinMap(): Record<string, NaYinInfo> {
  const rules = rulesLoader.getConsumerReportRules();
  const naYinImagery = rules.rules.naYinImagery;
  const result: Record<string, NaYinInfo> = {};
  
  for (const [key, value] of Object.entries(naYinImagery)) {
    result[key] = {
      subtitle: key,
      description: value,
      keywords: [], // 可以从描述中提取关键词
    };
  }
  
  return result;
}

// ====================================================================
// §5.7 五行与消费者报告映射表
// ====================================================================

interface WuXingGuide {
  colors: string[];
  directions: string[];
  numbers: number[];
  industries: string[];
  foods: string[];
  advice: string;
}

const WUXING_GUIDE: Record<WuXing, WuXingGuide> = {
  木: {
    colors: ['绿色', '青色'],
    directions: ['东方'],
    numbers: [3, 8],
    industries: ['教育', '出版', '文化', '环保', '家具', '服装'],
    foods: ['绿色蔬菜', '酸味食物', '豆制品'],
    advice: '多接触植物、穿绿色系、东方摆放绿植',
  },
  火: {
    colors: ['红色', '紫色', '橙色'],
    directions: ['南方'],
    numbers: [2, 7],
    industries: ['餐饮', '能源', '电子', '娱乐', '传媒', '化妆品'],
    foods: ['红色食物（红枣、红薯）', '辛香食物（适量）', '温补类（姜茶、桂圆）'],
    advice: '多晒太阳、穿暖色系、南方发展',
  },
  土: {
    colors: ['黄色', '棕色', '咖啡色'],
    directions: ['中部', '西南'],
    numbers: [5, 0],
    industries: ['房地产', '农业', '建筑', '矿业', '陶瓷'],
    foods: ['粗粮', '黄色食物（南瓜、玉米）', '根茎类'],
    advice: '多接触泥土（登山、田园）、穿黄棕色系',
  },
  金: {
    colors: ['白色', '金色', '银色'],
    directions: ['西方', '西北'],
    numbers: [4, 9],
    industries: ['金融', '法律', '机械', 'IT', '汽车', '五金'],
    foods: ['白色食物（百合、莲子）', '坚果', '辛辣适量'],
    advice: '佩戴金属饰品、穿白色系、西方发展',
  },
  水: {
    colors: ['黑色', '深蓝色'],
    directions: ['北方'],
    numbers: [1, 6],
    industries: ['物流', '航运', '水利', '旅游', '咨询', '保险'],
    foods: ['黑色食物（黑芝麻、黑豆）', '海鲜', '汤类'],
    advice: '多亲近水（游泳、湖边）、穿深色系',
  },
};

// ====================================================================
// 五行通用映射 - 从配置加载
// ====================================================================

function getGanToWx(): Record<string, WuXing> {
  const rules = rulesLoader.getYongShenRules();
  const shengKe = rules.rules.shengKe.mapping;
  const result: Record<string, WuXing> = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
    己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  };
  return result;
}

function getWuxingNature(): Record<WuXing, string> {
  const rules = rulesLoader.getConsumerReportRules();
  const wuxingGuide = rules.rules.wuxingGuide;
  const result: Record<WuXing, string> = {};
  for (const wx of Object.keys(wuxingGuide) as Array<keyof typeof wuxingGuide>) {
    result[wx] = wuxingGuide[wx].nature;
  }
  return result;
}

function getWuxingSheng(): Record<WuXing, WuXing> {
  const rules = rulesLoader.getYongShenRules();
  const shengKe = rules.rules.shengKe.mapping;
  const result: Record<WuXing, WuXing> = {};
  for (const wx of Object.keys(shengKe) as Array<keyof typeof shengKe>) {
    result[wx] = shengKe[wx].sheng;
  }
  return result;
}

function getWuxingKe(): Record<WuXing, WuXing> {
  const rules = rulesLoader.getYongShenRules();
  const shengKe = rules.rules.shengKe.mapping;
  const result: Record<WuXing, WuXing> = {};
  for (const wx of Object.keys(shengKe) as Array<keyof typeof shengKe>) {
    result[wx] = shengKe[wx].ke;
  }
  return result;
}

// ====================================================================
// 主入口
// ====================================================================

/**
 * 基于 BaziChart 全字段，自动生成 ConsumerReport
 */
export function generateConsumerReport(chart: BaziChart): ConsumerReport {
  const dayGan = chart.pillars[2].tianGan;
  const ganToWx = getGanToWx();
  const dayWx = ganToWx[dayGan] || '水';
  const naYin = chart.pillars[2].naYin; // 日柱纳音
  const primaryWx = chart.yongShen.primary;
  const secondaryWx = chart.yongShen.secondary;
  const jiWx = chart.yongShen.ji;

  return {
    imagery: buildImagery(naYin, dayGan, dayWx),
    empathy: buildEmpathy(chart, dayGan, dayWx),
    explanation: buildExplanation(chart, dayGan, dayWx),
    guidance: buildGuidance(chart, dayGan, dayWx),
    timeline: buildTimeline(chart, dayWx, primaryWx, secondaryWx),
    luckyGuide: buildLuckyGuide(primaryWx, secondaryWx, dayWx),
    closing: buildClosing(naYin, dayWx, primaryWx),
    otherAreas: buildOtherAreas(chart, dayWx),
  };
}

// ====================================================================
// 1. imagery — 命格意象
// ====================================================================

function buildImagery(naYin: string, dayGan: string, dayWx: WuXing) {
  const naYinMap = getNaYinMap();
  const wuxingNature = getWuxingNature();
  const info = naYinMap[naYin];
  if (info) {
    return {
      title: naYin,
      subtitle: info.subtitle,
      description: info.description,
      keywords: info.keywords,
    };
  }
  // 兜底：未收录的纳音
  return {
    title: naYin || '未知纳音',
    subtitle: `${dayGan}${dayWx}之命`,
    description: `你的命格属「${naYin || '未知'}」，核心能量是${dayWx}——${wuxingNature[dayWx]}。`,
    keywords: [dayWx, wuxingNature[dayWx].split('、')[0], '独特', '待探索'],
  };
}

// ====================================================================
// 2. empathy — 共情段落
// ====================================================================

function buildEmpathy(chart: BaziChart, dayGan: string, dayWx: WuXing) {
  const paragraphs: string[] = [];
  const conclusion = chart.wangShuai.conclusion;
  const isStrong = conclusion.includes('旺');
  const isWeak = conclusion.includes('弱');
  const firePercent = getPercent(chart.wuxingStats, '火');
  const waterPercent = getPercent(chart.wuxingStats, '水');

  // 第一段：基于旺衰的共情
  if (isStrong) {
    paragraphs.push(
      `过去这些年，你大概常有一种"明明付出很多，成果却没有预期那么大"的感受。你的能力不差、执行力也强，但总觉得缺了点什么。这不是你不够努力——你的命格本就是${dayWx}旺，${dayWx}包容一切，却也最容易"自己消耗自己"。`
    );
  } else if (isWeak) {
    paragraphs.push(
      `你可能经常觉得自己要很努力才能跟上别人的节奏，别人轻松能做到的事情你却需要加倍付出。这不是你能力不行——你的命格中${dayWx}气偏弱，需要在后天找到正确的"加油站"来补充能量。`
    );
  } else {
    paragraphs.push(
      `你给人的感觉是"看起来什么都能做，但好像什么都没做到极致"。这不是你不够专注——你的命格本就是中和之象，什么都有一点，关键在于找到那个让你真正闪光的方向。`
    );
  }

  // 第二段：基于五行缺失的共情
  const weakWx = chart.wuxingStats.filter(s => s.percent <= 10 && !chart.yongShen.ji.includes(s.wuxing));
  if (weakWx.length > 0) {
    const wxName = weakWx[0].wuxing;
    const wuxingNature = getWuxingNature();
    const wxMeaning = wuxingNature[wxName];
    paragraphs.push(
      `你也许察觉到，自己在"${wxMeaning.split('、')[0]}"这件事上总是不太顺——不是不想做好，而是命中${wxName}气不足。就像一棵树缺了阳光或水分，不是树不好，是环境需要调整。你需要的不是更多压力，而是主动去寻找${wxName}的能量。`
    );
  }

  // 第三段：温暖收束
  paragraphs.push(
    `请记住：命格不是枷锁，而是说明书。了解自己的"出厂配置"，是为了更好地活出自己——而不是给自己贴标签。接下来的解读，就是帮你读懂这本说明书。`
  );

  return { title: '先生懂你', paragraphs };
}

// ====================================================================
// 3. explanation — 解释段
// ====================================================================

function buildExplanation(chart: BaziChart, dayGan: string, dayWx: WuXing) {
  const paragraphs: string[] = [];
  const terms: Array<{ term: string; meaning: string }> = [];
  const convergenceNotes: string[] = [];

  // 第一段：命局概述
  const monthZhi = chart.pillars[1].diZhi;
  const wuxingNature = getWuxingNature();
  paragraphs.push(
    `你的八字是${dayGan}${dayWx}日主，生在${monthZhi}月。${chart.wangShuai.conclusion}——这决定了你命格的基调。用神方向是${chart.yongShen.primary.join('、')}，这意味着你一生中需要主动靠近${chart.yongShen.primary.map(w => wuxingNature[w].split('、')[0]).join('和')}的能量。`
  );
  terms.push({
    term: `${dayGan}${dayWx}日主`,
    meaning: `代表你这个人的核心能量是"${dayWx}"——${wuxingNature[dayWx]}`,
  });

  // 第二段：基于 keyFindings 的核心洞察（取 red + yellow 级别的）
  const importantFindings = chart.keyFindings.filter(kf => kf.level === 'red' || kf.level === 'yellow');
  if (importantFindings.length > 0) {
    const insights = importantFindings.slice(0, 3).map(kf => {
      // 将专业描述转化为通俗版本
      return convertFindingToInsight(kf, dayWx);
    });
    paragraphs.push(insights.join(''));
  }

  // 第三段：基于 green 级别 keyFindings 的天赋/机会点
  const greenFindings = chart.keyFindings.filter(kf => kf.level === 'green');
  if (greenFindings.length > 0) {
    const opportunities = greenFindings.slice(0, 2).map(kf => convertFindingToOpportunity(kf));
    paragraphs.push(`好消息是：${opportunities.join(' ')}`);
  }

  // 术语列表
  if (chart.yongShen.method === '调候') {
    terms.push({
      term: '调候用神',
      meaning: `${getSeasonName(monthZhi)}的${dayWx}需要${chart.yongShen.primary.join('和')}来平衡，这是你一生需要主动靠近的能量`,
    });
  }

  // 食伤相关术语
  const wuxingSheng = getWuxingSheng();
  const foodWx = wuxingSheng[dayWx];
  const hasFoodStar = chart.keyFindings.some(kf => kf.title.includes('食') || kf.title.includes('伤'));
  if (hasFoodStar) {
    terms.push({
      term: foodWx === '木' ? '伤官/食神' : '食伤',
      meaning: '命中"才华和创造力的输出口"，是你区别于常人的天赋通道',
    });
  }

  // 比劫相关术语
  const hasBiJie = chart.keyFindings.some(kf => kf.title.includes('比劫'));
  if (hasBiJie) {
    terms.push({
      term: '比劫夺财',
      meaning: '命中同类力量过强，容易在合作或情谊里出现利益分配不均的情况',
    });
  }

  // convergenceNotes — 从 keyFindings 中提取 convergence 的通俗版
  for (const kf of chart.keyFindings) {
    if (kf.convergence && kf.convergence.consumerNote) {
      convergenceNotes.push(kf.convergence.consumerNote);
    }
  }

  return { title: '为什么是这样', paragraphs, terms, convergenceNotes };
}

// ====================================================================
// 4. guidance — 出路段
// ====================================================================

function buildGuidance(chart: BaziChart, dayGan: string, dayWx: WuXing) {
  const points: Array<{ heading: string; content: string; isConvergent?: boolean }> = [];
  const wuxingNature = getWuxingNature();
  const wuxingSheng = getWuxingSheng();
  const rules = rulesLoader.getConsumerReportRules();
  const wuxingGuide = rules.rules.wuxingGuide;
  const primaryWxNames = chart.yongShen.primary.map(w => wuxingNature[w].split('、')[0]).join('和');

  // 从 green keyFindings 中提取正面建议
  const greenFindings = chart.keyFindings.filter(kf => kf.level === 'green');
  const yellowFindings = chart.keyFindings.filter(kf => kf.level === 'yellow');

  // Point 1：核心赛道（基于用神方向）
  const foodWx = wuxingSheng[dayWx];
  const hasFoodTalent = greenFindings.some(kf => kf.title.includes('泄秀') || kf.title.includes('天赋'));
  if (hasFoodTalent) {
    points.push({
      heading: '你的核心赛道：发挥天赋做"输出型"工作',
      content: `命中${foodWx}（食伤）正合用神方向，说明你天生有"输出"的天赋。内容创作、文字、设计、教育、咨询、心理、艺术等"靠才华和表达吃饭"的赛道，是命里给你预留的主路。`,
      isConvergent: true,
    });
  } else {
    // 基于用神方向给出通用赛道
    const guideWx = chart.yongShen.primary[0];
    const guide = wuxingGuide[guideWx];
    points.push({
      heading: `你的核心赛道：靠近${guideWx}相关领域`,
      content: `你的用神方向是${guideWx}（${wuxingNature[guideWx]}），推荐的行业方向包括：${guide.industries.join('、')}。在这些领域中你能获得更多正向能量。`,
    });
  }

  // Point 2：贵人画像（基于用神五行）
  const primaryLabels = chart.yongShen.primary.map(w => `${w}型`);
  points.push({
    heading: `你的贵人画像：带"${chart.yongShen.primary.join('""')}"的人`,
    content: `你的贵人不是和你一样的${dayWx}型人，而是${primaryLabels.join('和')}的人——${chart.yongShen.primary.map(w => wuxingNature[w]).join('、')}。多和这类人来往，你的运势会自然好转。`,
    isConvergent: chart.yongShen.convergence !== undefined,
  });

  // Point 3：基于 yellow keyFindings 的警示
  for (const kf of yellowFindings.slice(0, 2)) {
    if (kf.title.includes('比劫') || kf.title.includes('财')) {
      points.push({
        heading: '警惕破财陷阱',
        content: `${kf.description.length > 100 ? kf.description.substring(0, 100) + '……' : kf.description}在合伙、借贷、投资合作上要格外谨慎。`,
        isConvergent: kf.convergence !== undefined,
      });
      break;
    }
  }

  // Point 4：大运窗口（从 green keyFindings 中找大运相关）
  const daYunFinding = greenFindings.find(kf => kf.title.includes('大运') || kf.title.includes('年起'));
  if (daYunFinding) {
    points.push({
      heading: `时间窗口：${daYunFinding.title}`,
      content: daYunFinding.description,
      isConvergent: daYunFinding.convergence !== undefined,
    });
  }

  // 确保至少有 3 条
  if (points.length < 3) {
    points.push({
      heading: '保持你的节奏',
      content: `你的命格特点决定了你不是速成型选手。保持自己的节奏，在用神方向（${chart.yongShen.primary.join('、')}）上持续积累，时间会给你最好的回报。`,
    });
  }

  // 选择 focusArea：默认事业，若有感情相关 keyFindings 则改
  const focusArea: FocusArea = '事业';

  return {
    focusArea,
    title: '事业出路',
    points,
  };
}

// ====================================================================
// 5. timeline — 时间节奏
// ====================================================================

function buildTimeline(
  chart: BaziChart,
  dayWx: WuXing,
  primaryWx: WuXing[],
  secondaryWx: WuXing[],
) {
  const allYongShen = new Set([...primaryWx, ...secondaryWx]);
  const jiWxSet = new Set(chart.yongShen.ji);
  const ganToWx = getGanToWx();

  const nodes = chart.daYuns.slice(0, 6).map(dy => {
    const dyGanWx = ganToWx[dy.ganZhi[0]] || '土';
    const dyZhiWx = getZhiWuXing(dy.ganZhi[1]);

    // 判定 type
    let nodeType: 'good' | 'caution' | 'turning';
    if (allYongShen.has(dyGanWx) && allYongShen.has(dyZhiWx)) {
      nodeType = 'good';
    } else if (jiWxSet.has(dyGanWx) && jiWxSet.has(dyZhiWx)) {
      nodeType = 'caution';
    } else if (allYongShen.has(dyGanWx) || allYongShen.has(dyZhiWx)) {
      nodeType = 'turning';
    } else if (jiWxSet.has(dyGanWx) || jiWxSet.has(dyZhiWx)) {
      nodeType = 'caution';
    } else {
      nodeType = 'turning';
    }

    return {
      year: `${dy.startYear}-${dy.endYear}`,
      ageRange: `${dy.startAge}-${dy.startAge + 9}岁`,
      ganZhi: `${dy.ganZhi}大运`,
      summary: buildDaYunSummary(dy, dyGanWx, nodeType),
      type: nodeType,
    };
  });

  return { title: '你的时间节奏', nodes };
}

// ====================================================================
// 6. luckyGuide — 开运指南
// ====================================================================

function buildLuckyGuide(primaryWx: WuXing[], secondaryWx: WuXing[], dayWx: WuXing) {
  const allGuideWx = [...primaryWx, ...secondaryWx];
  const mergedColors: string[] = [];
  const mergedDirections: string[] = [];
  const mergedNumbers: number[] = [];
  const mergedIndustries: string[] = [];
  const mergedFoods: string[] = [];
  const rules = rulesLoader.getConsumerReportRules();
  const wuxingGuide = rules.rules.wuxingGuide;
  const wuxingNature = getWuxingNature();

  for (const wx of allGuideWx) {
    const guide = wuxingGuide[wx];
    for (const c of guide.colors) if (!mergedColors.includes(c)) mergedColors.push(c);
    for (const d of guide.directions) if (!mergedDirections.includes(d)) mergedDirections.push(d);
    for (const n of guide.numbers) if (!mergedNumbers.includes(n)) mergedNumbers.push(n);
    for (const i of guide.industries) if (!mergedIndustries.includes(i)) mergedIndustries.push(i);
    for (const f of guide.foods) if (!mergedFoods.includes(f)) mergedFoods.push(f);
  }

  // 贵人画像
  const primaryLabels = primaryWx.map(w => `${wuxingNature[w].split('、')[0]}型的"${w}"型人`);
  const nobleman = `${primaryLabels.join('，或')}；年长的、能给你温暖和方向感的人是你的关键贵人`;

  return {
    colors: mergedColors.slice(0, 5),
    directions: mergedDirections.slice(0, 3),
    numbers: mergedNumbers.slice(0, 4),
    industries: mergedIndustries.slice(0, 6),
    foods: mergedFoods.slice(0, 4),
    nobleman,
  };
}

// ====================================================================
// 7. closing — 温暖结语
// ====================================================================

function buildClosing(naYin: string, dayWx: WuXing, primaryWx: WuXing[]) {
  const wuxingNature = getWuxingNature();
  const wxAdvice = primaryWx.map(w => wuxingNature[w].split('、')[0]).join('和');
  const paragraphs = [
    `${naYin}的命格，注定你不是一眼就能被看透的人。你的深度是你最大的礼物，也是你需要学会驾驭的力量——别人看不懂你没关系，重要的是你自己慢慢看懂自己。`,
    `请记住：你命中最需要的能量是${primaryWx.join('和')}——请主动去靠近那些让你感受到${wxAdvice}的人和事。这不是迷信，是你命格给你指出的最优路径。`,
    `前半生的积累都不会白费；每一份沉淀，都在为你后面的精彩蓄力。慢慢来，不晚。`,
  ];

  return { paragraphs };
}

// ====================================================================
// 8. otherAreas — 其他领域简评
// ====================================================================

function buildOtherAreas(chart: BaziChart, dayWx: WuXing) {
  const wuxingKe = getWuxingKe();
  const caiWx = wuxingKe[dayWx]; // 财星五行
  const guanWx = getGuanWx(dayWx); // 官星五行（克我者）
  const caiPercent = getPercent(chart.wuxingStats, caiWx);
  const isStrong = chart.wangShuai.conclusion.includes('旺');
  const hasBiJie = chart.keyFindings.some(kf => kf.title.includes('比劫'));

  const areas: Array<{ area: FocusArea; summary: string }> = [
    {
      area: '感情',
      summary: buildLoveSummary(chart, dayWx, isStrong),
    },
    {
      area: '财运',
      summary: buildWealthSummary(caiPercent, hasBiJie, isStrong, caiWx),
    },
    {
      area: '健康',
      summary: buildHealthSummary(dayWx, isStrong),
    },
    {
      area: '人际',
      summary: buildSocialSummary(chart, dayWx),
    },
  ];

  return areas;
}

// ====================================================================
// 辅助函数
// ====================================================================

function getPercent(stats: readonly { wuxing: WuXing; percent: number }[], wx: WuXing): number {
  return stats.find(s => s.wuxing === wx)?.percent ?? 0;
}

function getSeasonName(monthZhi: string): string {
  if (['寅', '卯'].includes(monthZhi)) return '春';
  if (['巳', '午'].includes(monthZhi)) return '夏';
  if (['申', '酉'].includes(monthZhi)) return '秋';
  if (['亥', '子'].includes(monthZhi)) return '冬';
  return '季月';
}

function getZhiWuXing(zhi: string): WuXing {
  const MAP: Record<string, WuXing> = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
  };
  return MAP[zhi] || '土';
}

function getGuanWx(dayWx: WuXing): WuXing {
  // 克我者为官杀
  const KE_WO: Record<WuXing, WuXing> = {
    木: '金', 火: '水', 土: '木', 金: '火', 水: '土',
  };
  return KE_WO[dayWx];
}

function convertFindingToInsight(kf: KeyFinding, dayWx: WuXing): string {
  // 将 keyFinding 转化为通俗的解释段落句子
  if (kf.title.includes('极旺') || kf.title.includes('极弱')) {
    const isStrong = kf.title.includes('旺');
    return `你的命格中${dayWx}气${isStrong ? '极旺' : '极弱'}——这意味着${isStrong ? '你内在力量充沛，但需要找到释放和平衡的出口' : '你需要在后天环境中不断补充能量'}。`;
  }
  if (kf.title.includes('调候') || kf.title.includes('寒凝') || kf.title.includes('炎热')) {
    return `命局中有"寒暖失调"的特征——${kf.description.substring(0, 80)}。`;
  }
  if (kf.title.includes('比劫') || kf.title.includes('财')) {
    return `在财务和合作方面需要特别注意——${kf.description.substring(0, 80)}。`;
  }
  return `${kf.description.substring(0, 80)}。`;
}

function convertFindingToOpportunity(kf: KeyFinding): string {
  if (kf.title.includes('天赋') || kf.title.includes('泄秀')) {
    return `你命中有独特的天赋点——${kf.description.substring(0, 60)}。`;
  }
  if (kf.title.includes('贵人') || kf.title.includes('将星') || kf.title.includes('魁罡')) {
    return `你命带吉神——${kf.description.substring(0, 60)}。`;
  }
  if (kf.title.includes('大运')) {
    return `未来有重要的运势窗口——${kf.description.substring(0, 60)}。`;
  }
  return `${kf.description.substring(0, 60)}。`;
}

function buildDaYunSummary(dy: DaYun, dyGanWx: WuXing, nodeType: 'good' | 'caution' | 'turning'): string {
  const base = dy.brief || `${dy.shiShen}大运，${dyGanWx}气当令。`;
  if (nodeType === 'good') return `${dy.shiShen}大运。${base}`;
  if (nodeType === 'caution') return `${dy.shiShen}大运。${base} 此阶段需谨慎行事，避免冲动决策。`;
  return `${dy.shiShen}大运。${base} 转折期，可能面临重要抉择。`;
}

function buildLoveSummary(chart: BaziChart, dayWx: WuXing, isStrong: boolean): string {
  const hasYinYangChaoCuo = chart.shenShas.some(s => s.name === '阴阳差错');
  const hasTaoHua = chart.shenShas.some(s => s.name.includes('桃花'));
  const wuxingNature = getWuxingNature();

  let summary = `感情上你需要`;
  const yongWxLabels = chart.yongShen.primary.map(w => `${wuxingNature[w].split('、')[0]}`);
  summary += `"${yongWxLabels.join('、')}"类型的伴侣。`;

  if (hasTaoHua) summary += '命带桃花，异性缘不差，关键在于选对人。';
  if (hasYinYangChaoCuo) summary += '命带阴阳差错，婚姻路上可能有些波折，但以平常心对待，反而能收获更深的感情。';
  if (!hasTaoHua && !hasYinYangChaoCuo) summary += '感情运势总体平稳，在用神方向的大运期间容易遇到合适的人。';

  return summary;
}

function buildWealthSummary(caiPercent: number, hasBiJie: boolean, isStrong: boolean, caiWx: WuXing): string {
  let summary = '';
  if (caiPercent <= 10) {
    summary += `${caiWx}（财星）在命局中偏弱，不是暴富之命但能稳步积累。`;
  } else if (caiPercent >= 25) {
    summary += `${caiWx}（财星）在命局中有力，财运基础不错。`;
  } else {
    summary += `财运中等，不偏不倚。`;
  }

  if (hasBiJie) {
    summary += '一生忌合伙、忌借贷、忌"为情破财"。独立理财更适合你。';
  }

  if (isStrong) {
    summary += '命格旺势有余力去赚钱，关键是选对方向、避免散财。';
  }

  return summary;
}

function buildHealthSummary(dayWx: WuXing, isStrong: boolean): string {
  const HEALTH_MAP: Record<WuXing, string> = {
    木: '需关注肝胆系统、视力、情绪波动；多接触自然、保持作息规律。',
    火: '需关注心血管、眼睛、炎症；避免过度劳累，保持情绪稳定。',
    土: '需关注脾胃消化系统；饮食规律、少食生冷，多运动促进代谢。',
    金: '需关注肺部呼吸系统、皮肤、大肠；保持空气清新，适当有氧运动。',
    水: '需关注肾脏、泌尿系统、骨骼；注意保暖、规律运动、多晒太阳。',
  };
  let summary = HEALTH_MAP[dayWx];
  if (isStrong) summary += `${dayWx}旺者易有${dayWx === '水' ? '湿寒' : dayWx === '火' ? '上火' : '过旺'}倾向，需注意调节。`;
  return summary;
}

function buildSocialSummary(chart: BaziChart, dayWx: WuXing): string {
  const hasBiJie = chart.keyFindings.some(kf => kf.title.includes('比劫'));
  const hasTianYi = chart.shenShas.some(s => s.name === '天乙贵人');

  let summary = '朋友质量远比数量重要。';
  if (hasTianYi) summary += '命带天乙贵人，一生多贵人扶持，善待身边每一个帮助过你的人。';
  if (hasBiJie) summary += `多与${chart.yongShen.primary.map(w => `${w}型`).join('、')}的人来往，少与同类型扎堆。`;
  summary += `你最好的社交策略是"少而精、深而稳"。`;

  return summary;
}
