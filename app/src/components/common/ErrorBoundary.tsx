// ============================================================
// 通用 ErrorBoundary
//
// 解决"白屏 + Console 无报错"的诡异 case：
// React 18 在没有 ErrorBoundary 时遇到子组件渲染错误，
// 会静默 unmount 整棵子树，看起来就是白屏。
//
// 用法：包裹任意可能出错的子树（如 ResultPage 内容区）
// ============================================================

import React from 'react';

interface Props {
  /** 出错时显示的备用 UI（可选） */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** 出错时执行的回调（用于清 localStorage 等） */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 强制把错误打到 console（React 18 默认会吞，这里显式输出）
    console.error('[ErrorBoundary] 捕获到渲染错误:', error);
    console.error('[ErrorBoundary] 组件栈:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        style={{
          padding: '40px 24px',
          maxWidth: 720,
          margin: '0 auto',
          fontFamily: '"Noto Serif SC", "Songti SC", serif',
          color: 'var(--color-ink, #2C2A28)',
        }}
      >
        <div
          style={{
            background: 'rgba(197,57,47,0.06)',
            border: '1px solid rgba(197,57,47,0.3)',
            borderLeft: '4px solid #C5392F',
            borderRadius: 8,
            padding: '20px 24px',
          }}
        >
          <h3
            style={{
              color: '#C5392F',
              fontSize: 18,
              margin: 0,
              marginBottom: 12,
              letterSpacing: '0.05em',
            }}
          >
            ⚠ 页面渲染出错
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-ink-light, #6b5f54)', marginBottom: 16 }}>
            这通常是因为本地缓存的命盘数据格式过旧，与新版引擎不兼容。
          </p>
          <details
            style={{
              fontSize: 12,
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.04)',
              padding: 10,
              borderRadius: 4,
              marginBottom: 16,
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            <summary style={{ cursor: 'pointer', color: '#C5392F' }}>查看技术细节</summary>
            <div style={{ marginTop: 8 }}>
              <strong>{error.name}</strong>: {error.message}
              {error.stack && (
                <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
              )}
            </div>
          </details>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem('bazi:chart');
                } catch {
                  /* ignore */
                }
                window.location.href = '/onboarding';
              }}
              style={{
                padding: '8px 18px',
                background: '#C5392F',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                letterSpacing: '0.05em',
              }}
            >
              清除缓存并重新排盘
            </button>
            <button
              type="button"
              onClick={this.reset}
              style={{
                padding: '8px 18px',
                background: 'transparent',
                color: 'var(--color-ink, #2C2A28)',
                border: '1px solid var(--color-border, #d4c8a8)',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              再试一次
            </button>
          </div>
        </div>
      </div>
    );
  }
}
