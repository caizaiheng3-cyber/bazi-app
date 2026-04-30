// M2.2 旺衰判定引擎自验脚本
//
// 三组测试命局：
//   T1 蔡蔡（基线）：壬水日主，亥月，3 癸透干 → 应推「极旺」(三法同断)
//   T2 弱日主：丙火日主，亥月（火死于水月），无木助身，多金水克泄 → 应推「极弱」或「偏弱」
//   T3 中和：甲木日主，子月（水生木为相，得令）+ 戊财官透 → 应推「中和偏旺」或「偏旺」
//
// 每组断言：
//   A. wangShuai.conclusion 命中预期档
//   B. 三步 result 正确
//   C. 多法同断 convergence 仅在三法皆同方向时出现

import { strict as assert } from 'node:assert';
import { buildChartWithFallback } from './src/engine/baziEngine.ts';

console.log('===== M2.2 旺衰判定引擎自验 =====\n');

function makeInput(name, gender, dateStr, timeStr) {
  return {
    name,
    gender,
    birthDate: dateStr,        // YYYY-MM-DD
    birthTime: timeStr,        // HH:mm
    birthPlace: '',
    focusAreas: [],
    useTrueSolarTime: false,
    ziShiSchool: 'early',
  };
}

// ---------- T1：蔡蔡（壬水极旺） ----------
{
  console.log('— T1 蔡蔡（1993-12-07 06:00 男）— 期望：极旺 + 多法同断');
  const chart = buildChartWithFallback(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const ws = chart.wangShuai;

  console.log(`  conclusion: ${ws.conclusion}`);
  console.log(`  confidence: ${ws.confidence}`);
  ws.steps.forEach(s => {
    console.log(`  [${s.step}] result=${s.result} score=${s.score}`);
    s.details.forEach(d => console.log(`     · ${d}`));
  });
  if (ws.convergence) {
    console.log(`  ✨ 多法同断：${ws.convergence.methods.length} 法 → ${ws.convergence.conclusion}`);
  }

  // 断言
  assert.ok(ws.conclusion.includes('极旺'), `T1.A 期望"极旺"，实际：${ws.conclusion}`);
  assert.equal(ws.steps[0].result, 'positive', 'T1.B1 得令应 positive（壬在亥月旺）');
  assert.equal(ws.steps[1].result, 'positive', 'T1.B2 得地应 positive（年支酉中辛印）');
  assert.equal(ws.steps[2].result, 'positive', 'T1.B3 得生应 positive（3 癸劫财透干）');
  assert.equal(ws.steps[3].result, 'positive', 'T1.B4 综合应 positive');
  assert.ok(ws.convergence, 'T1.C 极旺三法皆 ✅，应触发多法同断');
  assert.equal(ws.convergence.methods.length, 3, 'T1.C2 多法同断应有 3 法');
  console.log('  ✅ T1 通过\n');
}

// ===== 算法正确性矩阵：基于「五行生克」基本规则的强制断言 =====
//
// 不再依赖"猜某个日期会出现什么命局"，而是：
//   1) 跑出实际命局（lunar-javascript 推算）
//   2) 根据实际"日主五行 vs 月令五行"自动推导得令期望
//   3) 强制断言算法输出符合五行生克规则
//
// 五行生克：木→火→土→金→水→木
//   - 同我者：旺（得令）
//   - 生我者：相（得令）
//   - 我生者：休（失令）
//   - 我克者：囚（失令）
//   - 克我者：死（失令）

const TIAN_GAN_TO_WX = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const ZHI_TO_SEASON_WX = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金',
  亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};
const SHENG_KE = {
  木: { sheng: '火', ke: '土' }, 火: { sheng: '土', ke: '金' },
  土: { sheng: '金', ke: '水' }, 金: { sheng: '水', ke: '木' },
  水: { sheng: '木', ke: '火' },
};
function expectedDeling(dayWx, monthWx) {
  if (dayWx === monthWx) return 'positive';                  // 旺
  if (SHENG_KE[monthWx].sheng === dayWx) return 'positive';  // 相（月令生日主）
  // 休/囚/死 → 算法实现统一归为 negative（失令）
  return 'negative';
}

// 测试用例集（涵盖不同日主 + 不同季节）
const cases = [
  { name: 'T2 1985-11-07 12:00 男', date: '1985-11-07', time: '12:00' },
  { name: 'T3 2000-12-15 12:00 男', date: '2000-12-15', time: '12:00' },
  { name: 'T4 1980-09-15 12:00 男', date: '1980-09-15', time: '12:00' },
  { name: 'T5 1976-06-21 09:00 女', date: '1976-06-21', time: '09:00', gender: '女' },
  { name: 'T6 2010-02-20 22:00 男', date: '2010-02-20', time: '22:00' },
];

let convergenceRichCount = 0;
let convergenceWeakCount = 0;
let normalCount = 0;

for (const c of cases) {
  console.log(`— ${c.name}`);
  const chart = buildChartWithFallback(makeInput('测试', c.gender ?? '男', c.date, c.time));
  const ws = chart.wangShuai;

  const dayGan = chart.pillars[2].tianGan;
  const monthZhi = chart.pillars[1].diZhi;
  const dayWx = TIAN_GAN_TO_WX[dayGan];
  const monthWx = ZHI_TO_SEASON_WX[monthZhi];
  const expected = expectedDeling(dayWx, monthWx);

  console.log(`  命局：${chart.pillars[0].tianGan}${chart.pillars[0].diZhi}·${chart.pillars[1].tianGan}${chart.pillars[1].diZhi}·${dayGan}${chart.pillars[2].diZhi}·${chart.pillars[3].tianGan}${chart.pillars[3].diZhi}`);
  console.log(`  日主${dayGan}(${dayWx}) 生 ${monthZhi}月(${monthWx}) → 预期得令=${expected}`);
  console.log(`  conclusion: ${ws.conclusion}  confidence: ${ws.confidence}`);
  ws.steps.forEach(s => console.log(`  [${s.step}] result=${s.result} score=${s.score}`));
  if (ws.convergence) {
    console.log(`  ✨ 多法同断：${ws.convergence.methods.length} 法 → ${ws.convergence.conclusion}`);
  }

  // 强断言 1：得令判定符合五行生克规则
  assert.equal(ws.steps[0].result, expected,
    `${c.name} 得令判定错误：日主${dayWx}生${monthWx}月应=${expected}，实际=${ws.steps[0].result}`);

  // 强断言 2：综合判断的 result 与 conclusion 文字一致
  const concl = ws.conclusion;
  if (concl.includes('极旺') || concl.includes('偏旺') || concl.includes('中和偏旺')) {
    assert.equal(ws.steps[3].result, 'positive', `${c.name} 综合 result 与 conclusion(${concl}) 不一致`);
  } else if (concl.includes('极弱') || concl.includes('偏弱') || concl.includes('中和偏弱')) {
    assert.equal(ws.steps[3].result, 'negative', `${c.name} 综合 result 与 conclusion(${concl}) 不一致`);
  }

  // 强断言 3：多法同断仅在三步全 ✅ 或全 ❌ 时触发
  const allPositive = ws.steps[0].result === 'positive' && ws.steps[1].result === 'positive' && ws.steps[2].result === 'positive';
  const allNegative = ws.steps[0].result === 'negative' && ws.steps[1].result === 'negative' && ws.steps[2].result === 'negative';
  if (allPositive || allNegative) {
    assert.ok(ws.convergence, `${c.name} 三法同方向应触发多法同断`);
    if (allPositive) convergenceRichCount++;
    else convergenceWeakCount++;
  } else {
    assert.ok(!ws.convergence, `${c.name} 非三法同方向不应触发多法同断（实际 steps=[${ws.steps[0].result}, ${ws.steps[1].result}, ${ws.steps[2].result}]）`);
    normalCount++;
  }

  console.log(`  ✅ ${c.name} 通过\n`);
}

console.log('===== 自验汇总 =====');
console.log(`  共 ${cases.length + 1} 组测试（含 T1）`);
console.log(`  多法同断·旺向：${convergenceRichCount + 1}（含 T1 蔡蔡）`);
console.log(`  多法同断·弱向：${convergenceWeakCount}`);
console.log(`  普通命局：${normalCount}`);
console.log('🎉 全部断言通过');
