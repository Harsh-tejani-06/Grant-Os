let io = null;

module.exports = {
  init: (httpServer, corsOptions) => {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: corsOptions || {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      // Join proposal-specific room for collaborative section editing, status, and chat
      socket.on('joinProposal', (proposalId) => {
        if (proposalId) {
          socket.join(`proposal_${proposalId}`);
        }
      });

      socket.on('leaveProposal', (proposalId) => {
        if (proposalId) {
          socket.leave(`proposal_${proposalId}`);
        }
      });

      // Join organization-specific room for admin oversight
      socket.on('joinOrg', (orgId) => {
        if (orgId) {
          socket.join(`org_${orgId}`);
        }
      });

      socket.on('leaveOrg', (orgId) => {
        if (orgId) {
          socket.leave(`org_${orgId}`);
        }
      });
    });

    return io;
  },

  getIO: () => {
    return io;
  },

  emitToProposal: (proposalId, event, data) => {
    if (io && proposalId) {
      io.to(`proposal_${proposalId}`).emit(event, data);
    }
  },

  emitToOrg: (orgId, event, data) => {
    if (io && orgId) {
      io.to(`org_${orgId}`).emit(event, data);
    }
  },

  broadcastEvent: (event, data) => {
    if (io) {
      io.emit(event, data);
    }
  },
};
