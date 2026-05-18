import React from 'react';
import type { EducationAnalysis } from '../../types/bazi';

const QUALITY_COLOR: Record<EducationAnalysis['qualityLabel'], { main: string; bg: string }> = {
  学富五车: { main: '#C5392F', bg: 'rgba(197,57,47,0.10)' },
  学有所成: { main: '#D97A1F', bg: 'rgba(217,122,31,0.10)' },
  中规中矩: { main: '#B8860B', bg: 'rgba(184,134,11,0.08)' },
  勉强达标: { main: '#5A6B7A', bg: 'rgba(90,107,122,0.10)' },
  学业坎坷: { main: '#4A4A4A', bg: 'rgba(74,74,74,0.10)' },
};

export const EducationCard: React.FC<{ education: EducationAnalysis }> = ({ education }) => {
  const qColor = QUALITY_COLOR[education.qualityLabel];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Block label="学业评分" main={education.qualityLabel} sub={`★${education.qualityScore}/5`} color={qColor.main} bg={qColor.bg} />
        <Block label="学业类型" main={education.scholarType} sub="" color="#3B5A6B" bg="rgba(59,90,107,0.08)" />
        <Block label="印星五行" main={education.educationStar.starWuXing} sub={education.educationStar.primaryStar} color="#6B8E23" bg="rgba(107,142,35,0.08)" />
      </div>

      <Section title="一、印星画像">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          {education.educationStar.description}
        </p>
        <div className="flex gap-3 mt-3 flex-wrap">
          {education.educationStar.shiShenPeiYin && <Badge label="食神配印（学问家组合）" color="#C5392F" />}
          {education.educationStar.shangGuanPeiYin && <Badge label="伤官佩印（才艺学者）" color="#D97A1F" />}
          {education.educationStar.guanYinSheng && <Badge label="官印相生（升学双吉）" color="#3B5A6B" />}
        </div>
      </Section>

      <Section title="二、学业贵人神煞">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          {education.shenSha.description}
        </p>
        <div className="flex gap-3 mt-3 flex-wrap">
          {education.shenSha.hasWenChang && <Badge label={`文昌贵人 · ${education.shenSha.wenChangZhi.join('、')}`} color="#C5392F" />}
          {education.shenSha.hasXueTang && <Badge label={`学堂 · ${education.shenSha.xueTangZhi.join('、')}`} color="#D97A1F" />}
          {education.shenSha.hasCiGuan && <Badge label={`词馆 · ${education.shenSha.ciGuanZhi.join('、')}`} color="#6B8E23" />}
        </div>
      </Section>

      <Section title="三、推荐学习方向">
        <div className="flex gap-2 flex-wrap">
          {education.recommendedFields.map((f) => (
            <span key={f} className="px-3 py-1 text-sm rounded" style={{ background: 'rgba(184,134,11,0.10)', color: '#8B6F0E' }}>{f}</span>
          ))}
        </div>
      </Section>

      {education.events.length > 0 && (
        <Section title="四、关键学业事件年">
          <div className="space-y-2">
            {education.events.slice(0, 6).map((ev, i) => (
              <EventRow key={i} year={ev.year} ganZhi={ev.ganZhi} age={ev.age} type={ev.eventType} desc={ev.description} strong={ev.strength === 'strong'} />
            ))}
          </div>
        </Section>
      )}

      <Section title="综合判词">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{education.summary}</p>
      </Section>

      {education.highlights.length > 0 && (
        <Section title="优势">
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-ink)' }}>
            {education.highlights.map((h, i) => <li key={i}>· {h}</li>)}
          </ul>
        </Section>
      )}

      {education.reminders.length > 0 && (
        <Section title="关注">
          <ul className="text-sm space-y-1" style={{ color: '#C5392F' }}>
            {education.reminders.map((r, i) => <li key={i}>· {r}</li>)}
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
    <span style={{ color: '#8B6F0E', minWidth: 80 }}>【{type}】</span>
    <span style={{ color: 'var(--color-ink)' }}>{desc}</span>
  </div>
);
