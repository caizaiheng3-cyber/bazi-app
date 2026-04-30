import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNavBar } from '../components/common/TopNavBar';
import { TodayFortuneCard } from '../components/Daily/TodayFortuneCard';
import { SceneQuickGrid } from '../components/Daily/SceneQuickGrid';
import { AskInputBar } from '../components/Daily/AskInputBar';
import { WeeklyTrendChart } from '../components/Daily/WeeklyTrendChart';
import { RecentQnaList } from '../components/Daily/RecentQnaList';
import { useBaziStore } from '../store/useBaziStore';

/**
 * 每日命理主页（M7 默认主页）
 * 老用户重开 App 的首屏；整合今日宜忌 / 场景快捷 / 输入条 / 周曲线 / 最近问答。
 */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const dashboard = useBaziStore((s) => s.todayDashboard);
  const journalRecords = useBaziStore((s) => s.journalRecords);
  const loadTodayDashboard = useBaziStore((s) => s.loadTodayDashboard);

  useEffect(() => {
    loadTodayDashboard();
  }, [loadTodayDashboard]);

  /** 最近问答优先从日记里取最新 3 条，保证 Dashboard 与日记一致 */
  const recentQna = useMemo(() => {
    if (journalRecords.length === 0) return dashboard.recentQna;
    return [...journalRecords]
      .sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1))
      .slice(0, 3);
  }, [journalRecords, dashboard.recentQna]);

  return (
    <div className="page-paper min-h-screen">
      <TopNavBar />

      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* 1. 今日宜忌卡 */}
        <div className="mt-6">
          <TodayFortuneCard fortune={dashboard.fortune} />
        </div>

        {/* 2. 场景快捷网格 */}
        <div className="mt-10">
          <div className="classic-cloud-title">
            <span className="cloud-mark">☁</span>
            <span>今 日 想 问 先 生 什 么</span>
            <span className="cloud-mark">☁</span>
          </div>
          <SceneQuickGrid quickScenes={dashboard.quickScenes} />
        </div>

        {/* 3. 输入条 */}
        <div className="mt-5">
          <AskInputBar />
        </div>

        {/* 4. 本周运势曲线 */}
        <div className="mt-8">
          <WeeklyTrendChart trend={dashboard.weeklyTrend} />
        </div>

        {/* 5. 最近问答 + 全部日记入口 */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between mb-1">
            <div className="classic-cloud-title" style={{ marginBottom: 0 }}>
              <span className="cloud-mark">☁</span>
              <span>最 近 请 教</span>
              <span className="cloud-mark">☁</span>
            </div>
            <button
              className="text-sm transition-colors"
              onClick={() => navigate('/journal')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-cinnabar)',
                fontFamily: 'var(--font-classic)',
                letterSpacing: '0.1em',
              }}
            >
              全部日记 →
            </button>
          </div>
          <RecentQnaList records={recentQna} />
        </div>
      </div>
    </div>
  );
};
