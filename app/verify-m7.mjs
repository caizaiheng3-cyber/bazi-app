// M7 每日命理对话引擎自验脚本
//
// 测试矩阵：
//   T1 流日推算：蔡蔡基线，指定日期的干支、十神、地支关系
//   T2 一周推算：7 日，含 isToday
//   T3 DailyFortune：scoreLabel / summary / shiYi / jiHui / jiShi 全部非空
//   T4 DailyDashboard：fortune + weeklyTrend + quickScenes 齐全
//   T5 先生对话引擎（决策）：verdict / empathy / explanation / suggestion / basis 全部非空
//   T6 先生对话引擎（择吉）：bestTiming 非空
//   T7 先生对话引擎（宜忌）：suggestion 含宜/忌
//   T8 先生对话引擎（开放）：explanation 含命格引用
//   T9 多命盘对比：不同日主的 dashboard fortune 明显不同
//   T10 无命盘兜底：mock 回退不崩溃

import { strict as assert } from 'node:assert';
import { buildChartWithFallback } from './src/engine/baziEngine.ts';
import { computeDayForecast, computeWeekForecast } from './src/engine/dailyForecast.ts';
import { generateDailyFortune, computeDayScore } from './src/engine/dailyFortuneGenerator.ts';
import { generateDailyDashboard } from './src/engine/dailyDashboardGenerator.ts';
import { generateShifuReply } from './src/engine/shifuEngine.ts';
import { matchShifuReply } from './src/mock/replyMatcher.ts';

console.log('===== M7 每日命理对话引擎自验 =====\n');

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

const chartCaiCai = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
const anchorDate = new Date('2026-04-27T12:00:00+08:00');

// ---------- T1：流日推算 ----------
{
  console.log('— T1 流日推算：蔡蔡 2026-04-27');
  const f = computeDayForecast(chartCaiCai.pillars[2].tianGan, chartCaiCai.pillars[2].diZhi, anchorDate);
  console.log(`  日期: ${f.date}, 干支: ${f.ganZhi}, 十神: ${f.shiShen}, 农历: ${f.lunarDate}`);
  console.log(`  地支与日支关系: ${f.relationToDayZhi}`);
  console.log(`  流年: ${f.liuNianGanZhi}, 流月: ${f.liuYueGanZhi}`);
  assert.ok(f.date === '2026-04-27', `T1 日期 ${f.date}`);
  assert.ok(f.ganZhi.length === 2, `T1 干支 ${f.ganZhi}`);
  assert.ok(f.shiShen.length >= 2, `T1 十神 ${f.shiShen}`);
  assert.ok(f.lunarDate.length > 3, `T1 农历 ${f.lunarDate}`);
  assert.ok(['合', '冲', '刑', '害', '无'].includes(f.relationToDayZhi), `T1 关系 ${f.relationToDayZhi}`);
  console.log('  ✅ T1 通过\n');
}

// ---------- T2：一周推算 ----------
{
  console.log('— T2 一周推算');
  const week = computeWeekForecast(chartCaiCai.pillars[2].tianGan, chartCaiCai.pillars[2].diZhi, anchorDate);
  assert.ok(week.length === 7, `T2 应有 7 日，实际 ${week.length}`);
  for (const d of week) {
    console.log(`  ${d.date} ${d.weekday} ${d.ganZhi} ${d.shiShen} rel=${d.relationToDayZhi}`);
    assert.ok(d.ganZhi.length === 2);
    assert.ok(d.shiShen.length >= 2);
  }
  console.log('  ✅ T2 通过\n');
}

// ---------- T3：DailyFortune ----------
{
  console.log('— T3 DailyFortune');
  const f = computeDayForecast(chartCaiCai.pillars[2].tianGan, chartCaiCai.pillars[2].diZhi, anchorDate);
  const fortune = generateDailyFortune(chartCaiCai, f);
  console.log(`  scoreLabel: ${fortune.scoreLabel}`);
  console.log(`  summary: ${fortune.summary}`);
  console.log(`  宜: ${fortune.shiYi.join(', ')}`);
  console.log(`  忌: ${fortune.jiHui.join(', ')}`);
  console.log(`  吉时: ${fortune.jiShi.map(j => j.range).join(', ')}`);
  assert.ok(['大吉', '小吉', '平', '小凶'].includes(fortune.scoreLabel));
  assert.ok(fortune.summary.length > 10, 'T3 summary 太短');
  assert.ok(fortune.shiYi.length >= 2, 'T3 宜太少');
  assert.ok(fortune.jiHui.length >= 2, 'T3 忌太少');
  assert.ok(fortune.jiShi.length >= 1, 'T3 吉时太少');
  // 吉时的 reason 非空
  for (const j of fortune.jiShi) {
    assert.ok(j.reason.length > 5, `T3 吉时 reason 太短: ${j.reason}`);
  }
  console.log('  ✅ T3 通过\n');
}

// ---------- T4：DailyDashboard ----------
{
  console.log('— T4 DailyDashboard');
  const dashboard = generateDailyDashboard(chartCaiCai, { anchorDate });
  assert.ok(dashboard.fortune.date.length > 0, 'T4 fortune.date');
  assert.ok(dashboard.weeklyTrend.days.length === 7, 'T4 weeklyTrend 7 日');
  assert.ok(dashboard.weeklyTrend.weekRange.length > 0, 'T4 weekRange');
  assert.ok(dashboard.quickScenes.length === 4, 'T4 quickScenes 4 种');
  // weeklyTrend 中有 isToday=true 的一天
  const todayDay = dashboard.weeklyTrend.days.find(d => d.isToday);
  assert.ok(todayDay, 'T4 weeklyTrend 中应有 isToday');
  console.log(`  fortune: ${dashboard.fortune.scoreLabel} - ${dashboard.fortune.summary.slice(0, 30)}...`);
  console.log(`  weeklyTrend: ${dashboard.weeklyTrend.weekRange} [${dashboard.weeklyTrend.days.map(d => d.label).join(', ')}]`);
  console.log(`  isToday: ${todayDay.date} ${todayDay.weekday}`);
  console.log('  ✅ T4 通过\n');
}

// ---------- T5：先生对话引擎（决策） ----------
{
  console.log('— T5 先生对话（决策）');
  const reply = generateShifuReply({
    question: '下午面试要不要去？',
    scene: '决策',
    chart: chartCaiCai,
    anchorDate,
  });
  console.log(`  verdict: ${reply.verdict}`);
  console.log(`  empathy: ${reply.empathy.slice(0, 40)}...`);
  console.log(`  explanation: ${reply.explanation.slice(0, 60)}...`);
  console.log(`  suggestion: ${reply.suggestion.slice(0, 60)}...`);
  console.log(`  basis.liuRi: ${reply.basis.liuRi}`);
  console.log(`  bestTiming: ${reply.bestTiming}`);
  assert.ok(['宜', '忌', '慎', '中性'].includes(reply.verdict), `T5 verdict ${reply.verdict}`);
  assert.ok(reply.empathy.length > 10, 'T5 empathy');
  assert.ok(reply.explanation.length > 20, 'T5 explanation');
  assert.ok(reply.suggestion.length > 20, 'T5 suggestion');
  assert.ok(reply.basis.liuRi, 'T5 basis.liuRi');
  assert.ok(reply.bestTiming, 'T5 bestTiming');
  console.log('  ✅ T5 通过\n');
}

// ---------- T6：先生对话引擎（择吉） ----------
{
  console.log('— T6 先生对话（择吉）');
  const reply = generateShifuReply({
    question: '下周签约哪天最好？',
    scene: '择吉',
    chart: chartCaiCai,
    anchorDate,
  });
  console.log(`  verdict: ${reply.verdict}`);
  console.log(`  bestTiming: ${reply.bestTiming}`);
  console.log(`  explanation: ${reply.explanation.slice(0, 80)}...`);
  assert.ok(reply.bestTiming, 'T6 bestTiming 应非空');
  assert.ok(reply.explanation.includes('首选'), 'T6 explanation 应含首选');
  console.log('  ✅ T6 通过\n');
}

// ---------- T7：先生对话引擎（宜忌） ----------
{
  console.log('— T7 先生对话（宜忌）');
  const reply = generateShifuReply({
    question: '今天一天该注意什么？',
    scene: '宜忌',
    chart: chartCaiCai,
    anchorDate,
  });
  console.log(`  verdict: ${reply.verdict}`);
  console.log(`  suggestion: ${reply.suggestion.slice(0, 80)}...`);
  assert.ok(reply.suggestion.includes('宜'), 'T7 suggestion 应含宜');
  assert.ok(reply.suggestion.includes('忌'), 'T7 suggestion 应含忌');
  console.log('  ✅ T7 通过\n');
}

// ---------- T8：先生对话引擎（开放 + 命格引用） ----------
{
  console.log('— T8 先生对话（开放 + 命格引用）');
  const reply = generateShifuReply({
    question: '最近总是失眠，是不是流年不好？',
    scene: '开放',
    chart: chartCaiCai,
    anchorDate,
  });
  console.log(`  verdict: ${reply.verdict}`);
  console.log(`  explanation: ${reply.explanation.slice(0, 100)}...`);
  // 应引用命格信息（geJu.name 或 wangShuai.conclusion）
  const hasGeJu = reply.explanation.includes(chartCaiCai.geJu.name);
  const hasWangShuai = reply.explanation.includes('日主');
  assert.ok(hasGeJu || hasWangShuai, 'T8 explanation 应引用命格或旺衰');
  // 应识别到"健康"领域
  assert.ok(reply.relatedFocus === '健康', `T8 relatedFocus 应为健康，实际 ${reply.relatedFocus}`);
  console.log('  ✅ T8 通过\n');
}

// ---------- T9：多命盘对比 ----------
{
  console.log('— T9 多命盘对比');
  const chartB = buildChartWithFallback(makeInput('丙火', '女', '1990-07-15', '14:00'));
  const fortuneA = generateDailyFortune(
    chartCaiCai,
    computeDayForecast(chartCaiCai.pillars[2].tianGan, chartCaiCai.pillars[2].diZhi, anchorDate),
  );
  const fortuneB = generateDailyFortune(
    chartB,
    computeDayForecast(chartB.pillars[2].tianGan, chartB.pillars[2].diZhi, anchorDate),
  );
  console.log(`  蔡蔡(${chartCaiCai.pillars[2].tianGan}日主): ${fortuneA.scoreLabel} - ${fortuneA.summary.slice(0, 30)}...`);
  console.log(`  丙火(${chartB.pillars[2].tianGan}日主): ${fortuneB.scoreLabel} - ${fortuneB.summary.slice(0, 30)}...`);
  // 不同日主应产生不同 summary（至少 summary 文本不完全相同）
  const isDifferent = fortuneA.summary !== fortuneB.summary || fortuneA.scoreLabel !== fortuneB.scoreLabel;
  assert.ok(isDifferent, 'T9 不同命主的 fortune 应有差异');
  console.log('  ✅ T9 通过\n');
}

// ---------- T10：无命盘兜底 ----------
{
  console.log('— T10 无命盘兜底（mock 回退）');
  const reply = matchShifuReply({ question: '今天宜忌', scene: '宜忌' });
  assert.ok(reply.empathy.length > 5, 'T10 mock empathy');
  assert.ok(reply.explanation.length > 5, 'T10 mock explanation');
  assert.ok(reply.suggestion.length > 5, 'T10 mock suggestion');
  assert.ok(['宜', '忌', '慎', '中性'].includes(reply.verdict), 'T10 mock verdict');
  console.log(`  mock verdict: ${reply.verdict}`);
  console.log('  ✅ T10 通过\n');
}

console.log('🎉 全部 10 组断言通过！M7 每日命理对话引擎验证完成！');
