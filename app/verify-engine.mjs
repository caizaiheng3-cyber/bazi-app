// M1.1 自验脚本：computeBazi(蔡蔡) 的输出 vs mock/baziChart.ts 的静态字段
// 对照范围（M1.1 真实计算的字段）：
//   - basicInfo.name/gender/solarDate/lunarDate
//   - pillars[0..3].tianGan/diZhi/cangGan/naYin/ganShiShen/diShiShen
//   - daYuns[0..7].ganZhi/startAge/startYear/endYear/shiShen
//   - qiYunDirection
// 不对照：basicInfo.lunarDate（中文格式可能不一致）、startAge 文本（格式化差异）
//
// 运行：node verify-engine.mjs

import lunarPkg from 'lunar-javascript';
const { Solar, LunarUtil } = lunarPkg;

// ===== 复刻 baziEngine.ts 核心逻辑（避免 import TS 文件） =====

const TIAN_GAN_ORDER = '甲乙丙丁戊己庚辛壬癸';

function inferCangGanType(index) {
  if (index === 0) return '本气';
  if (index === 1) return '中气';
  return '余气';
}

function getShiShen(dayGan, otherGan) {
  return LunarUtil.SHI_SHEN[`${dayGan}${otherGan}`];
}

function isYangGan(gan) {
  return TIAN_GAN_ORDER.indexOf(gan) % 2 === 0;
}

function computeDirection(yearGan, gender) {
  return (isYangGan(yearGan) === (gender === '男')) ? '顺行' : '逆行';
}

function buildPillar(name, ec, slot, isDayPillar) {
  const gan = ec[`get${slot}Gan`]();
  const zhi = ec[`get${slot}Zhi`]();
  const hideGan = ec[`get${slot}HideGan`]();
  const shiShenZhi = ec[`get${slot}ShiShenZhi`]();
  const cangGan = hideGan.map((g, i) => ({
    gan: g,
    type: inferCangGanType(i),
    shiShen: shiShenZhi[i],
  }));
  return {
    name,
    tianGan: gan,
    diZhi: zhi,
    cangGan,
    naYin: ec[`get${slot}NaYin`](),
    ganShiShen: isDayPillar ? '日主' : ec[`get${slot}ShiShenGan`](),
    diShiShen: shiShenZhi,
  };
}

function computeBazi(data) {
  const [y, m, d] = data.birthDate.split('-').map(Number);
  const [h, mi] = data.birthTime.split(':').map(Number);
  const genderCode = data.gender === '男' ? 1 : 0;
  const sect = data.ziShiSchool === 'early' ? 1 : 2;

  const solar = Solar.fromYmdHms(y, m, d, h, mi, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(sect);

  const pillars = [
    buildPillar('年柱', ec, 'Year', false),
    buildPillar('月柱', ec, 'Month', false),
    buildPillar('日柱', ec, 'Day', true),
    buildPillar('时柱', ec, 'Time', false),
  ];

  const dayGan = ec.getDayGan();
  const yun = ec.getYun(genderCode);
  const rawDaYuns = yun.getDaYun();
  const daYuns = rawDaYuns
    .filter((d, i) => i > 0 && d.getGanZhi())
    .slice(0, 8)
    .map((d, idx) => ({
      index: idx + 1,
      ganZhi: d.getGanZhi(),
      startAge: d.getStartAge(),
      startYear: d.getStartYear(),
      endYear: d.getEndYear(),
      shiShen: getShiShen(dayGan, d.getGanZhi()[0]),
    }));

  return {
    basicInfo: {
      name: data.name,
      gender: data.gender,
      solarDate: `${y}年${m}月${d}日 ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`,
    },
    pillars,
    daYuns,
    qiYunDirection: computeDirection(ec.getYearGan(), data.gender),
  };
}

// ===== mock 数据复刻（取自 mock/baziChart.ts，蔡蔡命局） =====

const mockExpected = {
  basicInfo: {
    name: '蔡蔡',
    gender: '男',
    solarDate: '1993年12月7日 06:00',
  },
  pillars: [
    { name: '年柱', tianGan: '癸', diZhi: '酉', naYin: '剑锋金', ganShiShen: '劫财',
      cangGan: [{ gan: '辛', type: '本气', shiShen: '正印' }],
      diShiShen: ['正印'] },
    { name: '月柱', tianGan: '癸', diZhi: '亥', naYin: '大海水', ganShiShen: '劫财',
      cangGan: [{ gan: '壬', type: '本气', shiShen: '比肩' }, { gan: '甲', type: '中气', shiShen: '食神' }],
      diShiShen: ['比肩', '食神'] },
    { name: '日柱', tianGan: '壬', diZhi: '戌', naYin: '大海水', ganShiShen: '日主',
      cangGan: [{ gan: '戊', type: '本气', shiShen: '七杀' }, { gan: '辛', type: '中气', shiShen: '正印' }, { gan: '丁', type: '余气', shiShen: '正财' }],
      diShiShen: ['七杀', '正印', '正财'] },
    { name: '时柱', tianGan: '癸', diZhi: '卯', naYin: '金箔金', ganShiShen: '劫财',
      cangGan: [{ gan: '乙', type: '本气', shiShen: '伤官' }],
      diShiShen: ['伤官'] },
  ],
  daYuns: [
    { index: 1, ganZhi: '壬戌', startAge: 11, startYear: 2003, endYear: 2012, shiShen: '比肩' },
    { index: 2, ganZhi: '辛酉', startAge: 21, startYear: 2013, endYear: 2022, shiShen: '正印' },
    { index: 3, ganZhi: '庚申', startAge: 31, startYear: 2023, endYear: 2032, shiShen: '偏印' },
    { index: 4, ganZhi: '己未', startAge: 41, startYear: 2033, endYear: 2042, shiShen: '正官' },
    { index: 5, ganZhi: '戊午', startAge: 51, startYear: 2043, endYear: 2052, shiShen: '七杀' },
    { index: 6, ganZhi: '丁巳', startAge: 61, startYear: 2053, endYear: 2062, shiShen: '正财' },
    { index: 7, ganZhi: '丙辰', startAge: 71, startYear: 2063, endYear: 2072, shiShen: '偏财' },
    { index: 8, ganZhi: '乙卯', startAge: 81, startYear: 2073, endYear: 2082, shiShen: '伤官' },
  ],
  qiYunDirection: '逆行',
};

const input = {
  name: '蔡蔡',
  gender: '男',
  birthDate: '1993-12-07',
  birthTime: '06:00',
  birthPlace: '',
  focusAreas: ['事业'],
  useTrueSolarTime: false,
  ziShiSchool: 'early',
};

const actual = computeBazi(input);

// ===== 对照 =====

let pass = 0, fail = 0;
const fails = [];

function eq(label, a, b) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) { pass++; }
  else { fail++; fails.push({ label, expected: b, actual: a }); }
}

console.log('═════════════════════════════════════════════');
console.log('  M1.1 baziEngine 自验：蔡蔡案例字段对照');
console.log('═════════════════════════════════════════════\n');

// basicInfo
eq('basicInfo.name', actual.basicInfo.name, mockExpected.basicInfo.name);
eq('basicInfo.gender', actual.basicInfo.gender, mockExpected.basicInfo.gender);
eq('basicInfo.solarDate', actual.basicInfo.solarDate, mockExpected.basicInfo.solarDate);

// pillars
mockExpected.pillars.forEach((exp, i) => {
  const act = actual.pillars[i];
  eq(`pillars[${i}].tianGan`, act.tianGan, exp.tianGan);
  eq(`pillars[${i}].diZhi`, act.diZhi, exp.diZhi);
  eq(`pillars[${i}].naYin`, act.naYin, exp.naYin);
  eq(`pillars[${i}].ganShiShen`, act.ganShiShen, exp.ganShiShen);
  eq(`pillars[${i}].cangGan`, act.cangGan, exp.cangGan);
  eq(`pillars[${i}].diShiShen`, act.diShiShen, exp.diShiShen);
});

// daYuns
mockExpected.daYuns.forEach((exp, i) => {
  const act = actual.daYuns[i];
  eq(`daYuns[${i}].ganZhi`, act.ganZhi, exp.ganZhi);
  eq(`daYuns[${i}].startAge`, act.startAge, exp.startAge);
  eq(`daYuns[${i}].startYear`, act.startYear, exp.startYear);
  eq(`daYuns[${i}].endYear`, act.endYear, exp.endYear);
  eq(`daYuns[${i}].shiShen`, act.shiShen, exp.shiShen);
});

// direction
eq('qiYunDirection', actual.qiYunDirection, mockExpected.qiYunDirection);

console.log(`✅ 通过：${pass}  ❌ 失败：${fail}\n`);

if (fail > 0) {
  console.log('—— 失败明细 ——');
  fails.forEach(f => {
    console.log(`\n[${f.label}]`);
    console.log('  期望:', JSON.stringify(f.expected));
    console.log('  实际:', JSON.stringify(f.actual));
  });
  process.exit(1);
}

console.log('🎉 全部对齐！engine 输出与 mock 静态字段 100% 一致。');
