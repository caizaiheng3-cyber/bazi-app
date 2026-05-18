import React from 'react';
import type { DailyCalendarAnalysis, DailyFortuneInfo } from '../../types/bazi';

const FORTUNE_STYLE: Record<DailyFortuneInfo['fortune'], { color: string; bg: string; label: string }> = {
  'great-auspicious':   { color: '#FFFFFF', bg: '#6B8E23', label: '大吉' },
  'auspicious':         { color: '#3F5C18', bg: 'rgba(107,142,35,0.20)', label: '吉' },
  'neutral':            { color: '#5A5651', bg: 'rgba(160,147,125,0.15)', label: '平' },
  'inauspicious':       { color: '#8B0000', bg: 'rgba(197,57,47,0.18)', label: '凶' },
  'great-inauspicious': { color: '#FFFFFF', bg: '#8B0000', label: '大凶' },
};

export const DailyCalendarCard: React.FC<{ dailyCalendar: DailyCalendarAnalysis }> = ({ dailyCalendar }) => {
  // 把日期排成 7 列日历布局
  const firstDay = new Date(`${dailyCalendar.days[0].date}T00:00:00Z`).getUTCDay(); // 0=周日
  const padding = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div>
      <div className="mb-4 text-sm" style={{ color: 'var(--color-ink)' }}>{dailyCalendar.summary}</div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {['日','一','二','三','四','五','六'].map((d) => (
          <div key={d} className="text-xs text-center py-1 font-semibold" style={{ color: 'var(--color-ink-light)' }}>{d}</div>
        ))}
        {padding.map((i) => <div key={`pad-${i}`}></div>)}
        {dailyCalendar.days.map((d) => {
          const style = FORTUNE_STYLE[d.fortune];
          const dayNum = parseInt(d.date.slice(-2), 10);
          return (
            <div
              key={d.date}
              className="aspect-square rounded flex flex-col items-center justify-center text-xs"
              style={{ background: style.bg, color: style.color }}
              title={`${d.date} ${d.ganZhi}\n关系：${d.zhiRelationToDayPalace}\n${d.suitable.length > 0 ? '宜：'+d.suitable.join('/') : ''}\n${d.avoid.length > 0 ? '忌：'+d.avoid.join('/') : ''}`}
            >
              <div className="font-bold">{dayNum}</div>
              <div className="font-mono text-[10px] opacity-90">{d.ganZhi}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="px-3 py-2 rounded" style={{ background: 'rgba(107,142,35,0.08)' }}>
          <div className="text-xs mb-1" style={{ color: '#6B8E23' }}>本月最吉的日子</div>
          <div className="text-sm font-medium" style={{ color: '#3F5C18' }}>
            {dailyCalendar.bestDays.length > 0 ? dailyCalendar.bestDays.join('、') : '本月各日平稳'}
          </div>
        </div>
        <div className="px-3 py-2 rounded" style={{ background: 'rgba(197,57,47,0.06)' }}>
          <div className="text-xs mb-1" style={{ color: '#C5392F' }}>本月需谨慎的日子</div>
          <div className="text-sm font-medium" style={{ color: '#8B0000' }}>
            {dailyCalendar.worstDays.length > 0 ? dailyCalendar.worstDays.join('、') : '本月各日平稳'}
          </div>
        </div>
      </div>

      <div className="text-xs space-y-1" style={{ color: 'var(--color-ink-light)' }}>
        <div>· 鼠标悬停每一天可查看：日干支 / 与日支关系 / 宜忌事项</div>
        <div>· 颜色等级：<span style={{ color: '#3F5C18' }}>大吉/吉</span> · <span style={{ color: '#5A5651' }}>平</span> · <span style={{ color: '#8B0000' }}>凶/大凶</span></div>
      </div>
    </div>
  );
};
