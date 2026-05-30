import { useState, useEffect } from 'react'
import ArchitectureGraph from './components/ArchitectureGraph'
import ChangeTimeline from './components/ChangeTimeline'

interface ProjectData {
  project_name: string
  scanned_at: string
  architecture: { layers: Layer[] }
  commits: Commit[]
  dependency_map: Record<string, string[]>
}

export interface Layer {
  name: string
  path: string
  color: string
  description: string
  modules: Module[]
}

export interface Module {
  file: string
  label: string
  key_functions: string[]
  last_modified: string
  status: string
}

export interface Commit {
  hash: string
  full_hash: string
  date: string
  time: string
  message: string
  author: string
  files_changed: string[]
  impact: { direct: string[]; downstream: string[] }
  layer_breakdown: Record<string, string[]>
}

export default function App() {
  const [data, setData] = useState<ProjectData | null>(null)
  const [activeTab, setActiveTab] = useState<'arch' | 'changes'>('arch')

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(setData)
      .catch(e => console.error('加载数据失败:', e))
  }, [])

  if (!data) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{data.project_name} · 开发管理面板</h1>
        <span className="scan-time">扫描时间：{new Date(data.scanned_at).toLocaleString('zh-CN')}</span>
      </header>

      <nav className="tab-nav">
        <button
          className={activeTab === 'arch' ? 'active' : ''}
          onClick={() => setActiveTab('arch')}
        >
          架构全景
        </button>
        <button
          className={activeTab === 'changes' ? 'active' : ''}
          onClick={() => setActiveTab('changes')}
        >
          变更追踪
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'arch' && (
          <ArchitectureGraph
            layers={data.architecture.layers}
            dependencyMap={data.dependency_map}
          />
        )}
        {activeTab === 'changes' && (
          <ChangeTimeline commits={data.commits} />
        )}
      </main>
    </div>
  )
}
