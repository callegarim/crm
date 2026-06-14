import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, UserCheck, XCircle, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useConversations,
  useMessages,
  useAssignConversation,
  useCloseConversation,
  useSendMessage,
  type Conversation,
  type Message,
} from '@/hooks/useConversation';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { formatPhone, truncate, cn } from '@/lib/utils';
import { format } from 'date-fns';

/* ── Message Bubble ── */
function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={cn('flex mb-sm', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] px-md py-sm',
          isOutbound ? 'bubble-outbound' : 'bubble-inbound'
        )}
      >
        <p className="text-body-sm font-light whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className={cn(
          'flex items-center gap-xs mt-xxs',
          isOutbound ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] opacity-60">
            {message.sent_by === 'bot' ? '🤖' : '👤'} {message.sent_by}
          </span>
          <span className="text-[10px] opacity-60">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Conversation Sidebar Item ── */
function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusVariant = conv.status === 'bot' ? 'bot' : conv.status === 'human' ? 'human' : 'closed';

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-sm px-md py-sm cursor-pointer transition-fast border-b border-hairline',
        'hover:bg-elevated/30',
        isActive && 'bg-elevated/50 border-l-2 border-l-ink'
      )}
    >
      <div className="h-8 w-8 bg-elevated flex items-center justify-center flex-shrink-0">
        <MessageSquare className="h-4 w-4 text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-ink truncate">{conv.contact_name}</p>
          <Badge variant={statusVariant} className="text-[9px] ml-xs">
            {conv.status}
          </Badge>
        </div>
        <p className="text-caption text-muted truncate">
          {conv.last_message ? truncate(conv.last_message.content, 30) : 'Sem mensagens'}
        </p>
      </div>
    </div>
  );
}

/* ── Chat Page ── */
export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { on, joinConversation, leaveConversation } = useSocket();

  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Data
  const { data: conversationsData } = useConversations();
  const { data: messages = [] } = useMessages(conversationId);
  const assignConversation = useAssignConversation();
  const closeConversation = useCloseConversation();
  const sendMessage = useSendMessage();

  const conversations = conversationsData?.data ?? [];
  const activeConversation = conversations.find((c) => c.id === conversationId);

  // Join/leave room
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
      return () => leaveConversation(conversationId);
    }
  }, [conversationId, joinConversation, leaveConversation]);

  // Socket: new message
  useEffect(() => {
    const cleanup = on('new-message', (msg: unknown) => {
      const message = msg as Message;
      if (message.conversation_id === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return cleanup;
  }, [on, conversationId, queryClient]);

  // Socket: conversation status changed
  useEffect(() => {
    const cleanup = on('conversation:status-changed', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return cleanup;
  }, [on, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = () => {
    if (!messageText.trim() || !conversationId) return;
    sendMessage.mutate({
      conversationId,
      content: messageText.trim(),
    });
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Assign to self
  const handleAssign = () => {
    if (!conversationId || !user) return;
    assignConversation.mutate({ conversationId, agentId: user.id });
  };

  // Close conversation
  const handleClose = () => {
    if (!conversationId) return;
    closeConversation.mutate(conversationId);
  };

  return (
    <div className="flex h-[calc(100vh-64px-48px)] -m-lg">
      {/* Left: Conversations list */}
      <div className="w-[360px] border-r border-hairline flex flex-col bg-canvas flex-shrink-0">
        <div className="px-md py-sm border-b border-hairline">
          <p className="text-label text-muted">Conversas</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === conversationId}
              onClick={() => navigate(`/chat/${conv.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Right: Chat area */}
      <div className="flex-1 flex flex-col bg-soft">
        {conversationId && activeConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-lg py-sm border-b border-hairline bg-canvas">
              <div className="flex items-center gap-sm">
                <div>
                  <p className="text-body-sm text-ink">
                    {activeConversation.contact_name}
                  </p>
                  <p className="text-caption text-muted">
                    {formatPhone(activeConversation.contact_phone)}
                    {activeConversation.assigned_agent_name &&
                      ` · ${activeConversation.assigned_agent_name}`}
                  </p>
                </div>
                <Badge
                  variant={
                    activeConversation.status === 'bot'
                      ? 'bot'
                      : activeConversation.status === 'human'
                      ? 'human'
                      : 'closed'
                  }
                >
                  {activeConversation.status}
                </Badge>
              </div>
              <div className="flex items-center gap-xs">
                {activeConversation.status !== 'human' && activeConversation.status !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAssign}
                    disabled={assignConversation.isPending}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Assumir
                  </Button>
                )}
                {activeConversation.status !== 'closed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={closeConversation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Fechar
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-lg py-md">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            {activeConversation.status !== 'closed' && (
              <div className="px-lg py-sm border-t border-hairline bg-canvas flex items-center gap-sm">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                  id="chat-message-input"
                />
                <Button
                  variant="m-blue"
                  size="icon"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  id="chat-send-button"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted mx-auto mb-md" />
              <p className="text-body text-muted">
                Selecione uma conversa para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
