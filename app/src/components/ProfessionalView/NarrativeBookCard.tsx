import React, { useState } from 'react';
import type { NarrativeBook } from '../../types/bazi';

export const NarrativeBookCard: React.FC<{ narrativeBook: NarrativeBook }> = ({ narrativeBook }) => {
  const [tab, setTab] = useState<'chapters' | 'markdown' | 'narrative'>('chapters');
  const [expandedChapter, setExpandedChapter] = useState<number | null>(0);

  const handleDownload = () => {
    const blob = new Blob([narrativeBook.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${narrativeBook.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const text = tab === 'markdown' ? narrativeBook.markdown : narrativeBook.narrative;
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['chapters','markdown','narrative'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 text-sm rounded"
              style={{
                background: tab === t ? '#8B6F0E' : 'rgba(184,134,11,0.08)',
                color: tab === t ? '#FFF8E7' : '#5A5651',
              }}
            >
              {t === 'chapters' ? '章节预览' : t === 'markdown' ? 'Markdown 全文' : '自然语言版'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="px-3 py-1.5 text-sm rounded" style={{ background: 'rgba(59,90,107,0.10)', color: '#3B5A6B' }}>📋 复制</button>
          <button onClick={handleDownload} className="px-3 py-1.5 text-sm rounded" style={{ background: '#8B6F0E', color: '#FFF8E7' }}>↓ 导出 Markdown</button>
        </div>
      </div>

      {tab === 'chapters' && (
        <div className="space-y-2">
          {narrativeBook.chapters.map((chapter, i) => (
            <div key={i} className="border rounded" style={{ borderColor: 'rgba(160,147,125,0.30)' }}>
              <button
                className="w-full px-4 py-2 text-left text-sm font-medium flex items-center justify-between"
                style={{ background: expandedChapter === i ? 'rgba(184,134,11,0.08)' : 'transparent', color: 'var(--color-ink)' }}
                onClick={() => setExpandedChapter(expandedChapter === i ? null : i)}
              >
                <span>{chapter.title}</span>
                <span style={{ color: 'var(--color-ink-light)' }}>{expandedChapter === i ? '−' : '+'}</span>
              </button>
              {expandedChapter === i && (
                <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-ink)', background: 'rgba(255,248,231,0.50)' }}>
                  {chapter.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'markdown' && (
        <pre className="text-xs p-4 rounded overflow-auto" style={{ background: '#FFF8E7', color: '#3D2E1A', maxHeight: 600, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {narrativeBook.markdown}
        </pre>
      )}

      {tab === 'narrative' && (
        <div className="text-sm leading-loose p-4 rounded" style={{ background: '#FFF8E7', color: '#3D2E1A', maxHeight: 600, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {narrativeBook.narrative}
        </div>
      )}
    </div>
  );
};
