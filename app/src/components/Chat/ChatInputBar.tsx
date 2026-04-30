import React, { useEffect, useRef } from 'react';
import { Input, Button, Dropdown } from 'antd';
import type { InputRef } from 'antd';
import type { AskScene } from '../../types/bazi';

interface Props {
  scene: AskScene;
  onSceneChange: (s: AskScene) => void;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading?: boolean;
  /** 外部触发聚焦（如点击"追问"时） */
  focusSignal?: number;
  placeholder?: string;
}

const SCENES: Array<{ key: AskScene; label: string }> = [
  { key: '决策', label: '🤔 决策' },
  { key: '择吉', label: '📅 择吉' },
  { key: '宜忌', label: '☀ 宜忌' },
  { key: '开放', label: '💬 开放' },
];

/**
 * 底部输入栏：场景下拉 + 输入框 + 发送按钮。
 * 支持 Enter 发送、Shift+Enter 换行。
 */
export const ChatInputBar: React.FC<Props> = ({
  scene,
  onSceneChange,
  value,
  onChange,
  onSend,
  loading,
  focusSignal,
  placeholder = '您想问什么？',
}) => {
  const inputRef = useRef<InputRef>(null);
  const currentLabel = SCENES.find((s) => s.key === scene)?.label ?? '🤔 决策';

  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) onSend();
    }
  };

  return (
    <div
      className="sticky bottom-0 border-t"
      style={{
        background: 'rgba(245, 239, 224, 0.96)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-2">
        <Dropdown
          trigger={['click']}
          menu={{
            items: SCENES.map((s) => ({
              key: s.key,
              label: s.label,
              onClick: () => onSceneChange(s.key),
            })),
            selectedKeys: [scene],
          }}
        >
          <button
            className="font-classic"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 16px',
              fontSize: 15,
              letterSpacing: '0.08em',
              borderRadius: 24,
              cursor: 'pointer',
              background: 'rgba(184, 55, 47, 0.06)',
              color: 'var(--color-cinnabar)',
              border: '1px solid rgba(184, 55, 47, 0.2)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {currentLabel} <span style={{ fontSize: 10 }}>▼</span>
          </button>
        </Dropdown>

        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 8,
            border: '1px solid var(--color-border-soft)',
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
          }}
        />

        <button
          onClick={onSend}
          disabled={loading || !value.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 24px',
            fontSize: 16,
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: '#fff7e6',
            background: loading || !value.trim()
              ? 'rgba(184, 55, 47, 0.4)'
              : 'linear-gradient(135deg, #b8372f 0%, #9a2a24 100%)',
            border: 'none',
            borderRadius: 8,
            cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
            boxShadow: loading || !value.trim()
              ? 'none'
              : '0 2px 8px rgba(184, 55, 47, 0.3)',
            whiteSpace: 'nowrap',
            minWidth: 80,
          }}
        >
          请 教
        </button>
      </div>
    </div>
  );
};
