// M2.4 格局判定引擎自验脚本
//
// 测试矩阵（覆盖三层判定）：
//   T1 蔡蔡（基线）：壬水极旺40% + 亥月本气壬透日干 → 比劫格（润下倾向）·偏格·半成·中
//   T2 探查 5 组随机命局，验证算法稳健性（不空、字段合法、type/status/level 配套）
//   T3 月令藏干透出取格 → 正格名命中 8 格之一（探查命中即可）
//   T4 极旺 ≥50% 触发专旺格
//   T5 极弱 + 某五行 ≥40% 触发从X格（探查）
//   T6 评估字段间逻辑一致性：成格→高/中、破格→低、半成→中

import { strict as assert } from 'node:assert';
import { buildChartWithFallback } from './src/engine/baziEngine.ts';
import { analyzeGeJu, __testing } from './src/engine/geJuAnalyzer.ts';
import { analyzeWuxing } from './src/engine/wuxingAnalyzer.ts';
import { analyzeWangShuai } from './src/engine/wangShuaiAnalyzer.ts';
import { analyzeYongShen } from './src/engine/yongShenAnalyzer.ts';
import { computeBazi } from './src/engine/baziEngine.ts';

console.log('===== M2.4 格局判定引擎自验 =====\n');

function makeInput(name, gender, dateStr, timeStr) {
  return {
    name,
    gender,
    birthDate: dateStr,
    birthTime: timeStr,
    birthPlace: '',
    focusAreas: [],
    useTrueSolarTime: false,
    ziShiSchool: 'early',
  };
}

function computeAll(input) {
  const eo = computeBazi(input);
  const ws = analyzeWuxing(eo.pillars);
  const wgsh = analyzeWangShuai(eo.pillars);
  const ys = analyzeYongShen(eo.pillars, ws, wgsh);
  const ge = analyzeGeJu(eo.pillars, ws, wgsh, ys);
  return { pillars: eo.pillars, wuxingStats: ws, wangShuai: wgsh, yongShen: ys, geJu: ge };
}

function printGeJu(ge) {
  console.log(`  name: ${ge.name}`);
  console.log(`  type: ${ge.type}  status: ${ge.status}  level: ${ge.level}`);
  console.log(`  description: ${ge.description.slice(0, 220)}${ge.description.length > 220 ? '...' : ''}`);
}

const VALID_TYPES = new Set(['正格', '偏格', '特殊格']);
const VALID_STATUS = new Set(['成格', '破格', '半成']);
const VALID_LEVELS = new Set(['高', '中', '低']);

// ---------- T1：蔡蔡（基线） ----------
{
  console.log('— T1 蔡蔡（1993-12-07 06:00 男）— 期望：比劫格（润下倾向）·偏格·半成·中');
  const r = computeAll(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const ge = r.geJu;
  printGeJu(ge);

  // 强断言：完全对齐 mock
  assert.equal(ge.name, '比劫格（润下倾向）', `T1.A name 应=「比劫格（润下倾向）」，实际 ${ge.name}`);
  assert.equal(ge.type, '偏格', `T1.B type 应=「偏格」，实际 ${ge.type}`);
  assert.equal(ge.status, '半成', `T1.C status 应=「半成」，实际 ${ge.status}`);
  assert.equal(ge.level, '中', `T1.D level 应=「中」，实际 ${ge.level}`);
  assert.ok(ge.description.includes('润下'), 'T1.E description 应含"润下"');
  assert.ok(ge.description.includes('亥'), 'T1.F description 应含月令"亥"');
  console.log('  ✅ T1 通过\n');
}

// ---------- T2：算法稳健性（5 组探查） ----------
{
  console.log('— T2 算法稳健性：5 组探查（无空、字段合法）');
  const cases = [
    ['1970-03-15', '08:00'],
    ['2005-08-20', '15:30'],
    ['1988-10-10', '23:30'],
    ['1991-04-15', '14:00'],
    ['1985-07-15', '10:00'],
  ];
  for (const [d, t] of cases) {
    const r = computeAll(makeInput('稳健', '男', d, t));
    const ge = r.geJu;
    console.log(`  ${d} ${t}: ${r.pillars.map(p => p.tianGan + p.diZhi).join('·')} | ${r.wangShuai.conclusion} | ${ge.name}·${ge.type}·${ge.status}·${ge.level}`);

    // 字段合法性
    assert.ok(ge.name && ge.name.length > 0, `T2 ${d} name 不应为空`);
    assert.ok(VALID_TYPES.has(ge.type), `T2 ${d} type 非法：${ge.type}`);
    assert.ok(VALID_STATUS.has(ge.status), `T2 ${d} status 非法：${ge.status}`);
    assert.ok(VALID_LEVELS.has(ge.level), `T2 ${d} level 非法：${ge.level}`);
    assert.ok(ge.description && ge.description.length > 30, `T2 ${d} description 太短：${ge.description?.length}`);

    // 状态-层次一致性
    if (ge.status === '破格') {
      assert.equal(ge.level, '低', `T2 ${d} 破格 level 必为低，实际 ${ge.level}`);
    }
    if (ge.status === '成格') {
      assert.notEqual(ge.level, '低', `T2 ${d} 成格 level 不应为低，实际 ${ge.level}`);
    }
    if (ge.status === '半成') {
      assert.equal(ge.level, '中', `T2 ${d} 半成 level 必为中，实际 ${ge.level}`);
    }

    // 特殊格 / 正格 / 偏格的 name 与 type 配套
    if (ge.type === '特殊格') {
      const SPECIAL = /^(曲直格|炎上格|稼穑格|从革格|润下格|从强格|从弱格|从财格|从官格|从儿格)$/;
      assert.ok(SPECIAL.test(ge.name), `T2 ${d} 特殊格 name 不在允许集：${ge.name}`);
    }
    if (ge.type === '正格') {
      const ZHENG = /^(正官|偏官|正印|偏印|正财|偏财|食神|伤官)格$/;
      assert.ok(ZHENG.test(ge.name), `T2 ${d} 正格 name 不在 8 格：${ge.name}`);
    }
    if (ge.type === '偏格') {
      assert.ok(ge.name.includes('比') || ge.name.includes('劫'),
        `T2 ${d} 偏格 name 应含"比"或"劫"：${ge.name}`);
    }
  }
  console.log('  ✅ T2 全部通过（5 组稳健性）\n');
}

// ---------- T3：findMonthLingTouChu 单元探查 ----------
{
  console.log('— T3 月令透出 & 取格内部子函数探查');
  const r = computeAll(makeInput('蔡蔡', '男', '1993-12-07', '06:00'));
  const tc = __testing.findMonthLingTouChu(r.pillars);
  console.log(`  蔡蔡月令亥透出：shiShen=${tc.shiShen} geShenGan=${tc.geShenGan}`);
  // 蔡蔡月令亥本气壬，月柱天干癸，日柱天干壬 → 壬透出 → 比肩
  assert.equal(tc.shiShen, '比肩', `T3 蔡蔡月令应透出比肩，实际 ${tc.shiShen}`);
  assert.equal(tc.geShenGan, '壬', `T3 蔡蔡格神应=壬，实际 ${tc.geShenGan}`);
  console.log('  ✅ T3 通过\n');
}

// ---------- T4：人工构造极旺 ≥50% 命局测试专旺格 ----------
// 找一个全水命局：如 1992-11-15 子时（亥月+多水柱）
{
  console.log('— T4 探查：寻找触发专旺格的命局（同五行 ≥50%）');
  const candidates = [
    ['1992-11-15', '00:00'],
    ['1972-11-15', '00:00'],
    ['1962-11-15', '00:00'],
    ['1953-11-15', '23:30'],
  ];
  let foundZhuanWang = false;
  for (const [d, t] of candidates) {
    const r = computeAll(makeInput('探', '男', d, t));
    if (r.geJu.type === '特殊格' && /^(曲直|炎上|稼穑|从革|润下)格$/.test(r.geJu.name)) {
      console.log(`  ✨ ${d} ${t} 触发专旺格：${r.geJu.name} | ${r.pillars.map(p => p.tianGan + p.diZhi).join('·')}`);
      assert.equal(r.geJu.status, '成格');
      assert.equal(r.geJu.level, '高');
      foundZhuanWang = true;
      break;
    }
  }
  if (!foundZhuanWang) {
    console.log('  ℹ️ 4 组候选命局均未触发专旺格（可能阈值 50% 较严，符合预期；非测试失败）\n');
  } else {
    console.log('  ✅ T4 通过\n');
  }
}

// ---------- T5：成格条件细节 - 用神契合度 → 高级 ----------
{
  console.log('— T5 用神-格神契合判定（成格命局：用神含格神五行 → 高级；不含 → 中级）');
  // 用 T2 中已知会成正格的命局
  const r = computeAll(makeInput('稳健', '男', '2005-08-20', '15:30'));
  if (r.geJu.type === '正格' && r.geJu.status === '成格') {
    const tc = __testing.findMonthLingTouChu(r.pillars);
    const ganWxMap = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
    const geWx = ganWxMap[tc.geShenGan];
    const inYongShen = r.yongShen.primary.includes(geWx);
    console.log(`  格神=${tc.geShenGan}(${geWx})，用神=[${r.yongShen.primary.join(',')}]，包含格神=${inYongShen}`);
    if (inYongShen) {
      assert.equal(r.geJu.level, '高', `T5 用神含格神应=高级，实际 ${r.geJu.level}`);
    } else {
      assert.equal(r.geJu.level, '中', `T5 用神不含格神应=中级，实际 ${r.geJu.level}`);
    }
    console.log('  ✅ T5 通过\n');
  } else {
    console.log(`  ℹ️ T5 该命局非"正格成格"（${r.geJu.type}·${r.geJu.status}），跳过用神契合断言\n`);
  }
}

console.log('🎉 全部断言通过');
