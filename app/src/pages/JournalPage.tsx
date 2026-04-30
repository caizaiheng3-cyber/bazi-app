import React, { useMemo, useState } from 'react';
import { Button, message } from 'antd';
import { TopNavBar } from '../components/common/TopNavBar';
import {
  JournalFilterBar,
  type JournalFilter,
} from '../components/Journal/JournalFilterBar';
import { JournalItem } from '../components/Journal/JournalItem';
import { useBaziStore } from '../store/useBaziStore';
import type { Feedback, QnaRecord } from '../types/bazi';

/** 按 YYYY-MM 分组（入参假定已按时间倒序） */
function groupByMonth(records: QnaRecord[]): Array<{
  key: string;
  label: string;
  items: QnaRecord[];
}> {
  const groups: Record<string, QnaRecord[]> = {};
  records.forEach((r) => {
    const key = r.askedAt.slice(0, 7); // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups)
    .sort((a, b) => (a < b ? 1 : -1)) // 月份倒序
    .map((key) => {
      const [y, m] = key.split('-');
      return {
        key,
        label: `${y} · ${Number(m)} 月`,
        items: groups[key],
      };
    });
}

/**
 * 命理日记页：时间线倒序 + 月份分组 + 筛选 + 反馈回填 + 跳转续聊
 */
export const JournalPage: React.FC = () => {
  const journalRecords = useBaziStore((s) => s.journalRecords);
  const updateFeedback = useBaziStore((s) => s.updateFeedback);
  const toggleJournalStar = useBaziStore((s) => s.toggleJournalStar);

  const [filter, setFilter] = useState<JournalFilter>('全部');

  /** 按时间倒序 */
  const sortedRecords = useMemo<QnaRecord[]>(
    () =>
      [...journalRecords].sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1)),
    [journalRecords],
  );

  const filtered = useMemo(() => {
    if (filter === '全部') return sortedRecords;
    if (filter === '收藏') return sortedRecords.filter((r) => r.starred);
    return sortedRecords.filter((r) => r.reply.verdict === filter);
  }, [sortedRecords, filter]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const handleUpdateFeedback = (id: string, fb: Feedback) => {
    updateFeedback(id, fb);
    message.success('反馈已更新');
  };

  const handleToggleStar = (id: string) => {
    toggleJournalStar(id);
  };

  const handleExport = () => {
    message.info('导出本月功能：M7.6 阶段实现');
  };

  return (
    <div className="page-paper min-h-screen">
      <TopNavBar />

      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* 标题区 */}
        <div className="flex items-baseline justify-between flex-wrap gap-2 mt-6 mb-2">
          <div>
            <h2 className="classic-section-title m-0">📚 命理日记</h2>
            <div className="text-sm text-ink-light mt-1 pl-[18px]">
              先生陪您过的每一天，都在这里。
            </div>
          </div>
          <Button onClick={handleExport}>导出本月</Button>
        </div>

        <div className="classic-divider" />

        {/* 筛选 */}
        <JournalFilterBar
          value={filter}
          onChange={setFilter}
          total={filtered.length}
        />

        {/* 月份分组时间线 */}
        {grouped.length === 0 && (
          <div className="classic-card text-center text-ink-light py-10">
            暂无匹配的记录。
          </div>
        )}

        {grouped.map((g) => (
          <div key={g.key} className="mb-6">
            <div
              className="font-classic text-base mb-3 tracking-widest"
              style={{ color: 'var(--color-ink-light)' }}
            >
              ─── {g.label} ──────────
            </div>
            {g.items.map((r) => (
              <JournalItem
                key={r.id}
                record={r}
                onUpdateFeedback={handleUpdateFeedback}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ))}

        {grouped.length > 0 && (
          <div className="text-center text-xs text-ink-light py-6 tracking-wider">
            ─── 已加载全部 ───
          </div>
        )}
      </div>
    </div>
  );
};
