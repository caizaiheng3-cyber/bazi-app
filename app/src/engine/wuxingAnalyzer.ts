/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// M2.1 五行统计引擎（带权重版）
//
// 口径：全部计入 + 带权重
//   - 天干：权重 1.2（显露在外，力量最大）
//   - 地支本气（藏干第 1 个）：权重 1.0（当令之气）
//   - 地支中气（藏干第 2 个）：权重 0.6（次要之气）
//   - 地支余气（藏干第 3 个）：权重 0.3（残余微弱之气）
//
// 每个五行的 total 为加权分数之和（非简单计数），percent 基于加权分数计算。
// tianGanCount / diZhiCount / cangGanCount 保留为原始计数（不加权），
// 供 UI 展示"有几个天干/地支/藏干属于该五行"。
//
// 权重参考：子平真诠常用体系，天干透出力量最大，
// 地支藏干按本气 > 中气 > 余气递减。

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

// ===== 权重常量 =====

/** 天干权重：显露在外，力量最大 */
const WEIGHT_TIAN_GAN = 1.2;
/** 藏干权重：按本气/中气/余气递减 */
const WEIGHT_CANG_GAN: readonly number[] = [1.0, 0.6, 0.3];

// ===== 工具 =====

function ganToWuxing(gan: string): WuXing {
  const wx = TIAN_GAN_TO_WUXING[gan as TianGan];
  if (!wx) throw new Error(`[wuxingAnalyzer] 未知天干：${gan}`);
  return wx;
}

/** 中间统计容器 */
interface RawAccum {
  /** 原始计数（不加权） */
  tianGanCount: number;
  diZhiCount: number;
  cangGanCount: number;
  /** 加权分数 */
  weightedScore: number;
}

// ===== 主入口 =====

/**
 * 五行统计（带权重版）：天干 1.2、地支本气 1.0、中气 0.6、余气 0.3
 *
 * @param pillars 必须严格是 4 柱（年月日时）
 * @throws 当 pillars 长度 ≠ 4 或任一柱缺少藏干时抛错
 */
export function analyzeWuxing(pillars: readonly Pillar[]): WuXingStat[] {
  if (pillars.length !== 4) {
    throw new Error(`[wuxingAnalyzer] 必须传入恰好 4 柱（年月日时），实际收到 ${pillars.length} 柱`);
  }
  for (const p of pillars) {
    if (!p.cangGan || p.cangGan.length === 0) {
      throw new Error(`[wuxingAnalyzer] ${p.name ?? '未知柱'} 的藏干列表为空，无法统计地支本气`);
    }
  }

  // 初始化 5 行容器
  const accums = new Map<WuXing, RawAccum>();
  WUXING_ORDER.forEach((wx) => {
    accums.set(wx, { tianGanCount: 0, diZhiCount: 0, cangGanCount: 0, weightedScore: 0 });
  });

  for (const p of pillars) {
    // 1) 天干：权重 1.2
    const tianGanWx = ganToWuxing(p.tianGan);
    const tianGanAccum = accums.get(tianGanWx)!;
    tianGanAccum.tianGanCount += 1;
    tianGanAccum.weightedScore += WEIGHT_TIAN_GAN;

    // 2) 地支本气计数（用于 diZhiCount 展示）
    const benQiWx = ganToWuxing(p.cangGan[0].gan);
    accums.get(benQiWx)!.diZhiCount += 1;

    // 3) 所有藏干：按位置给不同权重（本气 1.0 / 中气 0.6 / 余气 0.3）
    for (let i = 0; i < p.cangGan.length; i++) {
      const cangGanWx = ganToWuxing(p.cangGan[i].gan);
      const weight = WEIGHT_CANG_GAN[Math.min(i, WEIGHT_CANG_GAN.length - 1)];
      const cangAccum = accums.get(cangGanWx)!;
      cangAccum.cangGanCount += 1;
      cangAccum.weightedScore += weight;
    }
  }

  // 加权总分
  const grandWeightedTotal = WUXING_ORDER.reduce(
    (sum, wx) => sum + accums.get(wx)!.weightedScore, 0,
  );

  // 输出按固定顺序 [金 木 水 火 土]
  const stats: WuXingStat[] = WUXING_ORDER.map((wx) => {
    const acc = accums.get(wx)!;
    return {
      wuxing: wx,
      tianGanCount: acc.tianGanCount,
      diZhiCount: acc.diZhiCount,
      cangGanCount: acc.cangGanCount,
      // total 使用加权分数（保留 1 位小数后取整，供下游百分比和排序使用）
      total: Math.round(acc.weightedScore * 10) / 10,
      percent: grandWeightedTotal > 0
        ? Math.round((acc.weightedScore / grandWeightedTotal) * 100)
        : 0,
    };
  });

  // 修正百分比舍入误差：保证总和 = 100
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