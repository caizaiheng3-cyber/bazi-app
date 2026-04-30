import React from 'react';
import type { BaziChart } from '../../types/bazi';
import { ClassicCard } from '../common/ClassicCard';
import { SectionTitle } from '../common/SectionTitle';
import { ClassicDivider } from '../common/ClassicDivider';
import { PillarsTable } from './PillarsTable';
import { WuxingChart } from './WuxingChart';
import { WangShuaiChain } from './WangShuaiChain';
import { DayunTimeline } from './DayunTimeline';

const KEY_FINDING_STYLE = {
  red:    { color: '#C5392F', bg: 'rgba(197,57,47,0.08)',  label: '需关注' },
  yellow: { color: '#B8860B', bg: 'rgba(184,134,11,0.10)', label: '中性' },
  green:  { color: '#6B8E23', bg: 'rgba(107,142,35,0.10)', label: '利好' },
} as const;

const SHENSHA_STYLE = {
  吉神: { color: '#6B8E23', bg: 'rgba(107,142,35,0.10)' },
  凶神: { color: '#C5392F', bg: 'rgba(197,57,47,0.08)' },
  中性: { color: '#5A5651', bg: 'rgba(90,86,81,0.06)' },
} as const;

export const ProfessionalView: React.FC<{ chart: BaziChart }> = ({ chart }) => {
  const { basicInfo, wuxingStats, wangShuai, yongShen, geJu, shenShas, daYuns, keyFindings } = chart;

  return (
    <div className="space-y-6">
      {/* 1. 基础信息 */}
      <ClassicCard>
        <SectionTitle title="基础信息" />
        <div
          className="grid gap-x-8 gap-y-2 text-sm"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>姓名：</span>
            <span className="font-medium">{basicInfo.name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>性别：</span>
            <span className="font-medium">{basicInfo.gender}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>公历：</span>
            {basicInfo.solarDate}
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>农历：</span>
            {basicInfo.lunarDate}
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>节气月：</span>
            {basicInfo.jieQiMonth}
          </div>
          {basicInfo.trueSolarTime && (
            <div>
              <span style={{ color: 'var(--color-ink-light)' }}>真太阳时：</span>
              {basicInfo.trueSolarTime}
            </div>
          )}
          {basicInfo.birthPlace && (
            <div className="col-span-2">
              <span style={{ color: 'var(--color-ink-light)' }}>出生地：</span>
              {basicInfo.birthPlace}
            </div>
          )}
        </div>
      </ClassicCard>

      {/* 2. 四柱排盘 */}
      <ClassicCard>
        <SectionTitle title="四柱排盘" subtitle="天干地支 · 藏干十神 · 纳音" />
        <PillarsTable chart={chart} />
      </ClassicCard>

      {/* 3. 五行分布 */}
      <ClassicCard>
        <SectionTitle title="五行力量分布" />
        <WuxingChart stats={wuxingStats} />
      </ClassicCard>

      {/* 4. 旺衰推断链 */}
      <ClassicCard>
        <SectionTitle title="日主旺衰判断" subtitle="四步推断 · 全过程可追溯" />
        <WangShuaiChain data={wangShuai} />
      </ClassicCard>

      {/* 5. 用神 / 格局 */}
      <ClassicCard>
        <SectionTitle title="用神 · 格局" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 用神 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-classic text-base text-cinnabar m-0">用神推断（{yongShen.method}法）</h3>
              {yongShen.convergence && <span className="convergence-seal">多法同断</span>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-ink-light w-16">主用神：</span>
                {yongShen.primary.map((w) => (
                  <span key={w} className="px-2.5 py-0.5 bg-celadon/15 text-celadon rounded font-classic">{w}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-light w-16">次用神：</span>
                {yongShen.secondary.map((w) => (
                  <span key={w} className="px-2.5 py-0.5 bg-gold/15 text-gold rounded font-classic">{w}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-light w-16">忌神：</span>
                {yongShen.ji.map((w) => (
                  <span key={w} className="px-2.5 py-0.5 bg-cinnabar/10 text-cinnabar rounded font-classic">{w}</span>
                ))}
              </div>
              <p className="text-ink-light text-sm leading-relaxed mt-2 mb-0">{yongShen.reason}</p>
              {yongShen.convergence && (
                <div className="convergence-methods">
                  <div className="convergence-methods-title">— 多法同断 · 证据链 —</div>
                  <ul>
                    {yongShen.convergence.methods.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                  <div className="text-xs text-gold mt-2 font-classic">
                    ⊙⊙ 共同结论：{yongShen.convergence.conclusion}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* 格局 */}
          <div>
            <h3 className="font-classic text-base text-cinnabar mb-3">格局判定</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-ink-light w-16">格局：</span>
                <span className="font-classic text-base">{geJu.name}</span>
                <span className="ml-2 text-xs px-2 py-0.5 bg-gold/15 text-gold rounded">{geJu.type}</span>
              </div>
              <div>
                <span className="text-ink-light w-16">状态：</span>
                <span className={geJu.status === '成格' ? 'text-celadon font-medium' : 'text-cinnabar'}>
                  {geJu.status}
                </span>
                <span className="ml-3 text-ink-light w-16">层次：</span>
                <span>{geJu.level}</span>
              </div>
              <p className="text-ink-light text-sm leading-relaxed mt-2 mb-0">{geJu.description}</p>
            </div>
          </div>
        </div>
      </ClassicCard>

      {/* 6. 神煞 */}
      <ClassicCard>
        <SectionTitle title="神煞速查" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shenShas.map((s) => {
            const style = SHENSHA_STYLE[s.category];
            return (
              <div
                key={s.name}
                className="p-3 rounded border-l-3"
                style={{ background: style.bg, borderLeft: `3px solid ${style.color}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-classic text-sm" style={{ color: style.color }}>{s.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: style.color, color: '#fff' }}>
                    {s.category}
                  </span>
                </div>
                <div className="text-xs text-ink-light mb-1">来源：{s.source}</div>
                <div className="text-xs text-ink leading-snug">{s.description}</div>
              </div>
            );
          })}
        </div>
      </ClassicCard>

      {/* 7. 大运时间轴 */}
      <ClassicCard>
        <SectionTitle title="大运排盘" subtitle="十年一运 · 一生节奏" />
        <DayunTimeline daYuns={daYuns} startAge={chart.startAge} direction={chart.qiYunDirection} />
      </ClassicCard>

      {/* 8. 关键发现 */}
      <ClassicCard>
        <SectionTitle title="关键发现" subtitle="红黄绿三级 + 多法同断（金色印章）· 命理师审核要点" />
        <div className="space-y-3">
          {keyFindings.map((f, i) => {
            const s = KEY_FINDING_STYLE[f.level];
            const isConvergent = !!f.convergence;
            return (
              <div
                key={i}
                className={`p-3 rounded flex gap-3 items-start ${isConvergent ? 'convergence-card' : ''}`}
                style={isConvergent ? undefined : { background: s.bg }}
              >
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                  style={{ background: s.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-classic text-sm font-semibold" style={{ color: s.color }}>
                      {f.title}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-px rounded"
                      style={{ color: s.color, border: `1px solid ${s.color}` }}
                    >
                      {s.label}
                    </span>
                    {isConvergent && (
                      <span className="convergence-seal" title="多个独立分析路径指向同一结论 · 命理最高置信度">
                        多法同断
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-light leading-relaxed">{f.description}</div>
                  {f.convergence && (
                    <div className="convergence-methods">
                      <div className="convergence-methods-title">
                        — 共 {f.convergence.methods.length} 法皆指向：{f.convergence.conclusion} —
                      </div>
                      <ul>
                        {f.convergence.methods.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ClassicCard>

      <ClassicDivider />
      <div className="text-center text-xs text-ink-light pb-4">
        — 以上为命理师审核版数据 · 审核通过后可推送消费者报告 —
      </div>
    </div>
  );
};
