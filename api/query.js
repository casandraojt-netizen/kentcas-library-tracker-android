const { neon } = require('@neondatabase/serverless')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { connectionString, sql, params = [] } = req.body || {}
  if (!connectionString || !sql) return res.status(400).json({ error: 'Missing connectionString or sql' })

  const sqlTrimmed = sql.trim().toUpperCase()
  const allowed = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALTER', 'CREATE']
  if (!allowed.some(op => sqlTrimmed.startsWith(op))) return res.status(403).json({ error: 'SQL operation not allowed' })

  try {
    const db = neon(connectionString)
    const rows = await db(sql, params)
    res.status(200).json({ rows })
  } catch (err) {
    console.error('Query error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
