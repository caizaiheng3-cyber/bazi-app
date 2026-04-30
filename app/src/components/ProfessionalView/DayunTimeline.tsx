import React from 'react';
import type { DaYun } from '../../types/bazi';

/** 大运时间轴：横向滚动展示 */
export const DayunTimeline: React.FC<{ daYuns: DaYun[]; startAge: string; direction: string }> = ({
  daYuns,
  startAge,
  direction,
}) => {
  return (
    <div>
      <div className="text-sm text-ink-light mb-3">
        起运信息：{startAge} · 大运{direction}
      </div>
      <div className="relative">
        {/* 主时间轴线 */}
        <div className="absolute left-0 right-0 top-12 h-0.5 bg-gradient-to-r from-cinnabar/40 via-gold/40 to-cinnabar/40" />
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {daYuns.map((dy) => (
              <div key={dy.index} className="w-44 flex-shrink-0 relative">
                <div className="text-center">
                  <div className="text-xs text-ink-light h-4">{dy.startYear}</div>
                  <div className="font-classic text-2xl text-cinnabar leading-tight pt-1 pb-2 relative">
                    {dy.ganZhi}
                    {/* 时间轴节点 */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 rounded-full bg-cinnabar border-2 border-paper" />
                  </div>
                </div>
                <div className="mt-4 p-2 bg-paper-deep/40 rounded text-center">
                  <div className="text-xs text-ink-light mb-0.5">{dy.startAge}-{dy.startAge + 9} 岁</div>
                  <div className="text-xs text-gold mb-1">{dy.shiShen}</div>
                  <div className="text-xs text-ink leading-snug">{dy.brief}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
