import { useState } from 'react'
import type { Layer, Module } from '../App'
import ModuleNode from './ModuleNode'

interface Props {
  layers: Layer[]
  dependencyMap: Record<string, string[]>
}

export default function ArchitectureGraph({ layers, dependencyMap }: Props) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null)

  const dataFlows = [
    { from: 'Engine', to: 'Report', label: 'paipan_data + rules_data' },
    { from: 'Report', to: 'Web', label: 'markdown reports' },
  ]

  return (
    <div className="architecture">
      <div className="arch-legend">
        <span className="legend-item">
          <span className="dot dot-modified" /> 最近已修改
        </span>
        <span className="legend-item">
          <span className="dot dot-unchanged" /> 未变动
        </span>
      </div>

      <div className="arch-layers">
        {layers.map((layer, idx) => (
          <div key={layer.name}>
            <div
              className="layer-card"
              style={{ borderColor: layer.color }}
            >
              <div className="layer-header">
                <span className="layer-badge" style={{ background: layer.color }}>
                  {layer.name}
                </span>
                <span className="layer-path">{layer.path}</span>
                <span className="layer-desc">{layer.description}</span>
              </div>
              <div className="layer-modules">
                {layer.modules.map(mod => (
                  <ModuleNode
                    key={mod.file}
                    module={mod}
                    layerColor={layer.color}
                    isExpanded={expandedModule === mod.file}
                    onToggle={() =>
                      setExpandedModule(expandedModule === mod.file ? null : mod.file)
                    }
                    downstream={dependencyMap[mod.file] || []}
                  />
                ))}
              </div>
            </div>

            {idx < layers.length - 1 && (
              <div className="data-flow">
                <div className="flow-arrow">↓</div>
                <span className="flow-label">{dataFlows[idx]?.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
