const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const prisma = require('./config/prisma');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Confirms both the HTTP server and PostgreSQL connection are healthy.
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Server and database are running', database: 'connected' });
  } catch (error) {
    res.status(503).json({ success: false, message: 'Database is unavailable', database: 'disconnected' });
  }
});

app.use('/api', routes);
app.use(errorHandler);

module.exports = app;