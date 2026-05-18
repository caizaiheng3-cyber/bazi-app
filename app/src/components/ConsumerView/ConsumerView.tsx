import React, { useMemo } from 'react';
import type { BaziChart, ConsumerReport } from '../../types/bazi';
import { ClassicCard } from '../common/ClassicCard';
import { SectionTitle } from '../common/SectionTitle';
import { EnhancedWarningsSection } from './EnhancedWarningsSection';
import { buildEnhancedWarnings } from '../../engine/consumerReportEnhancer/warningEnhancer';

const TYPE_STYLE = {
  good:    { color: '#6B8E23', bg: 'rgba(107,142,35,0.10)', label: '机遇期' },
  caution: { color: '#C5392F', bg: 'rgba(197,57,47,0.08)',  label: '需谨慎' },
  turning: { color: '#B8860B', bg: 'rgba(184,134,11,0.12)', label: '转折点' },
} as const;

interface ConsumerViewProps {
  report: ConsumerReport;
  /** 可选：传入排盘结果以启用「带依据折叠」的预警增强段。
   *  不传则保持原有 7 段渲染，完全向后兼容。 */
  chart?: BaziChart;
}

export const ConsumerView: React.FC<ConsumerViewProps> = ({ report, chart }) => {
  const { imagery, empathy, explanation, guidance, timeline, luckyGuide, closing, otherAreas } = report;

  // 计算带依据的预警列表（仅在 chart 存在时计算）
  // 防御性 try/catch：旧版 localStorage chart 可能缺少新引擎需要的字段，
  // 任何匹配/翻译异常都不能影响主页面渲染，只是不显示警示段。
  const enhancedWarnings = useMemo(() => {
    if (!chart) return [];
    try {
      return buildEnhancedWarnings(chart, { maxWarnings: 6 });
    } catch (err) {
      console.error('[ConsumerView] buildEnhancedWarnings failed:', err);
      return [];
    }
  }, [chart]);

  return (
    <div className="space-y-6">
      {/* 居中云纹标题：你的命格 */}
      <div className="classic-cloud-title">
        <span className="cloud-mark">☁</span>
        <span>你 的 命 格</span>
        <span className="cloud-mark">☁</span>
      </div>

      {/* 1. 命格意象（开篇）— 上方文案 + 下方大海水插画（对标设计稿 02b） */}
      <ClassicCard
        style={{
          background:
            'linear-gradient(135deg, rgba(251,243,223,0.95) 0%, rgba(248,238,212,0.92) 100%)',
          padding: '28px 28px 0',
          overflow: 'hidden',
        }}
      >
        {/* 纳音 + 大标题 */}
        <div className="flex items-center gap-3 mb-2">
          <span
            className="zhuan-seal"
            style={{ width: 36, height: 36, fontSize: 14 }}
          >
            纳音
          </span>
          <h1
            className="font-classic m-0"
            style={{
              fontSize: 48,
              color: 'var(--color-ink)',
              letterSpacing: '0.15em',
              lineHeight: 1.15,
            }}
          >
            {imagery.title}
          </h1>
        </div>

        {/* 副标题 */}
        <div
          className="font-classic mt-3"
          style={{
            color: 'var(--color-ink-light)',
            letterSpacing: '0.2em',
            fontSize: 15,
          }}
        >
          {imagery.subtitle}
        </div>

        {/* 关键词标签 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {imagery.keywords.map((k) => (
            <span
              key={k}
              className="font-classic"
              style={{
                padding: '5px 16px',
                fontSize: 14,
                color: 'var(--color-cinnabar)',
                background: 'rgba(184, 55, 47, 0.06)',
                border: '1px solid rgba(184, 55, 47, 0.25)',
                borderRadius: 999,
                letterSpacing: '0.1em',
              }}
            >
              {k}
            </span>
          ))}
        </div>

        {/* 描述文字 */}
        <p
          className="leading-relaxed mt-5 mb-0"
          style={{
            fontSize: 15,
            color: 'var(--color-ink)',
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            paddingBottom: 20,
          }}
        >
          {imagery.description}
        </p>

        {/* 大海水插画（宽幅） */}
        <div style={{ margin: '0 -28px' }}>
          <img
            src="/images/consumer-sea.png"
            alt="命格意象"
            style={{
              width: '100%',
              display: 'block',
              borderRadius: '0 0 8px 8px',
            }}
          />
        </div>
      </ClassicCard>

      {/* ⚠️ 必须告诉你的事（仅在 chart 存在且有命中时渲染） */}
      {enhancedWarnings.length > 0 && (
        <EnhancedWarningsSection warnings={enhancedWarnings} />
      )}

      {/* 居中云纹标题：性格画像（对标设计稿的装饰线分隔） */}
      <div className="classic-cloud-title">
        <span className="cloud-mark">☁</span>
        <span>{empathy.title}</span>
        <span className="cloud-mark">☁</span>
      </div>

      {/* 2. 共情段落（左侧水墨装饰） */}
      <ClassicCard style={{ position: 'relative', overflow: 'hidden' }}>
        {/* 左上角水墨装饰 */}
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 80,
            opacity: 0.15,
            pointerEvents: 'none',
          }}
        >
          <img src="/images/mountain-header.png" alt="" style={{ width: '100%' }} />
        </div>
        <div style={{ position: 'relative' }}>
          {empathy.paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-base leading-loose mb-4 last:mb-0 indent-8"
              style={{
                color: 'var(--color-ink)',
                fontFamily: '"Noto Serif SC", "Songti SC", serif',
                fontSize: 16,
              }}
            >
              {p}
            </p>
          ))}
          {/* 朱砂色祝福语（设计稿中的红色斜体结语） */}
          <div
            className="text-center font-classic mt-4"
            style={{
              color: 'var(--color-cinnabar)',
              fontSize: 15,
              letterSpacing: '0.1em',
              fontStyle: 'italic',
            }}
          >
            愿你心怀大海，乘风破浪，活出自在从容的人生。
          </div>
        </div>
      </ClassicCard>

      {/* 3. 解释段落 */}
      <ClassicCard>
        <SectionTitle title={explanation.title} />
        {explanation.paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-loose text-ink mb-3 indent-8">
            {p}
          </p>
        ))}

        {/* 多法同断小注脚（柔和呈现） */}
        {explanation.convergenceNotes && explanation.convergenceNotes.length > 0 && (
          <div className="mt-4">
            {explanation.convergenceNotes.map((note, i) => (
              <div key={i} className="convergence-note-soft">{note}</div>
            ))}
          </div>
        )}

        {/* 术语小贴士 */}
        <div className="mt-4 p-4 bg-paper-deep/50 rounded border-l-4 border-gold">
          <div className="text-xs text-gold mb-2 tracking-widest">— 术语小贴士 —</div>
          <div className="space-y-1.5">
            {explanation.terms.map((t, i) => (
              <div key={i} className="text-sm">
                <span className="font-classic text-cinnabar">{t.term}</span>
                <span className="text-ink-light mx-1">：</span>
                <span className="text-ink-light">{t.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </ClassicCard>

      {/* 4. 出路段落（重点领域） */}
      <ClassicCard>
        <SectionTitle
          title={guidance.title}
          subtitle={`重点领域：${guidance.focusArea}（标 ⊙⊙ 者为多法同断 · 最高置信度）`}
        />
        <div className="space-y-4">
          {guidance.points.map((p, i) => (
            <div
              key={i}
              className={`relative pl-4 py-1 border-l-2 ${
                p.isConvergent ? 'border-gold' : 'border-cinnabar/40'
              }`}
            >
              {p.isConvergent && <span className="convergence-corner-mark">⊙⊙ 多法同断</span>}
              <h4 className="font-classic text-base text-ink m-0 mb-1.5 pr-24">{p.heading}</h4>
              <p className="text-sm text-ink-light leading-relaxed m-0">{p.content}</p>
            </div>
          ))}
        </div>
      </ClassicCard>

      {/* 5. 时间节奏 */}
      <ClassicCard>
        <SectionTitle title={timeline.title} subtitle="大运流年的关键节点" />
        <div className="space-y-3">
          {timeline.nodes.map((n, i) => {
            const s = TYPE_STYLE[n.type];
            return (
              <div
                key={i}
                className="flex gap-4 p-3 rounded"
                style={{ background: s.bg }}
              >
                <div className="flex-shrink-0 w-28 text-center pt-1">
                  <div className="font-classic text-base" style={{ color: s.color }}>{n.year}</div>
                  <div className="text-xs text-ink-light mt-1">{n.ageRange}</div>
                </div>
                <div className="flex-1 border-l border-border-classic/50 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-classic text-sm" style={{ color: s.color }}>{n.ganZhi}</span>
                    <span
                      className="text-[10px] px-1.5 py-px rounded text-white"
                      style={{ background: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="text-sm text-ink leading-relaxed">{n.summary}</div>
                </div>
              </div>
            );
          })}
        </div>
      </ClassicCard>

      {/* 7. 其他领域速览（彩色 4 卡，对应感情/财运/健康/人际） */}
      <div className="classic-cloud-title">
        <span className="cloud-mark">☁</span>
        <span>其 他 领 域 速 览</span>
        <span className="cloud-mark">☁</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {otherAreas.map((a) => {
          const tone = AREA_TONE[a.area] ?? AREA_TONE.default;
          return (
            <div
              key={a.area}
              style={{
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                borderRadius: 10,
                padding: '18px 20px',
                boxShadow: '0 1px 8px rgba(58,47,36,0.04)',
              }}
            >
              <div
                className="font-classic flex items-center gap-2 mb-2"
                style={{ color: tone.title, fontSize: 16, letterSpacing: '0.1em' }}
              >
                <span style={{ color: tone.title, fontSize: 14 }}>●</span>
                <span>{tone.icon} {a.area}</span>
              </div>
              <div
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-ink)' }}
              >
                {a.summary}
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. 开运指南 */}
      <div className="classic-cloud-title">
        <span className="cloud-mark">☁</span>
        <span>开 运 指 南</span>
        <span className="cloud-mark">☁</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <LuckyChipCard icon="🌸" title="幸运颜色" items={luckyGuide.colors} accent="#C5392F" />
        <LuckyChipCard icon="🧭" title="幸运方位" items={luckyGuide.directions} accent="#6B8E23" />
        <LuckyChipCard icon="🔢" title="幸运数字" items={luckyGuide.numbers.map(String)} accent="#1E6091" />
        <LuckyChipCard icon="🎒" title="适合行业" items={luckyGuide.industries} accent="#B8860B" />
      </div>
      <ClassicCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LuckyItem title="🍵 养生饮食" items={luckyGuide.foods} />
          <div className="bg-paper-deep/50 p-3 rounded">
            <div className="text-xs text-gold mb-2 tracking-widest">贵人画像</div>
            <div className="text-sm text-ink leading-relaxed">{luckyGuide.nobleman}</div>
          </div>
        </div>
      </ClassicCard>

      {/* 8. 温暖结语（对标设计稿底部祝福语+印章） */}
      <div
        className="text-center py-6"
        style={{ position: 'relative' }}
      >
        <div
          className="font-classic mb-2"
          style={{
            color: 'var(--color-cinnabar)',
            fontSize: 12,
            letterSpacing: '0.3em',
          }}
        >
          ☁ ☁ ☁
        </div>
        {closing.paragraphs.map((p, i) => (
          <p
            key={i}
            className="font-classic leading-loose mb-3 last:mb-0 max-w-2xl mx-auto"
            style={{ color: 'var(--color-ink)', fontSize: 15, letterSpacing: '0.05em' }}
          >
            {p}
          </p>
        ))}
        {/* 底部红色方印 */}
        <div
          className="mx-auto mt-5"
          style={{
            width: 42,
            height: 42,
            background: '#b8372f',
            color: '#fff7e6',
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            fontSize: 20,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            boxShadow:
              'inset 0 0 0 2px rgba(255, 247, 230, 0.3), 0 2px 8px rgba(184, 55, 47, 0.25)',
          }}
        >
          命
        </div>
      </div>
    </div>
  );
};

/** 4 个领域的色调（对应感情/财运/健康/人际） */
const AREA_TONE: Record<string, { bg: string; border: string; title: string; icon: string }> = {
  感情: {
    bg: 'linear-gradient(135deg, rgba(255,228,232,0.55) 0%, rgba(251,243,223,0.7) 100%)',
    border: 'rgba(217, 89, 79, 0.25)',
    title: '#C5392F',
    icon: '❤️',
  },
  财运: {
    bg: 'linear-gradient(135deg, rgba(252,234,199,0.6) 0%, rgba(251,243,223,0.7) 100%)',
    border: 'rgba(184, 134, 11, 0.3)',
    title: '#B8860B',
    icon: '💰',
  },
  健康: {
    bg: 'linear-gradient(135deg, rgba(220,235,206,0.5) 0%, rgba(251,243,223,0.7) 100%)',
    border: 'rgba(107, 142, 35, 0.3)',
    title: '#6B8E23',
    icon: '🌿',
  },
  人际: {
    bg: 'linear-gradient(135deg, rgba(208,224,236,0.5) 0%, rgba(251,243,223,0.7) 100%)',
    border: 'rgba(30, 96, 145, 0.3)',
    title: '#1E6091',
    icon: '👥',
  },
  default: {
    bg: 'rgba(248,238,212,0.7)',
    border: 'rgba(212,200,168,0.6)',
    title: '#3a2f24',
    icon: '◇',
  },
};

const LuckyItem: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="bg-paper-deep/50 p-3 rounded">
    <div className="text-xs text-gold mb-2 tracking-widest">{title}</div>
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className="text-sm font-classic text-ink px-2 py-0.5 bg-paper rounded">
          {it}
        </span>
      ))}
    </div>
  </div>
);

const LuckyChipCard: React.FC<{
  icon: string;
  title: string;
  items: string[];
  accent: string;
}> = ({ icon, title, items, accent }) => (
  <div
    style={{
      background: 'var(--color-paper-card)',
      border: `1px solid ${accent}30`,
      borderRadius: 10,
      padding: '14px 16px',
      boxShadow: '0 1px 6px rgba(58,47,36,0.04)',
    }}
  >
    <div
      className="font-classic flex items-center gap-1.5 mb-2"
      style={{ color: accent, fontSize: 14, letterSpacing: '0.1em' }}
    >
      <span>{icon}</span>
      <span>{title}</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className="text-xs font-classic"
          style={{
            color: 'var(--color-ink)',
            background: `${accent}10`,
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {it}
        </span>
      ))}
    </div>
  </div>
);
