import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

/** 古典风卡片：宣纸纹理背景 + 古典边框 */
export const ClassicCard: React.FC<Props> = ({ children, className = '' }) => {
  return <div className={`classic-card ${className}`}>{children}</div>;
};
