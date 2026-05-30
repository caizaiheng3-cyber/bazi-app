import type { Module } from '../App'

interface Props {
  module: Module
  layerColor: string
  isExpanded: boolean
  onToggle: () => void
  downstream: string[]
}

export default function ModuleNode({ module, layerColor, isExpanded, onToggle, downstream }: Props) {
  const statusIcon = module.status === 'modified' ? '⚠️' : '⬜'
  const statusClass = module.status === 'modified' ? 'status-modified' : 'status-unchanged'

  const formatDate = (iso: string) => {
    if (!iso) return '未知'
    return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`module-node ${statusClass}`} onClick={onToggle}>
      <div className="module-header">
        <span className="module-status">{statusIcon}</span>
        <span className="module-label">{module.label}</span>
        <span className="module-file">{module.file}</span>
        <span className="module-date">{formatDate(module.last_modified)}</span>
      </div>

      {isExpanded && (
        <div className="module-detail">
          <div className="detail-section">
            <h4>核心函数</h4>
            <ul>
              {module.key_functions.map(fn => (
                <li key={fn}><code>{fn}</code></li>
              ))}
            </ul>
          </div>

          {downstream.length > 0 && (
            <div className="detail-section">
              <h4>下游依赖（修改本模块会影响）</h4>
              <ul className="downstream-list">
                {downstream.map(dep => (
                  <li key={dep} className="downstream-item">{dep}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
