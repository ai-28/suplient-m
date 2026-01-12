const { NextRequest } = require('next/server');
const { getSocketManager } = require('../../lib/socket/SocketManager');

// Health check endpoint for Socket.IO
async function GET(request) {
  const socketManager = getSocketManager();

  return Response.json({
    status: 'ok',
    activeUsers: socketManager.getActiveUsersCount(),
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  GET
};

