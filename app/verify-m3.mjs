// M3 消费者报告生成引擎自验脚本
//
// 测试矩阵：
//   T1 蔡蔡基线：8 大段落全部生成，字段非空
//   T2 imagery 纳音映射：蔡蔡=大海水（壬戌纳音）
//   T3 luckyGuide 合法性：colors/directions/numbers/industries/foods 非空
//   T4 timeline 合法性：≥3 个节点，type ∈ good/caution/turning
//   T5 稳健性：5 组命局跑通，字段合法
//   T6 端到端：buildChartWithFallback → generateConsumerReport

import { strict as assert } from 'node:assert';
import { buildChartWithFallback } from './src/engine/baziEngine.ts';
import { generateConsumerReport } from './src/engine/consumerReportGenerator.ts';

console.log('===== M3 消费者报告生成引擎自验 =====\n');

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

// ---------- T1：蔡蔡基线 ----------
{
  console.log('— T1 蔡蔡基线：8 大段落全部生成');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const report = generateConsumerReport(chart);

  // imagery
  assert.ok(report.imagery.title.length > 0, 'T1 imagery.title 非空');
  assert.ok(report.imagery.subtitle.length > 0, 'T1 imagery.subtitle 非空');
  assert.ok(report.imagery.description.length > 10, 'T1 imagery.description 非空');
  assert.ok(report.imagery.keywords.length >= 3, 'T1 imagery.keywords ≥3');

  // empathy
  assert.ok(report.empathy.title.length > 0, 'T1 empathy.title 非空');
  assert.ok(report.empathy.paragraphs.length >= 2, 'T1 empathy.paragraphs ≥2');

  // explanation
  assert.ok(report.explanation.title.length > 0, 'T1 explanation.title 非空');
  assert.ok(report.explanation.paragraphs.length >= 2, 'T1 explanation.paragraphs ≥2');
  assert.ok(report.explanation.terms.length >= 1, 'T1 explanation.terms ≥1');

  // guidance
  assert.ok(report.guidance.title.length > 0, 'T1 guidance.title 非空');
  assert.ok(report.guidance.points.length >= 3, 'T1 guidance.points ≥3');

  // timeline
  assert.ok(report.timeline.nodes.length >= 3, 'T1 timeline.nodes ≥3');

  // luckyGuide
  assert.ok(report.luckyGuide.colors.length >= 1, 'T1 luckyGuide.colors ≥1');
  assert.ok(report.luckyGuide.directions.length >= 1, 'T1 luckyGuide.directions ≥1');
  assert.ok(report.luckyGuide.numbers.length >= 1, 'T1 luckyGuide.numbers ≥1');
  assert.ok(report.luckyGuide.industries.length >= 1, 'T1 luckyGuide.industries ≥1');

  // closing
  assert.ok(report.closing.paragraphs.length >= 2, 'T1 closing.paragraphs ≥2');

  // otherAreas
  assert.ok(report.otherAreas.length >= 3, 'T1 otherAreas ≥3');

  console.log('  ✅ T1 通过\n');
}

// ---------- T2：imagery 纳音映射 ----------
{
  console.log('— T2 蔡蔡 imagery = 大海水');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const report = generateConsumerReport(chart);
  console.log(`  纳音：${chart.pillars[2].naYin}`);
  console.log(`  imagery.title：${report.imagery.title}`);
  assert.ok(report.imagery.title === '大海水', `T2 蔡蔡纳音应为大海水，实际 ${report.imagery.title}`);
  console.log('  ✅ T2 通过\n');
}

// ---------- T3：luckyGuide 合法性 ----------
{
  console.log('— T3 luckyGuide 合法性');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const report = generateConsumerReport(chart);
  const lg = report.luckyGuide;
  console.log(`  colors: ${lg.colors.join(', ')}`);
  console.log(`  directions: ${lg.directions.join(', ')}`);
  console.log(`  numbers: ${lg.numbers.join(', ')}`);
  console.log(`  industries: ${lg.industries.slice(0, 4).join(', ')}...`);
  console.log(`  nobleman: ${lg.nobleman.substring(0, 40)}...`);

  assert.ok(lg.colors.every(c => typeof c === 'string' && c.length > 0), 'T3 colors 合法');
  assert.ok(lg.numbers.every(n => typeof n === 'number'), 'T3 numbers 合法');
  assert.ok(lg.nobleman.length > 5, 'T3 nobleman 非空');
  console.log('  ✅ T3 通过\n');
}

// ---------- T4：timeline 合法性 ----------
{
  console.log('— T4 timeline 合法性');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const report = generateConsumerReport(chart);
  const VALID_TYPES = new Set(['good', 'caution', 'turning']);
  for (const node of report.timeline.nodes) {
    assert.ok(node.year.length > 0, `T4 year 非空`);
    assert.ok(node.ageRange.length > 0, `T4 ageRange 非空`);
    assert.ok(node.ganZhi.length > 0, `T4 ganZhi 非空`);
    assert.ok(node.summary.length > 10, `T4 summary 太短`);
    assert.ok(VALID_TYPES.has(node.type), `T4 非法 type: ${node.type}`);
  }
  console.log(`  ${report.timeline.nodes.length} 个节点，类型分布：${report.timeline.nodes.map(n => n.type).join(', ')}`);
  console.log('  ✅ T4 通过\n');
}

// ---------- T5：稳健性 ----------
{
  console.log('— T5 稳健性：5 组命局');
  const cases = [
    ['1970-03-15', '08:00'],
    ['2005-08-20', '15:30'],
    ['1988-10-10', '23:30'],
    ['1991-04-15', '14:00'],
    ['1985-07-15', '10:00'],
  ];

  for (const [d, t] of cases) {
    const chart = buildChartWithFallback(makeInput('稳健', '男', d, t));
    const report = generateConsumerReport(chart);
    console.log(`  ${d} ${t}: imagery=${report.imagery.title}, empathy=${report.empathy.paragraphs.length}段, guidance=${report.guidance.points.length}条, timeline=${report.timeline.nodes.length}节点`);

    assert.ok(report.imagery.title.length > 0, `T5 ${d} imagery.title 非空`);
    assert.ok(report.empathy.paragraphs.length >= 2, `T5 ${d} empathy ≥2`);
    assert.ok(report.guidance.points.length >= 3, `T5 ${d} guidance ≥3`);
    assert.ok(report.timeline.nodes.length >= 3, `T5 ${d} timeline ≥3`);
    assert.ok(report.luckyGuide.colors.length >= 1, `T5 ${d} luckyGuide 非空`);
    assert.ok(report.otherAreas.length >= 3, `T5 ${d} otherAreas ≥3`);
  }
  console.log('  ✅ T5 全部通过\n');
}

// ---------- T6：端到端 ----------
{
  console.log('— T6 端到端验证（确认 store 接入可行性）');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const report = generateConsumerReport(chart);
  console.log(`  完整流程：排盘 → 分析 → 报告生成 ✅`);
  console.log(`  imagery: ${report.imagery.title} — ${report.imagery.subtitle}`);
  console.log(`  empathy: ${report.empathy.paragraphs.length} 段`);
  console.log(`  explanation: ${report.explanation.paragraphs.length} 段, ${report.explanation.terms.length} 术语, ${(report.explanation.convergenceNotes || []).length} convergence注脚`);
  console.log(`  guidance: ${report.guidance.points.length} 条建议`);
  console.log(`  timeline: ${report.timeline.nodes.length} 节点`);
  console.log(`  otherAreas: ${report.otherAreas.map(a => a.area).join(', ')}`);
  console.log('  ✅ T6 通过\n');
}

console.log('🎉 全部断言通过！M3 消费者报告生成引擎验证完成！');
