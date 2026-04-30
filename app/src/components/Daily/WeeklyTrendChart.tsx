import React from 'react';
import type { WeeklyTrend } from '../../types/bazi';

interface Props {
  trend: WeeklyTrend;
}

/**
 * 本周运势曲线（纯 CSS / SVG 折线，避免引入 ECharts）
 * score 只用于绘图，不展示数字。
 */
export const WeeklyTrendChart: React.FC<Props> = ({ trend }) => {
  const width = 320;
  const height = 140;
  const paddingX = 20;
  const paddingTop = 20;
  const paddingBottom = 32;
  const plotH = height - paddingTop - paddingBottom;
  const n = trend.days.length;
  const stepX = (width - paddingX * 2) / (n - 1);

  // score 范围按 0-100 归一化
  const points = trend.days.map((d, i) => {
    const x = paddingX + stepX * i;
    const y = paddingTop + plotH * (1 - d.score / 100);
    return { x, y, day: d };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  return (
    <div className="classic-card">
      <div className="flex items-baseline justify-between mb-3">
        <div
          className="font-classic text-lg tracking-wider"
          style={{ color: 'var(--color-ink)' }}
        >
          本周运势
        </div>
        <div className="text-xs text-ink-light">{trend.weekRange}</div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: 480, display: 'block', margin: '0 auto' }}
      >
        {/* 三条横虚线（小吉/平/小凶参考线） */}
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={paddingX}
            x2={width - paddingX}
            y1={paddingTop + plotH * r}
            y2={paddingTop + plotH * r}
            stroke="var(--color-border)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}
        {/* 折线 */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-cinnabar)"
          strokeWidth={1.5}
          opacity={0.85}
        />
        {/* 数据点 */}
        {points.map((p) => (
          <g key={p.day.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.day.isToday ? 5 : 3}
              fill={p.day.isToday ? 'var(--color-cinnabar)' : '#fff'}
              stroke="var(--color-cinnabar)"
              strokeWidth={1.5}
            />
            {p.day.isToday && (
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-cinnabar)"
                fontFamily="Noto Serif SC, serif"
              >
                今
              </text>
            )}
          </g>
        ))}
        {/* 底部日期 */}
        {points.map((p) => (
          <g key={`lbl-${p.day.date}`}>
            <text
              x={p.x}
              y={height - 14}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-ink-light)"
            >
              {p.day.date.slice(-2)}
            </text>
            <text
              x={p.x}
              y={height - 2}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-ink-light)"
              fontFamily="Noto Serif SC, serif"
            >
              {p.day.weekday}
            </text>
          </g>
        ))}
      </svg>

      {/* 右上角图例（小吉/平/小凶，对齐横线位置） */}
      <div className="flex justify-between text-xs text-ink-light mt-1 px-5">
        <span>小吉</span>
        <span>平</span>
        <span>小凶</span>
      </div>
    </div>
  );
};
