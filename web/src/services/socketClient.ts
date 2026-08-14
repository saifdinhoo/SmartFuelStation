import { io, type Socket } from 'socket.io-client';

// The backend attaches Socket.IO to the same HTTP server the REST API
// runs on (see backend/src/server.js) — same origin, no separate port.
// VITE_API_URL is "http://localhost:5000/api"; strip the /api suffix to
// get the server root Socket.IO listens on.
const SOCKET_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '');

// Single socket instance for the whole app, matching apiClient.ts's
// "one shared instance" convention. autoConnect is off — connection is
// driven explicitly by SocketProvider based on auth state, never
// implicitly on import.
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {},
});

// The client only reads `auth` at the moment it starts a handshake, so a
// token change (login, logout, switching accounts in the same tab) has to
// force a fresh connection rather than just mutating the auth object on
// an already-open socket — otherwise the server would keep treating the
// connection as authenticated for whoever connected first.
export function connectSocketWithToken(token: string) {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
