import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;

  connect: () => void;
  disconnect: () => void;
}

/**
 * Socket Store — gerencia a conexão WebSocket global.
 * Chamado no AppLayout após autenticação.
 */
export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const socket = getSocket();

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket });
  },

  disconnect: () => {
    disconnectSocket();
    set({ socket: null, isConnected: false });
  },
}));
