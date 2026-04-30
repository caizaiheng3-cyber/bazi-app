import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  key: string;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: '今日', path: '/dashboard' },
  { key: 'chat', label: '对话', path: '/chat' },
  { key: 'journal', label: '命理日记', path: '/journal' },
  { key: 'chart', label: '我的命盘', path: '/chart' },
  { key: 'onboarding', label: '✏ 修改', path: '/onboarding' },
];

/**
 * 顶部通用导航条：4 Tab（今日 / 对话 / 命理日记 / 我的命盘）
 * 根据当前路由自动高亮。
 */
export const TopNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="sticky top-0 z-20 border-b"
      style={{
        background: 'rgba(245, 239, 224, 0.92)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div
          className="font-classic text-xl tracking-[0.2em] cursor-pointer"
          style={{ color: 'var(--color-cinnabar)' }}
          onClick={() => navigate('/dashboard')}
        >
          📿 先生
        </div>
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="px-3 py-1.5 text-sm font-classic tracking-wider transition-colors"
                style={{
                  color: active ? 'var(--color-cinnabar)' : 'var(--color-ink-light)',
                  borderBottom: active
                    ? '2px solid var(--color-cinnabar)'
                    : '2px solid transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
