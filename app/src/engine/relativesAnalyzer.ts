/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 六亲细论分析器（Relatives Analyzer）
//
// 命理学方法论（子平传统六亲口诀）：
//   §10.1 六亲十神映射：
//     - 父：偏财（克我之同性）
//     - 母：正印（生我之异性）
//     - 兄弟姐妹：比肩、劫财（同我者）
//     - 配偶：男 = 正/偏财，女 = 正/七杀（已在 M3 处理）
//     - 子女：男 = 七杀（女）/正官（男），女命：食神/伤官
//   §10.2 六亲宫位：
//     - 年柱：祖辈/父母（远辈大环境）
//     - 月柱：父母/兄弟（直接养育者）
//     - 日支：配偶（已在 M3 处理）
//     - 时柱：子女/晚辈
//   §10.3 亲缘厚薄判定：
//     - 对应十神显象有力 + 在对应宫位 = 亲缘厚（5星）
//     - 显象有力但不在对应宫 = 亲缘可（4星）
//     - 显象虚弱 = 亲缘一般（3星）
//     - 空亡或不见 = 亲缘薄（2星）
//     - 被冲克严重 = 亲缘极薄/早离（1星）

import type {
  ChartRelations,
  DiZhi,
  Gender,
  ManifestLevel,
  Pillar,
  RelativeInfo,
  RelativesAnalysis,
  ShiShen,
  ShiShenManifestation,
  TianGan,
  WuXing,
} from '../types/bazi';

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const GAN_YIN_YANG: Record<TianGan, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};
const KE_MAP: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const SHENG_MAP: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

function computeShiShen(dayGan: TianGan, otherGan: TianGan): ShiShen {
  if (dayGan === otherGan) return '比肩';
  const dayWx = GAN_TO_WX[dayGan];
  const otherWx = GAN_TO_WX[otherGan];
  const sameYy = GAN_YIN_YANG[dayGan] === GAN_YIN_YANG[otherGan];
  if (otherWx === dayWx) return sameYy ? '比肩' : '劫财';
  if (SHENG_MAP[dayWx] === otherWx) return sameYy ? '食神' : '伤官';
  if (KE_MAP[dayWx] === otherWx) return sameYy ? '偏财' : '正财';
  if (KE_MAP[otherWx] === dayWx) return sameYy ? '七杀' : '正官';
  if (SHENG_MAP[otherWx] === dayWx) return sameYy ? '偏印' : '正印';
  return '比肩';
}

function getLevel(manif: readonly ShiShenManifestation[], ss: ShiShen): ManifestLevel {
  return manif.find((m) => m.shiShen === ss)?.level ?? 'absent';
}

/** 检测某十神是否在指定宫位（年/月/日/时柱）藏于天干或地支 */
function isShiShenInPalace(
  dayGan: TianGan,
  pillar: Pillar,
  targetShiShen: ShiShen,
): boolean {
  // 检查天干
  if (computeShiShen(dayGan, pillar.tianGan as TianGan) === targetShiShen) return true;
  // 检查藏干
  for (const cg of pillar.cangGan) {
    if (computeShiShen(dayGan, cg.gan as TianGan) === targetShiShen) return true;
  }
  return false;
}

/** 检测某宫位地支是否被冲 */
function isPalaceBeingChong(palaceZhi: DiZhi, relations: ChartRelations): boolean {
  for (const c of relations.zhiChong) {
    if (c.zhiA === palaceZhi || c.zhiB === palaceZhi) return true;
  }
  return false;
}

// ============================================================
// 单个亲缘画像分析
// ============================================================
function analyzeRelative(
  role: RelativeInfo['role'],
  shiShen: ShiShen,
  palace: RelativeInfo['palace'],
  dayGan: TianGan,
  pillars: readonly Pillar[],
  manifestation: readonly ShiShenManifestation[],
  relations: ChartRelations,
): RelativeInfo {
  const level = getLevel(manifestation, shiShen);

  // 取宫位对应的 Pillar
  const palaceIdxMap: Record<RelativeInfo['palace'], number> = {
    年柱: 0, 月柱: 1, 日支: 2, 时柱: 3,
  };
  const palacePillar = pillars[palaceIdxMap[palace]];
  const palaceZhi = palacePillar.diZhi as DiZhi;

  // 在宫位中是否能见
  const inPalace = isShiShenInPalace(dayGan, palacePillar, shiShen);
  // 宫位是否被冲
  const palaceChong = isPalaceBeingChong(palaceZhi, relations);
  // 宫位是否落空亡（hitPositions 中是否有此地支命中空亡）
  const palaceEmpty = relations.xunKong.hitPositions.some((hit) => hit.zhi === palaceZhi);

  // 评分：基础按显象级别，加宫位匹配，扣冲/空亡
  let score = 3;
  if (level === 'manifest-strong') score = 5;
  else if (level === 'hidden-strong') score = 4;
  else if (level === 'manifest-weak') score = 3;
  else if (level === 'hidden-weak') score = 2.5;
  else if (level === 'absent') score = 2;
  else if (level === 'absent-empty') score = 1.5;

  // 宫位匹配加分
  if (inPalace) score += 0.5;
  // 宫位被冲扣分
  if (palaceChong) score -= 1;
  // 宫位落空亡扣分
  if (palaceEmpty) score -= 0.8;

  const finalScore = Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
  const labelMap: Record<1 | 2 | 3 | 4 | 5, RelativeInfo['closenessLabel']> = {
    5: '极亲', 4: '亲密', 3: '一般', 2: '疏远', 1: '极疏/早离',
  };
  const closenessLabel = labelMap[finalScore];

  // 描述
  let description = '';
  if (level === 'absent-empty') {
    description = `${role}星${shiShen}空亡，${role}缘极薄，主早离/感情疏远/或对方多病`;
  } else if (level === 'absent') {
    description = `${role}星${shiShen}原局未现，${role}缘较淡，需主动经营`;
  } else if (level === 'manifest-strong') {
    description = `${role}星${shiShen}透干通根有力，${role}缘深厚，得${role}庇佑/扶助`;
  } else if (level === 'hidden-strong') {
    description = `${role}星${shiShen}藏支本气有力，${role}缘稳固但低调，关系亲近`;
  } else if (level === 'manifest-weak') {
    description = `${role}星${shiShen}透干无根，${role}缘表面亲近实则虚浮`;
  } else {
    description = `${role}星${shiShen}藏支余气，${role}缘一般`;
  }

  if (inPalace) description += `；${shiShen}恰落${role}宫（${palace}），位星合一更显亲缘`;
  if (palaceChong) description += `；${role}宫${palaceZhi}被冲，${role}易远离/分离/聚少离多`;
  if (palaceEmpty) description += `；${role}宫${palaceZhi}落空亡，${role}缘有"虚位"之象`;

  return {
    role,
    shiShen,
    level,
    palace,
    closenessScore: finalScore,
    closenessLabel,
    description,
  };
}

// ============================================================
// 主入口
// ============================================================
export function analyzeRelatives(
  gender: Gender,
  pillars: readonly Pillar[],
  relations: ChartRelations,
): RelativesAnalysis {
  const dayGan = pillars[2].tianGan as TianGan;
  const manifestation = relations.manifestation;

  // 父：偏财，宫位年柱
  const father = analyzeRelative('父亲', '偏财', '年柱', dayGan, pillars, manifestation, relations);
  // 母：正印，宫位月柱（古法亦有用年柱）
  const mother = analyzeRelative('母亲', '正印', '月柱', dayGan, pillars, manifestation, relations);
  // 兄弟姐妹：比肩（劫财作为补充），宫位月柱
  const siblings = analyzeRelative('兄弟姐妹', '比肩', '月柱', dayGan, pillars, manifestation, relations);
  // 子女：男命=正官（女儿）/七杀（儿子）→ 取主官 / 女命=食神（女儿）/伤官（儿子）→ 取食神
  const childrenShiShen: ShiShen = gender === '男' ? '正官' : '食神';
  const children = analyzeRelative('子女', childrenShiShen, '时柱', dayGan, pillars, manifestation, relations);

  // 综合评分（4 项均值）
  const avgScore = (father.closenessScore + mother.closenessScore + siblings.closenessScore + children.closenessScore) / 4;
  const qualityScore = Math.max(1, Math.min(5, Math.round(avgScore))) as 1 | 2 | 3 | 4 | 5;
  const overallLabelMap: Record<1 | 2 | 3 | 4 | 5, RelativesAnalysis['qualityLabel']> = {
    5: '六亲俱全', 4: '亲缘和睦', 3: '亲缘一般', 2: '亲缘较疏', 1: '六亲缘薄',
  };
  const qualityLabel = overallLabelMap[qualityScore];

  // 优势
  const highlights: string[] = [];
  for (const r of [father, mother, siblings, children]) {
    if (r.closenessScore >= 4) highlights.push(`${r.role}缘${r.closenessLabel}（${r.shiShen}${shortLevel(r.level)}）`);
  }
  if (qualityScore >= 4) highlights.push(`整体六亲缘分${qualityLabel}`);

  // 提醒
  const reminders: string[] = [];
  for (const r of [father, mother, siblings, children]) {
    if (r.closenessScore <= 2) {
      reminders.push(`【${r.role}缘${r.closenessLabel}】${r.shiShen}${shortLevel(r.level)}，需主动维系或心理建设`);
    }
  }

  // 综合判词
  let summary = `日主${dayGan}（${GAN_TO_WX[dayGan]}）${gender}命。`;
  summary += `父（偏财·${shortLevel(father.level)}）${father.closenessLabel}、`;
  summary += `母（正印·${shortLevel(mother.level)}）${mother.closenessLabel}、`;
  summary += `兄弟（比肩·${shortLevel(siblings.level)}）${siblings.closenessLabel}、`;
  summary += `子女（${childrenShiShen}·${shortLevel(children.level)}）${children.closenessLabel}。`;
  summary += `综合评定：六亲【${qualityLabel}】（${qualityScore}/5）。`;
  const closest = [father, mother, siblings, children].sort((a, b) => b.closenessScore - a.closenessScore)[0];
  if (closest.closenessScore >= 4) summary += `最深缘分：${closest.role}（${closest.shiShen}${shortLevel(closest.level)}）。`;
  const distant = [father, mother, siblings, children].sort((a, b) => a.closenessScore - b.closenessScore)[0];
  if (distant.closenessScore <= 2) summary += `最薄缘分：${distant.role}（需特别留意维系）。`;

  return {
    gender,
    father,
    mother,
    siblings,
    children,
    qualityScore,
    qualityLabel,
    summary,
    highlights,
    reminders,
  };
}

function shortLevel(level: ManifestLevel): string {
  switch (level) {
    case 'manifest-strong': return '透·强';
    case 'manifest-weak':   return '透·虚';
    case 'hidden-strong':   return '藏·实';
    case 'hidden-weak':     return '藏·余';
    case 'absent-empty':    return '空亡';
    case 'absent':          return '未现';
  }
}