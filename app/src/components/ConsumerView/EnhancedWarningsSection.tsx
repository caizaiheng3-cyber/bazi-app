// ============================================================
// 「必须告诉你的事」警示段（带依据折叠的预警块）
//
// 数据来源：buildEnhancedWarnings(chart) → EnhancedWarning[]
//
// 视觉设计：
//   - 沿用 ClassicCard + classic-cloud-title + 朱砂/金/竹绿 三色调
//   - 三层折叠结构：
//     * 标题层（默认展开）：严重度色条 + 标题 + 一句话依据 + 缓解话
//     * 折叠 1：依据（命理 / 通俗 / 验证）
//     * 折叠 2：化解方案
//     * 折叠 3：历史回响（仅适用条目）
//
// 设计原则：
//   - 默认全部折叠（避免一进来视觉爆炸）
//   - 用户主动点击才展开（"我想知道为什么先生这么说"）
//   - 严重度用色条而不是色块（避免太刺激）
// ============================================================

import React, { useState } from 'react';
import { ClassicCard } from '../common/ClassicCard';
import type { EnhancedWarning } from '../../engine/consumerReportEnhancer/warningEnhancer';

/** 严重度的视觉映射 */
const SEVERITY_STYLE: Record<
  EnhancedWarning['severity'],
  { color: string; bg: string; barColor: string; label: string; icon: string }
> = {
  high: {
    color: '#C5392F',
    bg: 'rgba(197,57,47,0.06)',
    barColor: '#C5392F',
    label: '需要重点关注',
    icon: '⚠',
  },
  medium: {
    color: '#B8860B',
    bg: 'rgba(184,134,11,0.06)',
    barColor: '#B8860B',
    label: '值得留意',
    icon: '⚑',
  },
  low: {
    color: '#6B8E23',
    bg: 'rgba(107,142,35,0.06)',
    barColor: '#6B8E23',
    label: '温和提示',
    icon: '○',
  },
};

/** 领域 → emoji */
const DOMAIN_ICON: Record<EnhancedWarning['relatedDomain'], string> = {
  婚姻: '❤️',
  财富: '💰',
  事业: '📊',
  健康: '🌿',
  人际: '👥',
};

/** 单条预警卡片 */
const WarningCard: React.FC<{ warning: EnhancedWarning }> = ({ warning }) => {
  const [openEvidence, setOpenEvidence] = useState(false);
  const [openRemedies, setOpenRemedies] = useState(false);
  const [openEcho, setOpenEcho] = useState(false);

  const style = SEVERITY_STYLE[warning.severity];

  return (
    <div
      style={{
        background: style.bg,
        border: '1px solid rgba(212,200,168,0.5)',
        borderLeft: `4px solid ${style.barColor}`,
        borderRadius: 8,
        padding: '18px 20px',
        boxShadow: '0 1px 6px rgba(58,47,36,0.04)',
      }}
    >
      {/* 标题层 */}
      <div className="flex items-start gap-3 mb-2">
        <span
          className="font-classic flex-shrink-0"
          style={{
            color: style.color,
            fontSize: 18,
            lineHeight: 1.4,
            paddingTop: 2,
          }}
        >
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          {/* 标签行：领域 + 严重度 */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="font-classic"
              style={{
                color: style.color,
                fontSize: 12,
                background: 'var(--color-paper-card)',
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.05em',
                border: `1px solid ${style.color}30`,
              }}
            >
              {DOMAIN_ICON[warning.relatedDomain]} {warning.relatedDomain}
            </span>
            <span
              className="font-classic"
              style={{
                color: style.color,
                fontSize: 11,
                opacity: 0.8,
                letterSpacing: '0.05em',
              }}
            >
              {style.label}
            </span>
          </div>

          {/* 用户友好标题 */}
          <h4
            className="font-classic m-0 mb-2"
            style={{
              color: 'var(--color-ink)',
              fontSize: 15,
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            {warning.title}
          </h4>

          {/* 一句话依据（默认展开） */}
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-ink-light)',
              lineHeight: 1.7,
              padding: '8px 12px',
              background: 'rgba(255,247,230,0.6)',
              borderRadius: 4,
              marginBottom: 8,
            }}
          >
            <span
              className="font-classic"
              style={{ color: style.color, fontSize: 11, marginRight: 6 }}
            >
              依据
            </span>
            {warning.oneLineReason}
          </div>

          {/* 缓解话 */}
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-cinnabar)',
              lineHeight: 1.6,
              fontStyle: 'italic',
              fontFamily: '"Noto Serif SC", "Songti SC", serif',
              opacity: 0.85,
            }}
          >
            ☯ {warning.reassurance}
          </div>
        </div>
      </div>

      {/* 折叠按钮组 */}
      <div
        className="flex flex-wrap gap-2 mt-4 pt-3"
        style={{ borderTop: '1px dashed rgba(212,200,168,0.6)' }}
      >
        <FoldButton
          icon="📜"
          label={openEvidence ? '收起依据' : '看命理依据'}
          active={openEvidence}
          onClick={() => setOpenEvidence((v) => !v)}
          accent={style.color}
        />
        <FoldButton
          icon="💊"
          label={openRemedies ? '收起方案' : `看化解方案 (${warning.remedies.length})`}
          active={openRemedies}
          onClick={() => setOpenRemedies((v) => !v)}
          accent={style.color}
        />
        {warning.historicalEcho && (
          <FoldButton
            icon="🕰"
            label={openEcho ? '收起历史' : '看历史回响'}
            active={openEcho}
            onClick={() => setOpenEcho((v) => !v)}
            accent={style.color}
          />
        )}
      </div>

      {/* 折叠层 1：依据 */}
      {openEvidence && (
        <div
          className="mt-3 p-3"
          style={{
            background: 'rgba(255,247,230,0.7)',
            borderRadius: 6,
            border: '1px solid rgba(212,200,168,0.4)',
          }}
        >
          <div
            className="text-xs mb-2"
            style={{ color: 'var(--color-ink-light)', opacity: 0.7 }}
          >
            🔍 命中证据：{warning.evidence.matchedFrom}
          </div>
          {warning.evidence.translation ? (
            <div className="space-y-2">
              <EvidenceRow
                icon="📜"
                label="命理上"
                content={warning.evidence.translation.literal}
                accent="var(--color-gold)"
              />
              <EvidenceRow
                icon="💡"
                label="通俗讲"
                content={warning.evidence.translation.lifeAnalogy}
                accent="var(--color-ink)"
              />
              <EvidenceRow
                icon="🔁"
                label="验证方法"
                content={warning.evidence.translation.verifyHint}
                accent="var(--color-cinnabar)"
              />
            </div>
          ) : (
            <div className="text-xs text-ink-light italic">（暂无对应术语翻译）</div>
          )}
        </div>
      )}

      {/* 折叠层 2：化解方案 */}
      {openRemedies && (
        <div
          className="mt-3 p-3"
          style={{
            background: 'rgba(248,238,212,0.5)',
            borderRadius: 6,
            border: '1px solid rgba(212,200,168,0.4)',
          }}
        >
          <div className="space-y-2.5">
            {warning.remedies.map((r, i) => (
              <div
                key={i}
                className="flex gap-3"
                style={{
                  paddingBottom: 10,
                  borderBottom:
                    i < warning.remedies.length - 1
                      ? '1px dashed rgba(212,200,168,0.5)'
                      : 'none',
                }}
              >
                <span
                  className="font-classic flex-shrink-0"
                  style={{
                    color: style.color,
                    fontSize: 13,
                    width: 22,
                    height: 22,
                    border: `1px solid ${style.color}`,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-classic"
                    style={{
                      color: 'var(--color-ink)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    {r.action}
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color: 'var(--color-ink-light)',
                      lineHeight: 1.6,
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: 'var(--color-gold)' }}>原理：</span>
                    {r.reason}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--color-ink-light)', opacity: 0.8 }}
                  >
                    <span style={{ color: style.color }}>时机：</span>
                    {r.timing}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 折叠层 3：历史回响 */}
      {openEcho && warning.historicalEcho && (
        <div
          className="mt-3 p-3"
          style={{
            background: 'linear-gradient(135deg, rgba(184,134,11,0.08) 0%, rgba(248,238,212,0.6) 100%)',
            borderRadius: 6,
            border: '1px solid rgba(184,134,11,0.25)',
          }}
        >
          <div
            className="text-xs mb-2"
            style={{ color: 'var(--color-gold)', letterSpacing: '0.1em' }}
          >
            ━ 用你自己的过去验证 ━
          </div>
          <p
            className="leading-relaxed mb-3"
            style={{
              color: 'var(--color-ink)',
              fontSize: 14,
              fontFamily: '"Noto Serif SC", "Songti SC", serif',
            }}
          >
            {warning.historicalEcho.narrative}
          </p>
          {warning.historicalEcho.verifyPrompts.length > 0 && (
            <div
              className="space-y-1.5 pt-2"
              style={{ borderTop: '1px dashed rgba(184,134,11,0.25)' }}
            >
              {warning.historicalEcho.verifyPrompts.map((p, i) => (
                <div
                  key={i}
                  className="text-xs"
                  style={{
                    color: 'var(--color-ink-light)',
                    lineHeight: 1.6,
                    paddingLeft: 16,
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      color: 'var(--color-gold)',
                    }}
                  >
                    💭
                  </span>
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** 折叠触发按钮 */
const FoldButton: React.FC<{
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  accent: string;
}> = ({ icon, label, active, onClick, accent }) => (
  <button
    type="button"
    onClick={onClick}
    className="font-classic"
    style={{
      fontSize: 12,
      padding: '5px 12px',
      border: `1px solid ${accent}${active ? '' : '40'}`,
      background: active ? `${accent}15` : 'transparent',
      color: accent,
      borderRadius: 4,
      cursor: 'pointer',
      letterSpacing: '0.05em',
      transition: 'all 0.2s',
    }}
  >
    <span style={{ marginRight: 4 }}>{icon}</span>
    {label}
  </button>
);

/** 依据三段式的单行 */
const EvidenceRow: React.FC<{
  icon: string;
  label: string;
  content: string;
  accent: string;
}> = ({ icon, label, content, accent }) => (
  <div className="flex gap-2">
    <span
      className="flex-shrink-0 font-classic"
      style={{ fontSize: 12, color: accent, width: 60 }}
    >
      {icon} {label}
    </span>
    <span
      className="flex-1 text-sm"
      style={{
        color: 'var(--color-ink)',
        lineHeight: 1.7,
        fontFamily: '"Noto Serif SC", "Songti SC", serif',
      }}
    >
      {content}
    </span>
  </div>
);

// ============================================================
// 主入口：警示段
// ============================================================

interface EnhancedWarningsSectionProps {
  warnings: EnhancedWarning[];
}

export const EnhancedWarningsSection: React.FC<EnhancedWarningsSectionProps> = ({
  warnings,
}) => {
  // 没有任何预警时不渲染（避免空段落）
  if (warnings.length === 0) return null;

  // 按严重度分组用于头部摘要
  const counts = {
    high: warnings.filter((w) => w.severity === 'high').length,
    medium: warnings.filter((w) => w.severity === 'medium').length,
    low: warnings.filter((w) => w.severity === 'low').length,
  };

  return (
    <>
      {/* 居中云纹标题 */}
      <div className="classic-cloud-title">
        <span className="cloud-mark">☁</span>
        <span>必 须 告 诉 你 的 事</span>
        <span className="cloud-mark">☁</span>
      </div>

      <ClassicCard>
        {/* 段落引言 + 摘要 */}
        <div className="mb-5">
          <p
            className="leading-relaxed mb-2"
            style={{
              color: 'var(--color-ink)',
              fontSize: 14,
              fontFamily: '"Noto Serif SC", "Songti SC", serif',
            }}
          >
            以下 <span style={{ color: 'var(--color-cinnabar)', fontWeight: 600 }}>
              {warnings.length}
            </span> 件事，是从你的命局里能看到、值得提前知道的。
            <br />
            <span style={{ color: 'var(--color-ink-light)', fontSize: 13 }}>
              点开折叠可以看「先生为什么这么说」与具体的化解方案。
            </span>
          </p>
          {/* 严重度统计 */}
          <div className="flex flex-wrap gap-3 mt-3">
            {counts.high > 0 && (
              <SummaryChip color="#C5392F" icon="⚠" label="重点关注" count={counts.high} />
            )}
            {counts.medium > 0 && (
              <SummaryChip color="#B8860B" icon="⚑" label="值得留意" count={counts.medium} />
            )}
            {counts.low > 0 && (
              <SummaryChip color="#6B8E23" icon="○" label="温和提示" count={counts.low} />
            )}
          </div>
        </div>

        {/* 预警卡片列表 */}
        <div className="space-y-4">
          {warnings.map((w, i) => (
            <WarningCard key={i} warning={w} />
          ))}
        </div>

        {/* 段尾小注 */}
        <div
          className="text-center mt-5 pt-4"
          style={{
            borderTop: '1px dashed rgba(212,200,168,0.6)',
            color: 'var(--color-ink-light)',
            fontSize: 12,
            fontStyle: 'italic',
          }}
        >
          所有结论均来自命局推导 · 化解方案为传统命理建议，仅供参考
        </div>
      </ClassicCard>
    </>
  );
};

/** 头部严重度统计芯片 */
const SummaryChip: React.FC<{
  color: string;
  icon: string;
  label: string;
  count: number;
}> = ({ color, icon, label, count }) => (
  <div
    className="flex items-center gap-1.5"
    style={{
      padding: '4px 10px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 14,
      fontSize: 12,
      color,
    }}
  >
    <span>{icon}</span>
    <span className="font-classic">{label}</span>
    <span style={{ fontWeight: 600 }}>{count}</span>
  </div>
);
