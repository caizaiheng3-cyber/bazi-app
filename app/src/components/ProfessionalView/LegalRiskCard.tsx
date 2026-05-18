import React from 'react';
import type { LegalRiskAnalysis } from '../../types/bazi';

const QUALITY_COLOR: Record<LegalRiskAnalysis['qualityLabel'], { main: string; bg: string }> = {
  平安无虞: { main: '#6B8E23', bg: 'rgba(107,142,35,0.10)' },
  低风险:   { main: '#B8860B', bg: 'rgba(184,134,11,0.08)' },
  中等关注: { main: '#D97A1F', bg: 'rgba(217,122,31,0.10)' },
  高度警惕: { main: '#C5392F', bg: 'rgba(197,57,47,0.10)' },
  官非缠身: { main: '#8B0000', bg: 'rgba(139,0,0,0.12)' },
};

const SEVERITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: '#C5392F', medium: '#D97A1F', low: '#B8860B',
};

export const LegalRiskCard: React.FC<{ legalRisk: LegalRiskAnalysis }> = ({ legalRisk }) => {
  const qColor = QUALITY_COLOR[legalRisk.qualityLabel];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Block label="风险评分" main={legalRisk.qualityLabel} sub={`★${legalRisk.qualityScore}/5`} color={qColor.main} bg={qColor.bg} />
        <Block label="综合等级" main={legalRisk.overallRiskLevel.toUpperCase()} sub="" color="#3B5A6B" bg="rgba(59,90,107,0.08)" />
        <Block label="风险因子数" main={String(legalRisk.factors.length)} sub={`${legalRisk.events.length} 个高危流年`} color="#8B6F0E" bg="rgba(184,134,11,0.08)" />
      </div>

      {legalRisk.factors.length > 0 ? (
        <Section title="一、原局风险因子">
          <div className="space-y-2">
            {legalRisk.factors.map((f, i) => (
              <div key={i} className="px-3 py-2 rounded text-sm" style={{ background: 'rgba(197,57,47,0.04)', borderLeft: `3px solid ${SEVERITY_COLOR[f.severity]}` }}>
                <div className="font-medium" style={{ color: SEVERITY_COLOR[f.severity] }}>【{f.type}】<span className="text-xs ml-2" style={{ color: 'var(--color-ink-light)' }}>位置：{f.positions.join('、')}</span></div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-ink)' }}>{f.description}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section title="一、原局风险因子">
          <p className="text-sm" style={{ color: '#6B8E23' }}>✓ 原局未带羊刃/劫煞/三刑/伤官见官等凶神组合，平安格局</p>
        </Section>
      )}

      {legalRisk.events.length > 0 && (
        <Section title="二、流年高危事件">
          <div className="space-y-2">
            {legalRisk.events.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-mono" style={{ color: SEVERITY_COLOR[ev.severity], minWidth: 80 }}>{ev.year} {ev.ganZhi}</span>
                <span style={{ color: 'var(--color-ink-light)', minWidth: 50 }}>{ev.age}岁</span>
                <span style={{ color: '#8B6F0E', minWidth: 100 }}>【{ev.eventType}】</span>
                <span style={{ color: 'var(--color-ink)' }}>{ev.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="综合判词">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{legalRisk.summary}</p>
      </Section>

      {legalRisk.highlights.length > 0 && (
        <Section title="优势">
          <ul className="text-sm space-y-1" style={{ color: '#6B8E23' }}>
            {legalRisk.highlights.map((h, i) => <li key={i}>· {h}</li>)}
          </ul>
        </Section>
      )}

      {legalRisk.reminders.length > 0 && (
        <Section title="重要提醒">
          <ul className="text-sm space-y-1" style={{ color: '#C5392F' }}>
            {legalRisk.reminders.map((r, i) => <li key={i}>· {r}</li>)}
          </ul>
        </Section>
      )}
    </div>
  );
};

const Block: React.FC<{ label: string; main: string; sub: string; color: string; bg: string }> = ({ label, main, sub, color, bg }) => (
  <div className="px-4 py-3 rounded" style={{ background: bg, borderLeft: `3px solid ${color}` }}>
    <div className="text-xs mb-1" style={{ color: 'var(--color-ink-light)' }}>{label}</div>
    <div className="text-base font-medium" style={{ color }}>{main}</div>
    {sub && <div className="text-xs mt-1" style={{ color: 'var(--color-ink-light)' }}>{sub}</div>}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-ink)', borderBottom: '1px solid rgba(160,147,125,0.2)', paddingBottom: 4 }}>{title}</div>
    {children}
  </div>
);
