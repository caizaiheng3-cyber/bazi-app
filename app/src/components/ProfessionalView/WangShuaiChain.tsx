import React from 'react';
import type { WangShuai, WangShuaiStep } from '../../types/bazi';

/** 关系修正影响的视觉配色 */
const EFFECT_STYLE: Record<
  '助身' | '克泄' | '中性',
  { main: string; bg: string; bgSoft: string; icon: string }
> = {
  助身: { main: '#6B8E23', bg: 'rgba(107, 142, 35, 0.10)', bgSoft: 'rgba(107, 142, 35, 0.04)', icon: '＋' },
  克泄: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)', bgSoft: 'rgba(197, 57, 47, 0.04)', icon: '－' },
  中性: { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.10)', bgSoft: 'rgba(184, 134, 11, 0.04)', icon: '○' },
};

/** 强度对应的视觉权重 */
const STRENGTH_WEIGHT: Record<'强' | '中' | '弱', { dot: string; opacity: number }> = {
  强: { dot: '●●●', opacity: 1 },
  中: { dot: '●●○', opacity: 0.8 },
  弱: { dot: '●○○', opacity: 0.65 },
};

/** 结果对应的颜色与文案 */
const RESULT_STYLE: Record<
  'positive' | 'negative' | 'neutral',
  { main: string; bg: string; bgSoft: string; tag: string; icon: string }
> = {
  positive: { main: '#6B8E23', bg: 'rgba(107, 142, 35, 0.10)', bgSoft: 'rgba(107, 142, 35, 0.04)', tag: '利日主', icon: '＋' },
  negative: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)', bgSoft: 'rgba(197, 57, 47, 0.04)', tag: '不利日主', icon: '－' },
  neutral:  { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.10)', bgSoft: 'rgba(184, 134, 11, 0.04)', tag: '中性',     icon: '○' },
};

/** 古典数字 一二三四五 */
const CLASSIC_NUM = ['壹', '貳', '叁', '肆', '伍', '陸', '柒', '捌'];

/** 从 conclusion 中粗略提取偏旺/偏弱倾向（用于结论印章颜色） */
function getConclusionTone(conclusion: string): 'strong' | 'weak' | 'balanced' {
  if (/(旺|强)/.test(conclusion)) return 'strong';
  if (/(弱|衰)/.test(conclusion)) return 'weak';
  return 'balanced';
}

/** 从 step.title 中剥离 "第X步：" 前缀，得到核心标题（如 "得令判断"） */
function pureTitle(title: string): string {
  return title.replace(/^第[一二三四五六七八九十]步[：:]?\s*/, '');
}

/** 渲染得分汇总公式条 */
const ScoreFormula: React.FC<{ steps: readonly WangShuaiStep[] }> = ({ steps }) => {
  // 综合步骤通常 score = 0 或合计，过滤掉只展示前四步
  const calcSteps = steps.filter((s) => s.step !== '综合');
  const total = calcSteps.reduce((sum, s) => sum + s.score, 0);

  return (
    <div
      className="font-classic"
      style={{
        background: 'var(--color-paper-card-soft)',
        border: '1px dashed var(--color-border-soft, rgba(212, 200, 168, 0.7))',
        borderRadius: 8,
        padding: '14px 18px',
        margin: '12px 0 20px',
      }}
    >
      <div
        className="text-xs mb-2"
        style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.15em' }}
      >
        ◇ 得分汇总
      </div>
      <div className="flex items-center flex-wrap gap-x-2 gap-y-2" style={{ fontSize: 14 }}>
        {calcSteps.map((s, idx) => {
          const c = RESULT_STYLE[s.result];
          const sign = s.score > 0 ? '+' : '';
          return (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <span style={{ color: 'var(--color-ink-soft)', fontSize: 16 }}>+</span>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: c.bg,
                  color: c.main,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                <span>{pureTitle(s.title)}</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {sign}
                  {s.score}
                </span>
              </span>
            </React.Fragment>
          );
        })}
        <span style={{ color: 'var(--color-ink-soft)', fontSize: 16, margin: '0 4px' }}>＝</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 14px',
            borderRadius: 4,
            background: 'var(--color-cinnabar)',
            color: '#fff7e6',
            fontWeight: 700,
            fontFamily: 'monospace',
            boxShadow: '0 2px 6px rgba(184, 55, 47, 0.25)',
          }}
        >
          {total > 0 ? `+${total}` : total}
        </span>
      </div>
    </div>
  );
};

/** 顶部结论印章区 */
const ConclusionSeal: React.FC<{
  conclusion: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  hasConvergence: boolean;
}> = ({ conclusion, confidence, hasConvergence }) => {
  const tone = getConclusionTone(conclusion);
  const sealColor =
    tone === 'strong'
      ? 'var(--color-cinnabar)'
      : tone === 'weak'
        ? 'var(--color-gold)'
        : 'var(--color-ink-light)';

  return (
    <div
      className="relative"
      style={{
        textAlign: 'center',
        padding: '20px 16px 24px',
        background:
          'radial-gradient(ellipse at center, var(--color-paper-card) 0%, var(--color-paper-card-soft) 100%)',
        borderTop: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.5))',
        borderBottom: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.5))',
        marginBottom: 4,
      }}
    >
      {/* 多法同断浮标（右上角） */}
      {hasConvergence && (
        <span
          className="convergence-seal font-classic"
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            fontSize: 11,
            padding: '3px 8px',
            letterSpacing: '0.1em',
          }}
        >
          ◆ 多法同断
        </span>
      )}

      <div
        className="text-xs font-classic"
        style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.3em', marginBottom: 8 }}
      >
        日 主 旺 衰 結 論
      </div>

      <div
        className="font-classic inline-block"
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: sealColor,
          padding: '8px 28px',
          border: `2.5px solid ${sealColor}`,
          borderRadius: 6,
          letterSpacing: '0.15em',
          background: 'rgba(255, 247, 230, 0.4)',
          boxShadow: `0 2px 12px ${sealColor === 'var(--color-cinnabar)' ? 'rgba(184, 55, 47, 0.18)' : 'rgba(184, 134, 11, 0.15)'}`,
        }}
      >
        {conclusion}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <span className="text-ink-soft font-classic">置信度</span>
        <span className="text-gold tracking-widest" style={{ fontSize: 16 }}>
          {'★'.repeat(confidence)}
          <span style={{ color: 'rgba(184, 134, 11, 0.3)' }}>{'☆'.repeat(5 - confidence)}</span>
        </span>
      </div>
    </div>
  );
};

/** 单个步骤卡片 */
const StepCard: React.FC<{ step: WangShuaiStep; index: number; isLast: boolean }> = ({
  step,
  index,
  isLast,
}) => {
  const c = RESULT_STYLE[step.result];
  const sign = step.score > 0 ? '+' : '';

  return (
    <div className="relative flex" style={{ minHeight: 72 }}>
      {/* 左侧：序号圆圈 + 竖向连接线 */}
      <div className="flex flex-col items-center" style={{ width: 56, flexShrink: 0 }}>
        <div
          className="flex items-center justify-center font-classic"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${c.main}`,
            background: c.bg,
            color: c.main,
            fontSize: 18,
            fontWeight: 700,
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          {CLASSIC_NUM[index] || index + 1}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              background:
                'repeating-linear-gradient(to bottom, var(--color-border-soft, rgba(212, 200, 168, 0.7)) 0 4px, transparent 4px 8px)',
              marginTop: 4,
            }}
          />
        )}
      </div>

      {/* 右侧：内容卡片 */}
      <div
        className="flex-1 ml-3 mb-3 rounded-md"
        style={{
          background: c.bgSoft,
          border: `1px solid ${c.bg}`,
          borderLeft: `3px solid ${c.main}`,
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h4
              className="font-classic m-0"
              style={{ fontSize: 16, color: 'var(--color-ink)', letterSpacing: '0.05em' }}
            >
              {pureTitle(step.title)}
            </h4>
            <span
              className="text-xs font-classic"
              style={{
                padding: '1px 8px',
                borderRadius: 10,
                background: c.bg,
                color: c.main,
                letterSpacing: '0.05em',
              }}
            >
              {c.tag}
            </span>
          </div>
          <span
            className="font-classic"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: c.main,
              fontFamily: 'monospace',
              padding: '2px 10px',
              background: 'rgba(255,255,255,0.45)',
              borderRadius: 4,
              minWidth: 40,
              textAlign: 'center',
            }}
          >
            {sign}
            {step.score}
          </span>
        </div>
        <ul
          className="m-0 pl-4 space-y-1"
          style={{ fontSize: 13.5, color: 'var(--color-ink-light)', lineHeight: 1.7 }}
        >
          {step.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * M2.7 动态关系修正区块
 * 展示：原始结论 → 关系修正项列表（按助身/克泄/中性分组）→ 综合解读
 *
 * 即使没有显著动态关系，也会展示一个"原局结构稳定"的提示，保持渲染一致性。
 */
const RelationAdjustmentSection: React.FC<{
  adjustment: NonNullable<WangShuai['relationAdjustment']>;
  rawConclusion: string;
}> = ({ adjustment, rawConclusion }) => {
  const { rawConclusion: rawText, items, changedConclusion, summary } = adjustment;

  // 按助身/克泄/中性分组
  const grouped = {
    助身: items.filter((it) => it.effect === '助身'),
    克泄: items.filter((it) => it.effect === '克泄'),
    中性: items.filter((it) => it.effect === '中性'),
  };

  return (
    <div className="mt-5">
      {/* 区块标题 */}
      <div
        className="text-xs font-classic mb-3"
        style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.2em' }}
      >
        ◇ 动态关系修正（命理「动态作用层」叠加）
      </div>

      <div className="relative flex" style={{ minHeight: 56 }}>
        {/* 左侧序号圆圈（标记为"伍" - 第五步） */}
        <div className="flex flex-col items-center" style={{ width: 56, flexShrink: 0 }}>
          <div
            className="flex items-center justify-center font-classic"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '2px solid var(--color-gold)',
              background: 'rgba(184, 134, 11, 0.10)',
              color: 'var(--color-gold)',
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            伍
          </div>
        </div>

        {/* 右侧主体卡片 */}
        <div
          className="flex-1 ml-3 rounded-md"
          style={{
            background: 'rgba(184, 134, 11, 0.04)',
            border: '1px solid rgba(184, 134, 11, 0.22)',
            borderLeft: '3px solid var(--color-gold)',
            padding: '14px 16px',
          }}
        >
          {/* 标题行 */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h4
                className="font-classic m-0"
                style={{ fontSize: 16, color: 'var(--color-ink)', letterSpacing: '0.05em' }}
              >
                动态关系修正
              </h4>
              <span
                className="text-xs font-classic"
                style={{
                  padding: '1px 8px',
                  borderRadius: 10,
                  background: 'rgba(184, 134, 11, 0.15)',
                  color: 'var(--color-gold)',
                  letterSpacing: '0.05em',
                }}
              >
                {changedConclusion ? '结论已修正' : '结论维持'}
              </span>
            </div>
            <span
              className="text-xs"
              style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic' }}
            >
              共 {items.length} 处
            </span>
          </div>

          {/* 上：原始结论 → 最终结论的对比箭头 */}
          <div
            className="flex items-center gap-2 flex-wrap mb-3"
            style={{ fontSize: 13 }}
          >
            <span
              className="font-classic"
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                background: 'var(--color-paper-card-soft)',
                border: '1px dashed var(--color-border-soft, rgba(212, 200, 168, 0.7))',
                color: 'var(--color-ink-light)',
              }}
            >
              静态判定：{rawText}
            </span>
            <span style={{ color: 'var(--color-ink-soft)', fontSize: 14 }}>⇒</span>
            <span
              className="font-classic"
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                background: changedConclusion ? 'var(--color-cinnabar)' : 'rgba(107, 142, 35, 0.12)',
                color: changedConclusion ? '#fff7e6' : '#6B8E23',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              最终结论：{rawConclusion}
            </span>
          </div>

          {/* 中：关系修正项列表（按 助身 → 克泄 → 中性 分组） */}
          {items.length > 0 ? (
            <div className="space-y-3 mb-3">
              {(['助身', '克泄', '中性'] as const).map((effect) => {
                const list = grouped[effect];
                if (list.length === 0) return null;
                const c = EFFECT_STYLE[effect];
                return (
                  <div key={effect}>
                    <div
                      className="font-classic text-xs mb-1.5 flex items-center gap-2"
                      style={{ color: c.main, letterSpacing: '0.1em' }}
                    >
                      <span style={{ fontSize: 14 }}>{c.icon}</span>
                      <span>{effect}</span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}
                      >
                        （{list.length} 项）
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {list.map((item, idx) => (
                        <RelationItemRow key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-ink-light)',
                fontStyle: 'italic',
                padding: '8px 12px',
                background: 'var(--color-paper-card-soft)',
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              · 原局四柱无显著合化、三合、六合或库冲关系，无需动态修正。
            </div>
          )}

          {/* 下：综合解读 */}
          <div
            className="font-classic"
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              color: 'var(--color-ink)',
              padding: '10px 14px',
              background: 'var(--color-paper-card-soft)',
              border: '1px dashed rgba(184, 134, 11, 0.35)',
              borderRadius: 4,
            }}
          >
            <span
              className="text-xs font-classic"
              style={{
                color: 'var(--color-gold)',
                letterSpacing: '0.1em',
                marginRight: 6,
                fontWeight: 700,
              }}
            >
              ⚑ 综合解读：
            </span>
            {summary}
          </div>
        </div>
      </div>
    </div>
  );
};

/** 单条关系修正项 */
const RelationItemRow: React.FC<{
  item: NonNullable<WangShuai['relationAdjustment']>['items'][number];
}> = ({ item }) => {
  const c = EFFECT_STYLE[item.effect];
  const w = STRENGTH_WEIGHT[item.strength];
  return (
    <div
      style={{
        background: c.bgSoft,
        border: `1px solid ${c.bg}`,
        borderLeft: `2px solid ${c.main}`,
        padding: '7px 12px',
        borderRadius: 3,
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="font-classic"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: c.main,
            letterSpacing: '0.03em',
          }}
        >
          {item.relation}
        </span>
        <span
          className="text-xs"
          style={{
            color: c.main,
            opacity: w.opacity,
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
          title={`强度：${item.strength}`}
        >
          {w.dot}
        </span>
        <span
          className="text-xs"
          style={{
            padding: '0 6px',
            borderRadius: 8,
            background: c.bg,
            color: c.main,
            opacity: 0.85,
          }}
        >
          {item.strength}
        </span>
      </div>
      <div
        className="mt-0.5"
        style={{ fontSize: 12.5, color: 'var(--color-ink-light)', lineHeight: 1.65 }}
      >
        {item.description}
      </div>
    </div>
  );
};

/** 旺衰判断推断链：印章式结论 + 公式条 + 古典数字步骤卡（重设计） */
export const WangShuaiChain: React.FC<{ data: WangShuai }> = ({ data }) => {
  // 综合步骤单独抽出（如果存在），其余作为推断步骤
  const reasoningSteps = data.steps.filter((s) => s.step !== '综合');
  const summaryStep = data.steps.find((s) => s.step === '综合');

  return (
    <div>
      {/* ① 顶部结论印章 */}
      <ConclusionSeal
        conclusion={data.conclusion}
        confidence={data.confidence}
        hasConvergence={!!data.convergence}
      />

      {/* ② 得分汇总公式条 */}
      {reasoningSteps.length > 0 && <ScoreFormula steps={reasoningSteps} />}

      {/* ③ 推断步骤卡片（古典数字纵向时间线） */}
      <div
        className="text-xs font-classic mb-3"
        style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.2em' }}
      >
        ◇ 推断过程（共 {reasoningSteps.length} 步）
      </div>
      <div>
        {reasoningSteps.map((step, idx) => (
          <StepCard
            key={idx}
            step={step}
            index={idx}
            isLast={idx === reasoningSteps.length - 1 && !summaryStep}
          />
        ))}
        {/* 综合步骤（如果存在）用特殊样式 */}
        {summaryStep && (
          <div className="relative flex" style={{ minHeight: 56 }}>
            <div className="flex flex-col items-center" style={{ width: 56, flexShrink: 0 }}>
              <div
                className="flex items-center justify-center font-classic"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--color-cinnabar)',
                  color: '#fff7e6',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 2px 8px rgba(184, 55, 47, 0.25)',
                }}
              >
                綜合
              </div>
            </div>
            <div
              className="flex-1 ml-3 mb-1 rounded-md"
              style={{
                background: 'rgba(184, 55, 47, 0.05)',
                border: '1px solid rgba(184, 55, 47, 0.15)',
                borderLeft: '3px solid var(--color-cinnabar)',
                padding: '12px 16px',
              }}
            >
              <h4
                className="font-classic m-0 mb-2"
                style={{ fontSize: 15, color: 'var(--color-cinnabar)', letterSpacing: '0.05em' }}
              >
                {pureTitle(summaryStep.title)}
              </h4>
              <ul
                className="m-0 pl-4 space-y-1"
                style={{ fontSize: 13.5, color: 'var(--color-ink-light)', lineHeight: 1.7 }}
              >
                {summaryStep.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ④ M2.7 新增：动态关系修正环节 */}
      {data.relationAdjustment && (
        <RelationAdjustmentSection
          adjustment={data.relationAdjustment}
          rawConclusion={data.conclusion}
        />
      )}

      {/* ⑤ 多法同断详情（如果存在） */}
      {data.convergence && (
        <div className="convergence-card mt-5 p-4 rounded">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="convergence-seal">多法同断</span>
            <span className="text-sm text-ink-light">
              {data.convergence.methods.length} 种方法共同印证
            </span>
          </div>
          {data.convergence.conclusion && (
            <div
              className="text-sm font-classic mb-2"
              style={{ color: 'var(--color-ink)', fontStyle: 'italic' }}
            >
              "{data.convergence.conclusion}"
            </div>
          )}
          <div className="convergence-methods">
            <ul>
              {data.convergence.methods.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
