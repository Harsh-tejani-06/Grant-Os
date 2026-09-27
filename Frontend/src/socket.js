import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

export const joinProposalRoom = (proposalId) => {
  if (proposalId && socket) {
    socket.emit('joinProposal', proposalId);
  }
};

export const leaveProposalRoom = (proposalId) => {
  if (proposalId && socket) {
    socket.emit('leaveProposal', proposalId);
  }
};

export const joinOrgRoom = (orgId) => {
  if (orgId && socket) {
    socket.emit('joinOrg', orgId);
  }
};

export const leaveOrgRoom = (orgId) => {
  if (orgId && socket) {
    socket.emit('leaveOrg', orgId);
  }
};

export default socket;