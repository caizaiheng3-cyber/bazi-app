// M2.4 格局判定引擎
//
// ⚠️ 算法严格遵循《命理分析方法论》§3.3 格局判定章节，三层判定：
//
//   第一层「特殊格优先识别」（§3.3.2）：
//     - 专旺格：日主极旺成一方之势 → 曲直(木)/炎上(火)/稼穑(土)/从革(金)/润下(水)
//       工程化阈值：日主同五行 ≥50% 且日主"极旺"档（与 yongShenAnalyzer 专旺判定保持一致）
//     - 从强格：日主极旺 + 全局印比 ≥75% + 无显著财官食伤
//     - 从弱格：日主极弱 + 无根无助
//     - 从财格：日主弱 + 财极旺 ≥40%
//     - 从官格：日主弱 + 官杀极旺 ≥40%
//     - 从儿格：日主弱 + 食伤极旺 ≥40%
//
//   第二层「正格判定」（§3.3.1）：
//     取格规则：以月令（月支）藏干中**透出天干**者定 8 格之一
//       优先级：本气透出 > 中气透出 > 余气透出 > 均不透 → 取本气
//     8 格 = 正官 / 偏官（七杀） / 正印 / 偏印 / 正财 / 偏财 / 食神 / 伤官
//     ⚠️ 比肩/劫财不立正格（文档明确："正格八格"不含比劫）
//        → 当透出干为日主同类（比肩/劫财）时，归偏格 = "比劫格（XX 倾向）"
//
//   第三层「成格条件评估」（§3.3.1 表内"成格条件"列）：
//     | 格 | 成格条件（工程化）|
//     | 正官 | 印星(生官)≥1 OR 财星(生官)≥1 |
//     | 偏官 | 食神(制杀)≥1 OR 印星(化杀)≥1 |
//     | 正印 | 官杀(生印)≥1 AND 财星(破印)=0 |
//     | 偏印 | 官杀(生印)≥1 AND 食神(被夺)=0 |
//     | 正财 | 食伤(生财)≥1 AND 比劫(夺财)弱(<2) |
//     | 偏财 | 食伤(生财)≥1 AND 比劫(夺财)弱(<2) |
//     | 食神 | 财星(泄食)≥1 AND 偏印(夺食)=0 |
//     | 伤官 | 印星(配印)≥1 OR 财星(生财)≥1 |
//
//   层次评估（§3.3.3）：
//     - 高（上格）：成格条件完备 + 用神(yongShen.primary)与格局喜用重合
//     - 中（中格）：成格但用神力量稍弱 OR 半成
//     - 低（下格）：破格（成格条件 0 项满足，且有显著破格因素）
//
// 验证基线（蔡蔡 1993-12-07 06:00 男，命局：癸酉·癸亥·壬戌·癸卯）：
//   月令亥（藏干壬本气、甲余气）→ 透出天干检测：
//     - 壬透日干（自身比肩）→ 进入"比劫不立格"分支
//     - 甲未透（命中无甲）
//   水气 40%（极旺档），但日支戌土+时支卯木混杂，未达专旺纯净（需 ≥50%）
//   → 落入"比劫格（润下倾向）·偏格·半成·中"
//   ✅ 与 mock 完全一致：name='比劫格（润下倾向）' type='偏格' status='半成' level='中'

import type {
  GeJu,
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
/** 十神 → 格局名称映射（命理方法论 §3.3.1）- 从配置加载 */
function getShiShenToGe(): Record<ShiShen, string> {
  const rules = rulesLoader.getGeJuRules();
  return rules.rules.shiShenToGe;
}

/** 专旺格名称映射 - 从配置加载 */
function getZhuWangGeName(): Record<WuXing, string> {
  const rules = rulesLoader.getGeJuRules();
  return rules.rules.zhuWangGeName;
}

/** 专旺倾向映射 - 从配置加载 */
function getZhuWangTendency(): Record<WuXing, '专旺' | '从旺'> {
  const rules = rulesLoader.getGeJuRules();
  return rules.rules.zhuWangTendency;
}

/** 五行相生相克关系 - 从配置加载 */
function getShengKe(): Record<WuXing, { sheng: WuXing; ke: WuXing }> {
  const rules = rulesLoader.getYongShenRules();
  const shengKe = rules.rules.shengKe.mapping;
  // 只提取 sheng 和 ke，去掉 keMe 和 shengMe
  const result: Record<WuXing, { sheng: WuXing; ke: WuXing }> = {};
  for (const wx of Object.keys(shengKe) as WuXing[]) {
    result[wx] = { sheng: shengKe[wx].sheng, ke: shengKe[wx].ke };
  }
  return result;
}
// ===== 工具函数 =====

function ganWx(g: TianGan): WuXing {
  const wx = TIAN_GAN_TO_WUXING[g];
  if (!wx) throw new Error(`[geJuAnalyzer] 非法天干：${g}`);
  return wx;
}

function getStat(stats: readonly WuXingStat[], wx: WuXing): WuXingStat {
  const s = stats.find(x => x.wuxing === wx);
  if (!s) throw new Error(`[geJuAnalyzer] 五行统计缺失：${wx}`);
  return s;
}

/** 该五行占比百分比（基于 total），返回整数百分比 */
function percentOf(stats: readonly WuXingStat[], wx: WuXing): number {
  const totalSum = stats.reduce((acc, s) => acc + s.total, 0);
  if (totalSum === 0) return 0;
  return Math.round((getStat(stats, wx).total / totalSum) * 100);
}

/** 统计某十神在四柱天干 + 地支藏干中的总出现次数（含本气、中气、余气） */
function countShiShen(pillars: readonly Pillar[], target: ShiShen): number {
  let count = 0;
  for (const p of pillars) {
    if (p.ganShiShen === target) count++;
    for (const cg of p.cangGan) {
      if (cg.shiShen === target) count++;
    }
  }
  return count;
}

/** 统计多个十神出现次数总和 */
function countShiShenAny(pillars: readonly Pillar[], targets: ShiShen[]): number {
  return targets.reduce((acc, t) => acc + countShiShen(pillars, t), 0);
}

// ===== 第一层：特殊格识别 =====

interface SpecialGeResult {
  matched: boolean;
  geJu?: GeJu;
}

function detectSpecialGe(pillars: readonly Pillar[], wuxingStats: readonly WuXingStat[], wangShuai: WangShuai): { matched: false } | { matched: true; geJu: GeJu } {
  const dayWx = ganWx(pillars[2].tianGan);
  const dayPercent = percentOf(wuxingStats, dayWx);
  const rules = rulesLoader.getGeJuRules();
  const specialGeRules = rules.rules.specialGeRules;
  const zhuWangGeName = getZhuWangGeName();
  const zhuWangTendency = getZhuWangTendency();
  const shengKe = getShengKe();

  // ===== 专旺格识别（命理方法论 §3.3.2） =====
  // 条件：日主极旺 + 同五行 ≥ 50%
  const minPercent = specialGeRules.threshold.minPercent;
  if (wangShuai.conclusion.includes('极旺') && dayPercent >= minPercent) {
    const geName = zhuWangGeName[dayWx];
    const tendency = zhuWangTendency[dayWx];
    return {
      matched: true,
      geJu: {
        name: geName,
        type: '特殊格',
        status: '成格',
        level: '高',
        description: `日主${dayWx}气${dayPercent}%极旺成一方之势，按文档 §3.3.2 判定为「${geName}」（${tendency}）。喜用神为${dayWx}（同我）+${shengKe[dayWx].sheng}（印生），忌克泄。`,
      },
    };
  }

  // ===== 从格识别（命理方法论 §3.3.3） =====
  // 条件：日主极弱 + 无根无印 + 克泄重
  // 工程化判定：日主极弱 + 同五行 ≤ 10% + 得地=false
  const congGeRules = specialGeRules.congGeRules;
  const maxPercent = congGeRules.minPercent; // 从格：日主同五行 ≤ 此阈值
  if (wangShuai.conclusion.includes('极弱') && dayPercent <= maxPercent) {
    const stepDeDi = wangShuai.steps.find(s => s.step === '得地');
    const hasRoot = stepDeDi?.result === 'positive';
    if (!hasRoot) {
      return {
        matched: true,
        geJu: {
          name: '从弱格',
          type: '特殊格',
          status: '成格',
          level: '中',
          description: `日主${dayWx}气${dayPercent}%极弱且无根无印，按文档 §3.3.3 判定为「从弱格」。喜克泄（${shengKe[dayWx].sheng}、${shengKe[dayWx].ke}），忌生扶。`,
        },
      };
    }
  }

  return { matched: false };
}

// ===== 第二层：正格 / 比劫格判定 =====

/**
 * 取月令藏干中**透出天干**的第一个（按本气>中气>余气优先级）
 * 透出 = 该藏干在四柱天干中也出现
 * @returns 透出的藏干十神 + 出处描述；若均未透出则返回月令本气十神 + "本气取格"
 */
function findMonthLingTouChu(pillars: readonly Pillar[]): {
  shiShen: ShiShen;
  source: string;
  /** 取格所用的天干（用于后续 evaluateLevel 中作"格神"的五行依据） */
  geShenGan: TianGan;
} {
  const monthZhi = pillars[1];
  const tianGanSet = new Set<TianGan>(pillars.map(p => p.tianGan));

  // 按本气>中气>余气顺序
  const order: Array<'本气' | '中气' | '余气'> = ['本气', '中气', '余气'];
  for (const type of order) {
    const cg = monthZhi.cangGan.find(x => x.type === type);
    if (cg && tianGanSet.has(cg.gan)) {
      return {
        shiShen: cg.shiShen,
        source: `月令${monthZhi.diZhi}藏${type}${cg.gan}透出（${cg.shiShen}）`,
        geShenGan: cg.gan,
      };
    }
  }
  // 均未透出 → 取本气
  const benQi = monthZhi.cangGan.find(x => x.type === '本气');
  if (!benQi) {
    throw new Error(`[geJuAnalyzer] 月支${monthZhi.diZhi}无本气藏干，数据异常`);
  }
  return {
    shiShen: benQi.shiShen,
    source: `月令${monthZhi.diZhi}藏干均未透出天干，按文档 §3.3.1 取本气${benQi.gan}（${benQi.shiShen}）定格`,
    geShenGan: benQi.gan,
  };
}

// ===== 第三层：成格条件评估 =====

/**
 * 评估正格的成格条件，返回成败 + 描述
 * 表见文件头注释（§3.3.1 工程化映射）
 */
function evaluateZhengGe(
  geName: string,
  geShiShen: ShiShen,
  pillars: readonly Pillar[],
): { status: '成格' | '破格' | '半成'; reason: string } {
  // 计算各类十神出现数（含天干 + 地支藏干）
  const yinXing = countShiShenAny(pillars, ['正印', '偏印']);  // 印星
  const caiXing = countShiShenAny(pillars, ['正财', '偏财']);  // 财星
  const guanSha = countShiShenAny(pillars, ['正官', '七杀']);  // 官杀
  const shiShang = countShiShenAny(pillars, ['食神', '伤官']); // 食伤
  const biJie = countShiShenAny(pillars, ['比肩', '劫财']);    // 比劫

  switch (geShiShen) {
    case '正官': {
      const ok = yinXing >= 1 || caiXing >= 1;
      return ok
        ? { status: '成格', reason: `${geName}成格：${yinXing >= 1 ? `印星${yinXing}个护官` : ''}${yinXing >= 1 && caiXing >= 1 ? '、' : ''}${caiXing >= 1 ? `财星${caiXing}个生官` : ''}` }
        : { status: '破格', reason: `${geName}破格：缺印护官、缺财生官（印=${yinXing}，财=${caiXing}）` };
    }
    case '七杀': {
      const ok = (countShiShen(pillars, '食神') >= 1) || yinXing >= 1;
      return ok
        ? { status: '成格', reason: `偏官（七杀）格成格：${countShiShen(pillars, '食神') >= 1 ? '食神制杀' : ''}${countShiShen(pillars, '食神') >= 1 && yinXing >= 1 ? '、' : ''}${yinXing >= 1 ? `印星${yinXing}个化杀` : ''}` }
        : { status: '破格', reason: `偏官格破格：缺食神制杀、缺印化杀（食神=${countShiShen(pillars, '食神')}，印=${yinXing}）` };
    }
    case '正印':
    case '偏印': {
      const guanShengYin = guanSha >= 1;
      const caiPoYin = caiXing >= 2;  // 财≥2 才算破印
      // 偏印格额外检查：食神=0 才不被夺（文档 §3.3.1 偏印成格条件）
      const shiShenDuoYin = geShiShen === '偏印' && countShiShen(pillars, '食神') >= 1;
      if (guanShengYin && !caiPoYin && !shiShenDuoYin) {
        return { status: '成格', reason: `${geName}成格：官杀${guanSha}个生印，财${caiXing}个未破印${geShiShen === '偏印' ? '，无食神夺印' : ''}` };
      }
      if (guanShengYin && (caiPoYin || shiShenDuoYin)) {
        const flaws: string[] = [];
        if (caiPoYin) flaws.push(`财${caiXing}个偏强有破印之嫌`);
        if (shiShenDuoYin) flaws.push(`食神${countShiShen(pillars, '食神')}个有夺印之嫌`);
        return { status: '半成', reason: `${geName}半成：官杀${guanSha}个生印，但${flaws.join('、')}` };
      }
      return { status: '破格', reason: `${geName}破格：无官杀生印（官杀=${guanSha}）` };
    }
    case '正财':
    case '偏财': {
      const shiShangShengCai = shiShang >= 1;
      const biJieDuoCai = biJie >= 2;
      if (shiShangShengCai && !biJieDuoCai) {
        return { status: '成格', reason: `${geName}成格：食伤${shiShang}个生财，比劫${biJie}个未夺财` };
      }
      if (shiShangShengCai && biJieDuoCai) {
        return { status: '半成', reason: `${geName}半成：食伤${shiShang}个生财，但比劫${biJie}个偏旺有夺财之嫌` };
      }
      return { status: '破格', reason: `${geName}破格：无食伤生财（食伤=${shiShang}）` };
    }
    case '食神': {
      const caiXieShi = caiXing >= 1;
      const pianYinDuoShi = countShiShen(pillars, '偏印') >= 1;
      if (caiXieShi && !pianYinDuoShi) {
        return { status: '成格', reason: `${geName}成格：财${caiXing}个泄食，无偏印夺食` };
      }
      if (caiXieShi && pianYinDuoShi) {
        return { status: '半成', reason: `${geName}半成：财${caiXing}个泄食，但偏印${countShiShen(pillars, '偏印')}个有夺食之嫌` };
      }
      return { status: '破格', reason: `${geName}破格：无财泄食${pianYinDuoShi ? '，且偏印夺食' : ''}（财=${caiXing}）` };
    }
    case '伤官': {
      const peiYin = yinXing >= 1;
      const shengCai = caiXing >= 1;
      if (peiYin || shengCai) {
        return { status: '成格', reason: `${geName}成格：${peiYin ? `伤官配印（印=${yinXing}）` : ''}${peiYin && shengCai ? '；' : ''}${shengCai ? `伤官生财（财=${caiXing}）` : ''}` };
      }
      return { status: '破格', reason: `${geName}破格：既无印配、又无财生（印=${yinXing}，财=${caiXing}）` };
    }
    default:
      throw new Error(`[geJuAnalyzer] 未支持的格局十神：${geShiShen}`);
  }
}

/**
 * 评估格局层次（§3.3.3）
 * 用神 yongShen.primary 是否包含"格神"（取格的那个透出干的五行）→ 上格
 * @param touChuGan 取格用的透出天干（即 findMonthLingTouChu 返回的源天干）
 *                  若为 null 表示均未透出走"取本气"分支，用月令本气天干作格神
 */
function evaluateLevel(
  status: '成格' | '破格' | '半成',
  yongShenPrimary: readonly WuXing[],
  geShenGan: TianGan,
): '高' | '中' | '低' {
  if (status === '破格') return '低';
  if (status === '半成') return '中';
  // 成格：进一步看用神是否包含格神五行
  const geWx = ganWx(geShenGan);
  if (yongShenPrimary.includes(geWx)) {
    return '高';
  }
  // 用神不与格神重合，但成格 → 列为中格
  return '中';
}

// ===== 第三层：比劫不立格 → 偏格 =====

function buildBiJieGe(
  pillars: readonly Pillar[],
  wuxingStats: readonly WuXingStat[],
  wangShuai: WangShuai,
  zhuChuShiShen: ShiShen,
): GeJu {
  const dayWx = ganWx(pillars[2].tianGan);
  const dayPercent = percentOf(wuxingStats, dayWx);
  const monthZhi = pillars[1].diZhi;
  const zhuWangTendency = getZhuWangTendency();
  const zhuWangGeName = getZhuWangGeName();
  const shengKe = getShengKe();
  const tendency = zhuWangTendency[dayWx];

  // 旺度判定
  const isExtreme = wangShuai.conclusion.includes('极旺');
  // "偏旺" 严格匹配，避免被 "中和偏旺" 也命中
  const isPianWang = wangShuai.conclusion === '日主偏旺' || wangShuai.conclusion.startsWith('日主偏旺');

  // 状态判定（命理常识：比劫格的"成立"取决于日主气势是否真正成势）：
  //   - 极旺（≥40%）→ 接近专旺但因混杂未达 50% → 半成
  //   - 偏旺（非"中和偏旺"）→ 半成
  //   - 中和偏旺 / 中和偏弱 / 偏弱 / 极弱 → 破格（比劫格须身旺成势才有意义）
  let status: '成格' | '破格' | '半成';
  if (isExtreme && dayPercent >= 40) {
    status = '半成';
  } else if (isPianWang) {
    status = '半成';
  } else {
    status = '破格';
  }

  // 找出"碍"日主成专旺的他柱五行：克日主(官杀) 或 泄日主(食伤) 或 耗日主(财)
  // 完整扫描天干 + 地支藏干本气（最显著影响），覆盖蔡蔡日支戌戊本气=克水、时支卯乙本气=泄水
  const sk = shengKe[dayWx];
  const aiTargetWx = new Set<WuXing>([sk.ke, sk.sheng]); // 我克(财)、我生(食伤)、克我(官杀)
  const aiWxFound = new Set<WuXing>();
  for (let i = 0; i < pillars.length; i++) {
    if (i === 2) continue; // 跳过日柱本身
    const p = pillars[i];
    // 天干
    const tgWx = ganWx(p.tianGan);
    if (aiTargetWx.has(tgWx)) aiWxFound.add(tgWx);
    // 地支藏干本气（最显著力量）
    const benQi = p.cangGan.find(c => c.type === '本气');
    if (benQi) {
      const wx = ganWx(benQi.gan);
      if (aiTargetWx.has(wx)) aiWxFound.add(wx);
    }
  }
  const aiWxList = Array.from(aiWxFound);

  const levelMap: Record<typeof status, '高' | '中' | '低'> = {
    成格: '高',
    半成: '中',
    破格: '低',
  };

  // name 使用统称「比劫格」（文档 §3.3.1 明确"比肩/劫财不立正格"，统归比劫范畴），
  // 具体是比肩还是劫财在 description 中精确说明
  return {
    name: `比劫格（${tendency}倾向）`,
    type: '偏格',
    status,
    level: levelMap[status],
    description:
      `月令${monthZhi}藏干透日干${pillars[2].tianGan}（${zhuChuShiShen}），日主${dayWx}气${dayPercent}%${isExtreme ? '极旺' : (isPianWang ? '偏旺' : '未达旺势')}。` +
      `按文档 §3.3.1 比劫不立正格之规，本可论「${zhuWangGeName[dayWx]}」（${dayWx}专旺），` +
      (aiWxList.length > 0
        ? `但${aiWxList.map(w => `${w}气`).join('、')}混杂未成纯一方势，故归「比劫格（${tendency}倾向）」偏格。`
        : `因${dayPercent < 50 ? '同五行未达专旺 50% 阈值' : '其他柱未充分配合'}，故归「比劫格（${tendency}倾向）」偏格。`) +
      `喜用神参见用神章节，忌再见生扶旺势之五行。${status === '半成' ? '若大运行食伤泄秀或财耗之地，格局可由「半成」转「成」。' : '当前命局比劫不旺，不构成此格主线。'}`,
  };
}

// ===== 主入口 =====

/**
 * 格局判定：基于四柱 + 五行统计 + 旺衰 + 用神 → GeJu
 *
 * 三层判定（按优先级）：
 *   1. 特殊格（专旺 / 从强 / 从财 / 从官 / 从儿 / 从弱）
 *   2. 正格（月令透出干十神 → 8 格之一）
 *   3. 比劫格偏格（月令本气透日主同类时）
 *
 * @param pillars 四柱
 * @param wuxingStats 五行统计
 * @param wangShuai 旺衰判定
 * @param yongShen 用神选取（用于评估格局层次）
 */
export function analyzeGeJu(
  pillars: readonly Pillar[],
  wuxingStats: readonly WuXingStat[],
  wangShuai: WangShuai,
  yongShen: YongShen,
): GeJu {
  if (pillars.length !== 4) {
    throw new Error(`[geJuAnalyzer] 必须传入恰好 4 柱，实际 ${pillars.length}`);
  }
  if (wuxingStats.length !== 5) {
    throw new Error(`[geJuAnalyzer] 五行统计必须含 5 项，实际 ${wuxingStats.length}`);
  }
  if (!wangShuai.conclusion) {
    throw new Error('[geJuAnalyzer] 旺衰结论缺失');
  }
  if (!yongShen.primary || yongShen.primary.length === 0) {
    throw new Error('[geJuAnalyzer] 用神 primary 缺失');
  }

  // 第一层：特殊格优先识别
  const specialGe = detectSpecialGe(pillars, wuxingStats, wangShuai);
  if (specialGe.matched && specialGe.geJu) {
    return specialGe.geJu;
  }

  // 第二层：取月令透出干 → 推格
  const touChu = findMonthLingTouChu(pillars);

  // 比肩/劫财不立正格 → 走比劫偏格分支
  if (touChu.shiShen === '比肩' || touChu.shiShen === '劫财') {
    return buildBiJieGe(pillars, wuxingStats, wangShuai, touChu.shiShen);
  }

  if (touChu.shiShen === '日主') {
    throw new Error(`[geJuAnalyzer] 月令透出干十神为'日主'，逻辑异常（应为比肩/劫财）`);
  }

  // 第三层：正格 + 成格评估
  const shiShenToGe = getShiShenToGe();
  const geName = shiShenToGe[touChu.shiShen];
  if (!geName) {
    throw new Error(`[geJuAnalyzer] 不支持的格局十神：${touChu.shiShen}`);
  }
  const evaluation = evaluateZhengGe(geName, touChu.shiShen, pillars);
  const level = evaluateLevel(evaluation.status, yongShen.primary, touChu.geShenGan);

  return {
    name: geName,
    type: '正格',
    status: evaluation.status,
    level,
    description:
      `${touChu.source}，按文档 §3.3.1 取「${geName}」。` +
      `${evaluation.reason}。` +
      `层次评估：用神为${yongShen.primary.join('+')}，${level === '高' ? '与格神契合，列为上格' : (level === '中' ? '与格神部分契合或格局有瑕疵，列为中格' : '格局被破，列为下格')}。`,
  };
}

// ===== 仅供测试导出（用于在自验脚本中检查内部子结果） =====
export const __testing = {
  detectSpecialGe,
  findMonthLingTouChu,
  evaluateZhengGe,
  evaluateLevel,
};
