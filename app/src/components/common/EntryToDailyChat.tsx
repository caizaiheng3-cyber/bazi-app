import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ClassicCard } from './ClassicCard';

/**
 * 报告底部 CTA 入口卡：引导用户从整体报告跳转到每日对话。
 * 放置在 ResultPage 末尾。
 */
export const EntryToDailyChat: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ClassicCard className="mt-12 text-center">
      <div
        className="font-classic text-2xl mb-2"
        style={{ color: 'var(--color-ink)' }}
      >
        📿 先生想每天为您解一事
      </div>
      <div className="text-ink-light text-sm mb-6 tracking-wide">
        · 决策建议 · 时机择吉 · 每日宜忌 · 开放问答 ·
      </div>
      <Button
        type="primary"
        size="large"
        onClick={() => navigate('/dashboard')}
      >
        开始每日对话 →
      </Button>
    </ClassicCard>
  );
};
