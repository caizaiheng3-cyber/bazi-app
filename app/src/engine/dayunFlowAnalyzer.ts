/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 大运流年关系联动分析（DaYun Flow Analyzer）
//
// 命理学原理：
//   - 大运是命运的"阶段背景"，每 10 年改写一次背景五行
//   - 大运干支与原局四柱发生 8 种作用关系 → 触发原本静态的命局格局变化
//   - 流年是临时变量，与大运 + 原局叠加可触发关键事件
//
// 方法论严格对照《命理分析方法论.md》：
//   §1.3 天干合化与相冲（适用于大运干 vs 原局干）
//   §1.4 地支六合/六冲/三合/半三合/三刑（适用于大运支 vs 原局支）
//   §1.5 旬空填实（大运/流年带来空亡支 → 该位激活）
//   §3.5 远近权重 + 合解冲 + 用神判分
//
// 设计选择：
//   不复用 relationAnalyzer 的内部 detector（它们专为"四柱内部"设计），
//   而是实现一套"大运 vs 原局"专用的轻量检测，因为：
//   1. 大运无须像原局那样判"月令支持化神"（大运干支本身代表运势力量）
//   2. 大运需要新增"伏吟/反吟/填实空亡"三种特有概念
//   3. 不动 relationAnalyzer 可保证原局回归测试不受影响

import type {
  ChartRelations,
  DaYun,
  DaYunFlow,
  DaYunRelation,
  DiZhi,
  LifeTimeline,
  LifeTimelineSegment,
  LiuNianHint,
  Pillar,
  PillarPosition,
  RelationStrength,
  TianGan,
  WuXing,
  YongShen,
} from '../types/bazi';

// ============================================================
// 静态规则表（与 relationAnalyzer 同源，但本模块独立持有以避免循环依赖）
// ============================================================

const GAN_TO_WX: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const ZHI_TO_WX: Record<string, WuXing> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 亥: '水', 子: '水',
  辰: '土', 未: '土', 戌: '土', 丑: '土',
};

/** 天干五合表 */
const GAN_HE_PAIRS: Array<{ pair: [TianGan, TianGan]; hua: WuXing }> = [
  { pair: ['甲', '己'], hua: '土' },
  { pair: ['乙', '庚'], hua: '金' },
  { pair: ['丙', '辛'], hua: '水' },
  { pair: ['丁', '壬'], hua: '木' },
  { pair: ['戊', '癸'], hua: '火' },
];

/** 天干相冲表 */
const GAN_CHONG_PAIRS: Array<[TianGan, TianGan]> = [
  ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'],
];

/** 地支六合表 */
const ZHI_LIU_HE: Array<{ pair: [DiZhi, DiZhi]; hua: WuXing }> = [
  { pair: ['子', '丑'], hua: '土' },
  { pair: ['寅', '亥'], hua: '木' },
  { pair: ['卯', '戌'], hua: '火' },
  { pair: ['辰', '酉'], hua: '金' },
  { pair: ['巳', '申'], hua: '水' },
  { pair: ['午', '未'], hua: '火' },
];

/** 地支六冲表 */
const ZHI_CHONG_PAIRS: Array<[DiZhi, DiZhi]> = [
  ['子', '午'], ['卯', '酉'], ['寅', '申'],
  ['巳', '亥'], ['辰', '戌'], ['丑', '未'],
];

/** 地支三合 / 半三合表（[生支, 旺支, 库支] → 化神） */
const SAN_HE: Array<{ members: [DiZhi, DiZhi, DiZhi]; hua: WuXing }> = [
  { members: ['亥', '卯', '未'], hua: '木' },
  { members: ['寅', '午', '戌'], hua: '火' },
  { members: ['巳', '酉', '丑'], hua: '金' },
  { members: ['申', '子', '辰'], hua: '水' },
];

/** 地支三刑表 */
const SAN_XING: Array<{ members: DiZhi[]; name: string }> = [
  { members: ['寅', '巳', '申'], name: '寅巳申无恩之刑' },
  { members: ['丑', '戌', '未'], name: '丑戌未恃势之刑' },
  { members: ['子', '卯'], name: '子卯无礼之刑' },
];

/** 地支自刑 */
const ZI_XING: DiZhi[] = ['辰', '午', '酉', '亥'];

/** 暗合表 */
const AN_HE_PAIRS: Array<{ pair: [DiZhi, DiZhi]; hiddenGanHe: string; hua: WuXing }> = [
  { pair: ['寅', '丑'], hiddenGanHe: '甲己合', hua: '土' },
  { pair: ['卯', '申'], hiddenGanHe: '乙庚合', hua: '金' },
  { pair: ['午', '亥'], hiddenGanHe: '丁壬合', hua: '木' },
  { pair: ['巳', '酉'], hiddenGanHe: '丙辛合', hua: '水' },
];

const POS_LABEL = ['年', '月', '日', '时'] as const;

// ============================================================
// 工具函数
// ============================================================

function posLabel(pos: PillarPosition): string {
  return POS_LABEL[pos];
}

/** 大运与某柱的距离权重 → 关系作用力 */
function dayunStrengthByPos(pos: PillarPosition): RelationStrength {
  // 命理学：大运与日柱关系最重（紧贴日主），月柱次之
  if (pos === 2) return 'strong';
  if (pos === 1 || pos === 3) return 'medium';
  return 'weak';
}

/** 解析大运干支字符串 → [天干, 地支] */
function parseGanZhi(gz: string): [TianGan, DiZhi] {
  return [gz[0] as TianGan, gz[1] as DiZhi];
}

// ============================================================
// 大运 vs 原局的关系检测
// ============================================================

/**
 * 检测大运天干与原局四干的合化/合不化/相冲
 *
 * 命理学原理（《命理分析方法论》§1.3.2 + §3.5.3）：
 * 大运天干合化是否成立 = 三个条件并满足：
 *   1. 邻位（大运视作"月柱右侧虚位"，仅与月干/日干视为紧贴邻位）
 *   2. 化神在原局地支有根（与原局静态合化的判定一致）
 *   3. 月令为化神之气或四库土
 * 否则按"合而不化"论，主合住、羁绊。
 */
function detectDaYunGanRelations(
  dayunGan: TianGan,
  pillars: readonly Pillar[],
): DaYunRelation[] {
  const relations: DaYunRelation[] = [];
  const monthZhi = pillars[1].diZhi as DiZhi;
  // 化神得令所需月支表（与 relationAnalyzer 同源，但精简到与本模块所需）
  const HUA_MONTH_SUPPORT: Record<WuXing, DiZhi[]> = {
    土: ['辰', '戌', '丑', '未', '巳', '午'],
    金: ['申', '酉', '辰', '戌', '丑'],
    水: ['亥', '子', '辰', '丑'],
    木: ['寅', '卯', '亥', '未'],
    火: ['巳', '午', '寅', '戌'],
  };

  for (let i = 0; i < pillars.length; i++) {
    const ganP = pillars[i].tianGan as TianGan;

    // 五合判定
    const heMatch = GAN_HE_PAIRS.find(
      (h) => (h.pair[0] === dayunGan && h.pair[1] === ganP) ||
             (h.pair[1] === dayunGan && h.pair[0] === ganP),
    );
    if (heMatch) {
      const isDayPos = i === 2;
      const isMonthPos = i === 1;

      // 合化条件 1：邻位（大运视作时柱之后的"第五柱"，与日柱/时柱算紧贴；
      //                  也可视作月柱之前虚位，与年柱/月柱算紧贴）
      // 综合命理学口径：大运与月干、日干合视为紧贴；与年干、时干合视为隔位
      const isAdjacent = isMonthPos || isDayPos;
      // 合化条件 2：化神在原局地支有根
      const huaHasRoot = pillars.some((p) => ZHI_TO_WX[p.diZhi] === heMatch.hua);
      // 合化条件 3：月令支持化神
      const monthSupport = HUA_MONTH_SUPPORT[heMatch.hua].includes(monthZhi);

      const huaSuccess = isAdjacent && huaHasRoot && monthSupport;

      if (huaSuccess) {
        relations.push({
          kind: '大运合化',
          withPos: i as PillarPosition,
          hua: heMatch.hua,
          strength: 'strong',
          description: isDayPos
            ? `大运天干${dayunGan}与日干${ganP}合化${heMatch.hua}成功（月令${monthZhi}得令、${heMatch.hua}有根）：日主此运临时改性为${heMatch.hua}，整个十年的人生气质和事业方向发生根本转向`
            : `大运天干${dayunGan}与${posLabel(i as PillarPosition)}干${ganP}合化${heMatch.hua}成功：${heMatch.hua}气在此运实质增强，命局格局可能临时改变`,
        });
      } else {
        // 合而不化的具体原因（用于 description）
        const reason: string[] = [];
        if (!isAdjacent) reason.push(`大运与${posLabel(i as PillarPosition)}干非紧贴`);
        if (!huaHasRoot) reason.push(`化神${heMatch.hua}在原局无根`);
        if (!monthSupport) reason.push(`月令${monthZhi}不支持化${heMatch.hua}`);

        relations.push({
          kind: '大运合而不化',
          withPos: i as PillarPosition,
          hua: heMatch.hua,
          strength: dayunStrengthByPos(i as PillarPosition),
          description: isDayPos
            ? `大运天干${dayunGan}与日干${ganP}相合（化${heMatch.hua}不成：${reason.join('、')}）：合住日主，命主此运易被环境裹挟、决策力受牵制`
            : `大运天干${dayunGan}与${posLabel(i as PillarPosition)}干${ganP}相合（化${heMatch.hua}不成：${reason.join('、')}）：合住该柱之神，影响该位人事`,
        });
      }
      continue;
    }

    // 相冲判定（修复：使用专用的 '大运天干相冲' kind，不再误用 '大运地支六冲'）
    const chongMatch = GAN_CHONG_PAIRS.find(
      (c) => (c[0] === dayunGan && c[1] === ganP) ||
             (c[1] === dayunGan && c[0] === ganP),
    );
    if (chongMatch) {
      const isDayPos = i === 2;
      relations.push({
        kind: '大运天干相冲',
        withPos: i as PillarPosition,
        strength: dayunStrengthByPos(i as PillarPosition),
        description: isDayPos
          ? `大运天干${dayunGan}冲日干${ganP}：直接冲击日主，此运易有重大变动、健康/事业波动`
          : `大运天干${dayunGan}冲${posLabel(i as PillarPosition)}干${ganP}：冲击该柱之神，影响该位人事`,
      });
    }
  }
  return relations;
}

/**
 * 检测大运地支与原局四支的合化/六合/六冲/三刑/暗合/伏吟/反吟
 */
function detectDaYunZhiRelations(
  dayunZhi: DiZhi,
  pillars: readonly Pillar[],
): DaYunRelation[] {
  const relations: DaYunRelation[] = [];

  for (let i = 0; i < pillars.length; i++) {
    const zhiP = pillars[i].diZhi as DiZhi;
    const isDayPos = i === 2;
    const strength = dayunStrengthByPos(i as PillarPosition);

    // 伏吟（同支相见）
    if (dayunZhi === zhiP) {
      relations.push({
        kind: '大运伏吟',
        withPos: i as PillarPosition,
        strength,
        description: isDayPos
          ? `大运地支${dayunZhi}与日支${zhiP}伏吟：自身伏吟，命主此运多有"重复旧事/旧痛复发/老问题再现"之象`
          : `大运地支${dayunZhi}与${posLabel(i as PillarPosition)}支${zhiP}伏吟：${posLabel(i as PillarPosition)}柱之事重复出现`,
      });
      continue;
    }

    // 反吟（与日支冲）
    if (isDayPos) {
      const chongMatch = ZHI_CHONG_PAIRS.find(
        (c) => (c[0] === dayunZhi && c[1] === zhiP) ||
               (c[1] === dayunZhi && c[0] === zhiP),
      );
      if (chongMatch) {
        relations.push({
          kind: '大运反吟',
          withPos: 2,
          strength: 'strong',
          description: `大运地支${dayunZhi}冲日支${zhiP}（反吟）：冲动配偶宫，此运婚姻易有大变动、迁移搬迁、健康波动；命理学谓"反吟伏吟，泪流不止"`,
        });
        continue;
      }
    }

    // 六冲（非日支）
    const chongMatch = ZHI_CHONG_PAIRS.find(
      (c) => (c[0] === dayunZhi && c[1] === zhiP) ||
             (c[1] === dayunZhi && c[0] === zhiP),
    );
    if (chongMatch) {
      relations.push({
        kind: '大运地支六冲',
        withPos: i as PillarPosition,
        strength,
        description: `大运地支${dayunZhi}冲${posLabel(i as PillarPosition)}支${zhiP}：冲击${posLabel(i as PillarPosition)}柱之神，激活该位事件`,
      });
      continue;
    }

    // 六合
    const liuHe = ZHI_LIU_HE.find(
      (h) => (h.pair[0] === dayunZhi && h.pair[1] === zhiP) ||
             (h.pair[1] === dayunZhi && h.pair[0] === zhiP),
    );
    if (liuHe) {
      relations.push({
        kind: '大运地支六合',
        withPos: i as PillarPosition,
        hua: liuHe.hua,
        strength,
        description: isDayPos
          ? `大运地支${dayunZhi}与日支${zhiP}六合化${liuHe.hua}：合配偶宫，此运感情升温/婚姻信号显著（已婚者需防外遇桃花）`
          : `大运地支${dayunZhi}与${posLabel(i as PillarPosition)}支${zhiP}六合化${liuHe.hua}：合住该柱，${liuHe.hua}气暗增`,
      });
      continue;
    }

    // 三合 / 半三合（大运支 + 原局两支构成完整三合 → 三合成局；+ 原局一支 → 半三合）
    // 这里只判半三合（大运支与原局某支构成生旺 / 旺库 / 生库其中一对）
    for (const sh of SAN_HE) {
      const [sheng, wang, ku] = sh.members;
      // 半三合的有效组合：生+旺、旺+库
      const halfPairs: Array<[DiZhi, DiZhi]> = [[sheng, wang], [wang, ku]];
      for (const [a, b] of halfPairs) {
        if ((dayunZhi === a && zhiP === b) || (dayunZhi === b && zhiP === a)) {
          relations.push({
            kind: '大运地支半三合',
            withPos: i as PillarPosition,
            hua: sh.hua,
            strength,
            description: `大运地支${dayunZhi}与${posLabel(i as PillarPosition)}支${zhiP}半合${sh.hua}局：${sh.hua}气大增，影响命局力量平衡`,
          });
        }
      }
      // 完整三合：大运支 + 原局有另两支
      if (sh.members.includes(dayunZhi)) {
        const otherTwo = sh.members.filter((m) => m !== dayunZhi);
        const allOriginalZhis = pillars.map((p) => p.diZhi);
        if (otherTwo.every((m) => allOriginalZhis.includes(m))) {
          // 已经包含上面的半合记录，但这里再加一条"完整三合"高权重事件
          relations.push({
            kind: '大运地支三合',
            withPos: i as PillarPosition,
            hua: sh.hua,
            strength: 'strong',
            description: `大运地支${dayunZhi}补全原局${otherTwo.join('、')} → 三合${sh.hua}局成势：此运${sh.hua}气压倒全盘，命局格局可能临时改变`,
          });
          break; // 一组三合记录一次即可
        }
      }
    }

    // 三刑
    for (const xing of SAN_XING) {
      if (xing.members.includes(dayunZhi) && xing.members.includes(zhiP) && dayunZhi !== zhiP) {
        relations.push({
          kind: '大运地支三刑',
          withPos: i as PillarPosition,
          strength,
          description: `大运地支${dayunZhi}与${posLabel(i as PillarPosition)}支${zhiP}构成${xing.name}：刑事/官非/手术/纠纷信号`,
        });
        break;
      }
    }

    // 自刑（仅当大运支 == 原局某支构成自刑组合）
    if (ZI_XING.includes(dayunZhi) && dayunZhi === zhiP) {
      // 已被伏吟记录，但补一条"自刑"以加强语义
      relations.push({
        kind: '大运地支三刑',
        withPos: i as PillarPosition,
        strength,
        description: `大运地支${dayunZhi}与${posLabel(i as PillarPosition)}支${zhiP}自刑：自寻烦恼/内耗/自我冲突`,
      });
    }

    // 暗合
    const anHe = AN_HE_PAIRS.find(
      (a) => (a.pair[0] === dayunZhi && a.pair[1] === zhiP) ||
             (a.pair[1] === dayunZhi && a.pair[0] === zhiP),
    );
    if (anHe) {
      relations.push({
        kind: '大运地支暗合',
        withPos: i as PillarPosition,
        hua: anHe.hua,
        strength,
        description: isDayPos
          ? `大运地支${dayunZhi}与日支${zhiP}暗合（${anHe.hiddenGanHe}）：暗中关系/隐秘合作，婚姻外有暗线`
          : `大运地支${dayunZhi}与${posLabel(i as PillarPosition)}支${zhiP}暗合（${anHe.hiddenGanHe}）：${posLabel(i as PillarPosition)}柱有暗中变化`,
      });
    }
  }

  return relations;
}

/**
 * 检测大运是否填实原局空亡
 */
function detectFillsXunKong(
  dayunZhi: DiZhi,
  xunKong: ChartRelations['xunKong'],
): DaYunFlow['fillsXunKong'] {
  const result: DaYunFlow['fillsXunKong'] = [];
  if (xunKong.emptyZhi.includes(dayunZhi)) {
    result.push({
      zhi: dayunZhi,
      description: `大运地支${dayunZhi}恰好填实原局空亡（旬空${xunKong.emptyZhi.join('、')}）：原本虚浮的${dayunZhi}位在此运 10 年间被"填实激活"，相关十神由"虚位"恢复"实位"，事业/感情/财运可在此运实质兑现`,
    });
  }
  return result;
}

// ============================================================
// 大运吉凶评分（用神角色判定）
// ============================================================

/**
 * 根据用神 / 忌神判定大运五行角色
 *
 * 命理学规则（简化版，对应方法论 §3.3.2）：
 * - 用神（primary）→ 用神运 → 5 分（黄金 10 年）
 * - 喜神（secondary）→ 喜神运 → 4 分
 * - 忌神（ji）→ 忌神运 → 1 分
 * - 仇神（克用神之神）→ 仇神运 → 2 分
 * - 其他 → 闲神运 → 3 分
 */
function classifyDaYunRole(
  dayunWx: WuXing,
  yongShen: YongShen,
): { role: DaYunFlow['wuxingRole']; score: 1 | 2 | 3 | 4 | 5 } {
  if (yongShen.primary.includes(dayunWx)) return { role: '用神', score: 5 };
  if (yongShen.secondary.includes(dayunWx)) return { role: '喜神', score: 4 };
  if (yongShen.ji.includes(dayunWx)) return { role: '忌神', score: 1 };

  // 仇神：克用神之神。以主用神为准
  const KE_BY: Record<WuXing, WuXing> = { 金: '火', 木: '金', 土: '木', 水: '土', 火: '水' };
  if (yongShen.primary.length > 0) {
    const primaryWx = yongShen.primary[0];
    if (KE_BY[primaryWx] === dayunWx) return { role: '仇神', score: 2 };
  }
  return { role: '闲神', score: 3 };
}

// ============================================================
// 流年提示（关键事件年）
// ============================================================

/**
 * 计算指定大运 10 年内的关键流年
 *
 * 命理学策略：不输出每一年的常规干支，只输出"显著事件年"
 */
function detectKeyLiuNian(
  daYun: DaYun,
  pillars: readonly Pillar[],
  yongShen: YongShen,
  xunKong: ChartRelations['xunKong'],
): LiuNianHint[] {
  const hints: LiuNianHint[] = [];
  const dayPillar = pillars[2];
  const dayGan = dayPillar.tianGan as TianGan;
  const dayZhi = dayPillar.diZhi as DiZhi;
  const [dayunGan, dayunZhi] = parseGanZhi(daYun.ganZhi);
  // 大运是否已经填实空亡（用于判定流年的"加倍填空"）
  const dayunFillsEmpty = xunKong.emptyZhi.includes(dayunZhi);

  // 遍历这 10 年（startYear 到 startYear + 9）
  for (let year = daYun.startYear; year <= daYun.startYear + 9; year++) {
    const gz = computeYearGanZhi(year);
    const [yGan, yZhi] = parseGanZhi(gz);
    const yWx = ZHI_TO_WX[yZhi];
    const age = daYun.startAge + (year - daYun.startYear);

    // 1. 伏吟：流年 == 日柱
    if (yGan === dayGan && yZhi === dayZhi) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '伏吟',
        tendency: 'inauspicious',
        description: `${year}年${gz}伏吟日柱：自身重大变动、旧事重提、健康复发，命理"伏吟泪不干"`,
      });
      continue;
    }

    // 2. 岁运并临：流年 == 大运
    if (yGan === dayunGan && yZhi === dayunZhi) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '岁运并临',
        tendency: 'inauspicious',
        description: `${year}年${gz}岁运并临：流年与大运完全相同，吉凶倍增（如本运为忌神运则祸事尤烈），命理学列为高危年`,
      });
      continue;
    }

    // 3. 反吟：流年地支冲日支
    const chongDayZhi = ZHI_CHONG_PAIRS.find(
      (c) => (c[0] === yZhi && c[1] === dayZhi) || (c[1] === yZhi && c[0] === dayZhi),
    );
    if (chongDayZhi) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '反吟',
        tendency: 'inauspicious',
        description: `${year}年${gz}冲日支${dayZhi}：婚姻波动/搬迁出行/健康受冲，需主动求变以化冲`,
      });
      continue;
    }

    // 4. 加倍填空：大运已填空亡 + 流年又填同一空亡支（双倍激活）
    if (dayunFillsEmpty && yZhi === dayunZhi) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '加倍填空',
        tendency: 'auspicious',
        description: `${year}年${gz}与大运${daYun.ganZhi}同填空亡${yZhi}：原局虚位获双倍激活，相关十神在此年彻底落地，是全运最关键的实现年`,
      });
      continue;
    }

    // 5. 填实空亡：流年地支恰好是原局空亡支
    if (xunKong.emptyZhi.includes(yZhi)) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '填实空亡',
        tendency: 'auspicious',
        description: `${year}年${gz}填实原局空亡（${yZhi}）：原本虚位之神在此年实现，事业/感情/财运可有实质收获`,
      });
      continue;
    }

    // 6. 流年合日支（婚姻信号）
    const heDayZhi = ZHI_LIU_HE.find(
      (h) => (h.pair[0] === yZhi && h.pair[1] === dayZhi) || (h.pair[1] === yZhi && h.pair[0] === dayZhi),
    );
    if (heDayZhi) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '流年合日支',
        tendency: 'auspicious',
        description: `${year}年${gz}合日支${dayZhi}化${heDayZhi.hua}：感情/合作机缘明显，未婚者主婚配信号、已婚者主合作贵人`,
      });
      continue;
    }

    // 7. 流年合大运：流年地支与大运地支六合（环境联动，整体吉凶倾向取决于合化神是否为用神）
    const heDaYunZhi = ZHI_LIU_HE.find(
      (h) => (h.pair[0] === yZhi && h.pair[1] === dayunZhi) || (h.pair[1] === yZhi && h.pair[0] === dayunZhi),
    );
    if (heDaYunZhi) {
      const isYong = yongShen.primary.includes(heDaYunZhi.hua);
      const isJi = yongShen.ji.includes(heDaYunZhi.hua);
      hints.push({
        year, ganZhi: gz, age,
        eventType: '流年合大运',
        tendency: isYong ? 'auspicious' : isJi ? 'inauspicious' : 'neutral',
        description: `${year}年${gz}与大运${daYun.ganZhi}地支六合化${heDaYunZhi.hua}：流年与大运联动，${isYong ? '用神局成势，全年顺遂' : isJi ? '忌神局成势，全年阻碍' : '中性联动，注意大环境配合'}`,
      });
      continue;
    }

    // 8. 用神年 / 忌神年（兜底，只在没匹配上面任何高优先级事件时取）
    if (yongShen.primary.includes(yWx)) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '用神年',
        tendency: 'auspicious',
        description: `${year}年${gz}流年五行${yWx}为用神：此年顺遂，宜进取`,
      });
    } else if (yongShen.ji.includes(yWx)) {
      hints.push({
        year, ganZhi: gz, age,
        eventType: '忌神年',
        tendency: 'inauspicious',
        description: `${year}年${gz}流年五行${yWx}为忌神：此年不顺，宜守不宜攻`,
      });
    }
  }

  // 按"高优先级事件"排序（前 5 个最关键）
  const PRIORITY: Record<LiuNianHint['eventType'], number> = {
    岁运并临: 10, 伏吟: 9, 反吟: 8,
    加倍填空: 8, 填实空亡: 7,
    流年合日支: 6, 流年合大运: 5,
    忌神年: 3, 用神年: 2,
  };
  return hints
    .sort((a, b) => (PRIORITY[b.eventType] ?? 0) - (PRIORITY[a.eventType] ?? 0))
    .slice(0, 5);
}

/**
 * 公历年 → 干支（甲子起 1864 年）
 *
 * 命理学注意：严格说应以立春为界，但本工具仅用于"关键流年识别"，
 * 立春前后 1 个月的偏差不影响"伏吟/反吟/合冲"的判定结论，故采用简化算法。
 */
function computeYearGanZhi(year: number): string {
  const GAN: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // 1984 年是甲子年
  const baseYear = 1984;
  const offset = ((year - baseYear) 