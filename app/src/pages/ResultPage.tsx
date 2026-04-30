import React from 'react';
import { Segmented, Button, Tooltip, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useBaziStore } from '../store/useBaziStore';
import { ProfessionalView } from '../components/ProfessionalView/ProfessionalView';
import { ConsumerView } from '../components/ConsumerView/ConsumerView';
import { EntryToDailyChat } from '../components/common/EntryToDailyChat';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const baziChart = useBaziStore((s) => s.baziChart);
  const consumerReport = useBaziStore((s) => s.consumerReport);
  const viewMode = useBaziStore((s) => s.viewMode);
  const setViewMode = useBaziStore((s) => s.setViewMode);

  if (!baziChart || !consumerReport) {
    return (
      <div className="page-paper py-20 text-center">
        <Empty description="尚未有排盘数据" />
        <Button type="primary" className="mt-4" onClick={() => navigate('/onboarding')}>
          去填入八字
        </Button>
      </div>
    );
  }

  // 有命盘 → 视为老用户，返回按钮指向 Dashboard；否则回到输入页
  const handleBack = () => {
    navigate(baziChart ? '/dashboard' : '/onboarding');
  };

  return (
    <div className="page-paper">
      {/* 顶部固定操作栏：视角切换 + 返回 */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md border-b border-border-classic"
        style={{ background: 'rgba(245, 239, 224, 0.92)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button type="text" onClick={handleBack} className="text-ink-light">
            ← 返回每日
          </Button>
          <div className="flex items-center gap-3">
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as 'professional' | 'consumer')}
              options={[
                { label: '🔍 专业模式', value: 'professional' },
                { label: '📖 消费者模式', value: 'consumer' },
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Tooltip title="MVP 阶段：仅原型展示">
              <Button size="small" disabled>导出图片</Button>
            </Tooltip>
            <Tooltip title="MVP 阶段：仅原型展示">
              <Button size="small" disabled>审核微调</Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* 内容区：长滚动 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {viewMode === 'professional' ? (
          <ProfessionalView chart={baziChart} />
        ) : (
          <ConsumerView report={consumerReport} />
        )}

        {/* 报告底部 CTA：引导进入每日对话 */}
        <EntryToDailyChat />
      </div>
    </div>
  );
};
