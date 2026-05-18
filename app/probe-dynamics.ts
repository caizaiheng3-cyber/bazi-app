/**
 * 命理动力学引擎验证脚本（针对蔡命样本）
 *
 * 蔡命：1993-12-07 06:00 男（壬子年/癸亥月/壬戌日/癸卯时）
 *
 * 5 项合格标准（用户定义）：
 *   ✅ S1: 能识别"七杀虚透 + 戊癸合化" → 蔡命"难自律"的根源
 *   ✅ S2: 能识别"水53% + 比劫旺 + 食伤少" → 流通断在"水→木"环节
 *   ✅ S3: 能识别"用神火土皆藏地支不透 + 忌神水金透干" → 一生在"想做的没人支持/不想做的环境逼着做"中拉扯
 *   ✅ S4: 能识别"日支戌中辛金正印被合走" → 母亲缘薄但有间接助力
 *   ✅ S5: 7 维输出能在报告里聚合成一段"动力学总论"，让人一眼看懂这盘的"骨架运动逻辑"
 *
 * 运行：cd app && npx tsx probe-dynamics.ts
 */

import { buildChartWithFallback } from './src/engine/baziEngine';
import type { InputData } from './src/types/bazi';

const caiInput: InputData = {
  name: '蔡蔡',
  gender: '男',
  birthDate: '1993-12-07',
  birthTime: '06:00',
  useTrueSolarTime: false,
  birthPlace: '杭州',
  sect: 2,
};

console.log('═'.repeat(72));
console.log('  动力学引擎验证 — 蔡命样本（1993-12-07 06:00 男）');
console.log('═'.repeat(72));

const chart = buildChartWithFallback(caiInput);
const dyn = chart.dynamics;

if (!dyn) {
  console.error('❌ FATAL: chart.dynamics 字段未生成！请检查 baziEngine.ts 接入');
  process.exit(1);
}

// —— 基础信息 ——
console.log('\n[四柱]');
console.log(chart.pillars.map((p) => `${p.name}=${p.tianGan}${p.diZhi}`).join(' / '));

// ════════════════════════════════════════════════════════════
// 5 项合格标准检查
// ════════════════════════════════════════════════════════════

interface CheckResult {
  id: string;
  desc: string;
  passed: boolean;
  evidence: string;
}

const results: CheckResult[] = [];

// S1: 七杀虚透 + 戊癸合化
const s1Hits: string[] = [];
// 在 D6 找"七杀虚透" — 但蔡命四柱无戊（年癸/月癸/日壬/时癸），实际无七杀透干
// 因此应改为检测：D2 中是否识别"七杀虚透"组合，D3 中是否有戊癸合化痕迹（藏干层面）
const xuTou = dyn.xuTouVsRoot.illusoryAbilities;
if (xuTou.some((x) => x.includes('七杀') || x.includes('戊'))) {
  s1Hits.push(`D6.illusoryAbilities命中=${JSON.stringify(xuTou)}`);
}
// 在 D2 找"七杀虚透"组合
const qiShaCombo = dyn.shiShenCombos.combos.find((c) => c.type === '七杀虚透');
if (qiShaCombo) {
  s1Hits.push(`D2.combos命中"七杀虚透"=${qiShaCombo.destinyChain}`);
}
// 在 D3 找天干合（戊癸合 / 任何合化）
const tianGanHe = dyn.keyTransforms.transforms.find(
  (t) => (t.type === '天干合化' || t.type === '天干合而不化') && t.participants.some((p) => p.includes('戊') || p.includes('癸')),
);
if (tianGanHe) {
  s1Hits.push(`D3.transforms命中=${tianGanHe.type}/${tianGanHe.participants.join('+')}/${tianGanHe.impact}`);
}
results.push({
  id: 'S1',
  desc: '七杀虚透 / 戊癸合化痕迹 → "难自律"的根源',
  passed: s1Hits.length >= 1,
  evidence: s1Hits.length > 0 ? s1Hits.join(' | ') : `未识别 | D2.combos=${dyn.shiShenCombos.combos.map((c) => c.type).join(',')} | D3.transforms=${dyn.keyTransforms.transforms.map((t) => t.type + ':' + t.participants.join('+')).join('; ')}`,
});

// S2: 流通断在"水→木"
const flowBreak = dyn.flowChain.worstSegments.find((s) => s.includes('水→木'));
const flowInsight = dyn.flowChain.keyInsights.find((s) => s.includes('水') && s.includes('木'));
results.push({
  id: 'S2',
  desc: '水旺 + 比劫旺 + 食伤少 → 流通断在水→木',
  passed: !!flowBreak || !!flowInsight,
  evidence: flowBreak
    ? `D4.worstSegments命中: ${flowBreak}`
    : (flowInsight ? `D4.keyInsights命中: ${flowInsight}` : `D4.worstSegments=${JSON.stringify(dyn.flowChain.worstSegments)} | D4.keyInsights=${JSON.stringify(dyn.flowChain.keyInsights)}`),
});

// S3: 用神火土皆藏 + 忌神水金透干 → 拉扯
// 真实字段：D1.primaryYong/secondaryYong[].isFullyHidden, D1.ji[].ganPositions
const yongFullyHidden = [...dyn.yongJiByPosition.primaryYong, ...dyn.yongJiByPosition.secondaryYong].filter((y) => y.isFullyHidden);
const jiTransparent = dyn.yongJiByPosition.ji.filter((j) => j.ganPositions.length > 0);
const xiJiStruggle = dyn.xiJiContrast.primaryStruggle;
const struggleHit = xiJiStruggle.includes('对抗') || xiJiStruggle.includes('反抗') || xiJiStruggle.includes('拉扯') || xiJiStruggle.includes('外求');
const s3Passed = (yongFullyHidden.length > 0 && jiTransparent.length > 0) || struggleHit;
results.push({
  id: 'S3',
  desc: '用神皆藏(火土) + 忌神透干(水金) → 一生拉扯',
  passed: s3Passed,
  evidence: `用神全藏=${yongFullyHidden.map((y) => y.wuxing + '(' + y.role + ')').join(',') || '无'} | 忌神透干=${jiTransparent.map((j) => j.wuxing + '@' + j.ganPositions.join(',')).join(';') || '无'} | D5.primaryStruggle="${xiJiStruggle}"`,
});

// S4: 戌中辛金正印被合走
// D3.transforms 中找"地支六合" 包含 戌+卯
const liuHeHit = dyn.keyTransforms.transforms.find(
  (t) => t.type === '地支六合' && t.participants.some((p) => p.includes('戌')) && t.participants.some((p) => p.includes('卯')),
);
const altered = dyn.keyTransforms.alteredConfigurations.find((a) => a.includes('正印') || a.includes('辛') || a.includes('戌'));
// 还要看 D1 中"正印"用神是否标 isAttacked / attackDescription
const yongAttacked = [...dyn.yongJiByPosition.primaryYong, ...dyn.yongJiByPosition.secondaryYong].find((y) => y.isAttacked && y.attackDescription);
const s4Passed = !!liuHeHit || !!altered || !!yongAttacked;
results.push({
  id: 'S4',
  desc: '日支戌中辛金正印被合走 → 母亲缘薄但有间接助力',
  passed: s4Passed,
  evidence: liuHeHit
    ? `D3.transforms命中地支六合: ${liuHeHit.participants.join('+')} → ${liuHeHit.impact}`
    : (altered
        ? `D3.alteredConfigurations命中: ${altered}`
        : (yongAttacked
            ? `D1命中attack: ${yongAttacked.wuxing}/${yongAttacked.role} → ${yongAttacked.attackDescription}`
            : `D3.transforms=${dyn.keyTransforms.transforms.map((t) => t.type + ':' + t.participants.join('+')).join('; ')} | altered=${JSON.stringify(dyn.keyTransforms.alteredConfigurations)}`)),
});

// S5: 动力学总论 summary 可读性（要包含至少 5 段以上分号或换行）
const summary = dyn.summary;
const sectionCount = (summary.match(/。/g) ?? []).length;
results.push({
  id: 'S5',
  desc: '动力学总论 summary 聚合 7 维输出，让人一眼看懂',
  passed: sectionCount >= 5 && summary.length >= 200,
  evidence: `summary 长度=${summary.length}字 / 句段数=${sectionCount}`,
});

// ════════════════════════════════════════════════════════════
// 输出 10 维结果
// ════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(72));
console.log('  10 维动力学输出');
console.log('═'.repeat(72));

console.log('\n【D1 用神/忌神 × 位置】');
console.log('summary:', dyn.yongJiByPosition.summary);
console.log('keyInsights:');
dyn.yongJiByPosition.keyInsights.forEach((k) => console.log('  -', k));
console.log('primaryYong（主用神）:');
dyn.yongJiByPosition.primaryYong.forEach((y) =>
  console.log(`  - ${y.wuxing}/${y.role} | 透干@${y.ganPositions.join(',') || '无'} | 藏支@${y.zhiPositions.join(',') || '无'} | 全藏=${y.isFullyHidden} | 受攻=${y.isAttacked}${y.attackDescription ? '/' + y.attackDescription : ''} | 主导期=${y.primaryLifeStage} | ${y.judgment}`),
);
console.log('secondaryYong（次用神/喜神）:');
dyn.yongJiByPosition.secondaryYong.forEach((y) =>
  console.log(`  - ${y.wuxing}/${y.role} | 透干@${y.ganPositions.join(',') || '无'} | 藏支@${y.zhiPositions.join(',') || '无'} | 全藏=${y.isFullyHidden} | 受攻=${y.isAttacked} | ${y.judgment}`),
);
console.log('ji（忌神）:');
dyn.yongJiByPosition.ji.forEach((y) =>
  console.log(`  - ${y.wuxing}/${y.role} | 透干@${y.ganPositions.join(',') || '无'} | 藏支@${y.zhiPositions.join(',') || '无'} | ${y.judgment}`),
);

console.log('\n【D2 十神组合】');
console.log('summary:', dyn.shiShenCombos.summary);
dyn.shiShenCombos.combos.forEach((c) => console.log(`  - ${c.type}(${c.strength}/${c.polarity}) @${c.positions.join(',')}: ${c.destinyChain}`));

console.log('\n【D3 关键合化冲刑】');
console.log('summary:', dyn.keyTransforms.summary);
console.log('transforms:');
dyn.keyTransforms.transforms.forEach((t) => console.log(`  - [${t.type}] ${t.participants.join('+')} @${t.positions.join(',')} → effect=${t.effect}/${t.affectedRoles.join(',')} | ${t.impact}`));
console.log('alteredConfigurations:');
dyn.keyTransforms.alteredConfigurations.forEach((a) => console.log('  -', a));
console.log('keyInsights:');
dyn.keyTransforms.keyInsights.forEach((k) => console.log('  -', k));

console.log('\n【D4 五行流通链】');
console.log('summary:', dyn.flowChain.summary);
console.log('pattern:', dyn.flowChain.pattern);
console.log('best:', dyn.flowChain.bestSegments.join(' / ') || '（无）');
console.log('worst:', dyn.flowChain.worstSegments.join(' / ') || '（无）');
console.log('keyInsights:');
dyn.flowChain.keyInsights.forEach((k) => console.log('  -', k));

console.log('\n【D5 强弱 vs 喜忌反差】');
console.log('summary:', dyn.xiJiContrast.summary);
console.log('primaryStruggle:', dyn.xiJiContrast.primaryStruggle);
dyn.xiJiContrast.items.forEach((it) => console.log(`  - [${it.severity}] ${it.type}: ${it.evidence} → ${it.lifelongStruggle}`));

console.log('\n【D6 虚透 vs 通根】');
console.log('summary:', dyn.xuTouVsRoot.summary);
console.log('illusoryAbilities:', dyn.xuTouVsRoot.illusoryAbilities);
console.log('hiddenStrengths:', dyn.xuTouVsRoot.hiddenStrengths);
dyn.xuTouVsRoot.items.forEach((it) => console.log(`  - ${it.position}${it.gan}(${it.shiShen}) ${it.rootStrength}: ${it.reality} | ${it.impact}`));

console.log('\n【D7 位置 + 身体部位】');
console.log('summary:', dyn.positionMeaning.summary);
dyn.positionMeaning.mappings.forEach((m) => console.log(`  - ${m.position}/${m.bodyPart}/${m.wuxing}/${m.yongJiNature}/risk=${m.riskLevel}`));

console.log('\n【D7+ 位置力学全景矩阵 PositionForce】');
console.log('summary:', dyn.positionForce.summary);
console.log(`yongTotal=${dyn.positionForce.yongTotalForce} | jiTotal=${dyn.positionForce.jiTotalForce} | lostYong=${dyn.positionForce.lostYongForce} | globalNet=${dyn.positionForce.globalNetForce}`);
console.log('worstChar:', dyn.positionForce.worstChar?.charLabel ?? '（无）', '净影响力=', dyn.positionForce.worstChar?.netForce ?? '');
console.log('bestChar:', dyn.positionForce.bestChar?.charLabel ?? '（无）', '净影响力=', dyn.positionForce.bestChar?.netForce ?? '');
console.log('items（按 |netForce| 降序）:');
dyn.positionForce.items.forEach((it, idx) => {
  const sign = it.netForce > 0 ? '+' : '';
  const interactionTag = it.interactionDetail ? ` | ${it.interactionDetail}` : '';
  console.log(`  ${idx + 1}. ${it.badge} ${it.pillar}${it.charLabel}（${it.gongWei}/${it.shiShen}/${it.slot}） baseScore=${it.baseScore} × dist=${it.distanceCoef}(${it.distance}) × trig=${it.triggerCoef}(${it.triggerMode}) × inter=${it.interactionCoef}(${it.interaction}) × sign=${it.yongJiSign} = netForce=${sign}${it.netForce}${interactionTag}`);
});
console.log('keyInsights:');
dyn.positionForce.keyInsights.forEach((k) => console.log('  -', k));

console.log('\n【D8 纳音深度】');
console.log('summary:', dyn.naYinDepth.summary);
console.log('combinationMeaning:', dyn.naYinDepth.combinationMeaning);

console.log('\n【D9 神煞联动】');
console.log('summary:', dyn.shenShaInteraction.summary);
dyn.shenShaInteraction.chains.forEach((c) => console.log(`  - [${c.type}] ${c.shenShaNames.join('+')}: ${c.combinedEffect}`));

console.log('\n【D10 节气深度】');
console.log('summary:', dyn.jieQiDepth.summary);
console.log('tiaoHouNeed:', dyn.jieQiDepth.tiaoHouNeed);

console.log('\n【D11 大运联动】');
console.log('summary:', dyn.daYunDynamics.summary);
console.log('黄金窗口:');
dyn.daYunDynamics.goldenWindows.forEach((g) =>
  console.log(`  - 第${g.index}步 ${g.ganZhi} (${g.ageRange[0]}-${g.ageRange[1]}岁) — ${g.reason}`),
);
console.log('凶险窗口:');
dyn.daYunDynamics.riskyWindows.forEach((r) =>
  console.log(`  - 第${r.index}步 ${r.ganZhi} (${r.ageRange[0]}-${r.ageRange[1]}岁) — ${r.reason}`),
);
console.log('关键转折点:');
dyn.daYunDynamics.turningPoints.forEach((t) => console.log(`  - ${t.description}`));
console.log('keyInsights:');
dyn.daYunDynamics.keyInsights.forEach((k) => console.log('  -', k));
console.log('\n8 步大运详细:');
dyn.daYunDynamics.daYuns.forEach((d) => {
  console.log(`  第${d.index}步 ${d.ganZhi}（${d.shiShen}） ${d.startAge}岁起 [${d.wuxingRole}/${d.score}分] ${d.headline}`);
  d.triggers.forEach((t) => console.log(`     · [${t.kind}/${t.intensity}] ${t.description}`));
});

console.log('\n' + '═'.repeat(72));
console.log('  📜 动力学总论 summary');
console.log('═'.repeat(72));
console.log(dyn.summary);

// ════════════════════════════════════════════════════════════
// S6 大运联动新增检查
// ════════════════════════════════════════════════════════════
const dy11 = dyn.daYunDynamics;
const s6Hits: string[] = [];
// 6.1: 8 步大运全部生成
if (dy11.daYuns.length === 8) s6Hits.push(`8步大运齐全`);
// 6.2: 至少识别一处"冲解原局合"（蔡命应识别酉运冲卯解戌卯合）
const chongJie = dy11.daYuns.flatMap((d) => d.triggers.filter((t) => t.kind === '冲解原局合'));
if (chongJie.length > 0) s6Hits.push(`冲解原局合命中=${chongJie.length}处`);
// 6.3: 至少识别一处"加剧忌神"（蔡命应识别水运/金运再加忌神）
const addJi = dy11.daYuns.flatMap((d) => d.triggers.filter((t) => t.kind === '加剧忌神'));
if (addJi.length > 0) s6Hits.push(`加剧忌神命中=${addJi.length}处`);
// 6.4: keyInsights 至少 1 条
if (dy11.keyInsights.length >= 1) s6Hits.push(`keyInsights=${dy11.keyInsights.length}条`);
results.push({
  id: 'S6',
  desc: '大运联动 D11：8步大运 + 关键节点(冲解合/加剧忌神)识别',
  passed: dy11.daYuns.length === 8 && (chongJie.length + addJi.length) > 0 && dy11.keyInsights.length >= 1,
  evidence: s6Hits.join(' | ') || `daYuns.length=${dy11.daYuns.length}, triggers未识别`,
});

// ════════════════════════════════════════════════════════════
// S7 位置力学 PositionForce 验证（蔡命预期）
// ════════════════════════════════════════════════════════════
const pf = dyn.positionForce;
const s7Hits: string[] = [];
const s7Fails: string[] = [];

// 7.1：所有字 + 主要藏干都被覆盖（4 天干 + 4 地支本气 + 部分中气/余气，至少 10 项）
if (pf.items.length >= 10) {
  s7Hits.push(`items=${pf.items.length}项（覆盖天干+藏干）`);
} else {
  s7Fails.push(`items 仅 ${pf.items.length} 项，期望 ≥10`);
}

// 7.2：日干壬被标记为本命主中性（yongJiSign=0、shiShen='日主'）
const dayMaster = pf.items.find((it) => it.shiShen === '日主');
if (dayMaster && dayMaster.yongJiSign === 0 && dayMaster.gongWei === '本命主') {
  s7Hits.push(`日主${dayMaster.charLabel}@${dayMaster.pillar}标记中性正确`);
} else {
  s7Fails.push(`日主标记异常: ${JSON.stringify(dayMaster)}`);
}

// 7.3：戌中戊（用神七杀）被戌卯六合化火 → interaction='transformed' 且 netForce=0
const wuTuInXu = pf.items.find((it) => it.pillar === '日柱' && it.charLabel.includes('戌') && it.charLabel.includes('戊'));
if (wuTuInXu && wuTuInXu.interaction === 'transformed' && wuTuInXu.netForce === 0) {
  s7Hits.push(`戌中戊用神被合化归零正确（${wuTuInXu.interactionDetail}）`);
} else if (wuTuInXu) {
  s7Fails.push(`戌中戊状态异常: interaction=${wuTuInXu.interaction} netForce=${wuTuInXu.netForce} detail=${wuTuInXu.interactionDetail}`);
} else {
  s7Fails.push(`未找到日支戌中戊`);
}

// 7.4：月支亥本气（壬，月令）应当是负分最大的字之一（|netForce| ≥ 5）
const yueLingHaiBenQi = pf.items.find((it) => it.pillar === '月柱' && it.slot === '地支本气' && it.charLabel.includes('亥'));
if (yueLingHaiBenQi && Math.abs(yueLingHaiBenQi.netForce) >= 5) {
  s7Hits.push(`月令亥本气负分=${yueLingHaiBenQi.netForce}（绝对值≥5）`);
} else if (yueLingHaiBenQi) {
  s7Fails.push(`月令亥本气负分不足: netForce=${yueLingHaiBenQi.netForce}`);
} else {
  s7Fails.push(`未找到月支亥本气`);
}

// 7.5：月令字 baseScore 应该是双倍（10），其他本气字应是 5
if (yueLingHaiBenQi && yueLingHaiBenQi.baseScore === 10) {
  s7Hits.push(`月令本气 baseScore=10（双倍）正确`);
} else if (yueLingHaiBenQi) {
  s7Fails.push(`月令本气 baseScore 异常: ${yueLingHaiBenQi.baseScore}`);
}
const otherBenQi = pf.items.filter((it) => it.slot === '地支本气' && it.pillar !== '月柱');
const allOtherBenQiCorrect = otherBenQi.every((it) => it.baseScore === 5);
if (otherBenQi.length > 0 && allOtherBenQiCorrect) {
  s7Hits.push(`非月令本气 baseScore=5 全部正确（共${otherBenQi.length}项）`);
} else if (otherBenQi.length > 0) {
  s7Fails.push(`非月令本气 baseScore 异常: ${otherBenQi.map((it) => `${it.charLabel}=${it.baseScore}`).join(',')}`);
}

// 7.6：时干癸（紧贴日主+忌神透干）应是负向 |netForce| 较大的字（绝对值 ≥ 5）
const shiGanGui = pf.items.find((it) => it.pillar === '时柱' && it.slot === '天干' && it.charLabel === '癸');
if (shiGanGui && shiGanGui.netForce <= -5) {
  s7Hits.push(`时干癸劫财 netForce=${shiGanGui.netForce}（紧贴日主忌神透干）`);
} else if (shiGanGui) {
  s7Fails.push(`时干癸 netForce 不达预期: ${shiGanGui.netForce}`);
} else {
  s7Fails.push(`未找到时干癸`);
}

// 7.7：年干癸（隔月柱→one-apart 0.6）的 |netForce| 必然小于时干癸（紧贴 1.0）
const nianGanGui = pf.items.find((it) => it.pillar === '年柱' && it.slot === '天干' && it.charLabel === '癸');
if (nianGanGui && shiGanGui && Math.abs(nianGanGui.netForce) < Math.abs(shiGanGui.netForce)) {
  s7Hits.push(`年干癸|${nianGanGui.netForce}| < 时干癸|${shiGanGui.netForce}|（位置力学差异验证通过）`);
} else if (nianGanGui && shiGanGui) {
  s7Fails.push(`位置力学差异不满足: 年干癸=${nianGanGui.netForce} vs 时干癸=${shiGanGui.netForce}`);
}

// 7.8：lostYongForce > 0（戌中戊本应贡献正分却被夺走）
if (pf.lostYongForce > 0) {
  s7Hits.push(`lostYongForce=${pf.lostYongForce}（戌中戊用神被夺潜在损失）`);
} else {
  s7Fails.push(`lostYongForce 应大于 0，实际=${pf.lostYongForce}`);
}

// 7.9：globalNetForce 为负（深度水寒局）
if (pf.globalNetForce < 0) {
  s7Hits.push(`globalNetForce=${pf.globalNetForce}（深度失衡正确）`);
} else {
  s7Fails.push(`globalNetForce 应为负，实际=${pf.globalNetForce}`);
}

// 7.10：worstChar 与 bestChar 都应能识别（非 null）
if (pf.worstChar && pf.bestChar) {
  s7Hits.push(`worstChar=${pf.worstChar.charLabel}/bestChar=${pf.bestChar.charLabel}`);
} else {
  s7Fails.push(`worstChar=${pf.worstChar?.charLabel ?? '空'}/bestChar=${pf.bestChar?.charLabel ?? '空'}`);
}

// 7.11：keyInsights 应至少 1 条（含"全场最毒位"和"用神被夺"）
const hasWorstInsight = pf.keyInsights.some((k) => k.includes('全场最毒位'));
const hasLostInsight = pf.keyInsights.some((k) => k.includes('用神被夺'));
if (hasWorstInsight && hasLostInsight) {
  s7Hits.push(`keyInsights 包含 "全场最毒位" + "用神被夺"`);
} else {
  s7Fails.push(`keyInsights 缺关键洞察: insights=${JSON.stringify(pf.keyInsights)}`);
}

results.push({
  id: 'S7',
  desc: '位置力学全景 PositionForce：覆盖度 + 戊土归零 + 月令双权 + 位置差异 + 全局指标',
  passed: s7Fails.length === 0,
  evidence: s7Fails.length === 0
    ? s7Hits.join(' | ')
    : `通过=${s7Hits.length}项 / 失败=${s7Fails.length}项: ${s7Fails.join(' || ')}`,
});

// ════════════════════════════════════════════════════════════
// 合格性报告
// ════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(72));
console.log('  ✅ 5 项合格标准检查');
console.log('═'.repeat(72));

let passed = 0;
results.forEach((r) => {
  const tag = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n[${tag}] ${r.id}: ${r.desc}`);
  console.log(`  证据: ${r.evidence}`);
  if (r.passed) passed++;
});

console.log('\n' + '═'.repeat(72));
console.log(`  最终结果: ${passed}/${results.length} 项通过`);
console.log('═'.repeat(72));

if (passed < results.length) {
  process.exit(1);
}
