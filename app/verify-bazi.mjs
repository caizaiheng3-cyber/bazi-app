// lunar-javascript 验证脚本：蔡蔡 1993-12-07 06:00 男 新历
// 用途：① 验证 lunar-javascript API 行为 ② 为 M1 排盘引擎封装做参考
// 保留至 M1 完成后再清理
// 运行：node verify-bazi.mjs

import lunarPkg from 'lunar-javascript';
const { Solar } = lunarPkg;

const NAME = '蔡蔡';
const GENDER_CODE = 1; // 1=男, 0=女（先按男算，后续可改）
const GENDER_LABEL = GENDER_CODE === 1 ? '男' : '女';

// 1993-12-07 06:00 新历
const solar = Solar.fromYmdHms(1993, 12, 7, 6, 0, 0);
const lunar = solar.getLunar();
const eightChar = lunar.getEightChar();

// 默认晚子时（sect=2 表示晚子时换日，sect=1 表示早子时换日）
// 你的项目设定是「子时默认早子时换日」→ setSect(1)
eightChar.setSect(1);

console.log('═══════════════════════════════════════════════════════════');
console.log(`  ${NAME}  ${GENDER_LABEL}  公历 1993-12-07 06:00`);
console.log('═══════════════════════════════════════════════════════════\n');

// ============ 基础信息 ============
console.log('【基础信息】');
console.log('公历:', solar.toFullString());
console.log('农历:', lunar.toFullString());
console.log('节气月:', `${lunar.getJieQi()} (本月节: ${lunar.getCurrentJie()?.getName?.() || lunar.getPrevJie().getName()})`);
console.log();

// ============ 四柱八字 ============
console.log('【四柱八字】');
console.log(`年柱: ${eightChar.getYear()}   纳音: ${eightChar.getYearNaYin()}`);
console.log(`月柱: ${eightChar.getMonth()}  纳音: ${eightChar.getMonthNaYin()}`);
console.log(`日柱: ${eightChar.getDay()}   纳音: ${eightChar.getDayNaYin()}  ← 日主: ${eightChar.getDayGan()}`);
console.log(`时柱: ${eightChar.getTime()}  纳音: ${eightChar.getTimeNaYin()}`);
console.log();

// ============ 藏干 ============
console.log('【地支藏干】');
console.log(`年支 ${eightChar.getYearZhi()}: [${eightChar.getYearHideGan().join(', ')}]`);
console.log(`月支 ${eightChar.getMonthZhi()}: [${eightChar.getMonthHideGan().join(', ')}]`);
console.log(`日支 ${eightChar.getDayZhi()}: [${eightChar.getDayHideGan().join(', ')}]`);
console.log(`时支 ${eightChar.getTimeZhi()}: [${eightChar.getTimeHideGan().join(', ')}]`);
console.log();

// ============ 十神（天干） ============
console.log('【天干十神（相对日主）】');
console.log(`年干: ${eightChar.getYearGan()} → ${eightChar.getYearShiShenGan()}`);
console.log(`月干: ${eightChar.getMonthGan()} → ${eightChar.getMonthShiShenGan()}`);
console.log(`日干: ${eightChar.getDayGan()} → 日主`);
console.log(`时干: ${eightChar.getTimeGan()} → ${eightChar.getTimeShiShenGan()}`);
console.log();

// ============ 十神（地支藏干） ============
console.log('【地支藏干十神】');
console.log(`年支 ${eightChar.getYearZhi()}: [${eightChar.getYearShiShenZhi().join(', ')}]`);
console.log(`月支 ${eightChar.getMonthZhi()}: [${eightChar.getMonthShiShenZhi().join(', ')}]`);
console.log(`日支 ${eightChar.getDayZhi()}: [${eightChar.getDayShiShenZhi().join(', ')}]`);
console.log(`时支 ${eightChar.getTimeZhi()}: [${eightChar.getTimeShiShenZhi().join(', ')}]`);
console.log();

// ============ 五行 ============
console.log('【五行属性】');
console.log(`年柱: 干${eightChar.getYearWuXing()}`);
console.log(`月柱: 干${eightChar.getMonthWuXing()}`);
console.log(`日柱: 干${eightChar.getDayWuXing()}`);
console.log(`时柱: 干${eightChar.getTimeWuXing()}`);
console.log();

// ============ 神煞 ============
console.log('【神煞】');
try {
  console.log('年柱神煞:', eightChar.getYearShenSha?.() || '(API 不存在)');
  console.log('月柱神煞:', eightChar.getMonthShenSha?.() || '(API 不存在)');
  console.log('日柱神煞:', eightChar.getDayShenSha?.() || '(API 不存在)');
  console.log('时柱神煞:', eightChar.getTimeShenSha?.() || '(API 不存在)');
} catch (e) {
  console.log('(神煞 API 异常):', e.message);
}
console.log();

// ============ 大运 ============
console.log('【大运（前 8 步）】');
const yun = eightChar.getYun(GENDER_CODE);
console.log(`起运: ${yun.getStartYear()}年${yun.getStartMonth()}月${yun.getStartDay()}天 后`);
console.log(`起运公历: ${yun.getStartSolar().toYmd()}`);
console.log();

const daYuns = yun.getDaYun();
console.log('序号 | 干支 | 起运年龄 | 起运年份 | 结束年份');
console.log('-----|------|----------|----------|--------');
for (let i = 0; i < Math.min(9, daYuns.length); i++) {
  const d = daYuns[i];
  console.log(`${String(i).padStart(4)} | ${d.getGanZhi() || '(出生大运)'} | ${String(d.getStartAge()).padStart(8)} | ${d.getStartYear()} | ${d.getEndYear()}`);
}
console.log();

// ============ 流年（当前 2026 年） ============
console.log('【2026 年流年（验证每日对话所需的流年干支）】');
const liuNianYear = 2026;
// 找当前所在大运
const currentDayun = daYuns.find(d => liuNianYear >= d.getStartYear() && liuNianYear <= d.getEndYear());
if (currentDayun) {
  console.log(`所在大运: ${currentDayun.getGanZhi()} (${currentDayun.getStartYear()}-${currentDayun.getEndYear()})`);
  const liuNians = currentDayun.getLiuNian();
  const liuNian2026 = liuNians.find(ln => ln.getYear() === liuNianYear);
  if (liuNian2026) {
    console.log(`2026 年流年: ${liuNian2026.getGanZhi()}`);
  }
}
console.log();

// ============ 流日（验证今日 2026-04-26） ============
console.log('【流日：2026-04-26（验证 Daily Dashboard 所需）】');
const todaySolar = Solar.fromYmd(2026, 4, 26);
const todayLunar = todaySolar.getLunar();
console.log('公历:', todaySolar.toYmd());
console.log('农历:', todayLunar.toString());
console.log('当日干支:', `${todayLunar.getYearInGanZhi()}年 ${todayLunar.getMonthInGanZhi()}月 ${todayLunar.getDayInGanZhi()}日`);
console.log('当日日干:', todayLunar.getDayGan(), ' 当日日支:', todayLunar.getDayZhi());
console.log('当日纳音:', todayLunar.getDayNaYin());

// 计算当日干对蔡蔡（日主壬）的十神
const todayEightChar = todayLunar.getEightChar();
console.log('当日相对蔡蔡日主壬的十神参考: 当日干', todayLunar.getDayGan(), '→ (需自行映射)');
console.log();

console.log('═══════════════════════════════════════════════════════════');
console.log('  验证完毕');
console.log('═══════════════════════════════════════════════════════════');
