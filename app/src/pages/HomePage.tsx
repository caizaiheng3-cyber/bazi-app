import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InputForm } from '../components/InputForm/InputForm';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="page-paper" style={{ minHeight: '100vh', paddingTop: 48, paddingBottom: 40 }}>
      {/* 顶部 logo：方印 + 大标题 + 副标题 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        {/* 命字方形篆印：红底白字，双线内框 */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            backgroundColor: '#b8372f',
            color: '#fff7e6',
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            fontSize: 34,
            fontWeight: 700,
            borderRadius: 6,
            boxShadow:
              'inset 0 0 0 2px rgba(255, 247, 230, 0.4), inset 0 0 0 4px rgba(184, 55, 47, 0.8), 0 4px 12px rgba(184, 55, 47, 0.3)',
            marginBottom: 20,
          }}
        >
          命
        </div>
        <h1
          style={{
            fontFamily: '"Noto Serif SC", "Songti SC", STSong, serif',
            fontSize: 42,
            color: '#3a2f24',
            letterSpacing: '0.5em',
            lineHeight: 1.2,
            margin: 0,
            fontWeight: 600,
          }}
        >
          子 平 命 鉴
        </h1>
        <div
          style={{
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            fontSize: 15,
            color: '#6b5a48',
            letterSpacing: '0.4em',
            marginTop: 12,
          }}
        >
          — 知 命 而 不 困 于 命 —
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#8a7a66',
            marginTop: 12,
            letterSpacing: '0.15em',
          }}
        >
          输入你的出生信息，开启一次关于自己的推演
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <InputForm onSubmit={() => navigate('/chart')} />
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          marginTop: 40,
          color: '#8a7a66',
          letterSpacing: '0.25em',
        }}
      >
        八字推盘 · 命理推断 · 趋吉避凶 · 知命从容
      </div>
    </div>
  );
};
