import React from 'react';
import type { TravelAnalysis } from '../../types/bazi';

const QUALITY_COLOR: Record<TravelAnalysis['qualityLabel'], { main: string; bg: string }> = {
  动如脱兔: { main: '#C5392F', bg: 'rgba(197,57,47,0.10)' },
  常出常入: { main: '#D97A1F', bg: 'rgba(217,122,31,0.10)' },
  动静相宜: { main: '#B8860B', bg: 'rgba(184,134,11,0.08)' },
  安居乐业: { main: '#6B8E23', bg: 'rgba(107,142,35,0.10)' },
  不喜远行: { main: '#5A6B7A', bg: 'rgba(90,107,122,0.10)' },
};

export const TravelCard: React.FC<{ travel: TravelAnalysis }> = ({ travel }) => {
  const qColor = QUALITY_COLOR[travel.qualityLabel];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Block label="出行评分" main={travel.qualityLabel} sub={`★${travel.qualityScore}/5`} color={qColor.main} bg={qColor.bg} />
        <Block label="出行类型" main={travel.travelType} sub="" color="#3B5A6B" bg="rgba(59,90,107,0.08)" />
        <Block label="驿马位" main={travel.yiMa.yiMaZhi} sub={travel.yiMa.hasYiMa ? `命中${travel.yiMa.hitPositions.join('、')}` : '原局未带'} color="#8B6F0E" bg="rgba(184,134,11,0.08)" />
      </div>

      <Section title="一、驿马画像">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{travel.yiMa.description}</p>
        <div className="flex gap-3 mt-3 flex-wrap">
          {travel.yiMa.yiMaBeingChong && <Badge label="驿马逢冲（必动且急）" color="#C5392F" />}
          {travel.yiMa.yiMaBeingHe && <Badge label="驿马合住（欲动不能）" color="#D97A1F" />}
          {travel.overseasAffinity && <Badge label="海外/远方有缘" color="#3B5A6B" />}
        </div>
      </Section>

      {travel.events.length > 0 && (
        <Section title="二、关键出行年">
          <div className="space-y-2">
            {travel.events.slice(0, 8).map((ev, i) => (
              <EventRow key={i} year={ev.year} ganZhi={ev.ganZhi} age={ev.age} type={ev.eventType} desc={ev.description} strong={ev.strength === 'strong'} />
            ))}
          </div>
        </Section>
      )}

      <Section title="综合判词">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{travel.summary}</p>
      </Section>

      {travel.highlights.length > 0 && (
        <Section title="优势">
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-ink)' }}>
            {travel.highlights.map((h, i) => <li key={i}>· {h}</li>)}
          </ul>
        </Section>
      )}

      {travel.reminders.length > 0 && (
        <Section title="关注">
          <ul className="text-sm space-y-1" style={{ color: '#C5392F' }}>
            {travel.reminders.map((r, i) => <li key={i}>· {r}</li>)}
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

const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span className="px-2 py-1 text-xs rounded" style={{ border: `1px solid ${color}`, color }}>{label}</span>
);

const EventRow: React.FC<{ year: number; ganZhi: string; age: number; type: string; desc: string; strong: boolean }> = ({ year, ganZhi, age, type, desc, strong }) => (
  <div className="flex items-start gap-3 text-sm">
    <span className="font-mono" style={{ color: strong ? '#C5392F' : '#5A5651', minWidth: 80 }}>{year} {ganZhi}</span>
    <span style={{ color: 'var(--color-ink-light)', minWidth: 50 }}>{age}岁</span>
    <span style={{ color: '#8B6F0E', minWidth: 110 }}>【{type}】</span>
    <span style={{ color: 'var(--color-ink)' }}>{desc}</span>
  </div>
);
