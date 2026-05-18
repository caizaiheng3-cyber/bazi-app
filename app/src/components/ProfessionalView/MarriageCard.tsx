import React, { useState } from 'react';
import type {
  MarriageAnalysis,
  MarriageEvent,
  MarriageEventType,
  MarriageRisk,
} from '../../types/bazi';

/**
 * 婚姻细论 UI 卡片（M3）
 *
 * 视觉布局（古典美学）：
 *   ┌──────────────────────────────────────────────┐
 *   │ 总览：配偶星 / 配偶宫 / 桃花 / 质量评分           │
 *   ├──────────────────────────────────────────────┤
 *   │ 综合判词（命理学家口吻）                          │
 *   ├──────────────────────────────────────────────┤
 *   │ ✦ 优势点 ✦ 关键提醒                              │
 *   ├──────────────────────────────────────────────┤
 *   │ 婚期时间表（按 10 年大运分组，可展开/收起）         │
 *   ├──────────────────────────────────────────────┤
 *   │ 风险点专区（如有）                               │
 *   └──────────────────────────────────────────────┘
 */

const QUALITY_COLOR: Record<MarriageAnalysis['qualityLabel'], { main: string; bg: string }> = {
  上佳: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)' },
  良好: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)' },
  平稳: { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)' },
  波折: { main: '#5A6B7A', bg: 'rgba(90, 107, 122, 0.10)' },
  坎坷: { main: '#4A4A4A', bg: 'rgba(74, 74, 74, 0.10)' },
};

const EVENT_STYLE: Record<MarriageEventType, { icon: string; color: string; weight: number }> = {
  大运合日支:    { icon: '⊕', color: '#C5392F', weight: 5 },
  流年合日支:    { icon: '♥', color: '#C5392F', weight: 5 },
  配偶星到位年:  { icon: '✦', color: '#C5392F', weight: 5 },
  桃花年:        { icon: '🌸', color: '#D97A1F', weight: 3 },
  红艳年:        { icon: '🌹', color: '#D97A1F', weight: 3 },
  天喜年:        { icon: '🎊', color: '#B8860B', weight: 2 },
  反吟冲日支:    { icon: '⚡', color: '#5A6B7A', weight: 4 },
  伏吟日柱:      { icon: '↻', color: '#5A6B7A', weight: 3 },
  官杀混杂年:    { icon: '⚠', color: '#4A4A4A', weight: 4 },
  财星争合年:    { icon: '⚠', color: '#4A4A4A', weight: 4 },
};

const RISK_COLOR: Record<MarriageRisk['level'], { main: string; bg: string; label: string }> = {
  high:   { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)', label: '高风险' },
  medium: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)', label: '中等' },
  low:    { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)', label: '低' },
};

export const MarriageCard: React.FC<{ marriage: MarriageAnalysis }> = ({ marriage }) => {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const qColor = QUALITY_COLOR[marriage.qualityLabel];

  // 事件按大运分组（每 10 年一组）
  const eventsByDaYun = new Map<number, { ganZhi: string; events: MarriageEvent[] }>();
  for (const e of marriage.events) {
    if (!eventsByDaYun.has(e.inDaYunIndex)) {
      eventsByDaYun.set(e.inDaYunIndex, { ganZhi: e.inDaYunGanZhi, events: [] });
    }
    eventsByDaYun.get(e.inDaYunIndex)!.events.push(e);
  }
  const sortedDaYunEvents = Array.from(eventsByDaYun.entries()).sort(([a], [b]) => a - b);

  // 默认只显示 strong 事件，点击"展开全部"显示所有
  const filterEvents = (evs: MarriageEvent[]) =>
    showAllEvents ? evs : evs.filter((e) => e.strength === 'strong');

  return (
    <div>
      {/* ───────── 一、 总览：配偶星/宫/桃花/质量分 ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        {/* 配偶星 */}
        <OverviewBlock
          label="配偶星"
          mainText={`${marriage.spouseStar.primaryStar}（${marriage.spouseStar.starWuXing}）`}
          subText={levelLabel(marriage.spouseStar.primaryLevel)}
          color="#C5392F"
        />
        {/* 配偶宫 */}
        <OverviewBlock
          label="配偶宫"
          mainText={`${marriage.spousePalace.dayZhi} · ${marriage.spousePalace.benQiShiShen}`}
          subText={marriage.spousePalace.selfSeated ? '自坐配偶星' : '不见配偶星'}
          color="#D97A1F"
        />
        {/* 桃花 */}
        <OverviewBlock
          label="桃花"
          mainText={
            marriage.peachBlossom.hasTaoHua
              ? marriage.peachBlossom.taoHuaType
              : '不带桃花'
          }
          subText={[
            marriage.peachBlossom.hasHongYan ? '红艳' : null,
            marriage.peachBlossom.hasTianXi ? '天喜' : null,
          ].filter(Boolean).join(' · ') || '—'}
          color="#B8860B"
        />
        {/* 质量评分 */}
        <OverviewBlock
          label="婚姻质量"
          mainText={`${marriage.qualityLabel}`}
          subText={`★${marriage.qualityScore}/5`}
          color={qColor.main}
        />
      </div>

      {/* ───────── 二、 综合判词 ───────── */}
      <div
        className="font-classic mb-4"
        style={{
          fontSize: 13,
          lineHeight: 1.85,
          color: 'var(--color-ink)',
          padding: '14px 18px',
          background: qColor.bg,
          borderLeft: `3px solid ${qColor.main}`,
          borderRadius: 4,
          letterSpacing: '0.03em',
        }}
      >
        <span style={{ color: qColor.main, fontWeight: 700, marginRight: 8, fontSize: 14 }}>
          ⚑ 综合判词
        </span>
        {marriage.summary}
      </div>

      {/* ───────── 三、 配偶画像（详细描述） ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <DetailBlock
          title="配偶星画像"
          icon="✦"
          color="#C5392F"
          content={marriage.spouseStar.description}
          tags={[
            marriage.spouseStar.bothManifest ? '两星齐透' : null,
            marriage.spouseStar.mixedMarriage ? '官杀/财星混杂' : null,
            marriage.spouseStar.starBeingHe ? '配偶星被合' : null,
            marriage.spouseStar.starBeingChong ? '配偶星被冲' : null,
          ].filter(Boolean) as string[]}
        />
        <DetailBlock
          title="配偶宫画像"
          icon="◈"
          color="#D97A1F"
          content={marriage.spousePalace.description}
          tags={[
            marriage.spousePalace.selfSeated ? '自坐配偶星' : null,
            marriage.spousePalace.heRelations.length > 0 ? `合${marriage.spousePalace.heRelations.length}` : null,
            marriage.spousePalace.chongRelations.length > 0 ? `冲${marriage.spousePalace.chongRelations.length}` : null,
            marriage.spousePalace.xingRelations.length > 0 ? `刑${marriage.spousePalace.xingRelations.length}` : null,
            marriage.spousePalace.anHeRelations.length > 0 ? `暗合${marriage.spousePalace.anHeRelations.length}` : null,
            marriage.spousePalace.inXunKong ? '落空亡' : null,
          ].filter(Boolean) as string[]}
        />
      </div>

      {/* 桃花描述独立一行 */}
      {marriage.peachBlossom.description && (
        <div
          className="font-classic mb-5"
          style={{
            fontSize: 12.5,
            lineHeight: 1.7,
            color: 'var(--color-ink-light)',
            padding: '10px 14px',
            background: 'rgba(217, 122, 31, 0.06)',
            border: '1px dashed rgba(217, 122, 31, 0.4)',
            borderRadius: 4,
          }}
        >
          <span style={{ color: '#D97A1F', fontWeight: 700, marginRight: 6 }}>🌸 桃花画像</span>
          {marriage.peachBlossom.description}
        </div>
      )}

      {/* ───────── 四、 优势 / 提醒 ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {/* 优势 */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(107, 142, 35, 0.06)',
            border: '1px solid rgba(107, 142, 35, 0.35)',
            borderLeft: '3px solid #6B8E23',
            borderRadius: 4,
          }}
        >
          <div
            className="font-classic mb-2"
            style={{ fontSize: 13, color: '#6B8E23', letterSpacing: '0.1em', fontWeight: 700 }}
          >
            ✦ 婚缘优势
          </div>
          {marriage.highlights.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>
              —
            </div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {marriage.highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
        </div>
        {/* 提醒 */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(197, 57, 47, 0.06)',
            border: '1px solid rgba(197, 57, 47, 0.35)',
            borderLeft: '3px solid #C5392F',
            borderRadius: 4,
          }}
        >
          <div
            className="font-classic mb-2"
            style={{ fontSize: 13, color: '#C5392F', letterSpacing: '0.1em', fontWeight: 700 }}
          >
            ⚠ 关键提醒
          </div>
          {marriage.reminders.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>
              命局婚姻无显著风险点
            </div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {marriage.reminders.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* ───────── 五、 婚期时间表（按大运分组） ───────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div
            className="font-classic"
            style={{
              fontSize: 14,
              color: 'var(--color-cinnabar)',
              letterSpacing: '0.15em',
              fontWeight: 700,
            }}
          >
            ◇ 婚期时间表（一生 80 年）
          </div>
          <button
            className="font-classic text-xs"
            style={{
              padding: '4px 12px',
              border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--color-ink-light)',
              cursor: 'pointer',
            }}
            onClick={() => setShowAllEvents(!showAllEvents)}
          >
            {showAllEvents ? '仅看强信号' : `展开全部（共 ${marriage.events.length} 个）`}
          </button>
        </div>

        {sortedDaYunEvents.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>
            ⚠ 暂无婚期事件（命局静态）
          </div>
        ) : (
          <div className="space-y-2">
            {sortedDaYunEvents.map(([dyIndex, group]) => {
              const filtered = filterEvents(group.events);
              if (filtered.length === 0) return null;
              return (
                <DaYunGroup
                  key={dyIndex}
                  daYunIndex={dyIndex}
                  daYunGanZhi={group.ganZhi}
                  events={filtered}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ───────── 六、 风险点专区（如有） ───────── */}
      {marriage.risks.length > 0 && (
        <div>
          <div
            className="font-classic mb-3"
            style={{
              fontSize: 14,
              color: 'var(--color-cinnabar)',
              letterSpacing: '0.15em',
              fontWeight: 700,
            }}
          >
            ◇ 婚姻风险点（共 {marriage.risks.length} 项）
          </div>
          <div className="space-y-2">
            {marriage.risks.map((r, i) => <RiskRow key={i} risk={r} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 子组件
// ============================================================

const OverviewBlock: React.FC<{
  label: string;
  mainText: string;
  subText: string;
  color: string;
}> = ({ label, mainText, subText, color }) => (
  <div
    style={{
      padding: '12px 14px',
      background: 'var(--color-paper-card-soft)',
      border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
      borderTop: `3px solid ${color}`,
      borderRadius: 4,
      textAlign: 'center',
    }}
  >
    <div
      className="font-classic"
      style={{ fontSize: 11, color: 'var(--color-ink-soft)', letterSpacing: '0.2em', marginBottom: 6 }}
    >
      {label}
    </div>
    <div
      className="font-classic"
      style={{
        fontSize: 16,
        color,
        fontWeight: 700,
        letterSpacing: '0.03em',
        lineHeight: 1.3,
        marginBottom: 4,
      }}
    >
      {mainText}
    </div>
    <div className="text-xs" style={{ color: 'var(--color-ink-light)' }}>
      {subText}
    </div>
  </div>
);

const DetailBlock: React.FC<{
  title: string;
  icon: string;
  color: string;
  content: string;
  tags: string[];
}> = ({ title, icon, color, content, tags }) => (
  <div
    style={{
      padding: '12px 14px',
      background: 'var(--color-paper-card-soft)',
      border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
      borderLeft: `3px solid ${color}`,
      borderRadius: 4,
    }}
  >
    <div
      className="font-classic mb-2 flex items-center gap-2"
      style={{ fontSize: 13, color, letterSpacing: '0.1em', fontWeight: 700 }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {title}
    </div>
    <div
      style={{
        fontSize: 12.5,
        color: 'var(--color-ink)',
        lineHeight: 1.75,
        marginBottom: tags.length > 0 ? 8 : 0,
      }}
    >
      {content}
    </div>
    {tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span
            key={i}
            className="text-xs"
            style={{
              padding: '1px 8px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${color}`,
              color,
              fontSize: 10.5,
              opacity: 0.85,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    )}
  </div>
);

const DaYunGroup: React.FC<{
  daYunIndex: number;
  daYunGanZhi: string;
  events: MarriageEvent[];
}> = ({ daYunIndex, daYunGanZhi, events }) => {
  // 按 weight 倒序，强信号靠前
  const sorted = [...events].sort((a, b) => {
    const wa = EVENT_STYLE[a.eventType].weight;
    const wb = EVENT_STYLE[b.eventType].weight;
    return wb - wa;
  });
  const ageRange = `${events[0].age}-${events[events.length - 1].age}岁`;

  return (
    <div
      style={{
        background: 'var(--color-paper-card-soft)',
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
        borderRadius: 4,
        padding: '10px 14px',
      }}
    >
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span
          className="font-classic"
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-cinnabar)' }}
        >
          第{daYunIndex}步 · {daYunGanZhi}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-light)' }}>
          {ageRange}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          ({events.length} 个事件)
        </span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((e, i) => <EventRow key={i} event={e} />)}
      </div>
    </div>
  );
};

const EventRow: React.FC<{ event: MarriageEvent }> = ({ event }) => {
  const style = EVENT_STYLE[event.eventType];
  const tendencyBg =
    event.tendency === 'auspicious' ? 'rgba(107, 142, 35, 0.05)' :
    event.tendency === 'inauspicious' ? 'rgba(197, 57, 47, 0.05)' :
    'transparent';
  return (
    <div
      style={{
        background: tendencyBg,
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.4))',
        borderLeft: `2px solid ${style.color}`,
        padding: '6px 10px',
        borderRadius: 3,
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
        <span style={{ fontSize: 13 }}>{style.icon}</span>
        <span
          className="font-classic"
          style={{ fontSize: 13, fontWeight: 700, color: style.color, letterSpacing: '0.03em' }}
        >
          {event.year}年 · {event.ganZhi}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          {event.age}岁
        </span>
        <span
          className="text-xs font-classic"
          style={{
            padding: '1px 6px',
            borderRadius: 8,
            background: style.color,
            color: '#fff7e6',
            fontWeight: 600,
            opacity: 0.9,
            fontSize: 10.5,
          }}
        >
          {event.eventType}
        </span>
        <span style={{ color: style.color, fontSize: 11, letterSpacing: '0.1em', opacity: 0.7 }}>
          {'★'.repeat(event.strength === 'strong' ? 3 : event.strength === 'medium' ? 2 : 1)}
        </span>
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--color-ink-light)' }}>
        {event.description}
      </div>
    </div>
  );
};

const RiskRow: React.FC<{ risk: MarriageRisk }> = ({ risk }) => {
  const c = RISK_COLOR[risk.level];
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.main}`,
        borderLeft: `3px solid ${c.main}`,
        padding: '10px 14px',
        borderRadius: 4,
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
        <span
          className="font-classic"
          style={{ fontSize: 13.5, fontWeight: 700, color: c.main, letterSpacing: '0.05em' }}
        >
          {risk.type}
        </span>
        <span
          className="text-xs font-classic"
          style={{
            padding: '1px 8px',
            borderRadius: 10,
            background: c.main,
            color: '#fff7e6',
            fontWeight: 700,
            fontSize: 10.5,
          }}
        >
          {c.label}
        </span>
      </div>
      <div className="text-xs mb-1" style={{ color: 'var(--color-ink-light)', lineHeight: 1.6 }}>
        <span style={{ color: c.main, fontWeight: 600 }}>依据：</span>
        {risk.evidence}
      </div>
      <div className="text-xs" style={{ color: 'var(--color-ink)', lineHeight: 1.6 }}>
        <span style={{ color: c.main, fontWeight: 600 }}>建议：</span>
        {risk.advice}
      </div>
    </div>
  );
};

/** ManifestLevel 中文标签 */
function levelLabel(level: string): string {
  switch (level) {
    case 'manifest-strong': return '外显·实力派';
    case 'manifest-weak':   return '外显·虚位';
    case 'hidden-strong':   return '内蕴·实质';
    case 'hidden-weak':     return '内蕴·潜藏';
    case 'absent-empty':    return '空亡·几无';
    case 'absent':          return '原局未现';
    default: return level;
  }
}
