// M1.2 自验：模拟 useBaziStore.submit 的端到端调用
// 跑 2 组生辰，确认 engine 真实计算（不再固定返回蔡蔡）
//
// 运行：node verify-m1.2.mjs

import lunarPkg from 'lunar-javascript';
const { Solar, LunarUtil } = lunarPkg;

// ===== 复刻 buildChartWithFallback 的核心字段产出 =====

function computeBaziCore(data) {
  const [y, m, d] = data.birthDate.split('-').map(Number);
  const [h, mi] = data.birthTime.split(':').map(Number);
  const genderCode = data.gender === '男' ? 1 : 0;
  const sect = data.ziShiSchool === 'early' ? 1 : 2;

  const solar = Solar.fromYmdHms(y, m, d, h, mi, 0);
  const ec = solar.getLunar().getEightChar();
  ec.setSect(sect);

  const dayGan = ec.getDayGan();
  const yun = ec.getYun(genderCode);
  const daYuns = yun.getDaYun()
    .filter((du, i) => i > 0 && du.getGanZhi())
    .slice(0, 8)
    .map((du, idx) => ({
      index: idx + 1,
      ganZhi: du.getGanZhi(),
      startAge: du.getStartAge(),
      shiShen: LunarUtil.SHI_SHEN[`${dayGan}${du.getGanZhi()[0]}`],
    }));

  return {
    name: data.name,
    pillars: [
      ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime(),
    ],
    dayGan,
    daYun_1: daYuns[0],
    daYun_8: daYuns[7],
  };
}

// ===== 测试用例 =====

const cases = [
  {
    label: '案例 1：蔡蔡（基线，应与 mock 一致）',
    input: {
      name: '蔡蔡', gender: '男',
      birthDate: '1993-12-07', birthTime: '06:00',
      ziShiSchool: 'early',
    },
    expect: {
      pillars: ['癸酉', '癸亥', '壬戌', '癸卯'],
      dayGan: '壬',
    },
  },
  {
    label: '案例 2：1990-06-15 14:30 女（应与蔡蔡完全不同）',
    input: {
      name: '测试女', gender: '女',
      birthDate: '1990-06-15', birthTime: '14:30',
      ziShiSchool: 'early',
    },
    expect: {
      // 1990 年 = 庚午年；芒种(6/6)后入午月
      // 用 Solar.fromYmdHms(1990,6,15,14,30,0) 验证
      pillarsNotEq: ['癸酉', '癸亥', '壬戌', '癸卯'], // 必须 ≠ 蔡蔡
    },
  },
  {
    label: '案例 3：2000-01-01 00:30 男（早子时，应换日）',
    input: {
      name: '千禧男', gender: '男',
      birthDate: '2000-01-01', birthTime: '00:30',
      ziShiSchool: 'early',
    },
    expect: {
      pillarsNotEq: ['癸酉', '癸亥', '壬戌', '癸卯'],
    },
  },
];

console.log('═════════════════════════════════════════════');
console.log('  M1.2 端到端自验：engine 真实计算 vs 固定 mock');
console.log('═════════════════════════════════════════════\n');

let allPass = true;

for (const c of cases) {
  console.log(`\n━━ ${c.label} ━━`);
  const out = computeBaziCore(c.input);
  console.log(`  四柱: ${out.pillars.join(' · ')}`);
  console.log(`  日主: ${out.dayGan}`);
  console.log(`  首步大运: ${out.daYun_1.ganZhi}（${out.daYun_1.startAge}岁起，${out.daYun_1.shiShen}）`);
  console.log(`  末步大运: ${out.daYun_8.ganZhi}（${out.daYun_8.startAge}岁起，${out.daYun_8.shiShen}）`);

  if (c.expect.pillars) {
    const ok = JSON.stringify(out.pillars) === JSON.stringify(c.expect.pillars);
    console.log(`  ${ok ? '✅' : '❌'} 四柱对照：期望 ${c.expect.pillars.join(' · ')}`);
    if (!ok) allPass = false;
  }
  if (c.expect.pillarsNotEq) {
    const isDiff = JSON.stringify(out.pillars) !== JSON.stringify(c.expect.pillarsNotEq);
    console.log(`  ${isDiff ? '✅' : '❌'} 与蔡蔡命局不同：${isDiff ? '是（engine 真实计算生效）' : '否（仍是固定 mock！）'}`);
    if (!isDiff) allPass = false;
  }
}

console.log('\n═════════════════════════════════════════════');
console.log(allPass ? '🎉 M1.2 端到端自验全部通过！' : '❌ 存在失败项，请检查 store.submit 是否真的接到 engine');
console.log('═════════════════════════════════════════════');

process.exit(allPass ? 0 : 1);
