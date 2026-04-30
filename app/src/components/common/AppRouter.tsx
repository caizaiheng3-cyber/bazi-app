import React from 'react';
import { Navigate } from 'react-router-dom';
import { useBaziStore } from '../../store/useBaziStore';

/**
 * 路由中转：根据是否已有命盘，决定默认落地页。
 * - 有命盘（老用户）→ /dashboard 每日陪伴
 * - 无命盘（首次使用）→ /onboarding 引导输入
 */
export const AppRouter: React.FC = () => {
  const hasChart = useBaziStore((s) => s.baziChart !== null);
  return <Navigate to={hasChart ? '/dashboard' : '/onboarding'} replace />;
};
