import { useEffect } from 'react';
import { useSocketStore } from '@/stores/socketStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook para gerenciar a conexão Socket.io.
 * Conecta automaticamente quando autenticado.
 * Permite escutar eventos específicos.
 */
export function useSocket() {
  const { socket, isConnected, connect, disconnect } = useSocketStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !socket) {
      connect();
    }

    return () => {
      // Não desconecta no cleanup — mantém conexão global
    };
  }, [isAuthenticated, socket, connect]);

  /**
   * Escuta um evento Socket.io com auto-cleanup
   */
  const on = (event: string, handler: (...args: unknown[]) => void) => {
    if (socket) {
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    }
    return () => {};
  };

  /**
   * Entra na sala de uma conversa
   */
  const joinConversation = (conversationId: string) => {
    socket?.emit('joinConversation', conversationId);
  };

  /**
   * Sai da sala de uma conversa
   */
  const leaveConversation = (conversationId: string) => {
    socket?.emit('leaveConversation', conversationId);
  };

  return {
    socket,
    isConnected,
    on,
    joinConversation,
    leaveConversation,
    disconnect,
  };
}
