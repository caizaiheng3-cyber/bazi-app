// M2.1 五行统计引擎
//
// 口径（严格对齐 mock/baziChart.ts 中蔡蔡命局的统计方式）：
//   - tianGanCount = 4 个天干本气的计数
//   - diZhiCount   = 4 个地支本气的计数（地支本气 = 该地支藏干列表的第一项）
//   - cangGanCount = 所有藏干（含本气 + 中气 + 余气）的计数
//   - total = tianGan + diZhi + cangGan
//
// 这意味着地支本气在 diZhi 和 cangGan 中各计一次，total 会重复算一次本气，
// 这是 mock 文件已确立的口径，UI（WuxingChart 与五行条形图）已按此渲染。
// 详见 mock/baziChart.ts 第 67-75 行注释——口径定义权威来源。
//
// 校验基线（蔡蔡 1993-12-07 06:00 男）：
//   壬日 / 癸亥月 / 癸酉年 / 癸卯时
//   天干：癸癸壬癸（全水）          → tianGanCount: 水4
//   地支本气：酉(金) 亥(水) 戌(土) 卯(木) → diZhiCount: 金1 水1 土1 木1
//   全部藏干：辛 / 壬甲 / 戊辛丁 / 乙   → cangGanCount: 金2(辛×2) 水1(壬) 木2(甲乙) 土1(戊) 火1(丁)
//   合计：金 0+1+2=3 / 木 0+1+2=3 / 水 4+1+1=6 / 火 0+0+1=1 / 土 0+1+1=2 = 15
//   百分比：水 40 / 金 20 / 木 20 / 土 13 / 火 7（与 mock 100% 一致）

import type { Pillar, TianGan, WuXing, WuXingStat } from '../types/bazi';

// ===== 五行映射表 =====

const TIAN_GAN_TO_WUXING: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

const WUXING_ORDER: WuXing[] = ['金', '木', '水', '火', '土'];

// ===== 工具 =====

function ganToWuxing(gan: string): WuXing {
  const wx = TIAN_GAN_TO_WUXING[gan as TianGan];
  if (!wx) throw new Error(`[wuxingAnalyzer] 未知天干：${gan}`);
  return wx;
}

/** 中间计数容器 */
interface RawCount {
  tianGan: number;
  diZhi: number;
  cangGan: number;
}

// ===== 主入口 =====

/**
 * 五行统计：按 mock 既定口径计数（地支本气在 diZhi 和 cangGan 各计一次）
 *
 * @param pillars 必须严格是 4 柱（年月日时），命理学不存在其他数量
 * @throws 当 pillars 长度 ≠ 4 或任一柱缺少藏干时抛错（编程错误，应在调用方修正）
 *
 * @example
 *   const stats = analyzeWuxing(pillars);
 *   stats.find(s => s.wuxing === '水').percent; // 蔡蔡：40
 */
export function analyzeWuxing(pillars: readonly Pillar[]): WuXingStat[] {
  // 输入合法性断言：四柱在命理学上是固定的概念，少于/多于 4 柱都是编程错误
  if (pillars.length !== 4) {
    throw new Error(`[wuxingAnalyzer] 必须传入恰好 4 柱（年月日时），实际收到 ${pillars.length} 柱`);
  }
  for (const p of pillars) {
    if (!p.cangGan || p.cangGan.length === 0) {
      throw new Error(`[wuxingAnalyzer] ${p.name ?? '未知柱'} 的藏干列表为空，无法统计地支本气`);
    }
  }

  // 初始化 5 行容器
  const counts = new Map<WuXing, RawCount>();
  WUXING_ORDER.forEach((wx) => {
    counts.set(wx, { tianGan: 0, diZhi: 0, cangGan: 0 });
  });

  for (const p of pillars) {
    // 1) 天干本气计数
    counts.get(ganToWuxing(p.tianGan))!.tianGan += 1;

    // 2) 地支本气计数（藏干列表的第一项；前置断言已保证 length ≥ 1）
    counts.get(ganToWuxing(p.cangGan[0].gan))!.diZhi += 1;

    // 3) 所有藏干计数（含本气、中气、余气）
    for (const cg of p.cangGan) {
      counts.get(ganToWuxing(cg.gan))!.cangGan += 1;
    }
  }

  // 计算总数
  // 数学上保证 ≥ 12：4 天干 + 4 地支本气 + 至少 4 藏干（每柱 cangGan 已断言 ≥ 1）
  // 上界 ≤ 20：每柱藏干最多 3 个（如寅=甲丙戊），故藏干总计 ≤ 12 → 总计 ≤ 20
  const grandTotal = WUXING_ORDER.reduce((sum, wx) => {
    const c = counts.get(wx)!;
    return sum + c.tianGan + c.diZhi + c.cangGan;
  }, 0);

  // 输出按固定顺序 [金 木 水 火 土]，与 mock 顺序一致
  const stats: WuXingStat[] = WUXING_ORDER.map((wx) => {
    const c = counts.get(wx)!;
    const total = c.tianGan + c.diZhi + c.cangGan;
    return {
      wuxing: wx,
      tianGanCount: c.tianGan,
      diZhiCount: c.diZhi,
      cangGanCount: c.cangGan,
      total,
      percent: Math.round((total / grandTotal) * 100),
    };
  });

  // 修正百分比舍入误差：保证总和 = 100（差额补给 total 最大的那一项）
  // 例：5 项各 14.28% 四舍五入后为 [14,14,14,14,14] 总和 70，差 30 全部补给最大项
  const percentSum = stats.reduce((s, x) => s + x.percent, 0);
  if (percentSum !== 100) {
    const diff = 100 - percentSum;
    const maxIdx = stats.reduce((best, cur, i, arr) =>
      cur.total > arr[best].total ? i : best, 0,
    );
    stats[maxIdx] = { ...stats[maxIdx], percent: stats[maxIdx].percent + diff };
  }

  return stats;
}
