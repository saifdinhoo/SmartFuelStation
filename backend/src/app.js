const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Simple health check to confirm the server is running.
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use('/api', routes);

// Error handler must be registered last, after all routes.
app.use(errorHandler);

module.exports = app;
