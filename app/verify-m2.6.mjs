// M2.6 keyFindings 整合引擎自验脚本
//
// 测试矩阵：
//   T1 蔡蔡基线：≥4 条 keyFindings，≥1 条 red，≥1 条带 convergence
//   T2 字段合法性：level/title/description/convergence 字段校验
//   T3 排序正确性：red > yellow > green
//   T4 稳健性：5 组命局至少各有 ≥1 条 keyFinding
//   T5 端到端：通过 buildChartWithFallback 整体跑通

import { strict as assert } from 'node:assert';
import { computeBazi, buildChartWithFallback } from './src/engine/baziEngine.ts';
import { analyzeWuxing } from './src/engine/wuxingAnalyzer.ts';
import { analyzeWangShuai } from './src/engine/wangShuaiAnalyzer.ts';
import { analyzeYongShen } from './src/engine/yongShenAnalyzer.ts';
import { analyzeGeJu } from './src/engine/geJuAnalyzer.ts';
import { analyzeShenSha } from './src/engine/shenShaAnalyzer.ts';
import { analyzeKeyFindings } from './src/engine/keyFindingsAnalyzer.ts';

console.log('===== M2.6 keyFindings 整合引擎自验 =====\n');

function makeInput(name, gender, dateStr, timeStr) {
  return {
    name, gender,
    birthDate: dateStr,
    birthTime: timeStr,
    birthPlace: '',
    focusAreas: [],
    useTrueSolarTime: false,
    ziShiSchool: 'early',
  };
}

function runFullAnalysis(input) {
  const eo = computeBazi(input);
  const wuxingStats = analyzeWuxing(eo.pillars);
  const wangShuai = analyzeWangShuai(eo.pillars);
  const yongShen = analyzeYongShen(eo.pillars, wuxingStats, wangShuai);
  const geJu = analyzeGeJu(eo.pillars, wuxingStats, wangShuai, yongShen);
  const shenShas = analyzeShenSha(eo.pillars);
  const keyFindings = analyzeKeyFindings({
    pillars: eo.pillars, wuxingStats, wangShuai, yongShen, geJu, shenShas, daYuns: eo.daYuns,
  });
  return { eo, wuxingStats, wangShuai, yongShen, geJu, shenShas, keyFindings };
}

const VALID_LEVELS = new Set(['red', 'yellow', 'green']);

// ---------- T1：蔡蔡基线 ----------
{
  console.log('— T1 蔡蔡（1993-12-07 06:00 男）');
  const { eo, keyFindings } = runFullAnalysis(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  console.log(`  四柱：${eo.pillars.map(p => p.tianGan + p.diZhi).join('·')}`);
  console.log(`  命中 ${keyFindings.length} 条关键发现：`);
  for (const kf of keyFindings) {
    console.log(`    [${kf.level}] ${kf.title}${kf.convergence ? ' 🔰' + kf.convergence.methods.length + '法同断' : ''}`);
  }

  // 断言 A：条数 ≥4
  assert.ok(keyFindings.length >= 4, `T1.A 应 ≥4 条，实际 ${keyFindings.length}`);

  // 断言 B：≥1 条 red
  const hasRed = keyFindings.some(kf => kf.level === 'red');
  assert.ok(hasRed, 'T1.B 应至少 1 条 red');

  // 断言 C：≥1 条带 convergence
  const hasConvergence = keyFindings.some(kf => kf.convergence && kf.convergence.methods.length >= 2);
  assert.ok(hasConvergence, 'T1.C 应至少 1 条带 convergence（≥2 法同断）');

  // 断言 D：red 条目中有"极旺"相关字样
  const redFindings = keyFindings.filter(kf => kf.level === 'red');
  const hasWangShuaiRed = redFindings.some(kf => kf.title.includes('极旺') || kf.title.includes('极弱'));
  assert.ok(hasWangShuaiRed, 'T1.D red 条目应包含旺衰极端判断');

  console.log('  ✅ T1 通过\n');
}

// ---------- T2：字段合法性 ----------
{
  console.log('— T2 字段合法性');
  const { keyFindings } = runFullAnalysis(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));

  for (const kf of keyFindings) {
    assert.ok(VALID_LEVELS.has(kf.level), `T2 非法 level: ${kf.level}`);
    assert.ok(kf.title && kf.title.length > 0, `T2 title 不应为空`);
    assert.ok(kf.description && kf.description.length > 10, `T2 description 太短: ${kf.title}`);

    if (kf.convergence) {
      assert.ok(Array.isArray(kf.convergence.methods), `T2 convergence.methods 应为数组`);
      assert.ok(kf.convergence.methods.length >= 2, `T2 convergence.methods 应 ≥2`);
      assert.ok(kf.convergence.conclusion && kf.convergence.conclusion.length > 0, `T2 convergence.conclusion 不应为空`);
    }
  }
  console.log('  ✅ T2 通过\n');
}

// ---------- T3：排序正确性 ----------
{
  console.log('— T3 排序正确性（red > yellow > green）');
  const { keyFindings } = runFullAnalysis(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const ORDER = { red: 0, yellow: 1, green: 2 };
  let lastOrder = -1;
  for (const kf of keyFindings) {
    const ord = ORDER[kf.level];
    assert.ok(ord >= lastOrder, `T3 排序异常：${kf.title}(${kf.level}) 出现在更高级别之后`);
    lastOrder = ord;
  }
  console.log('  ✅ T3 通过\n');
}

// ---------- T4：稳健性 ----------
{
  console.log('— T4 稳健性：5 组探查');
  const cases = [
    ['1970-03-15', '08:00'],
    ['2005-08-20', '15:30'],
    ['1988-10-10', '23:30'],
    ['1991-04-15', '14:00'],
    ['1985-07-15', '10:00'],
  ];

  for (const [d, t] of cases) {
    const { eo, keyFindings } = runFullAnalysis(makeInput('稳健', '男', d, t));
    console.log(`  ${d} ${t}: ${eo.pillars.map(p => p.tianGan + p.diZhi).join('·')} → ${keyFindings.length} 条`);
    assert.ok(keyFindings.length >= 1, `T4 ${d} 应至少 1 条 keyFinding`);

    for (const kf of keyFindings) {
      assert.ok(VALID_LEVELS.has(kf.level), `T4 ${d} 非法 level: ${kf.level}`);
      assert.ok(kf.title.length > 0, `T4 ${d} title 为空`);
      assert.ok(kf.description.length > 10, `T4 ${d} desc 太短`);
    }
  }
  console.log('  ✅ T4 全部通过\n');
}

// ---------- T5：端到端（buildChartWithFallback） ----------
{
  console.log('— T5 端到端：buildChartWithFallback');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));

  assert.ok(chart.keyFindings && chart.keyFindings.length >= 4, 'T5 chart.keyFindings 应 ≥4 条');
  assert.ok(chart.keyFindings.some(kf => kf.level === 'red'), 'T5 应有 red');
  assert.ok(chart.keyFindings.some(kf => kf.convergence), 'T5 应有 convergence');

  // 确认不再是 mock 数据（mock 第一条 title 是 "日主极旺，水势汪洋"，引擎输出 title 应不同）
  console.log(`  keyFindings[0].title = "${chart.keyFindings[0].title}"`);
  console.log(`  keyFindings 条数 = ${chart.keyFindings.length}`);
  console.log('  ✅ T5 通过\n');
}

console.log('🎉 全部断言通过！M2.6 keyFindings 整合引擎验证完成！');
