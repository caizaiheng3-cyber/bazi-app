import React from 'react';
import type { MonthlyForecastAnalysis } from '../../types/bazi';

const TENDENCY_COLOR: Record<'auspicious' | 'inauspicious' | 'neutral', { main: string; bg: string; label: string }> = {
  auspicious:   { main: '#6B8E23', bg: 'rgba(107,142,35,0.12)', label: '吉' },
  inauspicious: { main: '#C5392F', bg: 'rgba(197,57,47,0.10)',  label: '凶' },
  neutral:      { main: '#8B7355', bg: 'rgba(139,115,85,0.08)', label: '平' },
};

const MONTH_LABEL = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];

export const MonthlyForecastCard: React.FC<{ monthlyForecast: MonthlyForecastAnalysis }> = ({ monthlyForecast }) => {
  return (
    <div>
      <div className="mb-4 px-4 py-3 rounded" style={{ background: 'rgba(184,134,11,0.06)', borderLeft: '3px solid #B8860B' }}>
        <div className="text-sm font-semibold" style={{ color: '#8B6F0E' }}>{monthlyForecast.year}年（{monthlyForecast.yearGanZhi}） · 第{monthlyForecast.inDaYunIndex}步大运{monthlyForecast.inDaYunGanZhi}</div>
        <div className="text-sm mt-1" style={{ color: 'var(--color-ink)' }}>{monthlyForecast.summary}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {monthlyForecast.liuYues.map((ly, i) => {
          const c = TENDENCY_COLOR[ly.tendency];
          return (
            <div key={i} className="px-3 py-2 rounded" style={{ background: c.bg, borderLeft: `3px solid ${c.main}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: c.main }}>{MONTH_LABEL[i]}（{ly.ganZhi}）</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: c.main, color: '#FFF8E7' }}>{c.label}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{ly.startDate.slice(5)} ~ {ly.endDate.slice(5)}</div>
              {ly.relations.length > 0 && (
                <div className="text-xs mt-1" style={{ color: 'var(--color-ink)' }}>{ly.relations.join('；')}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="px-3 py-2 rounded" style={{ background: 'rgba(107,142,35,0.08)' }}>
          <div className="text-xs mb-1" style={{ color: '#6B8E23' }}>本年最吉的月份</div>
          <div className="text-sm font-medium" style={{ color: '#3F5C18' }}>
            {monthlyForecast.bestMonths.length > 0 ? monthlyForecast.bestMonths.map((m) => MONTH_LABEL[m - 1]).join('、') : '本年各月平稳无突出大吉月'}
          </div>
        </div>
        <div className="px-3 py-2 rounded" style={{ background: 'rgba(197,57,47,0.06)' }}>
          <div className="text-xs mb-1" style={{ color: '#C5392F' }}>本年需关注的月份</div>
          <div className="text-sm font-medium" style={{ color: '#8B0000' }}>
            {monthlyForecast.worstMonths.length > 0 ? monthlyForecast.worstMonths.map((m) => MONTH_LABEL[m - 1]).join('、') : '本年各月平稳无显著凶月'}
          </div>
        </div>
      </div>
    </div>
  );
};
