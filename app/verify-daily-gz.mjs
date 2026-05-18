import { Solar } from 'lunar-javascript';

const myAlgorithm = (year, month, day) => {
  const ganList = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const zhiList = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const ANCHOR = new Date(Date.UTC(2000, 0, 1));
  const target = new Date(Date.UTC(year, month-1, day));
  const diff = Math.floor((target.getTime() - ANCHOR.getTime()) / 86400000);
  const gi = ((4 + diff) % 10 + 10) % 10;
  const zi = ((6 + diff) % 12 + 12) % 12;
  return ganList[gi] + zhiList[zi];
};

const dates = [
  [1993, 12, 7], [1993, 12, 8], [2000, 1, 1], [2024, 1, 1],
  [2024, 6, 15], [1900, 1, 31], [1985, 6, 18], [2030, 12, 31],
];
let ok = true;
for (const [y, m, d] of dates) {
  const std = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
  const mine = myAlgorithm(y, m, d);
  const match = std === mine;
  if (!match) ok = false;
  console.log(`${y}-${m}-${d}: 标准=${std} 我的=${mine} ${match ? 'OK' : 'MISMATCH'}`);
}
console.log(ok ? '\n全部校验通过 ✅' : '\n存在不一致 ❌');
