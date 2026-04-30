import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'antd';

/**
 * Dashboard 底部"和先生说点什么……"输入条（对标设计稿 03）。
 * 点击/输入后跳转 ChatPage 带问题预填。
 */
export const AskInputBar: React.FC = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const submit = () => {
    const q = value.trim();
    const url = q ? `/chat?question=${encodeURIComponent(q)}` : '/chat';
    navigate(url);
  };

  return (
    <div
      className="classic-card flex items-center gap-2"
      style={{ padding: '10px 14px' }}
    >
      <span style={{ fontSize: 18 }}>💭</span>
      <Input
        variant="borderless"
        placeholder="和先生说点什么……"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={submit}
        style={{
          flex: 1,
          fontFamily: '"Noto Serif SC", "Songti SC", serif',
        }}
      />
      <button
        onClick={submit}
        style={{
          padding: '6px 20px',
          fontSize: 15,
          fontFamily: '"Noto Serif SC", "Songti SC", serif',
          fontWeight: 600,
          letterSpacing: '0.3em',
          color: '#fff7e6',
          background: 'linear-gradient(135deg, #b8372f 0%, #9a2a24 100%)',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(184, 55, 47, 0.25)',
        }}
      >
        请教
      </button>
    </div>
  );
};
