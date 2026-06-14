import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

let socket: Socket | null = null;

/**
 * Retorna a instância singleton do Socket.io.
 * Cria a conexão na primeira chamada com auth JWT.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().token;
    socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.io conectado:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io desconectado:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('🔴 Socket.io erro de conexão:', err.message);
    });
  }

  return socket;
};

/**
 * Desconecta e destrói a instância do socket.
 * Chamado no logout.
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
