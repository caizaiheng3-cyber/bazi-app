// 命格特征模块端到端校验：蔡 1993-12-07 06:00 男 福建
// 目的：通过 ts-node 直接跑引擎，对照手算 6 维结论看是否合理
//
// 运行：cd app && npx tsx verify-persona.mjs

import { buildChartWithFallback } from './src/engine/baziEngine.ts';

const input = {
  name: '蔡',
  gender: '男',
  birthDate: '1993-12-07',
  birthTime: '06:00',
  birthPlace: '福建',
  focusAreas: ['事业'],
};

const chart = buildChartWithFallback(input);
const p = chart.persona;

const line = (s = '') => console.log(s);
const hr = (c = '─') => console.log(c.repeat(70));

hr('═');
line('  蔡 · 男 · 1993-12-07 06:00 · 福建');
line(`  四柱：${chart.pillars.map((x) => x.tianGan + x.diZhi).join(' · ')}`);
line(`  日主：${chart.pillars[2].tianGan}（${chart.pillars[2].naYin}）`);
line(`  旺衰：${chart.wangShuai.conclusion}（置信度 ${chart.wangShuai.confidence}）`);
line(`  用神：主${chart.yongShen.primary.join('、')} / 次${chart.yongShen.secondary.join('、')} / 忌${chart.yongShen.ji.join('、')}`);
line(`  格局：${chart.geJu.name}（${chart.geJu.status} · ${chart.geJu.level}）`);
line(`  神煞：${chart.shenShas.map((s) => s.name).join('、') || '无'}`);
hr('═');
line();

line('【一句话画像】');
line('  ' + p.oneLiner);
line();

line('【六维拆解】');
const dims = [
  ['1·旺衰基底', p.baseTone],
  ['2·日主气质', p.innerNature],
  ['3·用神主旋律', p.lifeTheme],
  ['4·社会角色', p.socialRole],
];
for (const [name, t] of dims) {
  line(`  ${name} → [${t.tag}]`);
  line(`     ${t.description}`);
  if (t.source) line(`     典出：${t.source}`);
  line();
}

line(`  5·十神组合心性（${p.mentality.length} 条）`);
p.mentality.forEach((t, i) => {
  line(`     ${i + 1}) [${t.tag}]`);
  line(`        ${t.description}`);
  if (t.source) line(`        典出：${t.source}`);
});
line();

line(`  6·神煞亮点（${p.highlights.length} 条）`);
p.highlights.forEach((t, i) => {
  line(`     ${i + 1}) [${t.tag}]`);
  line(`        ${t.description}`);
});
line();

hr();
line(`【优势天赋】(${p.strengths.length} 条)`);
p.strengths.forEach((s, i) => line(`  ${i + 1}. ${s}`));
line();

line(`【需要注意】(${p.cautions.length} 条)`);
p.cautions.forEach((s, i) => line(`  ${i + 1}. ${s}`));
line();

line(`【关键词云】(${p.keywords.length} 个)`);
line('  ' + p.keywords.join(' / '));
line();

line(`【综合置信度】 ${'★'.repeat(p.confidence)}${'☆'.repeat(5 - p.confidence)}`);
line();

if (p.convergence) {
  line('【多法同断】');
  line(`  结论：${p.convergence.conclusion}`);
  line('  方法：');
  p.convergence.methods.forEach((m, i) => line(`     ${i + 1}) ${m}`));
}
hr('═');
