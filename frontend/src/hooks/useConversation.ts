import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

/* ── Types ── */

export interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content_type: 'text' | 'image' | 'audio' | 'video' | 'doc';
  content: string;
  sent_by: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  status: 'bot' | 'human' | 'closed' | 'open';
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  created_at: string;
  updated_at: string;
  last_message: Message | null;
}

interface ConversationsResponse {
  data: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* ── Hooks ── */

/**
 * Lista de conversas com filtros
 */
export function useConversations(params?: { status?: string; page?: number }) {
  return useQuery<ConversationsResponse>({
    queryKey: ['conversations', params],
    queryFn: async () => {
      const { data } = await api.get('/conversations', { params });
      return data;
    },
  });
}

/**
 * Mensagens de uma conversa
 */
export function useMessages(conversationId: string | undefined) {
  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${conversationId}/messages`);
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: false,
  });
}

/**
 * Assumir atendimento de uma conversa
 */
export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string }) => {
      const { data } = await api.put(`/conversations/${conversationId}/assign`, {
        agent_id: agentId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Fechar conversa
 */
export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.put(`/conversations/${conversationId}/close`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Enviar mensagem (via backend → Evolution API)
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, contentType = 'text' }: {
      conversationId: string;
      content: string;
      contentType?: string;
    }) => {
      const { data } = await api.post(`/conversations/${conversationId}/send-message`, {
        content,
        content_type: contentType,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    },
  });
}
