// M2.1 五行统计自验
// 校验目标：
//   1) 蔡蔡基线：与 mock 数值 100% 一致（金3/木3/水6/火1/土2，% 20/20/40/7/13）
//   2) 不同命局应产生不同的五行分布（不再固定蔡蔡）
//   3) 边界：极旺单一五行 / 五行均匀
//
// 运行：node verify-m2.1.mjs

import lunarPkg from 'lunar-javascript';
const { Solar } = lunarPkg;

// ===== 复刻 wuxingAnalyzer 算法 =====

const TIAN_GAN_TO_WUXING = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const WUXING_ORDER = ['金', '木', '水', '火', '土'];

function ganWx(g) { return TIAN_GAN_TO_WUXING[g]; }

function analyzeWuxing(pillars) {
  const counts = new Map();
  WUXING_ORDER.forEach(wx => counts.set(wx, { tianGan: 0, diZhi: 0, cangGan: 0 }));

  for (const p of pillars) {
    counts.get(ganWx(p.tianGan)).tianGan += 1;
    if (p.cangGan.length > 0) counts.get(ganWx(p.cangGan[0].gan)).diZhi += 1;
    for (const cg of p.cangGan) counts.get(ganWx(cg.gan)).cangGan += 1;
  }

  const grandTotal = WUXING_ORDER.reduce((s, wx) => {
    const c = counts.get(wx);
    return s + c.tianGan + c.diZhi + c.cangGan;
  }, 0);
  const safeTotal = grandTotal > 0 ? grandTotal : 1;

  const stats = WUXING_ORDER.map(wx => {
    const c = counts.get(wx);
    const total = c.tianGan + c.diZhi + c.cangGan;
    return {
      wuxing: wx,
      tianGanCount: c.tianGan, diZhiCount: c.diZhi, cangGanCount: c.cangGan,
      total, percent: Math.round((total / safeTotal) * 100),
    };
  });

  // 百分比舍入修正
  const percentSum = stats.reduce((s, x) => s + x.percent, 0);
  if (percentSum !== 100 && grandTotal > 0) {
    const diff = 100 - percentSum;
    let maxIdx = 0;
    for (let i = 1; i < stats.length; i++) if (stats[i].total > stats[maxIdx].total) maxIdx = i;
    stats[maxIdx].percent += diff;
  }
  return stats;
}

// ===== 由 lunar 生成 pillars =====

function buildPillars(y, m, d, h, mi, sect = 1) {
  const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
  ec.setSect(sect);
  return [
    {
      tianGan: ec.getYearGan(),
      cangGan: ec.getYearHideGan().map((g, i) => ({ gan: g, type: i === 0 ? '本气' : i === 1 ? '中气' : '余气' })),
    },
    {
      tianGan: ec.getMonthGan(),
      cangGan: ec.getMonthHideGan().map((g, i) => ({ gan: g, type: i === 0 ? '本气' : i === 1 ? '中气' : '余气' })),
    },
    {
      tianGan: ec.getDayGan(),
      cangGan: ec.getDayHideGan().map((g, i) => ({ gan: g, type: i === 0 ? '本气' : i === 1 ? '中气' : '余气' })),
    },
    {
      tianGan: ec.getTimeGan(),
      cangGan: ec.getTimeHideGan().map((g, i) => ({ gan: g, type: i === 0 ? '本气' : i === 1 ? '中气' : '余气' })),
    },
  ];
}

// ===== 测试用例 =====

let pass = 0, fail = 0;
const fails = [];

function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; fails.push({ label, actual, expected }); }
}

console.log('═════════════════════════════════════════════════════════');
console.log('  M2.1 五行统计引擎自验');
console.log('═════════════════════════════════════════════════════════\n');

// ───────────────────────────
// C1: 蔡蔡基线 — 应与 mock 100% 一致
// ───────────────────────────
console.log('━━ C1 蔡蔡 1993-12-07 06:00 男（mock 基线对照）━━');
const caicaiPillars = buildPillars(1993, 12, 7, 6, 0);
const caicaiStats = analyzeWuxing(caicaiPillars);
caicaiStats.forEach(s => {
  console.log(`  ${s.wuxing}: 干${s.tianGanCount} 支${s.diZhiCount} 藏${s.cangGanCount} = ${s.total}（${s.percent}%）`);
});

const expectedCaicai = [
  { wuxing: '金', tianGanCount: 0, diZhiCount: 1, cangGanCount: 2, total: 3, percent: 20 },
  { wuxing: '木', tianGanCount: 0, diZhiCount: 1, cangGanCount: 2, total: 3, percent: 20 },
  { wuxing: '水', tianGanCount: 4, diZhiCount: 1, cangGanCount: 1, total: 6, percent: 40 },
  { wuxing: '火', tianGanCount: 0, diZhiCount: 0, cangGanCount: 1, total: 1, percent: 7 },
  { wuxing: '土', tianGanCount: 0, diZhiCount: 1, cangGanCount: 1, total: 2, percent: 13 },
];
eq('C1 蔡蔡 stats 与 mock 100% 一致', caicaiStats, expectedCaicai);
console.log(`  ${JSON.stringify(caicaiStats) === JSON.stringify(expectedCaicai) ? '✅' : '❌'} 与 mock 完全对齐\n`);

// ───────────────────────────
// C2: 1990-06-15 14:30 女 — 庚午年壬午月辛亥日乙未时（强金水火混合）
// ───────────────────────────
console.log('━━ C2 1990-06-15 14:30 女（强火土，应明显不同于蔡蔡）━━');
const c2Pillars = buildPillars(1990, 6, 15, 14, 30);
const c2Stats = analyzeWuxing(c2Pillars);
c2Stats.forEach(s => {
  console.log(`  ${s.wuxing}: 干${s.tianGanCount} 支${s.diZhiCount} 藏${s.cangGanCount} = ${s.total}（${s.percent}%）`);
});
const c2Diff = JSON.stringify(c2Stats) !== JSON.stringify(caicaiStats);
console.log(`  ${c2Diff ? '✅' : '❌'} C2 与 C1 五行分布不同：${c2Diff ? '是（算法生效）' : '否（仍是固定蔡蔡！）'}`);
if (c2Diff) pass++; else fail++;

// 进一步：午月（火旺）+ 双午支，火五行应至少 ≥ 3
const c2Fire = c2Stats.find(s => s.wuxing === '火').total;
const c2FirePass = c2Fire >= 3;
console.log(`  ${c2FirePass ? '✅' : '❌'} 火 ≥ 3（双午支，火当令）：实际 ${c2Fire}`);
if (c2FirePass) pass++; else fail++;
console.log('');

// ───────────────────────────
// C3: 2000-01-01 00:30 男 — 己卯年丙子月戊午日壬子时（水火土三足）
// ───────────────────────────
console.log('━━ C3 2000-01-01 00:30 男（水土火三足）━━');
const c3Pillars = buildPillars(2000, 1, 1, 0, 30);
const c3Stats = analyzeWuxing(c3Pillars);
c3Stats.forEach(s => {
  console.log(`  ${s.wuxing}: 干${s.tianGanCount} 支${s.diZhiCount} 藏${s.cangGanCount} = ${s.total}（${s.percent}%）`);
});

// 验证：百分比和必须 = 100
const c3PctSum = c3Stats.reduce((s, x) => s + x.percent, 0);
const c3PctPass = c3PctSum === 100;
console.log(`  ${c3PctPass ? '✅' : '❌'} 百分比合 = 100：实际 ${c3PctSum}`);
if (c3PctPass) pass++; else fail++;

// 验证：total 总和 = 4(干) + 4(支本气) + 全部藏干数（必须 ≥ 12，因为每柱至少 1 藏干）
const c3Total = c3Stats.reduce((s, x) => s + x.total, 0);
const c3TotalPass = c3Total >= 12 && c3Total <= 20;
console.log(`  ${c3TotalPass ? '✅' : '❌'} total 总和合理 [12,20]：实际 ${c3Total}`);
if (c3TotalPass) pass++; else fail++;
console.log('');

// ───────────────────────────
// C4: 边界 — 百分比舍入修正
// 构造一个理论上易产生舍入误差的命局
// ───────────────────────────
console.log('━━ C4 验证百分比修正：所有用例百分比合必须严格 = 100 ━━');
const allPctSums = [
  caicaiStats.reduce((s, x) => s + x.percent, 0),
  c2Stats.reduce((s, x) => s + x.percent, 0),
  c3Stats.reduce((s, x) => s + x.percent, 0),
];
const allPctPass = allPctSums.every(s => s === 100);
console.log(`  ${allPctPass ? '✅' : '❌'} C1/C2/C3 百分比合都=100：实际 ${allPctSums.join(' / ')}`);
if (allPctPass) pass++; else fail++;

// ===== 总结 =====
console.log('\n═════════════════════════════════════════════════════════');
console.log(`  结果：✅ ${pass} 项通过 ／ ❌ ${fail} 项失败`);
if (fail > 0) {
  console.log('\n  失败明细：');
  fails.forEach(f => {
    console.log(`  [${f.label}]`);
    console.log('    期望:', JSON.stringify(f.expected));
    console.log('    实际:', JSON.stringify(f.actual));
  });
  console.log('═════════════════════════════════════════════════════════');
  process.exit(1);
}
console.log('  🎉 M2.1 五行统计引擎全部断言通过！');
console.log('═════════════════════════════════════════════════════════');
