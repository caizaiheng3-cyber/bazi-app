import React from 'react';
import { ClassicCard } from '../common/ClassicCard';
import type { DailyFortune } from '../../types/bazi';

/** 宜忌 icon 映射 */
const YI_ICONS: Record<string, string> = {
  见客: '👤', 签约: '🤝', 出行: '🧳', 处理财务: '💰',
  开会: '📋', 谈判: '🗣', 求学: '📚', 面试: '👔',
  求财: '🪙', 祭祀: '🕯', 婚恋: '💍', 搬家: '📦',
};
const JI_ICONS: Record<string, string> = {
  夜宴: '🍷', 与人争辩: '💢', 过度劳神: '🧠',
  投资: '📉', 远行: '🚫', 动土: '⛏', 手术: '🏥',
  借贷: '💸', 熬夜: '🌙', 冒险: '⚠',
};

interface Props {
  fortune: DailyFortune;
}

/** 今日宜忌卡（对标设计稿 03-dashboard：大号干支 + 圆形icon横排 + 吉时菱形轴） */
export const TodayFortuneCard: React.FC<Props> = ({ fortune }) => {
  return (
    <ClassicCard
      style={{
        padding: 28,
        backgroundImage: 'url(/images/mountain-header.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 半透明遮罩确保文字可读 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(251, 243, 223, 0.88)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* 顶部：左侧日期 + 右侧大号干支 */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 18 }}>📜</span>
              <span
                className="font-classic"
                style={{ fontSize: 18, color: 'var(--color-ink)', letterSpacing: '0.1em' }}
              >
                {fortune.date}
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
              {fortune.lunarDate}
            </div>
            {/* 一句话概括（朱砂引文） */}
            <blockquote
              className="mt-4 px-4 py-3 leading-relaxed"
              style={{
                background: 'rgba(184, 55, 47, 0.05)',
                borderLeft: '3px solid var(--color-cinnabar)',
                fontFamily: '"Noto Serif SC", "Songti SC", serif',
                color: 'var(--color-ink)',
                fontSize: 15,
                margin: 0,
                maxWidth: 320,
              }}
            >
              「{fortune.summary}」
            </blockquote>
          </div>

          {/* 右侧大号干支 */}
          <div className="text-right">
            <div
              className="font-classic"
              style={{
                fontSize: 48,
                color: 'var(--color-cinnabar)',
                letterSpacing: '0.15em',
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {fortune.ganZhi}日
            </div>
            <div
              className="font-classic mt-2 inline-block"
              style={{
                padding: '3px 14px',
                fontSize: 13,
                color: 'var(--color-cinnabar)',
                background: 'rgba(184, 55, 47, 0.08)',
                border: '1px solid rgba(184, 55, 47, 0.2)',
                borderRadius: 999,
                letterSpacing: '0.1em',
              }}
            >
              {fortune.shiShen} · {fortune.scoreLabel}
            </div>
          </div>
        </div>

        {/* 宜忌：圆形icon横排（对标设计稿） */}
        <div className="flex flex-wrap items-start gap-8 mt-4">
          {/* 宜 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center justify-center font-classic"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--color-cinnabar)',
                color: '#fff7e6',
                fontSize: 24,
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(184, 55, 47, 0.25)',
              }}
            >
              宜
            </div>
            {fortune.shiYi.map((item) => (
              <div key={item} className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(184, 55, 47, 0.06)',
                    border: '1px solid rgba(184, 55, 47, 0.15)',
                    fontSize: 20,
                  }}
                >
                  {YI_ICONS[item] ?? '✨'}
                </div>
                <span className="text-xs font-classic" style={{ color: 'var(--color-ink)' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* 忌 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center justify-center font-classic"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(58, 47, 36, 0.75)',
                color: '#fff7e6',
                fontSize: 24,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              忌
            </div>
            {fortune.jiHui.map((item) => (
              <div key={item} className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(58, 47, 36, 0.05)',
                    border: '1px solid rgba(58, 47, 36, 0.15)',
                    fontSize: 20,
                  }}
                >
                  {JI_ICONS[item] ?? '🚫'}
                </div>
                <span className="text-xs font-classic" style={{ color: 'var(--color-ink-light)' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 吉时时间轴（菱形标记 + 横线，对标设计稿） */}
        <div className="mt-6">
          <div
            className="font-classic mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-ink)', fontSize: 14, letterSpacing: '0.15em' }}
          >
            <span>吉 时</span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(90deg, var(--color-border), transparent)',
                marginLeft: 8,
              }}
            />
          </div>
          <div className="relative" style={{ padding: '8px 0' }}>
            {/* 横线 */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, rgba(184,55,47,0.15), var(--color-gold), rgba(184,55,47,0.15))',
              }}
            />
            {/* 菱形标记 + 文字 */}
            <div className="flex items-center justify-around relative">
              {fortune.jiShi.map((t, index) => (
                <div key={t.range} className="flex flex-col items-center">
                  {/* 菱形 */}
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      background: index === 0 ? 'var(--color-cinnabar)' : 'var(--color-gold)',
                      transform: 'rotate(45deg)',
                      marginBottom: 8,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  />
                  <div
                    className="font-classic text-center"
                    style={{
                      color: index === 0 ? 'var(--color-cinnabar)' : 'var(--color-gold)',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {t.range}
                  </div>
                  <div
                    className="text-center text-xs mt-1"
                    style={{ color: 'var(--color-ink-light)', maxWidth: 160 }}
                  >
                    {t.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClassicCard>
  );
};
