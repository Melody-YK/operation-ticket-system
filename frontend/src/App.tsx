import { useState, useEffect } from 'react'
import { api } from './api/client'
import './App.css'

function App() {
  const [personnelId, setPersonnelId] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState<{ id: string; name: string; role: string; team?: string } | null>(null)
  const [dbStatus, setDbStatus] = useState<string>('checking...')
  const [personnel, setPersonnel] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])

  useEffect(() => {
    api.healthCheck().then(r => setDbStatus(r.database)).catch(() => setDbStatus('disconnected'))
  }, [])

  async function handleLogin() {
    try {
      const result = await api.login(personnelId, 'any')
      setUser(result.user)
      setLoggedIn(true)
      const allPersonnel = await api.getPersonnel()
      setPersonnel(allPersonnel)
      const ticketList = await api.getTickets()
      setTickets(ticketList.data)
    } catch (e: any) {
      alert('登录失败: ' + e.message)
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-2 text-center">操作票管理系统</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">Sprint 1 · 最小闭环验证</p>
          <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
            <p>🟢 数据库: <strong>{dbStatus}</strong></p>
            <p>⚙️ 后端版本: <strong>v0.1.0</strong></p>
          </div>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            placeholder="输入人员ID (如 zs, zl, sb, ws)"
            value={personnelId}
            onChange={e => setPersonnelId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button
            className="w-full bg-blue-600 text-white rounded py-2"
            onClick={handleLogin}
          >
            登录
          </button>
          <div className="mt-4 text-xs text-gray-400">
            可用账号: zs(操作人) zl(监护人) sb(批准人) ws(发令人)
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">操作票管理系统</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name} ({user?.role})</span>
            <button className="text-sm text-red-500" onClick={() => { setLoggedIn(false); setUser(null) }}>
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <h2 className="font-semibold mb-2">📊 系统状态</h2>
            <p className="text-sm text-gray-600">数据库: <strong className="text-green-600">已连接</strong></p>
            <p className="text-sm text-gray-600">人员数: <strong>{personnel.length}</strong></p>
            <p className="text-sm text-gray-600">操作票: <strong>{tickets.length}</strong></p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <h2 className="font-semibold mb-2">👥 人员列表</h2>
            <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
              {personnel.map(p => (
                <div key={p.personnelId} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-gray-400">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <h2 className="font-semibold mb-2">🎫 操作票列表</h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-gray-400">暂无操作票数据</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">票号</th>
                  <th>任务名称</th>
                  <th>状态</th>
                  <th>操作人</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t: any) => (
                  <tr key={t.ticketId} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{t.ticketId}</td>
                    <td>{t.taskName}</td>
                    <td><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{t.status}</span></td>
                    <td>{t.operatorId}</td>
                    <td className="text-gray-400 text-xs">{new Date(t.createdAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
