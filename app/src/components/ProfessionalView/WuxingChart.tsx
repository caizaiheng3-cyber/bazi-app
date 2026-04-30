import React from 'react';
import type { WuXingStat } from '../../types/bazi';
import { WUXING_COLOR } from '../common/wuxing';

/** 五行力量分布：横向条形图（纯 CSS，避免引入 ECharts 体积） */
export const WuxingChart: React.FC<{ stats: WuXingStat[] }> = ({ stats }) => {
  const max = Math.max(...stats.map((s) => s.total), 1);

  return (
    <div className="space-y-3">
      {stats.map((s) => {
        const widthPct = (s.total / max) * 100;
        const color = WUXING_COLOR[s.wuxing];
        return (
          <div key={s.wuxing} className="flex items-center gap-3">
            <div className="w-8 font-classic text-lg" style={{ color }}>
              {s.wuxing}
            </div>
            <div className="flex-1 bg-paper-deep/60 rounded h-6 overflow-hidden relative">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${color}DD, ${color})`,
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink/80 font-medium">
                {s.total}（{s.percent}%）
              </span>
            </div>
            <div className="w-32 text-xs text-ink-light text-right">
              干{s.tianGanCount} / 支{s.diZhiCount} / 藏{s.cangGanCount}
            </div>
          </div>
        );
      })}
    </div>
  );
};
