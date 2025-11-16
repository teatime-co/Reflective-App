import { useState, useEffect } from 'react'
import type { DatabaseStats } from '../../types/database'

function DatabaseTest() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('[RENDERER] window.electronAPI:', window.electronAPI)
    console.log('[RENDERER] window keys:', Object.keys(window))
    loadStats()
  }, [])

  const loadStats = async () => {
    if (!window.electronAPI) {
      console.error('[RENDERER] window.electronAPI is undefined!')
      return
    }
    const result = await window.electronAPI.db.getStats()
    if (result.success && result.data) {
      setStats(result.data)
    }
  }

  const testDatabaseOperations = async () => {
    setLoading(true)
    setTestResult('')

    try {
      const insertResult = await window.electronAPI.db.run(
        'INSERT INTO entries (content, word_count, sentiment_score) VALUES (?, ?, ?)',
        ['This is a test journal entry!', 6, 0.8]
      )

      if (!insertResult.success) {
        setTestResult(`Error inserting: ${insertResult.error}`)
        setLoading(false)
        return
      }

      const queryResult = await window.electronAPI.db.query(
        'SELECT * FROM entries WHERE id = ?',
        [insertResult.lastInsertRowid]
      )

      if (queryResult.success && queryResult.data) {
        setTestResult(`Success! Created entry with ID ${insertResult.lastInsertRowid}`)
        loadStats()
      } else {
        setTestResult(`Error querying: ${queryResult.error}`)
      }
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-2xl p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Reflective
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Local-first Journaling App
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Electron + React + TypeScript + SQLite
        </p>

        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Database Stats</h2>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{stats.totalEntries}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tags</p>
                <p className="text-2xl font-bold">{stats.totalTags}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Themes</p>
                <p className="text-2xl font-bold">{stats.totalThemes}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Database Size</p>
                <p className="text-2xl font-bold">
                  {(stats.databaseSize / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={testDatabaseOperations}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Testing...' : 'Test Database'}
        </button>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg ${testResult.includes('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  )
}

export default DatabaseTest
