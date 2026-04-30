// M1.3 真实生辰回归测试
// 5 组覆盖关键边界场景的生辰，逐项校验：
//   1) 蔡蔡基线（已知准确）
//   2) 早子时换日：23:30 出生应取「次日」日柱（sect=1）
//   3) 节气交界：大雪当天前后，月柱应正确归月
//   4) 跨世纪老案：1949-10-01 中华人民共和国成立日
//   5) 女命逆行：阳年女命应起大运逆行
//
// 运行：node verify-m1.3.mjs

import lunarPkg from 'lunar-javascript';
const { Solar, LunarUtil } = lunarPkg;

function compute(data) {
  const [y, m, d] = data.birthDate.split('-').map(Number);
  const [h, mi] = data.birthTime.split(':').map(Number);
  const genderCode = data.gender === '男' ? 1 : 0;
  const sect = data.ziShiSchool === 'early' ? 1 : 2;

  const solar = Solar.fromYmdHms(y, m, d, h, mi, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(sect);

  const dayGan = ec.getDayGan();
  const yearGan = ec.getYearGan();
  const yangGan = '甲丙戊庚壬'.includes(yearGan);
  const direction = (yangGan === (data.gender === '男')) ? '顺行' : '逆行';

  const yun = ec.getYun(genderCode);
  const daYuns = yun.getDaYun()
    .filter((du, i) => i > 0 && du.getGanZhi())
    .slice(0, 3)
    .map(du => ({
      ganZhi: du.getGanZhi(),
      startAge: du.getStartAge(),
      shiShen: LunarUtil.SHI_SHEN[`${dayGan}${du.getGanZhi()[0]}`],
    }));

  return {
    pillars: [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()],
    dayGan,
    direction,
    daYun_first3: daYuns,
    monthZhi: ec.getMonthZhi(),
  };
}

// ============= 5 组测试用例 =============

const cases = [
  // ───────────────────────────
  // 案例 1：基线（蔡蔡）
  // ───────────────────────────
  {
    label: 'C1 蔡蔡 1993-12-07 06:00 男（基线）',
    input: { gender: '男', birthDate: '1993-12-07', birthTime: '06:00', ziShiSchool: 'early' },
    asserts: [
      { name: '四柱', actual: o => o.pillars.join(' '), expect: '癸酉 癸亥 壬戌 癸卯' },
      { name: '日主', actual: o => o.dayGan, expect: '壬' },
      { name: '大运方向', actual: o => o.direction, expect: '逆行' },
      { name: '首步大运', actual: o => o.daYun_first3[0].ganZhi, expect: '壬戌' },
    ],
  },

  // ───────────────────────────
  // 案例 2：早子时换日（23:30 应归次日）
  // 早子时学派：23:30 出生 → 日柱按【次日】算
  // 1990-06-15 23:30 vs 1990-06-16 00:30 → 日柱应一致（都用 6/16 的日干）
  // ───────────────────────────
  {
    label: 'C2 早子时 1990-06-15 23:30 男（应=6/16 日柱）',
    input: { gender: '男', birthDate: '1990-06-15', birthTime: '23:30', ziShiSchool: 'early' },
    compare: {
      label: '对照 1990-06-16 00:30 男（同 sect）',
      input: { gender: '男', birthDate: '1990-06-16', birthTime: '00:30', ziShiSchool: 'early' },
      assertSameField: 'pillars[2]', // 日柱应一致
    },
  },

  // ───────────────────────────
  // 案例 3：节气交界（大雪 1993-12-07 14:34 节气交脱）
  // 蔡蔡 06:00 出生时还在「立冬→大雪」之间，月支应=亥
  // 同日 18:00 出生时已过大雪，月支应=子
  // ───────────────────────────
  {
    label: 'C3 节气交界 1993-12-07 18:00 男（已过大雪应入子月）',
    input: { gender: '男', birthDate: '1993-12-07', birthTime: '18:00', ziShiSchool: 'early' },
    asserts: [
      { name: '月支应=子（已过大雪）', actual: o => o.monthZhi, expect: '子' },
    ],
  },

  // ───────────────────────────
  // 案例 4：跨世纪老案（1949-10-01 15:00 男，建国日）
  // ───────────────────────────
  {
    label: 'C4 1949-10-01 15:00 男（己丑年 · 老案）',
    input: { gender: '男', birthDate: '1949-10-01', birthTime: '15:00', ziShiSchool: 'early' },
    asserts: [
      // 验证年柱：1949 = 己丑年
      { name: '年柱=己丑', actual: o => o.pillars[0], expect: '己丑' },
      // 1949-10-01 农历八月十日，已过白露(9/8)未到寒露(10/8)，月支=酉
      { name: '月支=酉（白露后寒露前）', actual: o => o.monthZhi, expect: '酉' },
    ],
  },

  // ───────────────────────────
  // 案例 5：女命逆行（阳年女命）
  // 1992 壬申年 = 阳年 → 女命应起大运逆行
  // ───────────────────────────
  {
    label: 'C5 1992-08-15 10:30 女（阳年女命应逆行）',
    input: { gender: '女', birthDate: '1992-08-15', birthTime: '10:30', ziShiSchool: 'early' },
    asserts: [
      { name: '大运方向=逆行（阳年女命）', actual: o => o.direction, expect: '逆行' },
      { name: '年柱=壬申', actual: o => o.pillars[0], expect: '壬申' },
    ],
  },
];

// ============= 执行 =============

console.log('═════════════════════════════════════════════════════════');
console.log('  M1.3 真实生辰回归测试（5 组覆盖命理边界）');
console.log('═════════════════════════════════════════════════════════\n');

let totalPass = 0, totalFail = 0;

for (const c of cases) {
  console.log(`\n━━ ${c.label} ━━`);
  const out = compute(c.input);
  console.log(`  四柱: ${out.pillars.join(' · ')}`);
  console.log(`  日主: ${out.dayGan}  方向: ${out.direction}`);
  console.log(`  大运首3: ${out.daYun_first3.map(d => `${d.ganZhi}(${d.startAge}岁/${d.shiShen})`).join(' → ')}`);

  if (c.asserts) {
    for (const a of c.asserts) {
      const got = a.actual(out);
      const ok = got === a.expect;
      console.log(`  ${ok ? '✅' : '❌'} ${a.name}: 期望「${a.expect}」实际「${got}」`);
      if (ok) totalPass++; else totalFail++;
    }
  }

  if (c.compare) {
    const out2 = compute(c.compare.input);
    console.log(`\n  ▶ ${c.compare.label}`);
    console.log(`    四柱: ${out2.pillars.join(' · ')}`);
    if (c.compare.assertSameField === 'pillars[2]') {
      const ok = out.pillars[2] === out2.pillars[2];
      console.log(`    ${ok ? '✅' : '❌'} 日柱一致性（早子时换日生效）: 「${out.pillars[2]}」vs「${out2.pillars[2]}」`);
      if (ok) totalPass++; else totalFail++;
    }
  }
}

console.log('\n═════════════════════════════════════════════════════════');
console.log(`  结果：✅ ${totalPass} 项通过 ／ ❌ ${totalFail} 项失败`);
console.log(totalFail === 0 ? '  🎉 M1.3 回归全绿！engine 通过 5 组命理边界考验' : '  ⚠️ 存在失败项，请审核断言或 engine 实现');
console.log('═════════════════════════════════════════════════════════');

process.exit(totalFail === 0 ? 0 : 1);
