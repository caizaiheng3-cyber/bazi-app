import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DailyDashboard } from '../../types/bazi';

interface Props {
  quickScenes: DailyDashboard['quickScenes'];
}

/**
 * 4 类场景快捷入口卡片网格。
 * 点击跳转 ChatPage 并预填场景（query: ?scene=xxx）。
 */
export const SceneQuickGrid: React.FC<Props> = ({ quickScenes }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quickScenes.map((s) => (
        <button
          key={s.scene}
          onClick={() =>
            navigate(`/chat?scene=${encodeURIComponent(s.scene)}`)
          }
          className="classic-card transition-transform hover:-translate-y-0.5 text-center"
          style={{
            padding: '20px 14px',
            cursor: 'pointer',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <div
            className="mx-auto mb-3 flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(184,55,47,0.10) 0%, rgba(184,55,47,0.04) 70%, transparent 100%)',
              border: '1px solid rgba(184, 55, 47, 0.2)',
              fontSize: 26,
            }}
          >
            {s.icon}
          </div>
          <div
            className="font-classic"
            style={{
              color: 'var(--color-ink)',
              fontSize: 16,
              letterSpacing: '0.15em',
              marginBottom: 4,
            }}
          >
            {s.label}
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--color-ink-light)', lineHeight: 1.5 }}
          >
            {s.placeholder}
          </div>
        </button>
      ))}
    </div>
  );
};
