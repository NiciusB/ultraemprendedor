const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')
  .listen(server)
  .path(process.env.NODE_ENV === 'development' ? '' : '/api/socket.io')
const { setupRoutes } = require('./routes')
const { setupChat } = require('./chat')
const setupCrons = require('./crons')

require('./express-async-errors-patch')
app.disable('x-powered-by')

// Parse application/json
var bodyParser = require('body-parser')
app.use(bodyParser.json())

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Allow', 'GET, POST, OPTIONS')
  next()
})

// OPTIONS middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }
  next()
})

// Auth middleware
require('./auth-middleware')(app)

// Our routes
setupRoutes(app)

// Setup chat
setupChat(io)

// Errors middleware
app.use(errorHandler)
function errorHandler(err, req, res, next) {
  console.error(err.stack)
  res.status(500).json({ error: 'Error 500: Algo salió mal' })
}

server.listen(3001, () => {
  console.log('Server listening on port 3001!')
})

// Setup crons
setupCrons()
