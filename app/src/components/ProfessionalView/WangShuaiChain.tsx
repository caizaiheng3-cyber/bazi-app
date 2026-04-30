import React from 'react';
import type { WangShuai } from '../../types/bazi';

const RESULT_COLOR: Record<'positive' | 'negative' | 'neutral', { bg: string; border: string; tag: string; text: string }> = {
  positive: { bg: 'rgba(107, 142, 35, 0.08)', border: '#6B8E23', tag: '#6B8E23', text: '利日主' },
  negative: { bg: 'rgba(197, 57, 47, 0.08)', border: '#C5392F', tag: '#C5392F', text: '不利日主' },
  neutral:  { bg: 'rgba(184, 134, 11, 0.08)', border: '#B8860B', tag: '#B8860B', text: '综合' },
};

/** 旺衰判断推断链：四步可视化展示 */
export const WangShuaiChain: React.FC<{ data: WangShuai }> = ({ data }) => {
  return (
    <div>
      <div className="space-y-3">
        {data.steps.map((step, idx) => {
          const c = RESULT_COLOR[step.result];
          return (
            <div
              key={idx}
              className="rounded-md p-4 border-l-4"
              style={{ background: c.bg, borderLeftColor: c.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-classic text-base m-0 text-ink">{step.title}</h4>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded text-white"
                    style={{ background: c.tag }}
                  >
                    {c.text}
                  </span>
                  <span className="text-sm font-medium" style={{ color: c.tag }}>
                    {step.score > 0 ? `+${step.score}` : step.score}
                  </span>
                </div>
              </div>
              <ul className="m-0 pl-5 text-sm text-ink-light space-y-0.5">
                {step.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-5 p-4 rounded ${
          data.convergence
            ? 'convergence-card'
            : 'bg-cinnabar/5 border border-cinnabar/30'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="classic-seal">结论</span>
            <span className="font-classic text-lg text-cinnabar">{data.conclusion}</span>
            {data.convergence && <span className="convergence-seal">多法同断</span>}
          </div>
          <div className="text-sm text-ink-light">
            置信度：
            <span className="text-gold tracking-tight">
              {'★'.repeat(data.confidence)}
              <span className="text-border-classic">{'☆'.repeat(5 - data.confidence)}</span>
            </span>
          </div>
        </div>
        {data.convergence && (
          <div className="convergence-methods">
            <div className="convergence-methods-title">
              — 共 {data.convergence.methods.length} 法皆指向：{data.convergence.conclusion} —
            </div>
            <ul>
              {data.convergence.methods.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
