import express from 'express'
import apiRouter from './api.js'
import { config } from './config.js'

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
	res.header('Access-Control-Allow-Headers', 'Content-Type')
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200)
	}
	next()
})

// Logging middleware
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
	next()
})

// Routes
app.get('/', (req, res) => {
	res.json({
		service: 'Telegram Bot URL Parser',
		version: '1.0.0',
		endpoints: {
			health: 'GET /api/health',
			parse: 'POST /api/parse',
		},
	})
})

app.use('/api', apiRouter)

// Error handler
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err)
	res.status(500).json({
		success: false,
		error: err.message,
	})
})

// Start server
app.listen(config.apiPort, config.apiHost, () => {
	console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Telegram Bot URL Parser                                              ║
║  Server running on http://${config.apiHost}:${config.apiPort}         ║
╚═══════════════════════════════════════════════════════════════════════╝
  `)
	console.log('API Endpoints:')
	console.log(`  - GET  /              - Service info`)
	console.log(`  - GET  /api/health    - Health check`)
	console.log(`  - POST /api/parse     - Parse URL`)
	console.log('')
})

export default app
