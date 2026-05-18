import React, { useState } from 'react';
import type {
  WealthAnalysis,
  WealthEvent,
  WealthEventType,
  WealthRisk,
} from '../../types/bazi';

const QUALITY_COLOR: Record<WealthAnalysis['qualityLabel'], { main: string; bg: string }> = {
  巨富: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)' },
  富足: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)' },
  小康: { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)' },
  平稳: { main: '#5A6B7A', bg: 'rgba(90, 107, 122, 0.10)' },
  清贫: { main: '#4A4A4A', bg: 'rgba(74, 74, 74, 0.10)' },
};

const EVENT_STYLE: Record<WealthEventType, { icon: string; color: string; weight: number }> = {
  正财年:        { icon: '$', color: '#C5392F', weight: 5 },
  偏财年:        { icon: '◆', color: '#C5392F', weight: 5 },
  财库开年:      { icon: '⚿', color: '#D97A1F', weight: 4 },
  食伤生财年:    { icon: '✦', color: '#B8860B', weight: 3 },
  财星到位运:    { icon: '⊕', color: '#C5392F', weight: 5 },
  比劫夺财年:    { icon: '⚠', color: '#5A6B7A', weight: 2 },
  比劫强夺运:    { icon: '⚡', color: '#5A6B7A', weight: 4 },
};

const RISK_COLOR: Record<WealthRisk['level'], { main: string; bg: string; label: string }> = {
  high:   { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)', label: '高风险' },
  medium: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)', label: '中等' },
  low:    { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)', label: '低' },
};

export const WealthCard: React.FC<{ wealth: WealthAnalysis }> = ({ wealth }) => {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const qColor = QUALITY_COLOR[wealth.qualityLabel];

  const eventsByDaYun = new Map<number, { ganZhi: string; events: WealthEvent[] }>();
  for (const e of wealth.events) {
    if (!eventsByDaYun.has(e.inDaYunIndex)) {
      eventsByDaYun.set(e.inDaYunIndex, { ganZhi: e.inDaYunGanZhi, events: [] });
    }
    eventsByDaYun.get(e.inDaYunIndex)!.events.push(e);
  }
  const sortedDaYunEvents = Array.from(eventsByDaYun.entries()).sort(([a], [b]) => a - b);

  const filterEvents = (evs: WealthEvent[]) =>
    showAllEvents ? evs : evs.filter((e) => e.strength === 'strong');

  return (
    <div>
      {/* 一、 总览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <OverviewBlock
          label="财星"
          mainText={`${wealth.wealthStar.primaryStar}（${wealth.wealthStar.starWuXing}）`}
          subText={levelLabel(wealth.wealthStar.primaryLevel)}
          color="#C5392F"
        />
        <OverviewBlock
          label="财库"
          mainText={wealth.wealthVault.hasVault ? wealth.wealthVault.vaultZhi.join('、') : '无'}
          subText={wealth.wealthVault.hasVault ? (wealth.wealthVault.vaultOpened ? '已冲开' : '未冲开') : '需后天积累'}
          color="#D97A1F"
        />
        <OverviewBlock
          label="财源类型"
          mainText={wealth.sources[0] ?? '—'}
          subText={wealth.sources.slice(1).join(' · ') || '—'}
          color="#B8860B"
        />
        <OverviewBlock
          label="财运评分"
          mainText={wealth.qualityLabel}
          subText={`★${wealth.qualityScore}/5`}
          color={qColor.main}
        />
      </div>

      {/* 二、 综合判词 */}
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
        <span style={{ color: qColor.main, fontWeight: 700, marginRight: 8, fontSize: 14 }}>⚑ 综合判词</span>
        {wealth.summary}
      </div>

      {/* 三、 财星 / 财库画像 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <DetailBlock
          title="财星画像"
          icon="$"
          color="#C5392F"
          content={wealth.wealthStar.description}
          tags={[
            wealth.wealthStar.bothManifest ? '正偏齐透' : null,
            wealth.wealthStar.starBeingHe ? '财星被合' : null,
            wealth.wealthStar.starBeingChong ? '财星被冲' : null,
          ].filter(Boolean) as string[]}
        />
        <DetailBlock
          title="财库画像"
          icon="⚿"
          color="#D97A1F"
          content={wealth.wealthVault.description}
          tags={[
            wealth.wealthVault.hasVault ? `带库 ${wealth.wealthVault.vaultZhi.length}` : '无库',
            wealth.wealthVault.vaultOpened ? '冲开' : null,
          ].filter(Boolean) as string[]}
        />
      </div>

      {/* 四、 求财方位 + 适合行业 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(184, 134, 11, 0.06)',
            border: '1px solid rgba(184, 134, 11, 0.35)',
            borderLeft: '3px solid #B8860B',
            borderRadius: 4,
          }}
        >
          <div className="font-classic mb-2" style={{ fontSize: 13, color: '#B8860B', letterSpacing: '0.1em', fontWeight: 700 }}>
            ✦ 求财方位（用神方位）
          </div>
          <div className="flex flex-wrap gap-2">
            {wealth.directions.map((d) => (
              <span
                key={d}
                className="font-classic"
                style={{
                  padding: '4px 14px',
                  borderRadius: 4,
                  background: '#B8860B',
                  color: '#fff7e6',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {d}方
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(107, 142, 35, 0.06)',
            border: '1px solid rgba(107, 142, 35, 0.35)',
            borderLeft: '3px solid #6B8E23',
            borderRadius: 4,
          }}
        >
          <div className="font-classic mb-2" style={{ fontSize: 13, color: '#6B8E23', letterSpacing: '0.1em', fontWeight: 700 }}>
            ✦ 适合行业（财星五行 + 用神五行）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {wealth.industries.map((ind) => (
              <span
                key={ind}
                className="text-xs"
                style={{
                  padding: '2px 10px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid #6B8E23',
                  color: '#6B8E23',
                  fontSize: 11.5,
                }}
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 五、 优势 / 提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(107, 142, 35, 0.06)',
            border: '1px solid rgba(107, 142, 35, 0.35)',
            borderLeft: '3px solid #6B8E23',
            borderRadius: 4,
          }}
        >
          <div className="font-classic mb-2" style={{ fontSize: 13, color: '#6B8E23', letterSpacing: '0.1em', fontWeight: 700 }}>
            ✦ 财运优势
          </div>
          {wealth.highlights.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>—</div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {wealth.highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(197, 57, 47, 0.06)',
            border: '1px solid rgba(197, 57, 47, 0.35)',
            borderLeft: '3px solid #C5392F',
            borderRadius: 4,
          }}
        >
          <div className="font-classic mb-2" style={{ fontSize: 13, color: '#C5392F', letterSpacing: '0.1em', fontWeight: 700 }}>
            ⚠ 关键提醒
          </div>
          {wealth.reminders.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>命局财运无显著风险点</div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {wealth.reminders.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* 六、 财运时间表 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-classic" style={{ fontSize: 14, color: 'var(--color-cinnabar)', letterSpacing: '0.15em', fontWeight: 700 }}>
            ◇ 财运时间表（一生 80 年）
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
            {showAllEvents ? '仅看强信号' : `展开全部（共 ${wealth.events.length} 个）`}
          </button>
        </div>
        {sortedDaYunEvents.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>暂无财运事件</div>
        ) : (
          <div className="space-y-2">
            {sortedDaYunEvents.map(([dyIndex, group]) => {
              const filtered = filterEvents(group.events);
              if (filtered.length === 0) return null;
              return <DaYunGroup key={dyIndex} daYunIndex={dyIndex} daYunGanZhi={group.ganZhi} events={filtered} />;
            })}
          </div>
        )}
      </div>

      {/* 七、 风险点专区 */}
      {wealth.risks.length > 0 && (
        <div>
          <div className="font-classic mb-3" style={{ fontSize: 14, color: 'var(--color-cinnabar)', letterSpacing: '0.15em', fontWeight: 700 }}>
            ◇ 财运风险点（共 {wealth.risks.length} 项）
          </div>
          <div className="space-y-2">
            {wealth.risks.map((r, i) => <RiskRow key={i} risk={r} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
const OverviewBlock: React.FC<{ label: string; mainText: string; subText: string; color: string }> = ({ label, mainText, subText, color }) => (
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
    <div className="font-classic" style={{ fontSize: 11, color: 'var(--color-ink-soft)', letterSpacing: '0.2em', marginBottom: 6 }}>
      {label}
    </div>
    <div className="font-classic" style={{ fontSize: 16, color, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1.3, marginBottom: 4 }}>
      {mainText}
    </div>
    <div className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{subText}</div>
  </div>
);

const DetailBlock: React.FC<{ title: string; icon: string; color: string; content: string; tags: string[] }> = ({ title, icon, color, content, tags }) => (
  <div
    style={{
      padding: '12px 14px',
      background: 'var(--color-paper-card-soft)',
      border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
      borderLeft: `3px solid ${color}`,
      borderRadius: 4,
    }}
  >
    <div className="font-classic mb-2 flex items-center gap-2" style={{ fontSize: 13, color, letterSpacing: '0.1em', fontWeight: 700 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {title}
    </div>
    <div style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.75, marginBottom: tags.length > 0 ? 8 : 0 }}>
      {content}
    </div>
    {tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className="text-xs" style={{ padding: '1px 8px', borderRadius: 8, background: 'transparent', border: `1px solid ${color}`, color, fontSize: 10.5, opacity: 0.85 }}>
            {t}
          </span>
        ))}
      </div>
    )}
  </div>
);

const DaYunGroup: React.FC<{ daYunIndex: number; daYunGanZhi: string; events: WealthEvent[] }> = ({ daYunIndex, daYunGanZhi, events }) => {
  const sorted = [...events].sort((a, b) => EVENT_STYLE[b.eventType].weight - EVENT_STYLE[a.eventType].weight);
  const ageRange = `${events[0].age}-${events[events.length - 1].age}岁`;
  return (
    <div style={{ background: 'var(--color-paper-card-soft)', border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))', borderRadius: 4, padding: '10px 14px' }}>
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span className="font-classic" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-cinnabar)' }}>
          第{daYunIndex}步 · {daYunGanZhi}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{ageRange}</span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>({events.length} 个事件)</span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((e, i) => <EventRow key={i} event={e} />)}
      </div>
    </div>
  );
};

const EventRow: React.FC<{ event: WealthEvent }> = ({ event }) => {
  const style = EVENT_STYLE[event.eventType];
  const tendencyBg =
    event.tendency === 'auspicious' ? 'rgba(107, 142, 35, 0.05)' :
    event.tendency === 'inauspicious' ? 'rgba(197, 57, 47, 0.05)' :
    'transparent';
  return (
    <div style={{ background: tendencyBg, border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.4))', borderLeft: `2px solid ${style.color}`, padding: '6px 10px', borderRadius: 3 }}>
      <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
        <span style={{ fontSize: 13 }}>{style.icon}</span>
        <span className="font-classic" style={{ fontSize: 13, fontWeight: 700, color: style.color, letterSpacing: '0.03em' }}>
          {event.year}年 · {event.ganZhi}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{event.age}岁</span>
        <span className="text-xs font-classic" style={{ padding: '1px 6px', borderRadius: 8, background: style.color, color: '#fff7e6', fontWeight: 600, opacity: 0.9, fontSize: 10.5 }}>
          {event.eventType}
        </span>
        <span style={{ color: style.color, fontSize: 11, letterSpacing: '0.1em', opacity: 0.7 }}>
          {'★'.repeat(event.strength === 'strong' ? 3 : event.strength === 'medium' ? 2 : 1)}
        </span>
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--color-ink-light)' }}>{event.description}</div>
    </div>
  );
};

const RiskRow: React.FC<{ risk: WealthRisk }> = ({ risk }) => {
  const c = RISK_COLOR[risk.level];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.main}`, borderLeft: `3px solid ${c.main}`, padding: '10px 14px', borderRadius: 4 }}>
      <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
        <span className="font-classic" style={{ fontSize: 13.5, fontWeight: 700, color: c.main, letterSpacing: '0.05em' }}>{risk.type}</span>
        <span className="text-xs font-classic" style={{ padding: '1px 8px', borderRadius: 10, background: c.main, color: '#fff7e6', fontWeight: 700, fontSize: 10.5 }}>{c.label}</span>
      </div>
      <div className="text-xs mb-1" style={{ color: 'var(--color-ink-light)', lineHeight: 1.6 }}>
        <span style={{ color: c.main, fontWeight: 600 }}>依据：</span>{risk.evidence}
      </div>
      <div className="text-xs" style={{ color: 'var(--color-ink)', lineHeight: 1.6 }}>
        <span style={{ color: c.main, fontWeight: 600 }}>建议：</span>{risk.advice}
      </div>
    </div>
  );
};

function levelLabel(level: string): string {
  switch (level) {
    case 'manifest-strong': return '透干通根·实力派';
    case 'manifest-weak':   return '透干无根·虚位';
    case 'hidden-strong':   return '藏支本气·实质';
    case 'hidden-weak':     return '藏支余气·潜藏';
    case 'absent-empty':    return '空亡·几无';
    case 'absent':          return '原局未现';
    default: return level;
  }
}
