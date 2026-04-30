import React from 'react';
import { Dropdown } from 'antd';
import type { AskScene } from '../../types/bazi';

interface Props {
  scene: AskScene;
  onSceneChange: (s: AskScene) => void;
  /** 当日干支提示（如：丁酉日 · 您日主丙火喜木火忌金水） */
  dayHint?: string;
}

const SCENE_OPTIONS: Array<{ key: AskScene; label: string; icon: string }> = [
  { key: '决策', label: '决策建议', icon: '🤔' },
  { key: '择吉', label: '时机择吉', icon: '📅' },
  { key: '宜忌', label: '每日宜忌', icon: '☀' },
  { key: '开放', label: '开放问答', icon: '💬' },
];

/** 顶部场景条：下拉场景选择 + 当日干支提示（对标设计稿 04-chat） */
export const ChatHeaderBar: React.FC<Props> = ({
  scene,
  onSceneChange,
  dayHint,
}) => {
  const currentOption = SCENE_OPTIONS.find((o) => o.key === scene) ?? SCENE_OPTIONS[0];

  return (
    <div
      className="sticky z-10 border-b"
      style={{
        top: 56,
        background: 'rgba(245, 236, 215, 0.94)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* 场景选择：下拉菜单 */}
        <div className="flex items-center gap-3">
          <span
            className="font-classic"
            style={{
              fontSize: 14,
              color: 'var(--color-ink-light)',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            ☁ 当前场景：
          </span>
          <Dropdown
            trigger={['click']}
            menu={{
              items: SCENE_OPTIONS.map((o) => ({
                key: o.key,
                label: (
                  <span style={{ letterSpacing: '0.05em' }}>
                    {o.icon} {o.label}
                  </span>
                ),
                onClick: () => onSceneChange(o.key),
              })),
              selectedKeys: [scene],
            }}
          >
            <button
              className="font-classic"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 16px',
                fontSize: 15,
                letterSpacing: '0.08em',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'rgba(184, 55, 47, 0.06)',
                color: 'var(--color-cinnabar)',
                border: '1px solid rgba(184, 55, 47, 0.25)',
                fontWeight: 600,
              }}
            >
              <span>{currentOption.icon}</span>
              <span>{currentOption.label}</span>
              <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
            </button>
          </Dropdown>
        </div>
        {dayHint && (
          <div
            className="text-xs mt-2 leading-relaxed"
            style={{ color: 'var(--color-ink-light)', letterSpacing: '0.05em' }}
          >
            {dayHint}
          </div>
        )}
      </div>
    </div>
  );
};
