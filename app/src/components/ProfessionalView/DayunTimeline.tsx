import React, { useState } from 'react';
import type { DaYun, DaYunFlow, DaYunRelation, LiuNianHint } from '../../types/bazi';

/**
 * 大运五行角色 → 颜色映射
 * 用神/喜神 = 暖色（朱砂红/金）
 * 忌神/仇神 = 冷色（青墨/灰）
 * 闲神 = 中性色
 */
const ROLE_STYLE: Record<DaYunFlow['wuxingRole'], { main: string; bg: string; border: string; label: string }> = {
  用神: { main: '#C5392F', bg: 'rgba(197, 57, 47, 0.10)', border: 'rgba(197, 57, 47, 0.45)', label: '黄金运' },
  喜神: { main: '#D97A1F', bg: 'rgba(217, 122, 31, 0.10)', border: 'rgba(217, 122, 31, 0.40)', label: '吉运' },
  闲神: { main: '#B8860B', bg: 'rgba(184, 134, 11, 0.08)', border: 'rgba(184, 134, 11, 0.35)', label: '平稳' },
  仇神: { main: '#5A6B7A', bg: 'rgba(90, 107, 122, 0.10)', border: 'rgba(90, 107, 122, 0.40)', label: '不利' },
  忌神: { main: '#4A4A4A', bg: 'rgba(74, 74, 74, 0.10)', border: 'rgba(74, 74, 74, 0.45)', label: '需防' },
};

/** 流年事件 → emoji + 颜色 */
const EVENT_STYLE: Record<LiuNianHint['eventType'], { icon: string; color: string }> = {
  伏吟:     { icon: '↻', color: '#C5392F' },
  反吟:     { icon: '⚡', color: '#C5392F' },
  岁运并临: { icon: '⚠', color: '#C5392F' },
  填实空亡: { icon: '✨', color: '#6B8E23' },
  加倍填空: { icon: '✨✨', color: '#6B8E23' },
  流年合日支: { icon: '♥', color: '#D97A1F' },
  流年合大运: { icon: '⊕', color: '#B8860B' },
  用神年:   { icon: '✓', color: '#6B8E23' },
  忌神年:   { icon: '✗', color: '#5A6B7A' },
};

/** 关系 kind → emoji 图标 */
function kindIcon(kind: DaYunRelation['kind']): string {
  const map: Record<DaYunRelation['kind'], string> = {
    大运填实空亡: '✨',
    大运反吟: '⚡',
    大运伏吟: '↻',
    大运合化: '⊕',
    大运合而不化: '○',
    大运天干相冲: '⚔',
    大运地支三合: '⊕',
    大运地支半三合: '◐',
    大运地支六合: '♥',
    大运地支六冲: '⚔',
    大运地支三刑: '⚠',
    大运地支暗合: '◈',
  };
  return map[kind] ?? '·';
}

/** 大运时间轴：横向滚动 + 每运可展开"动态作用"详情 */
export const DayunTimeline: React.FC<{ daYuns: DaYun[]; startAge: string; direction: string }> = ({
  daYuns,
  startAge,
  direction,
}) => {
  // 当前展开的大运索引（点击卡片切换）
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div>
      <div className="text-sm text-ink-light mb-3">
        起运信息：{startAge} · 大运{direction} · <span className="text-gold">点击大运卡片可展开"动态作用"详情</span>
      </div>
      <div className="relative">
        {/* 主时间轴线 */}
        <div className="absolute left-0 right-0 top-12 h-0.5 bg-gradient-to-r from-cinnabar/40 via-gold/40 to-cinnabar/40" />
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {daYuns.map((dy) => {
              const flow = dy.flowAnalysis;
              const role = flow?.wuxingRole;
              const style = role ? ROLE_STYLE[role] : ROLE_STYLE.闲神;
              const isExpanded = expandedIndex === dy.index;
              return (
                <div key={dy.index} className="w-44 flex-shrink-0 relative">
                  <div className="text-center">
                    <div className="text-xs text-ink-light h-4">{dy.startYear}</div>
                    <div className="font-classic text-2xl text-cinnabar leading-tight pt-1 pb-2 relative">
                      {dy.ganZhi}
                      {/* 时间轴节点 */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 rounded-full border-2 border-paper"
                        style={{ background: style.main }}
                      />
                    </div>
                  </div>
                  <div
                    className="mt-4 p-2 rounded text-center cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      borderLeft: `3px solid ${style.main}`,
                      transform: isExpanded ? 'translateY(-2px)' : 'none',
                    }}
                    onClick={() => setExpandedIndex(isExpanded ? null : dy.index)}
                  >
                    <div className="text-xs text-ink-light mb-0.5">
                      {dy.startAge}-{dy.startAge + 9} 岁
                    </div>
                    <div className="text-xs text-gold mb-1">{dy.shiShen}</div>
                    {/* M2.8：用神角色 + 评分 */}
                    {flow && (
                      <>
                        <div
                          className="font-classic text-xs mb-1 mt-1"
                          style={{ color: style.main, fontWeight: 600, letterSpacing: '0.05em' }}
                        >
                          {role}·{style.label}
                        </div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span style={{ color: style.main, fontSize: 11, letterSpacing: '0.1em' }}>
                            {'★'.repeat(flow.score)}
                            <span style={{ opacity: 0.3 }}>{'☆'.repeat(5 - flow.score)}</span>
                          </span>
                        </div>
                        {/* 关键事件 emoji 一字排开 */}
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {flow.fillsXunKong.length > 0 && (
                            <span title="填实空亡" style={{ fontSize: 13 }}>
                              ✨
                            </span>
                          )}
                          {flow.relations.some((r) => r.kind === '大运反吟') && (
                            <span title="反吟冲日" style={{ fontSize: 13 }}>
                              ⚡
                            </span>
                          )}
                          {flow.relations.some((r) => r.kind === '大运合化') && (
                            <span title="大运合化" style={{ fontSize: 13 }}>
                              ⊕
                            </span>
                          )}
                          {flow.relations.some((r) => r.kind === '大运地支三合') && (
                            <span title="三合成局" style={{ fontSize: 13 }}>
                              ◉
                            </span>
                          )}
                          {flow.relations.some((r) => r.kind === '大运地支三刑') && (
                            <span title="三刑见动" style={{ fontSize: 13 }}>
                              ⚠
                            </span>
                          )}
                          {flow.relations.some((r) => r.kind === '大运伏吟') && (
                            <span title="伏吟" style={{ fontSize: 13 }}>
                              ↻
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {!flow && (
                      <div className="text-xs text-ink leading-snug">{dy.brief}</div>
                    )}
                    {/* 折叠箭头 */}
                    {flow && (
                      <div
                        className="text-xs mt-1"
                        style={{ color: style.main, opacity: 0.6 }}
                      >
                        {isExpanded ? '▲ 收起' : '▼ 详情'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 展开的大运详情面板 */}
        {expandedIndex !== null && (() => {
          const dy = daYuns.find((d) => d.index === expandedIndex);
          if (!dy?.flowAnalysis) return null;
          return (
            <DaYunFlowDetail
              daYun={dy}
              flow={dy.flowAnalysis}
              onClose={() => setExpandedIndex(null)}
            />
          );
        })()}
      </div>
    </div>
  );
};

/**
 * 单步大运的"动态作用"详情面板
 * 展示：summary / 与原局关系 / 填实空亡 / 关键流年
 */
const DaYunFlowDetail: React.FC<{
  daYun: DaYun;
  flow: DaYunFlow;
  onClose: () => void;
}> = ({ daYun, flow, onClose }) => {
  const style = ROLE_STYLE[flow.wuxingRole];

  return (
    <div
      className="mt-5 rounded-md"
      style={{
        background: 'var(--color-paper-card-soft)',
        border: `1px solid ${style.border}`,
        borderLeft: `3px solid ${style.main}`,
        padding: '14px 16px',
      }}
    >
      {/* 顶部：标题 + 关闭 */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="font-classic"
            style={{ fontSize: 20, fontWeight: 700, color: style.main, letterSpacing: '0.05em' }}
          >
            第{daYun.index}步 · {daYun.ganZhi}
          </span>
          <span
            className="text-sm"
            style={{ color: 'var(--color-ink-light)' }}
          >
            {daYun.startAge}-{daYun.startAge + 9}虚岁 · {daYun.startYear}-{daYun.endYear}
          </span>
          <span
            className="font-classic text-xs"
            style={{
              padding: '2px 10px',
              borderRadius: 10,
              background: style.bg,
              border: `1px solid ${style.border}`,
              color: style.main,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            {flow.wuxingRole}·{style.label}
          </span>
          <span style={{ color: style.main, fontSize: 13, letterSpacing: '0.1em' }}>
            {'★'.repeat(flow.score)}
            <span style={{ opacity: 0.3 }}>{'☆'.repeat(5 - flow.score)}</span>
          </span>
        </div>
        <button
          className="text-xs"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
            padding: '4px 10px',
            borderRadius: 4,
            color: 'var(--color-ink-light)',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          ✕ 收起
        </button>
      </div>

      {/* 一句话总结 */}
      <div
        className="font-classic mb-4"
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: 'var(--color-ink)',
          padding: '10px 14px',
          background: 'rgba(184, 134, 11, 0.04)',
          border: '1px dashed rgba(184, 134, 11, 0.35)',
          borderRadius: 4,
        }}
      >
        <span style={{ color: 'var(--color-gold)', fontWeight: 700, marginRight: 6 }}>⚑</span>
        {flow.summary}
      </div>

      {/* 双栏：左=与原局关系 + 填实空亡，右=关键流年 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左：与原局关系 */}
        <div>
          <div
            className="font-classic mb-2"
            style={{ fontSize: 13, color: 'var(--color-ink)', letterSpacing: '0.1em' }}
          >
            <span style={{ color: 'var(--color-gold)' }}>◇</span> 与原局动态作用
            <span className="text-xs ml-1" style={{ color: 'var(--color-ink-soft)' }}>
              （{flow.relations.length} 项）
            </span>
          </div>
          {flow.relations.length === 0 ? (
            <div
              className="text-sm"
              style={{
                color: 'var(--color-ink-light)',
                fontStyle: 'italic',
                padding: '8px 12px',
                background: 'var(--color-paper-card-soft)',
                borderRadius: 4,
              }}
            >
              · 此运与原局无显著合冲刑害作用，命局结构平稳。
            </div>
          ) : (
            <div className="space-y-1.5">
              {flow.relations.map((r, i) => (
                <RelationRow key={i} relation={r} />
              ))}
            </div>
          )}
        </div>

        {/* 右：关键流年 */}
        <div>
          <div
            className="font-classic mb-2"
            style={{ fontSize: 13, color: 'var(--color-ink)', letterSpacing: '0.1em' }}
          >
            <span style={{ color: 'var(--color-gold)' }}>◇</span> 关键流年
            <span className="text-xs ml-1" style={{ color: 'var(--color-ink-soft)' }}>
              （{flow.keyLiuNian.length} 个最重要事件年）
            </span>
          </div>
          {flow.keyLiuNian.length === 0 ? (
            <div
              className="text-sm"
              style={{
                color: 'var(--color-ink-light)',
                fontStyle: 'italic',
                padding: '8px 12px',
                background: 'var(--color-paper-card-soft)',
                borderRadius: 4,
              }}
            >
              · 此运 10 年内无显著事件年，按用神/忌神基准评估即可。
            </div>
          ) : (
            <div className="space-y-1.5">
              {flow.keyLiuNian.map((ln, i) => (
                <LiuNianRow key={i} liuNian={ln} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** 单条关系行 */
const RelationRow: React.FC<{ relation: DaYunRelation }> = ({ relation }) => {
  const POS_LABEL = ['年', '月', '日', '时'];
  const strengthColor =
    relation.strength === 'strong' ? 'var(--color-cinnabar)' :
    relation.strength === 'medium' ? 'var(--color-gold)' :
    'var(--color-ink-soft)';
  return (
    <div
      style={{
        background: 'var(--color-paper-card-soft)',
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
        borderLeft: `2px solid ${strengthColor}`,
        padding: '7px 10px',
        borderRadius: 3,
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span style={{ fontSize: 14 }}>{kindIcon(relation.kind)}</span>
        <span
          className="font-classic"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}
        >
          {relation.kind}
        </span>
        <span
          className="text-xs"
          style={{
            color: strengthColor,
            border: `1px solid ${strengthColor}`,
            padding: '0 6px',
            borderRadius: 8,
            opacity: 0.85,
          }}
        >
          → {POS_LABEL[relation.withPos]}柱
        </span>
        {relation.hua && (
          <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
            化{relation.hua}
          </span>
        )}
      </div>
      <div
        style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--color-ink-light)' }}
      >
        {relation.description}
      </div>
    </div>
  );
};

/** 单条流年行 */
const LiuNianRow: React.FC<{ liuNian: LiuNianHint }> = ({ liuNian }) => {
  const evt = EVENT_STYLE[liuNian.eventType];
  const tendencyBg =
    liuNian.tendency === 'auspicious' ? 'rgba(107, 142, 35, 0.06)' :
    liuNian.tendency === 'inauspicious' ? 'rgba(197, 57, 47, 0.06)' :
    'var(--color-paper-card-soft)';
  return (
    <div
      style={{
        background: tendencyBg,
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
        borderLeft: `2px solid ${evt.color}`,
        padding: '7px 10px',
        borderRadius: 3,
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span style={{ fontSize: 14 }}>{evt.icon}</span>
        <span
          className="font-classic"
          style={{ fontSize: 13, fontWeight: 700, color: evt.color, letterSpacing: '0.03em' }}
        >
          {liuNian.year}年 · {liuNian.ganZhi}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          {liuNian.age}岁
        </span>
        <span
          className="text-xs font-classic"
          style={{
            padding: '1px 6px',
            borderRadius: 8,
            background: evt.color,
            color: '#fff7e6',
            opacity: 0.9,
            fontWeight: 600,
          }}
        >
          {liuNian.eventType}
        </span>
      </div>
      <div
        style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--color-ink-light)' }}
      >
        {liuNian.description}
      </div>
    </div>
  );
};
