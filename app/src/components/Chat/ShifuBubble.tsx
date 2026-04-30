import React from 'react';
import { message } from 'antd';
import { ClassicDivider } from '../common/ClassicDivider';
import { VerdictSeal } from './VerdictSeal';
import { BasisFootnote } from './BasisFootnote';
import type { ChatMessage, ShifuReply } from '../../types/bazi';

interface Props {
  msg: ChatMessage; // role=shifu
  onStar?: (msgId: string) => void;
  onFollowUp?: (quote: string) => void;
  onSaveToJournal?: (msg: ChatMessage) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderMultiline(text: string) {
  return text.split('\n').map((line, i) => (
    <div key={i} style={{ marginBottom: line.trim() ? 4 : 0 }}>
      {line || '\u00A0'}
    </div>
  ));
}

/** 先生回话气泡：左对齐，白底古典边框 + 三段式 + 印章 + 操作条 */
export const ShifuBubble: React.FC<Props> = ({
  msg,
  onStar,
  onFollowUp,
  onSaveToJournal,
}) => {
  const reply = msg.reply as ShifuReply;
  if (!reply) return null;

  const handleStar = () => {
    onStar?.(msg.id);
    message.success(msg.starred ? '已取消收藏' : '已收藏到日记');
  };
  const handleFollowUp = () => {
    onFollowUp?.(reply.suggestion.split('\n')[0] ?? '');
  };
  const handleSave = () => {
    onSaveToJournal?.(msg);
    message.success('已记入命理日记');
  };

  /** 将建议文本中的 ①②③ 编号转为结构化列表 */
  const renderSuggestion = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim());
    const numbered = lines.filter((l) => /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(l.trim()));
    if (numbered.length >= 2) {
      return (
        <div className="space-y-2">
          {lines.map((line, i) => {
            const match = line.match(/^([①②③④⑤⑥⑦⑧⑨⑩])\s*(.*)/);
            if (match) {
              return (
                <div key={i} className="flex gap-2 items-start">
                  <span
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(184, 55, 47, 0.1)',
                      color: 'var(--color-cinnabar)',
                      fontSize: 12,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    {match[1]}
                  </span>
                  <span style={{ lineHeight: 1.8 }}>{match[2]}</span>
                </div>
              );
            }
            return <div key={i} style={{ lineHeight: 1.8 }}>{line}</div>;
          })}
        </div>
      );
    }
    return <div className="text-[15px] leading-[1.9]">{renderMultiline(text)}</div>;
  };

  return (
    <div className="relative mb-5">
      {/* 先生回话卡片（全宽，对标设计稿 04b） */}
      <div
        style={{
          background: '#FFFDF7',
          border: '1px solid var(--color-border-soft)',
          borderRadius: 10,
          padding: '22px 22px 18px',
          color: 'var(--color-ink)',
          fontFamily: '"Noto Serif SC", "Songti SC", serif',
          boxShadow: '0 1px 6px rgba(58, 47, 36, 0.06)',
        }}
      >
        {/* 【共情】 */}
        <div>
          <div
            className="text-[14px] mb-2 font-semibold"
            style={{ color: 'var(--color-cinnabar)', letterSpacing: '0.15em' }}
          >
            【共情】
          </div>
          <div className="text-[15px] leading-[1.9]">
            {renderMultiline(reply.empathy)}
          </div>
        </div>

        {/* 菱形分隔 */}
        <div
          className="text-center my-4"
          style={{ color: 'var(--color-border)', fontSize: 12, letterSpacing: '0.5em' }}
        >
          •◇•
        </div>

        {/* 【解释】 */}
        <div>
          <div
            className="text-[14px] mb-2 font-semibold"
            style={{ color: 'var(--color-cinnabar)', letterSpacing: '0.15em' }}
          >
            【解释】
          </div>
          <div className="text-[15px] leading-[1.9]">
            {renderMultiline(reply.explanation)}
          </div>
          <BasisFootnote basis={reply.basis} bestTiming={reply.bestTiming} />
        </div>

        {/* 菱形分隔 */}
        <div
          className="text-center my-4"
          style={{ color: 'var(--color-border)', fontSize: 12, letterSpacing: '0.5em' }}
        >
          •◇•
        </div>

        {/* 【建议】 */}
        <div>
          <div
            className="text-[14px] mb-2 font-semibold"
            style={{ color: 'var(--color-cinnabar)', letterSpacing: '0.15em' }}
          >
            【建议】
          </div>
          <div className="text-[15px]">
            {renderSuggestion(reply.suggestion)}
          </div>
        </div>

        {/* 祝福语（朱砂色） */}
        {reply.suggestion && (
          <div
            className="text-center mt-5 font-classic"
            style={{
              color: 'var(--color-cinnabar)',
              fontSize: 14,
              letterSpacing: '0.15em',
              fontStyle: 'italic',
            }}
          >
            愿您在权衡中做出最合适的选择，顺势而为，未来可期。
          </div>
        )}

        {/* 右下角竹子装饰 */}
        <div
          style={{
            position: 'absolute',
            right: -8,
            bottom: -12,
            width: 80,
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        >
          <img
            src="/images/bamboo-corner.png"
            alt=""
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* 印章：右上角 */}
      <div
        style={{
          position: 'absolute',
          right: -10,
          top: -10,
        }}
      >
        <VerdictSeal verdict={reply.verdict} size={56} />
        <div
          className="text-center font-classic mt-1"
          style={{
            fontSize: 10,
            color: 'var(--color-ink-light)',
            letterSpacing: '0.1em',
            lineHeight: 1.3,
          }}
        >
          {reply.verdict === '慎' ? '三思而后行' : reply.verdict === '宜' ? '顺势而为' : '量力而行'}
          <br />
          {reply.verdict === '慎' ? '趋吉避凶' : reply.verdict === '宜' ? '把握良机' : '稳中求进'}
        </div>
      </div>
    </div>
  );
};
