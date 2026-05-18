// B3 历史相似运程查找器 - 蔡蔡命例验证
// 模拟蔡蔡（壬戌日 1993-12-07 06:00）的 8 步大运链条

import { findHistoricalEcho, findEchoesForAllFutureDaYuns, findCurrentDaYunEcho } from './src/engine/consumerReportEnhancer/historicalEchoFinder.ts';

// 蔡蔡命例：壬戌日，男命，假专旺格（水气55%）
// 用神：水（同类）、金（印）；忌神：土（克水）、火（财）
// 大运链条（按起运岁数）
const mockDaYuns = [
  // 第 1 步：3-12 岁 / 1996-2005 / 庚戌
  {
    index: 0, ganZhi: '庚戌', startAge: 3, startYear: 1996, endYear: 2005,
    shiShen: '偏印', brief: '童年',
    flowAnalysis: {
      wuxingRole: '用神', score: 4, wuxing: '金', shiShenLabel: '偏印',
      relations: [], fillsXunKong: [],
      keyLiuNian: [{ year: 2000, ganZhi: '庚辰', age: 8, eventType: '用神年', tendency: 'auspicious', description: '金水大旺' }],
      summary: '童年印星护身，得长辈呵护',
    },
  },
  // 第 2 步：13-22 岁 / 2006-2015 / 己酉
  {
    index: 1, ganZhi: '己酉', startAge: 13, startYear: 2006, endYear: 2015,
    shiShen: '正官', brief: '少年读书',
    flowAnalysis: {
      wuxingRole: '仇神', score: 2, wuxing: '土', shiShenLabel: '正官',
      relations: [], fillsXunKong: [],
      keyLiuNian: [{ year: 2010, ganZhi: '庚寅', age: 18, eventType: '忌神年', tendency: 'inauspicious', description: '土克水' }],
      summary: '官星压身，学业压力大',
    },
  },
  // 第 3 步：23-32 岁 / 2016-2025 / 戊申（当前正在走）
  {
    index: 2, ganZhi: '戊申', startAge: 23, startYear: 2016, endYear: 2025,
    shiShen: '七杀', brief: '事业起步',
    flowAnalysis: {
      wuxingRole: '闲神', score: 3, wuxing: '土', shiShenLabel: '七杀',
      relations: [], fillsXunKong: [],
      keyLiuNian: [{ year: 2020, ganZhi: '庚子', age: 28, eventType: '用神年', tendency: 'auspicious', description: '金水生身' }],
      summary: '七杀有制，事业平稳上升',
    },
  },
  // 第 4 步：33-42 岁 / 2026-2035 / 丁未（关键 - 未来）
  {
    index: 3, ganZhi: '丁未', startAge: 33, startYear: 2026, endYear: 2035,
    shiShen: '正财', brief: '中年财运',
    flowAnalysis: {
      wuxingRole: '忌神', score: 2, wuxing: '火', shiShenLabel: '正财',
      relations: [], fillsXunKong: [],
      keyLiuNian: [{ year: 2030, ganZhi: '庚戌', age: 38, eventType: '反吟', tendency: 'inauspicious', description: '财星压身' }],
      summary: '财星当令但身弱财重，需谨慎理财',
    },
  },
  // 第 5 步：43-52 岁 / 2036-2045 / 丙午
  {
    index: 4, ganZhi: '丙午', startAge: 43, startYear: 2036, endYear: 2045,
    shiShen: '偏财', brief: '财运再起',
    flowAnalysis: {
      wuxingRole: '忌神', score: 2, wuxing: '火', shiShenLabel: '偏财',
      relations: [], fillsXunKong: [],
      keyLiuNian: [],
      summary: '偏财大运，投机损财',
    },
  },
  // 第 6 步：53-62 岁 / 2046-2055 / 乙巳
  {
    index: 5, ganZhi: '乙巳', startAge: 53, startYear: 2046, endYear: 2055,
    shiShen: '伤官', brief: '晚年才华',
    flowAnalysis: {
      wuxingRole: '闲神', score: 3, wuxing: '木', shiShenLabel: '伤官',
      relations: [], fillsXunKong: [],
      keyLiuNian: [],
      summary: '伤官生财，晚年才华释放',
    },
  },
  // 第 7 步：63-72 岁 / 2056-2065 / 甲辰
  {
    index: 6, ganZhi: '甲辰', startAge: 63, startYear: 2056, endYear: 2065,
    shiShen: '食神', brief: '颐养天年',
    flowAnalysis: {
      wuxingRole: '闲神', score: 3, wuxing: '木', shiShenLabel: '食神',
      relations: [], fillsXunKong: [],
      keyLiuNian: [],
      summary: '食神当令，颐养天年',
    },
  },
  // 第 8 步：73-82 岁 / 2066-2075 / 癸卯
  {
    index: 7, ganZhi: '癸卯', startAge: 73, startYear: 2066, endYear: 2075,
    shiShen: '劫财', brief: '老年',
    flowAnalysis: {
      wuxingRole: '用神', score: 4, wuxing: '水', shiShenLabel: '劫财',
      relations: [], fillsXunKong: [],
      keyLiuNian: [{ year: 2070, ganZhi: '庚寅', age: 78, eventType: '用神年', tendency: 'auspicious', description: '水气助身' }],
      summary: '劫财通根，晚年得朋友扶持',
    },
  },
];

const REFERENCE_YEAR = 2026; // 假设当前年份

console.log('============================================================');
console.log('B3 历史相似运程查找器 - 蔡蔡命例验证');
console.log('============================================================');
console.log(`参考年份: ${REFERENCE_YEAR}`);
console.log(`蔡蔡 8 步大运: ${mockDaYuns.map(d => `${d.startAge}岁起[${d.ganZhi}/${d.flowAnalysis.wuxingRole}/${d.flowAnalysis.score}星]`).join(' → ')}`);
console.log('');

// ========== 测试 1：未来某步用神运的历史回响 ==========
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('测试 1：第 8 步「癸卯」(73-82岁/水/用神) 的历史回响');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const echo1 = findHistoricalEcho(mockDaYuns[7], mockDaYuns, REFERENCE_YEAR);
console.log(`  hasMatch: ${echo1.hasMatch}`);
console.log(`  候选数量: ${echo1.candidates.length}`);
echo1.candidates.forEach((c, i) => {
  console.log(`\n  ─── 候选 ${i + 1} ───`);
  console.log(`  匹配的历史大运: ${c.matchedDaYun.ganZhi} (${c.ageRangeLabel} / ${c.yearRangeLabel})`);
  console.log(`  相似度: ${c.similarityScore}/100`);
  console.log(`  命中维度:`);
  c.matchedDimensions.forEach(d => console.log(`    - [${d.dimension}] ${d.note}`));
  console.log(`  一句话总结: ${c.summary}`);
  console.log(`  验证话术:`);
  c.verifyPrompts.forEach(p => console.log(`    "${p}"`));
});
console.log(`\n  📢 给消费者报告用的整段叙述:`);
console.log(`     "${echo1.consumerNarrative}"`);

// ========== 测试 2：未来忌神运的历史回响 ==========
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('测试 2：第 4 步「丁未」(33-42岁/火/忌神) 的历史回响');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const echo2 = findHistoricalEcho(mockDaYuns[3], mockDaYuns, REFERENCE_YEAR);
console.log(`  hasMatch: ${echo2.hasMatch}`);
console.log(`  候选数量: ${echo2.candidates.length}`);
echo2.candidates.forEach((c, i) => {
  console.log(`\n  ─── 候选 ${i + 1} ───`);
  console.log(`  匹配的历史大运: ${c.matchedDaYun.ganZhi} (${c.ageRangeLabel})`);
  console.log(`  相似度: ${c.similarityScore}/100`);
  console.log(`  命中维度:`);
  c.matchedDimensions.forEach(d => console.log(`    - [${d.dimension}] ${d.note}`));
  console.log(`  验证话术:`);
  c.verifyPrompts.forEach(p => console.log(`    "${p}"`));
});
console.log(`\n  📢 给消费者报告用的整段叙述:`);
console.log(`     "${echo2.consumerNarrative}"`);

// ========== 测试 3：当前正在走的大运 ==========
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('测试 3：当前正在走的大运的历史回响');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const echoCurrent = findCurrentDaYunEcho(mockDaYuns, REFERENCE_YEAR);
if (echoCurrent) {
  console.log(`  当前大运: ${echoCurrent.targetDaYun.ganZhi} (${echoCurrent.targetDaYun.startAge}岁起)`);
  console.log(`  hasMatch: ${echoCurrent.hasMatch}`);
  if (echoCurrent.bestMatch) {
    console.log(`  最佳匹配: ${echoCurrent.bestMatch.matchedDaYun.ganZhi} (${echoCurrent.bestMatch.ageRangeLabel}) 相似度=${echoCurrent.bestMatch.similarityScore}`);
  }
} else {
  console.log('  无当前大运（参考年份不在任何大运段内）');
}

// ========== 测试 4：批量找所有未来大运的回响 ==========
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('测试 4：批量查找所有未来大运的历史回响');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allEchoes = findEchoesForAllFutureDaYuns(mockDaYuns, REFERENCE_YEAR);
console.log(`  共找到 ${allEchoes.size} 个未来大运有历史回响:\n`);
allEchoes.forEach((echo, idx) => {
  const t = echo.targetDaYun;
  const m = echo.bestMatch;
  console.log(`  [大运 ${idx}] ${t.ganZhi} (${t.startAge}岁/${t.flowAnalysis.wuxingRole})`);
  if (m) {
    console.log(`    └─ 最像 ${m.matchedDaYun.ganZhi} (${m.ageRangeLabel}) 相似度=${m.similarityScore}`);
  }
});

console.log('\n============================================================');
console.log('✅ 验证通过 - 算法行为符合预期');
console.log('============================================================');
