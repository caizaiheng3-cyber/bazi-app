import React from 'react';
import type { RelativeInfo, RelativesAnalysis } from '../../types/bazi';

const QUALITY_COLOR: Record<RelativesAnalysis['qualityLabel'], { main: string; bg: string }> = {
  六亲俱全: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)' },
  亲缘和睦: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)' },
  亲缘一般: { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)' },
  亲缘较疏: { main: '#5A6B7A', bg: 'rgba(90, 107, 122, 0.10)' },
  六亲缘薄: { main: '#4A4A4A', bg: 'rgba(74, 74, 74, 0.10)' },
};

const ROLE_COLOR: Record<RelativeInfo['role'], string> = {
  父亲: '#3B5A6B',
  母亲: '#C5392F',
  兄弟姐妹: '#6B8E23',
  子女: '#D97A1F',
  配偶: '#A0937D',
};

const ROLE_ICON: Record<RelativeInfo['role'], string> = {
  父亲: '◇',
  母亲: '♥',
  兄弟姐妹: '⚭',
  子女: '✿',
  配偶: '☯',
};

const CLOSENESS_COLOR: Record<RelativeInfo['closenessLabel'], string> = {
  极亲:        '#C5392F',
  亲密:        '#D97A1F',
  一般:        '#B8860B',
  疏远:        '#5A6B7A',
  '极疏/早离': '#4A4A4A',
};

export const RelativesCard: React.FC<{ relatives: RelativesAnalysis }> = ({ relatives }) => {
  const qColor = QUALITY_COLOR[relatives.qualityLabel];

  return (
    <div>
      {/* 一、 总览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <OverviewBlock
          label="六亲综合评分"
          mainText={relatives.qualityLabel}
          subText={`★${relatives.qualityScore}/5`}
          color={qColor.main}
        />
        <OverviewBlock
          label="亲缘分布"
          mainText={`极亲 ${countByLabel(relatives, '极亲')} · 亲密 ${countByLabel(relatives, '亲密')}`}
          subText={`一般 ${countByLabel(relatives, '一般')} · 疏远 ${countByLabel(relatives, '疏远') + countByLabel(relatives, '极疏/早离')}`}
          color="#6B8E23"
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
        {relatives.summary}
      </div>

      {/* 三、 四亲画像（2x2） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <RelativeBlock relative={relatives.father} />
        <RelativeBlock relative={relatives.mother} />
        <RelativeBlock relative={relatives.siblings} />
        <RelativeBlock relative={relatives.children} />
      </div>

      {/* 四、 优势 / 提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            ✦ 亲缘优势
          </div>
          {relatives.highlights.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>—</div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {relatives.highlights.map((h, i) => <li key={i}>{h}</li>)}
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
          {relatives.reminders.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--color-ink-light)', fontStyle: 'italic' }}>六亲缘分均无显著缺失</div>
          ) : (
            <ul className="m-0 pl-4 space-y-1" style={{ fontSize: 12.5, color: 'var(--color-ink)', lineHeight: 1.7 }}>
              {relatives.reminders.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>
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

const RelativeBlock: React.FC<{ relative: RelativeInfo }> = ({ relative }) => {
  const rColor = ROLE_COLOR[relative.role];
  const cColor = CLOSENESS_COLOR[relative.closenessLabel];
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--color-paper-card-soft)',
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
        borderLeft: `3px solid ${rColor}`,
        borderRadius: 4,
      }}
    >
      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
        <span style={{ fontSize: 16, color: rColor }}>{ROLE_ICON[relative.role]}</span>
        <span className="font-classic" style={{ fontSize: 14, fontWeight: 700, color: rColor, letterSpacing: '0.05em' }}>
          {relative.role}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          ({relative.shiShen} · {relative.palace})
        </span>
        <span
          className="text-xs font-classic"
          style={{
            padding: '1px 8px',
            borderRadius: 10,
            background: cColor,
            color: '#fff7e6',
            fontWeight: 700,
            fontSize: 10.5,
            marginLeft: 'auto',
          }}
        >
          {relative.closenessLabel}
        </span>
        <span style={{ color: cColor, fontSize: 11, letterSpacing: '0.1em' }}>
          {'★'.repeat(relative.closenessScore)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-ink)', lineHeight: 1.7 }}>
        {relative.description}
      </div>
    </div>
  );
};

function countByLabel(relatives: RelativesAnalysis, label: RelativeInfo['closenessLabel']): number {
  return [relatives.father, relatives.mother, relatives.siblings, relatives.children]
    .filter((r) => r.closenessLabel === label).length;
}
