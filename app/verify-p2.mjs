// 方案 2 端到端验证：从 chart → EnhancedWarning[]
// 用蔡蔡真实命例（壬戌日 1993-12-07 06:00）跑通完整链路

import { buildChartWithFallback } from './src/engine/baziEngine.ts';
import { buildEnhancedWarnings } from './src/engine/consumerReportEnhancer/warningEnhancer.ts';

console.log('============================================================');
console.log('方案 2 端到端验证：「必须告诉你的事」屏');
console.log('蔡蔡命例：壬戌日 1993-12-07 06:00 男');
console.log('============================================================\n');

// 用真实的 baziEngine 排盘
const chart = buildChartWithFallback({
  name: '蔡蔡',
  gender: '男',
  birthDate: '1993-12-07',
  birthTime: '06:00',
  birthPlace: '杭州',
  focusAreas: [],
  useTrueSolarTime: false,
  ziShiSchool: 'late',
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Step 0：排盘结果摘要（chart 数据）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  四柱: ${chart.pillars.map(p => p.tianGan + p.diZhi).join(' ')}`);
console.log(`  五行: ${chart.wuxingStats.map(s => `${s.wuxing}${s.percent}%`).join(' / ')}`);
console.log(`  旺衰: ${chart.wangShuai.conclusion}`);
console.log(`  用神: 主=[${chart.yongShen.primary.join(',')}] 忌=[${chart.yongShen.ji.join(',')}] 取法=${chart.yongShen.method}`);
console.log(`  格局: ${chart.geJu.name}（${chart.geJu.status}/${chart.geJu.level}）`);
console.log(`  神煞: ${chart.shenShas.map(s => s.name + '(' + s.source + ')').join(' / ')}`);
console.log(`  关键发现 ${chart.keyFindings.length} 条:`);
chart.keyFindings.slice(0, 5).forEach(kf => console.log(`    [${kf.level}] ${kf.title}`));
console.log(`  日支冲: ${chart.relations.zhiChong.length} 个`);
console.log(`  manifestation: ${chart.relations.manifestation.length} 条`);
console.log(`  食神层级: ${chart.relations.manifestation.find(m => m.shiShen === '食神')?.level ?? 'N/A'}`);
console.log(`  伤官层级: ${chart.relations.manifestation.find(m => m.shiShen === '伤官')?.level ?? 'N/A'}`);
console.log(`  大运 ${chart.daYuns.length} 步: ${chart.daYuns.map(d => d.ganZhi + '(' + d.flowAnalysis?.wuxingRole + ')').join(' ')}`);

// 调用增强器
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Step 1：调用 buildEnhancedWarnings');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const warnings = buildEnhancedWarnings(chart, {
  maxWarnings: 10,
  referenceYear: 2026,
});

console.log(`  ✅ 命中 ${warnings.length} 条预警\n`);

// 完整渲染每一条
warnings.forEach((w, i) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const sevIcon = { high: '🔴', medium: '🟡', low: '🟢' }[w.severity];
  console.log(`【预警 ${i + 1}】${sevIcon} ${w.severity.toUpperCase()} · ${w.relatedDomain}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📌 ${w.title}\n`);
  console.log(`💬 一句话依据: ${w.oneLineReason}`);
  console.log(`☯️  缓解: ${w.reassurance}`);

  console.log(`\n  ▼ 折叠层 1：依据`);
  console.log(`    🔍 命中证据: ${w.evidence.matchedFrom}`);
  if (w.evidence.translation) {
    console.log(`    📜 命理上: ${w.evidence.translation.literal}`);
    console.log(`    💡 通俗讲: ${w.evidence.translation.lifeAnalogy}`);
    console.log(`    🔁 验证方法: ${w.evidence.translation.verifyHint}`);
  } else {
    console.log(`    ⚠️  无术语翻译`);
  }

  console.log(`\n  ▼ 折叠层 2：化解方案 (${w.remedies.length} 条)`);
  w.remedies.slice(0, 3).forEach((r, j) => {
    console.log(`    ${j + 1}. ${r.action}`);
    console.log(`       原理: ${r.reason}`);
    console.log(`       时机: ${r.timing}`);
  });
  if (w.remedies.length > 3) {
    console.log(`    ... 还有 ${w.remedies.length - 3} 条化解方案`);
  }

  if (w.historicalEcho) {
    console.log(`\n  ▼ 折叠层 3：历史回响（让用户用过去验证）`);
    console.log(`    📢 ${w.historicalEcho.narrative}`);
    console.log(`    💭 验证话术:`);
    w.historicalEcho.verifyPrompts.forEach(p => console.log(`       "${p}"`));
  }
  console.log('');
});

// 按领域过滤测试
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Step 2：按领域过滤测试 - 仅婚姻 + 财富');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const filtered = buildEnhancedWarnings(chart, {
  focusedDomains: ['婚姻', '财富'],
  referenceYear: 2026,
});
console.log(`  过滤后命中 ${filtered.length} 条:`);
filtered.forEach(w => console.log(`    - [${w.severity}] ${w.relatedDomain}: ${w.title.slice(0, 30)}...`));

console.log('\n============================================================');
console.log('✅ 端到端验证完成');
console.log('============================================================');
