import React, { useState } from 'react';
import type { LifeTimeline as LifeTimelineData, LifeTimelineSegment } from '../../types/bazi';

/**
 * 人生时间轴组件（M2.8）
 *
 * 视觉设计：
 *   - 横向贯穿的"人生长河"主时间线
 *   - 每段大运 = 一个色块（用神=红/喜神=橙/闲神=黄/仇神=灰蓝/忌神=深灰）
 *   - 色块宽度按 10 年等分
 *   - 黄金期（评分≥4）顶部加金色印章，谨慎期（评分≤2）顶部加灰色警示
 *   - 点击色块展开本段详情（关键事件 + 关键流年）
 *
 * 命理学价值：让用户一眼看清"哪 10 年是黄金期、哪 10 年要谨慎"
 */

const ROLE_COLOR: Record<LifeTimelineSegment['wuxingRole'], { main: string; bg: string; bgLight: string; label: string }> = {
  用神: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.18)', bgLight: 'rgba(197, 57, 47, 0.06)', label: '黄金' },
  喜神: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.18)', bgLight: 'rgba(217, 122, 31, 0.06)', label: '吉运' },
  闲神: { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.15)', bgLight: 'rgba(184, 134, 11, 0.05)', label: '平稳' },
  仇神: { main: '#5A6B7A', bg: 'rgba(90, 107, 122, 0.18)', bgLight: 'rgba(90, 107, 122, 0.06)', label: '不利' },
  忌神: { main: '#4A4A4A', bg: 'rgba(74, 74, 74, 0.18)', bgLight: 'rgba(74, 74, 74, 0.06)', label: '需防' },
};

export const LifeTimeline: React.FC<{
  data: LifeTimelineData;
  /** 当前虚岁（用于在时间轴上标注"你在这里"） */
  currentAge?: number;
}> = ({ data, currentAge }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { segments, summary, goldenPeriods, cautionPeriods } = data;

  if (segments.length === 0) {
    return (
      <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>
        ⚠ 时间轴数据为空（可能起运未计算）
      </div>
    );
  }

  // 计算总年龄跨度，用于色块宽度比例
  const minAge = segments[0].ageRange[0];
  const maxAge = segments[segments.length - 1].ageRange[1];
  const totalSpan = maxAge - minAge + 1;

  return (
    <div>
      {/* 顶部：总结 */}
      <div
        className="font-classic mb-4"
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          color: 'var(--color-ink)',
          padding: '12px 16px',
          background: 'var(--color-paper-card-soft)',
          border: '1px dashed var(--color-border-soft, rgba(212, 200, 168, 0.7))',
          borderRadius: 6,
        }}
      >
        <span style={{ color: 'var(--color-cinnabar)', fontWeight: 700, marginRight: 8 }}>
          ⚑ 一生总览
        </span>
        {summary}
      </div>

      {/* 黄金期 / 谨慎期 简报 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {goldenPeriods.length > 0 && (
          <span
            className="font-classic text-xs"
            style={{
              padding: '4px 12px',
              borderRadius: 14,
              background: 'rgba(197, 57, 47, 0.10)',
              border: '1px solid rgba(197, 57, 47, 0.4)',
              color: 'var(--color-cinnabar)',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            ★ 黄金期 {goldenPeriods.length} 段
          </span>
        )}
        {cautionPeriods.length > 0 && (
          <span
            className="font-classic text-xs"
            style={{
              padding: '4px 12px',
              borderRadius: 14,
              background: 'rgba(74, 74, 74, 0.10)',
              border: '1px solid rgba(74, 74, 74, 0.4)',
              color: '#4A4A4A',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            ⚠ 谨慎期 {cautionPeriods.length} 段
          </span>
        )}
        <span
          className="font-classic text-xs"
          style={{
            padding: '4px 12px',
            borderRadius: 14,
            background: 'var(--color-paper-card-soft)',
            border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
            color: 'var(--color-ink-soft)',
          }}
        >
          全程 {minAge}-{maxAge} 虚岁（{totalSpan} 年）
        </span>
      </div>

      {/* 主时间轴：横向贯穿色块 */}
      <div className="mb-3">
        <div
          className="text-xs font-classic mb-2"
          style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.2em' }}
        >
          ◇ 80 年人生长河（点击色块查看详情）
        </div>
        <div
          className="relative rounded overflow-hidden"
          style={{
            border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
            background: 'var(--color-paper-card-soft)',
            height: 78,
          }}
        >
          {/* 色块行 */}
          <div className="flex h-full">
            {segments.map((seg) => {
              const c = ROLE_COLOR[seg.wuxingRole];
              const widthPct = ((seg.ageRange[1] - seg.ageRange[0] + 1) / totalSpan) * 100;
              const isActive = activeIndex === seg.daYunIndex;
              return (
                <div
                  key={seg.daYunIndex}
                  className="relative cursor-pointer transition-all flex flex-col items-center justify-center"
                  style={{
                    width: `${widthPct}%`,
                    background: isActive ? c.bg : c.bgLight,
                    borderRight: '1px dashed rgba(212, 200, 168, 0.7)',
                    boxShadow: isActive ? `inset 0 0 0 2px ${c.main}` : 'none',
                  }}
                  onClick={() => setActiveIndex(isActive ? null : seg.daYunIndex)}
                  title={`${seg.daYunGanZhi} · ${seg.wuxingRole}运 · ${seg.ageRange[0]}-${seg.ageRange[1]}虚岁`}
                >
                  {/* 干支 */}
                  <div
                    className="font-classic"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: c.main,
                      letterSpacing: '0.05em',
                      lineHeight: 1.3,
                    }}
                  >
                    {seg.daYunGanZhi}
                  </div>
                  {/* 评分 */}
                  <div
                    style={{
                      fontSize: 9,
                      color: c.main,
                      letterSpacing: '0.1em',
                      marginTop: 2,
                    }}
                  >
                    {'★'.repeat(seg.score)}
                    <span style={{ opacity: 0.3 }}>{'☆'.repeat(5 - seg.score)}</span>
                  </div>
                  {/* 角色标签 */}
                  <div
                    className="font-classic"
                    style={{
                      fontSize: 9.5,
                      color: c.main,
                      opacity: 0.85,
                      marginTop: 1,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {seg.wuxingRole}
                  </div>
                </div>
              );
            })}
          </div>
          {/* "你在这里"游标 */}
          {currentAge !== undefined && currentAge >= minAge && currentAge <= maxAge && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${((currentAge - minAge) / totalSpan) * 100}%`,
                width: 2,
                background: 'var(--color-cinnabar)',
                boxShadow: '0 0 4px rgba(197, 57, 47, 0.6)',
              }}
            >
              <div
                className="font-classic"
                style={{
                  position: 'absolute',
                  top: -18,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  color: 'var(--color-cinnabar)',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: 'var(--color-paper)',
                  padding: '0 4px',
                  borderRadius: 2,
                }}
              >
                ▼ 你在 {currentAge} 岁
              </div>
            </div>
          )}
        </div>
        {/* 年龄刻度尺 */}
        <div className="flex justify-between mt-1" style={{ fontSize: 10, color: 'var(--color-ink-soft)' }}>
          {segments.map((seg) => (
            <span key={seg.daYunIndex} style={{ flex: 1, textAlign: 'left', paddingLeft: 2 }}>
              {seg.ageRange[0]}
            </span>
          ))}
          <span style={{ width: 0 }}>{maxAge}</span>
        </div>
      </div>

      {/* 展开的段详情 */}
      {activeIndex !== null && (() => {
        const seg = segments.find((s) => s.daYunIndex === activeIndex);
        if (!seg) return null;
        return <SegmentDetail segment={seg} />;
      })()}
    </div>
  );
};

/** 单段详情面板（点击色块后展开） */
const SegmentDetail: React.FC<{ segment: LifeTimelineSegment }> = ({ segment }) => {
  const c = ROLE_COLOR[segment.wuxingRole];
  return (
    <div
      className="mt-4 rounded"
      style={{
        background: c.bgLight,
        border: `1px solid ${c.bg}`,
        borderLeft: `3px solid ${c.main}`,
        padding: '12px 16px',
      }}
    >
      {/* 标题 */}
      <div className="flex items-baseline gap-3 flex-wrap mb-2">
        <span
          className="font-classic"
          style={{ fontSize: 18, fontWeight: 700, color: c.main, letterSpacing: '0.05em' }}
        >
          {segment.daYunGanZhi}
        </span>
        <span className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
          {segment.ageRange[0]}-{segment.ageRange[1]}虚岁 · {segment.yearRange[0]}-{segment.yearRange[1]}
        </span>
        <span
          className="font-classic text-xs"
          style={{
            padding: '2px 10px',
            borderRadius: 10,
            background: c.bg,
            color: c.main,
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {segment.wuxingRole}·{c.label}
        </span>
        <span style={{ color: c.main, fontSize: 13, letterSpacing: '0.1em' }}>
          {'★'.repeat(segment.score)}
          <span style={{ opacity: 0.3 }}>{'☆'.repeat(5 - segment.score)}</span>
        </span>
      </div>

      {/* headline */}
      <div
        className="font-classic mb-3"
        style={{ fontSize: 13, color: 'var(--color-ink)', letterSpacing: '0.03em' }}
      >
        {segment.headline}
      </div>

      {/* 关键事件 */}
      {segment.keyEvents.length > 0 && (
        <div className="mb-3">
          <div
            className="font-classic text-xs mb-1.5"
            style={{ color: c.main, letterSpacing: '0.1em' }}
          >
            ◇ 关键事件
          </div>
          <ul
            className="m-0 pl-4 space-y-1"
            style={{ fontSize: 12.5, color: 'var(--color-ink-light)', lineHeight: 1.7 }}
          >
            {segment.keyEvents.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 关键流年 */}
      {segment.topLiuNian.length > 0 && (
        <div>
          <div
            className="font-classic text-xs mb-1.5"
            style={{ color: c.main, letterSpacing: '0.1em' }}
          >
            ◇ 关键流年（{segment.topLiuNian.length} 个最重要的事件年）
          </div>
          <div className="flex flex-wrap gap-2">
            {segment.topLiuNian.map((ln, i) => {
              const tendBg =
                ln.tendency === 'auspicious' ? 'rgba(107, 142, 35, 0.10)' :
                ln.tendency === 'inauspicious' ? 'rgba(197, 57, 47, 0.10)' :
                'var(--color-paper-card-soft)';
              const tendColor =
                ln.tendency === 'auspicious' ? '#6B8E23' :
                ln.tendency === 'inauspicious' ? '#C5392F' :
                'var(--color-ink-light)';
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5"
                  style={{
                    background: tendBg,
                    border: `1px solid ${tendColor}`,
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                  title={ln.description}
                >
                  <span className="font-classic" style={{ fontWeight: 700, color: tendColor }}>
                    {ln.year}
                  </span>
                  <span style={{ color: 'var(--color-ink-soft)' }}>·</span>
                  <span style={{ color: 'var(--color-ink)' }}>{ln.ganZhi}</span>
                  <span style={{ color: 'var(--color-ink-soft)', fontSize: 11 }}>
                    （{ln.age}岁）
                  </span>
                  <span
                    className="font-classic text-xs"
                    style={{
                      padding: '0 6px',
                      borderRadius: 8,
                      background: tendColor,
                      color: '#fff7e6',
                      fontWeight: 600,
                      opacity: 0.9,
                    }}
                  >
                    {ln.eventType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
