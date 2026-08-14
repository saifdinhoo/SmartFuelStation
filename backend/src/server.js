const http = require('http');
const app = require('./app');
const { initSocket } = require('./sockets');
const { port } = require('./config/env');

// http.createServer(app) instead of app.listen(...) directly — Socket.IO
// attaches to the underlying HTTP server, sharing the same port as the
// REST API rather than opening a second one.
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
