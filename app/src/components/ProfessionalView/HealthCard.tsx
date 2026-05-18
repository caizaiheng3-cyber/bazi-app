import React, { useState } from 'react';
import type {
  HealthAnalysis,
  HealthEvent,
  HealthEventType,
  OrganHealthInfo,
} from '../../types/bazi';

const QUALITY_COLOR: Record<HealthAnalysis['qualityLabel'], { main: string; bg: string }> = {
  强健:   { main: '#6B8E23', bg: 'rgba(107, 142, 35, 0.10)' },
  良好:   { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)' },
  平稳:   { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)' },
  亚健康: { main: '#5A6B7A', bg: 'rgba(90, 107, 122, 0.10)' },
  需调养: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)' },
};

const RISK_COLOR: Record<'low' | 'medium' | 'high', { main: string; bg: string; label: string }> = {
  low:    { main: '#6B8E23', bg: 'rgba(107, 142, 35, 0.08)', label: '平衡' },
  medium: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)', label: '偏失' },
  high:   { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)', label: '严重' },
};

const EVENT_STYLE: Record<HealthEventType, { icon: string; color: string }> = {
  '冲日支年（健康波动）':   { icon: '⚡', color: '#C5392F' },
  '伏吟日柱年（旧疾复发）': { icon: '↻', color: '#D97A1F' },
  '反吟流年（手术/意外）':  { icon: '✕', color: '#C5392F' },
  '忌神大运（慢性消耗）':   { icon: '◐', color: '#5A6B7A' },
  '岁运并临年（凶吉倍增）': { icon: '⊛', color: '#C5392F' },
};

const ORGAN_COLOR: Record<OrganHealthInfo['organ'], string> = {
  肝: '#6B8E23',
  心: '#C5392F',
  脾: '#D97A1F',
  肺: '#A0937D',
  肾: '#3B5A6B',
};

export const HealthCard: React.FC<{ health: HealthAnalysis }> = ({ health }) => {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const qColor = QUALITY_COLOR[health.qualityLabel];

  const filteredEvents = showAllEvents
    ? health.events
    : health.events.filter((e) => e.strength === 'strong');

  return (
    <div>
      {/* 一、 总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <OverviewBlock
          label="体质类型"
          mainText={health.constitution}
          subText={`${health.organs.filter((o) => o.riskLevel === 'low').length}/5 脏腑均衡`}
          color="#6B8E23"
        />
        <OverviewBlock
          label="重点保养"
          mainText={health.organs.filter((o) => o.riskLevel === 'high').map((o) => o.organ).join('、') || '无显著风险'}
          subText={`${health.organs.filter((o) => o.riskLevel === 'medium').length} 项中等关注`}
          color="#C5392F"
        />
        <OverviewBlock
          label="健康评分"
          mainText={health.qualityLabel}
          subText={`★${health.qualityScore}/5`}
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
        {health.summary}
      </div>

      {/* 三、 五脏六腑分析 */}
      <div className="mb-5">
        <div className="font-classic mb-3" style={{ fontSize: 14, color: 'var(--color-cinnabar)', letterSpacing: '0.15em', fontWeight: 700 }}>
          ◇ 五脏六腑健康图谱
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {health.organs.map((o) => (
            <OrganBlock key={o.wuxing} organ={o} />
          ))}
        </div>
      </div>

      {/* 四、 易患疾病 */}
      {health.diseaseRisks.length > 0 && (
        <div
          className="mb-5"
          style={{
            padding: '12px 14px',
            background: 'rgba(197, 57, 47, 0.06)',
            border: '1px solid rgba(197, 57, 47, 0.30)',
            borderLeft: '3px solid #C5392F',
            borderRadius: 4,
          }}
        >
          <div className="font-classic mb-2" style={{ fontSize: 13, color: '#C5392F', letterSpacing: '0.1em', fontWeight: 700 }}>
            ⚠ 易患疾病方向（基于五行偏枯）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {health.diseaseRisks.map((d, i) => (
              <span
                key={i}
                className="text-xs"
                style={{
                  padding: '2px 10px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid #C5392F',
                  color: '#C5392F',
                  fontSize: 11.5,
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 五、 调养方案 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <RecommendBlock title="食疗方向" icon="🍵" color="#B8860B" items={health.recommendations.diet} />
        <RecommendBlock title="运动建议" icon="🏃" color="#6B8E23" items={health.recommendations.exercise} />
        <RecommendBlock title="起居作息" icon="🌙" color="#3B5A6B" items={health.recommendations.lifestyle} />
      </div>

      {/* 六、 优势 / 提醒 */}
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
            ✦ 健康优势
          </div>
          {health.highlights.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>—</div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {health.highlights.map((h, i) => <li key={i}>{h}</li>)}
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
          {health.reminders.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>命局健康无显著风险点</div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {health.reminders.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* 七、 健康危险年时间表 */}
      {health.events.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="font-classic" style={{ fontSize: 14, color: 'var(--color-cinnabar)', letterSpacing: '0.15em', fontWeight: 700 }}>
              ◇ 健康关注年（一生）
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
              {showAllEvents ? '仅看强信号' : `展开全部（共 ${health.events.length} 个）`}
            </button>
          </div>
          <div className="space-y-1.5">
            {filteredEvents.map((e, i) => <EventRow key={i} event={e} />)}
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
    <div className="font-classic" style={{ fontSize: 15, color, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1.3, marginBottom: 4 }}>
      {mainText}
    </div>
    <div className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{subText}</div>
  </div>
);

const OrganBlock: React.FC<{ organ: OrganHealthInfo }> = ({ organ }) => {
  const c = RISK_COLOR[organ.riskLevel];
  const oColor = ORGAN_COLOR[organ.organ];
  return (
    <div
      style={{
        padding: '10px 12px',
        background: c.bg,
        border: `1px solid ${c.main}`,
        borderTop: `3px solid ${oColor}`,
        borderRadius: 4,
        textAlign: 'center',
      }}
    >
      <div className="font-classic" style={{ fontSize: 11, color: 'var(--color-ink-soft)', letterSpacing: '0.2em', marginBottom: 4 }}>
        {organ.wuxing}
      </div>
      <div className="font-classic" style={{ fontSize: 18, color: oColor, fontWeight: 700, letterSpacing: '0.03em', marginBottom: 2 }}>
        {organ.organ}
      </div>
      <div className="text-xs" style={{ color: 'var(--color-ink-light)', marginBottom: 4 }}>
        / {organ.bowel}
      </div>
      <div
        style={{
          fontSize: 10.5,
          padding: '1px 6px',
          borderRadius: 8,
          background: c.main,
          color: '#fff7e6',
          fontWeight: 700,
          display: 'inline-block',
          marginBottom: 6,
        }}
      >
        {c.label} · {organ.wuxingScore.toFixed(1)}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-ink-light)', lineHeight: 1.5, textAlign: 'left' }}>
        {organ.description}
      </div>
    </div>
  );
};

const RecommendBlock: React.FC<{ title: string; icon: string; color: string; items: string[] }> = ({ title, icon, color, items }) => (
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
    {items.length === 0 ? (
      <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>—</div>
    ) : (
      <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12, color: 'var(--color-ink)', lineHeight: 1.6 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    )}
  </div>
);

const EventRow: React.FC<{ event: HealthEvent }> = ({ event }) => {
  const style = EVENT_STYLE[event.eventType];
  return (
    <div
      style={{
        background: 'rgba(197, 57, 47, 0.04)',
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.4))',
        borderLeft: `2px solid ${style.color}`,
        padding: '6px 10px',
        borderRadius: 3,
      }}
    >
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
