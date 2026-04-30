import React from 'react';

/** 古典风分隔线：双线 + 中间花纹 */
export const ClassicDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`classic-divider ${className}`} />;
};
