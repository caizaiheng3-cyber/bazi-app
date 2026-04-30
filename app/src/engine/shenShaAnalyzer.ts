// M2.5 神煞匹配引擎
//
// ⚠️ 算法严格遵循《命理分析方法论》§5.6 神煞查法表（行 1416-1490），按 5 类查法分组：
//
//   §5.6.1 以日干查地支：天乙贵人 / 文昌贵人 / 羊刃 / 禄神
//   §5.6.2 以日支查地支（按三合局起）：驿马 / 桃花（咸池） / 华盖
//   §5.6.3 以年支查地支：将星（同三合局）+ 同 §5.6.2 的驿马/桃花/华盖以年支起
//   §5.6.4 其他常见神煞：孤辰寡宿 / 亡神 / 劫煞（按年支三合局起）
//   §5.6.5 天德贵人：月支查天干
//   §5.6.6 月德贵人：月支查天干（按三合局）
//
// 此外文档未单列但 mock 中明确出现的：
//   - 红艳煞：以日干查地支（壬癸日见子）—— 通用命理速查（非§5.6 表内但属常见神煞）
//   - 阴阳差错：6 个特定日柱（壬戌、丁丑、丙子、丁未、辛卯、戊寅）
//   - 魁罡：4 个特定日柱（庚辰、庚戌、壬辰、壬戌）
//
// 算法仅做"硬性命中"（地支精确出现在四柱中），不做 mock 中"未命中但带xx气"的命理师主观推断。
//
// 输出排序：吉神 > 中性 > 凶神（专业模式更醒目，吉神优先呈现）
//
// 验证基线（蔡蔡 1993-12-07 06:00 男，命局：癸酉·癸亥·壬戌·癸卯）：
//   日干壬：天乙(卯/巳)→时支卯命中 ✅；禄神(亥)→月支亥命中 ✅
//   日支戌(寅午戌组)：桃花=卯→时支卯命中 ✅；华盖=戌→日支戌自身命中 ✅
//   年支酉(巳酉丑组)：将星=酉→年支酉自身命中 ✅；驿马=亥→月支亥命中 ✅
//   日柱壬戌：魁罡 ✅；阴阳差错 ✅
//   红艳：壬癸日见子，未见 → 不命中（与 mock "未见显著红艳" 一致）
//   预期 ≥6 项神煞命中

import type {
  DiZhi,
  Pillar,
  ShenSha,
  ShiShen,
  TianGan,
} from '../types/bazi';
import { rulesLoader } from './rulesLoader';

// ===== 常量表 - 从配置加载 =====

/** §5.6.1 天乙贵人：以日干查地支 - 从配置加载 */
function getTianYi(): Record<TianGan, DiZhi[]> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.tianYi.mapping;
}

/** §5.6.1 文昌贵人：以日干查地支 - 从配置加载 */
function getWenChang(): Record<TianGan, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.wenChang.mapping;
}

/** §5.6.1 禄神：以日干查地支 - 从配置加载 */
function getLuShen(): Record<TianGan, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.luShen.mapping;
}

/** §5.6.1 羊刃：以日干查地支 - 从配置加载 */
function getYangRen(): Record<TianGan, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.yangRen.mapping;
}

/** §5.6.1 红艳煞：以日干查地支 - 从配置加载 */
function getHongYan(): Record<TianGan, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.hongYan.mapping;
}

/** 三合局类型 */
type SanHeGroup = '寅午戌' | '巳酉丑' | '申子辰' | '亥卯未';

/** 三合局 → 驿马/桃花/华盖查法表 - 从配置加载 */
function getSanHeTable(): Record<SanHeGroup, { yiMa: DiZhi; taoHua: DiZhi; huaGai: DiZhi }> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.sanHeTable.groups;
}

/** 将星：以年支起（取三合局之"中神"）- 从配置加载 */
function getJiangXing(): Record<SanHeGroup, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.jiangXing.mapping;
}

/** 亡神：三合局之"亡位" —— 寅午戌组亡神=巳，巳酉丑组=申，申子辰组=亥，亥卯未组=寅 - 从配置加载 */
function getWangShen(): Record<SanHeGroup, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.wangShen.mapping;
}

/** 劫煞：三合局之"劫位" —— 寅午戌组劫煞=亥，巳酉丑组=寅，申子辰组=巳，亥卯未组=申 - 从配置加载 */
function getJieSha(): Record<SanHeGroup, DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.jieSha.mapping;
}
/** 孤辰、寡宿：以年支查 - 从配置加载 */
function getGuChenGuaSu(yearZhi: DiZhi): { guChen: DiZhi; guaSu: DiZhi } {
  const rules = rulesLoader.getShenShaRules();
  const mapping = rules.rules.guChenGuaSu.mapping;
  
  if (yearZhi === '寅' || yearZhi === '卯' || yearZhi === '辰') return mapping['寅卯辰'];
  if (yearZhi === '巳' || yearZhi === '午' || yearZhi === '未') return mapping['巳午未'];
  if (yearZhi === '申' || yearZhi === '酉' || yearZhi === '戌') return mapping['申酉戌'];
  return mapping['亥子丑']; // 亥/子/丑
}

/** §5.6.5 天德贵人：月支查天干 - 从配置加载 */
function getTianDe(): Record<DiZhi, TianGan | DiZhi> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.tianDe.mapping;
}

/** §5.6.6 月德贵人：月支查天干（三合局）- 从配置加载 */
function getYueDe(): Record<SanHeGroup, TianGan> {
  const rules = rulesLoader.getShenShaRules();
  return rules.rules.yueDe.mapping;
}

/** 阴阳差错日（6 个特定日柱）- 从配置加载 */
function getYinYangChaCuo(): Set<string> {
  const rules = rulesLoader.getShenShaRules();
  return new Set(rules.rules.specialDayPillars.yinYangChaCuo.days);
}

/** 魁罡日（4 个特定日柱）- 从配置加载 */
function getKuiGang(): Set<string> {
  const rules = rulesLoader.getShenShaRules();
  return new Set(rules.rules.specialDayPillars.kuiGang.days);
}

// ===== 工具函数 =====

/** 根据地支查找所属三合局组 */
function getSanHeGroup(zhi: DiZhi): SanHeGroup {
  const mapping: Record<DiZhi, SanHeGroup> = {
    寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌',
    巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑',
    申: '申子辰', 子: '申子辰', 辰: '申子辰',
    亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未',
  };
  return mapping[zhi];
}

const TIAN_GAN_SET = new Set<string>(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
const DI_ZHI_SET = new Set<string>(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);

function isTianGan(s: string): s is TianGan {
  return TIAN_GAN_SET.has(s);
}
function isDiZhi(s: string): s is DiZhi {
  return DI_ZHI_SET.has(s);
}

/** 在四柱地支中查找命中位置，返回命中的柱名列表（如 ["年支", "时支"]）；若无命中返回空 */
function findZhiInPillars(pillars: readonly Pillar[], target: DiZhi): string[] {
  const PILLAR_NAMES = ['年支', '月支', '日支', '时支'];
  const hits: string[] = [];
  for (let i = 0; i < pillars.length; i++) {
    if (pillars[i].diZhi === target) hits.push(PILLAR_NAMES[i]);
  }
  return hits;
}

/** 在四柱天干中查找命中位置 */
function findGanInPillars(pillars: readonly Pillar[], target: TianGan): string[] {
  const PILLAR_NAMES = ['年干', '月干', '日干', '时干'];
  const hits: string[] = [];
  for (let i = 0; i < pillars.length; i++) {
    if (pillars[i].tianGan === target) hits.push(PILLAR_NAMES[i]);
  }
  return hits;
}

// ===== 主入口 =====

/**
 * 神煞匹配：基于四柱 → 命中神煞列表
 *
 * 输出排序规则：吉神 > 中性 > 凶神（专业模式优先呈现吉神）
 *
 * @param pillars 四柱
 * @returns 命中神煞列表（仅含硬性命中，不含命理师主观推断）
 */
export function analyzeShenSha(pillars: readonly Pillar[]): ShenSha[] {
  if (pillars.length !== 4) {
    throw new Error(`[shenShaAnalyzer] 必须传入恰好 4 柱，实际 ${pillars.length}`);
  }

  const yearP = pillars[0];
  const monthP = pillars[1];
  const dayP = pillars[2];
  const dayGan = dayP.tianGan;
  const dayZhi = dayP.diZhi;
  const yearZhi = yearP.diZhi;
  const monthZhi = monthP.diZhi;
  const dayPillarStr = `${dayGan}${dayZhi}`;

  if (!isTianGan(dayGan)) throw new Error(`[shenShaAnalyzer] 非法日干：${dayGan}`);
  if (!isDiZhi(dayZhi) || !isDiZhi(yearZhi) || !isDiZhi(monthZhi)) {
    throw new Error(`[shenShaAnalyzer] 非法地支`);
  }

  const result: ShenSha[] = [];

  // ====== §5.6.1 以日干查地支 ======

  const tianYi = getTianYi();
  const wenChang = getWenChang();
  const luShen = getLuShen();
  const yangRen = getYangRen();
  const hongYan = getHongYan();
  const shenShaRules = rulesLoader.getShenShaRules();

  // 天乙贵人（吉）—— 两个目标地支分别检查，命中多个合并为一条（更多天乙=更多贵人助力）
  {
    const allHits: string[] = [];
    for (const target of tianYi[dayGan]) {
      const hits = findZhiInPillars(pillars, target);
      for (const h of hits) allHits.push(`${h}${target}`);
    }
    if (allHits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.tianYi.descriptionTemplate;
      result.push({
        name: '天乙贵人',
        category: '吉神',
        source: `${allHits.join('、')}（日干${dayGan}查天乙=${tianYi[dayGan].join('或')}）`,
        description: allHits.length > 1 
          ? descriptionTemplate.replace('{multiHitReason}', '多柱见天乙，贵人缘尤厚。')
          : descriptionTemplate.replace('{multiHitReason}', ''),
      });
    }
  }

  // 文昌贵人（吉）
  {
    const target = wenChang[dayGan];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.wenChang.descriptionTemplate;
      result.push({
        name: '文昌贵人',
        category: '吉神',
        source: `${hits.join('、')}见${target}（日干${dayGan}查文昌=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // 禄神（吉）
  {
    const target = luShen[dayGan];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.luShen.descriptionTemplate;
      result.push({
        name: '禄神',
        category: '吉神',
        source: `${hits.join('、')}见${target}（日干${dayGan}查禄神=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // 羊刃（凶）
  {
    const target = yangRen[dayGan];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.yangRen.descriptionTemplate;
      result.push({
        name: '羊刃',
        category: '凶神',
        source: `${hits.join('、')}见${target}（日干${dayGan}查羊刃=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // 红艳煞（中性，多主异性缘旺）
  {
    const target = hongYan[dayGan];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.hongYan.descriptionTemplate;
      result.push({
        name: '红艳煞',
        category: '中性',
        source: `${hits.join('、')}见${target}（日干${dayGan}查红艳=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // ====== §5.6.2 + §5.6.3 以日支/年支查地支（按三合局起） ======
  // 文档 §5.6.3 明确"查法同日支"，即驿马/桃花/华盖既可以日支起也可以年支起
  // 算法同时查两路径，命中后按同名神煞合并 source（去重）

  const dayGroup = getSanHeGroup(dayZhi);
  const dayTable = getSanHeTable()[dayGroup];
  const yearGroup = getSanHeGroup(yearZhi);
  const yearTable = getSanHeTable()[yearGroup];

  // 辅助：双路径查找（日支起 + 年支起），合并 source
  function findSanHeShenSha(
    shenShaName: string,
    dayTarget: DiZhi,
    yearTarget: DiZhi,
  ): { allSources: string[]; hits: string[] } {
    const allSources: string[] = [];
    const hitPositions = new Set<string>();
    // 日支路径
    const dayHits = findZhiInPillars(pillars, dayTarget);
    for (const h of dayHits) {
      if (!hitPositions.has(h)) {
        hitPositions.add(h);
        allSources.push(`${h}见${dayTarget}（日支${dayZhi}属${dayGroup}组）`);
      }
    }
    // 年支路径（目标不同时才查，或目标相同但命中位置不同）
    if (yearTarget !== dayTarget || yearGroup !== dayGroup) {
      const yearHits = findZhiInPillars(pillars, yearTarget);
      for (const h of yearHits) {
        if (!hitPositions.has(h)) {
          hitPositions.add(h);
          allSources.push(`${h}见${yearTarget}（年支${yearZhi}属${yearGroup}组）`);
        }
      }
    }
    return { allSources, hits: Array.from(hitPositions) };
  }

  // 驿马（中性）
  {
    const { allSources } = findSanHeShenSha('驿马', dayTable.yiMa, yearTable.yiMa);
    if (allSources.length > 0) {
      result.push({
        name: '驿马',
        category: '中性',
        source: allSources.join('；'),
        description: '主变动、迁移、出差、奔波，得用则远行获利，逢冲则颠沛流离。',
      });
    }
  }

  // 桃花（咸池）（中性）
  {
    const { allSources } = findSanHeShenSha('桃花', dayTable.taoHua, yearTable.taoHua);
    if (allSources.length > 0) {
      result.push({
        name: '桃花（咸池）',
        category: '中性',
        source: allSources.join('；'),
        description: '主异性缘、个人魅力、风流之气；得用主受异性帮扶，逢凶则因色生灾。',
      });
    }
  }

  // 华盖（吉）
  {
    const { allSources } = findSanHeShenSha('华盖', dayTable.huaGai, yearTable.huaGai);
    if (allSources.length > 0) {
      result.push({
        name: '华盖',
        category: '吉神',
        source: allSources.join('；'),
        description: '主聪明孤高、有宗教艺术缘，利学术、玄学、艺术、独立钻研；忌孤僻寡合。',
      });
    }
  }

  // ====== §5.6.3 以年支起（yearGroup / yearTable 已在 §5.6.2 段声明） ======

  const jiangXing = getJiangXing();
  const wangShen = getWangShen();
  const jieSha = getJieSha();

  // 将星（吉）—— 以年支起（取年支三合局之"中神"）
  {
    const target = jiangXing[yearGroup];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.jiangXing.descriptionTemplate;
      result.push({
        name: '将星',
        category: '吉神',
        source: `${hits.join('、')}见${target}（年支${yearZhi}属${yearGroup}组，将星=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // 亡神（凶）—— 以年支起
  {
    const target = wangShen[yearGroup];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.wangShen.descriptionTemplate;
      result.push({
        name: '亡神',
        category: '凶神',
        source: `${hits.join('、')}见${target}（年支${yearZhi}属${yearGroup}组，亡神=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // 劫煞（凶）—— 以年支起
  {
    const target = jieSha[yearGroup];
    const hits = findZhiInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.jieSha.descriptionTemplate;
      result.push({
        name: '劫煞',
        category: '凶神',
        source: `${hits.join('、')}见${target}（年支${yearZhi}属${yearGroup}组，劫煞=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // 孤辰寡宿（凶）—— 以年支起
  {
    const { guChen, guaSu } = getGuChenGuaSu(yearZhi);
    const guChenHits = findZhiInPillars(pillars, guChen);
    const guaSuHits = findZhiInPillars(pillars, guaSu);
    
    if (guChenHits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.guChenGuaSu.guChenTemplate;
      result.push({
        name: '孤辰',
        category: '凶神',
        source: `${guChenHits.join('、')}见${guChen}（年支${yearZhi}查孤辰=${guChen}）`,
        description: descriptionTemplate,
      });
    }
    if (guaSuHits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.guChenGuaSu.guaSuTemplate;
      result.push({
        name: '寡宿',
        category: '凶神',
        source: `${guaSuHits.join('、')}见${guaSu}（年支${yearZhi}查寡宿=${guaSu}）`,
        description: descriptionTemplate,
      });
    }
  }

  // ====== §5.6.5/5.6.6 月支查天干 ======

  const tianDe = getTianDe();
  const yueDe = getYueDe();

  // 天德贵人（吉）—— 月支查天干（部分月份对应是地支，本算法仅匹配天干形式）
  {
    const target = tianDe[monthZhi];
    if (isTianGan(target)) {
      const hits = findGanInPillars(pillars, target);
      if (hits.length > 0) {
        const descriptionTemplate = shenShaRules.rules.tianDe.descriptionTemplate;
        result.push({
          name: '天德贵人',
          category: '吉神',
          source: `${hits.join('、')}见${target}（月支${monthZhi}查天德=${target}）`,
          description: descriptionTemplate,
        });
      }
    } else if (isDiZhi(target)) {
      // 部分月份天德对应是地支（如卯月→申、酉月→寅、午月→亥、子月→巳）
      const hits = findZhiInPillars(pillars, target);
      if (hits.length > 0) {
        const descriptionTemplate = shenShaRules.rules.tianDe.descriptionTemplate;
        result.push({
          name: '天德贵人',
          category: '吉神',
          source: `${hits.join('、')}见${target}（月支${monthZhi}查天德=${target}）`,
          description: descriptionTemplate,
        });
      }
    }
  }

  // 月德贵人（吉）—— 月支查天干（按三合局）
  {
    const monthGroup = getSanHeGroup(monthZhi);
    const target = yueDe[monthGroup];
    const hits = findGanInPillars(pillars, target);
    if (hits.length > 0) {
      const descriptionTemplate = shenShaRules.rules.yueDe.descriptionTemplate;
      result.push({
        name: '月德贵人',
        category: '吉神',
        source: `${hits.join('、')}见${target}（月支${monthZhi}属${monthGroup}组，月德=${target}）`,
        description: descriptionTemplate,
      });
    }
  }

  // ====== 特殊日柱神煞 ======

  const kuiGang = getKuiGang();
  const yinYangChaCuo = getYinYangChaCuo();

  // 魁罡（中性，多主刚毅）
  if (kuiGang.has(dayPillarStr)) {
    const descriptionTemplate = shenShaRules.rules.specialDayPillars.kuiGang.descriptionTemplate;
    result.push({
      name: '魁罡',
      category: '中性',
      source: `日柱${dayPillarStr}（魁罡四日：庚辰、庚戌、壬辰、壬戌）`,
      description: descriptionTemplate,
    });
  }

  // 阴阳差错（凶，主婚姻波折）
  if (yinYangChaCuo.has(dayPillarStr)) {
    const descriptionTemplate = shenShaRules.rules.specialDayPillars.yinYangChaCuo.descriptionTemplate;
    result.push({
      name: '阴阳差错',
      category: '凶神',
      source: `日柱${dayPillarStr}（阴阳差错六日：壬戌、丁丑、丙子、丁未、辛卯、戊寅）`,
      description: descriptionTemplate,
    });
  }

  // ====== 输出排序：吉神 > 中性 > 凶神 ======
  const order = shenShaRules.rules.outputOrder.categoryPriority;
  result.sort((a, b) => order[a.category] - order[b.category]);

  return result;
}

// ===== 仅供测试导出 =====
export const __testing = {
  get TIAN_YI() { return getTianYi(); },
  get WEN_CHANG() { return getWenChang(); },
  get YANG_REN() { return getYangRen(); },
  get LU_SHEN() { return getLuShen(); },
  get HONG_YAN() { return getHongYan(); },
  get SAN_HE_TABLE() { return getSanHeTable(); },
  get JIANG_XING() { return getJiangXing(); },
  get WANG_SHEN() { return getWangShen(); },
  get JIE_SHA() { return getJieSha(); },
  get TIAN_DE() { return getTianDe(); },
  get YUE_DE() { return getYueDe(); },
  get YIN_YANG_CHA_CUO() { return getYinYangChaCuo(); },
  get KUI_GANG() { return getKuiGang(); },
  getSanHeGroup,
  getGuChenGuaSu,
};
