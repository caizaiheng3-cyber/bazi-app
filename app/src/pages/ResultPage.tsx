import React from 'react';
import { Segmented, Button, Tooltip, Empty, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useBaziStore } from '../store/useBaziStore';
import { ProfessionalView } from '../components/ProfessionalView/ProfessionalView';
import { ConsumerView } from '../components/ConsumerView/ConsumerView';
import { EntryToDailyChat } from '../components/common/EntryToDailyChat';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const inputData = useBaziStore((s) => s.inputData);
  const baziChart = useBaziStore((s) => s.baziChart);
  const consumerReport = useBaziStore((s) => s.consumerReport);
  const viewMode = useBaziStore((s) => s.viewMode);
  const setViewMode = useBaziStore((s) => s.setViewMode);
  const submit = useBaziStore((s) => s.submit);
  // P6.3 LLM 增强相关状态
  const llmEnhancing = useBaziStore((s) => s.llmEnhancing);
  const llmEnhanced = useBaziStore((s) => s.llmEnhanced);
  const enhanceWithLLM = useBaziStore((s) => s.enhanceWithLLM);
  const [msgApi, contextHolder] = message.useMessage();
  const [regenerating, setRegenerating] = React.useState(false);

  const handleRegenerate = async () => {
    if (!inputData) {
      msgApi.warning('没有输入数据，请返回重新填写');
      return;
    }
    setRegenerating(true);
    try {
      await submit(inputData);
      msgApi.success('报告已重新生成 ✅');
    } catch {
      msgApi.error('重新生成失败，请重试');
    } finally {
      setRegenerating(false);
    }
  };

  const handleEnhance = async () => {
    const result = await enhanceWithLLM();
    if (result.ok) {
      msgApi.success('AI 已重写命运主线 + 命格画像 + 综合论命', 4);
    } else {
      msgApi.warning(result.reason ?? 'LLM 调用未生效', 5);
    }
  };

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
            <Tooltip title="基于当前输入数据重新排盘生成报告（引擎逻辑更新后使用）">
              <Button
                size="small"
                loading={regenerating}
                onClick={handleRegenerate}
                disabled={!inputData}
              >
                {regenerating ? '生成中...' : '🔄 重新生成'}
              </Button>
            </Tooltip>
            <Tooltip
              title={
                llmEnhanced
                  ? 'AI 已增强本命盘，可重新点击再生成一版'
                  : '调用 DeepSeek 重写：开篇定盘话 + 命格画像 + 综合论命叙述（约 6-8 秒）'
              }
            >
              <Button
                size="small"
                type={llmEnhanced ? 'default' : 'primary'}
                loading={llmEnhancing}
                onClick={handleEnhance}
                style={
                  llmEnhanced
                    ? { borderColor: '#6B8E23', color: '#6B8E23' }
                    : undefined
                }
              >
                {llmEnhancing ? 'AI 思考中...' : llmEnhanced ? '✨ AI 已增强 · 重做' : '🤖 AI 增强'}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
      {contextHolder}

      {/* 内容区：长滚动 — ErrorBoundary 防止单个组件错误导致整页白屏 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorBoundary>
          {viewMode === 'professional' ? (
            <ProfessionalView chart={baziChart} />
          ) : (
            <ConsumerView report={consumerReport} chart={baziChart} />
          )}
        </ErrorBoundary>

        {/* 报告底部 CTA：引导进入每日对话 */}
        <EntryToDailyChat />
      </div>
    </div>
  );
};
