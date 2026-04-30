import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  seal?: string; // 印章风格小标题（右上角）
  className?: string;
}

/** 古典风分区标题：左侧朱砂竖条 + 宋体大字 */
export const SectionTitle: React.FC<Props> = ({ title, subtitle, seal, className = '' }) => {
  return (
    <div className={`flex items-end justify-between mb-5 ${className}`}>
      <div>
        <h2 className="classic-section-title m-0">{title}</h2>
        {subtitle && (
          <div className="text-ink-light text-sm mt-1 pl-[18px]">{subtitle}</div>
        )}
      </div>
      {seal && <span className="classic-seal">{seal}</span>}
    </div>
  );
};
