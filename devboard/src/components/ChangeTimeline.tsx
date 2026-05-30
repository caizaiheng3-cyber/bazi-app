import { useState } from 'react'
import type { Commit } from '../App'
import ImpactBadge from './ImpactBadge'

interface Props {
  commits: Commit[]
}

const LAYER_COLORS: Record<string, string> = {
  engine: '#e74c3c',
  report: '#f39c12',
  web: '#3498db',
  other: '#95a5a6',
}

const LAYER_LABELS: Record<string, string> = {
  engine: '引擎层',
  report: '报告层',
  web: 'Web层',
  other: '其他',
}

export default function ChangeTimeline({ commits }: Props) {
  const [expandedHash, setExpandedHash] = useState<string | null>(null)

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>变更记录</h2>
        <span className="timeline-count">共 {commits.length} 次提交</span>
      </div>

      <div className="timeline-list">
        {commits.map(commit => (
          <div
            key={commit.hash}
            className="timeline-item"
            onClick={() => setExpandedHash(expandedHash === commit.hash ? null : commit.hash)}
          >
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="commit-header">
                <code className="commit-hash">{commit.hash}</code>
                <span className="commit-date">{commit.date}</span>
              </div>
              <p className="commit-message">{commit.message}</p>

              <div className="commit-layers">
                {Object.entries(commit.layer_breakdown).map(([layer, files]) => (
                  <span
                    key={layer}
                    className="layer-tag"
                    style={{ background: LAYER_COLORS[layer] || '#95a5a6' }}
                  >
                    {LAYER_LABELS[layer] || layer} ({files.length})
                  </span>
                ))}
              </div>

              {commit.impact.downstream.length > 0 && (
                <div className="commit-impact">
                  <span className="impact-label">影响下游：</span>
                  {commit.impact.downstream.map(dep => (
                    <ImpactBadge key={dep} file={dep} />
                  ))}
                </div>
              )}

              {expandedHash === commit.hash && (
                <div className="commit-detail">
                  <h4>修改文件</h4>
                  <ul className="file-list">
                    {commit.files_changed.map(f => (
                      <li key={f} className="file-item">
                        <span
                          className="file-dot"
                          style={{ background: LAYER_COLORS[classifyFile(f)] }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {commit.impact.downstream.length > 0 && (
                    <>
                      <h4>受影响模块（可能需要检查）</h4>
                      <ul className="file-list downstream">
                        {commit.impact.downstream.map(f => (
                          <li key={f} className="file-item impact-item">
                            <span className="file-dot" style={{ background: '#9b59b6' }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function classifyFile(filepath: string): string {
  if (filepath.startsWith('engine/')) return 'engine'
  if (filepath.startsWith('report/')) return 'report'
  if (filepath.startsWith('web/')) return 'web'
  return 'other'
}
