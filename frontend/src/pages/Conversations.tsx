import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { MStripe } from '@/components/ui/MStripe';
import { useConversations, type Conversation } from '@/hooks/useConversation';
import { useSocket } from '@/hooks/useSocket';
import { formatPhone, formatRelativeDate, truncate } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

/* ── Conversation Row ── */
function ConversationRow({ conv }: { conv: Conversation }) {
  const navigate = useNavigate();

  const statusVariant = conv.status === 'bot'
    ? 'bot'
    : conv.status === 'human'
    ? 'human'
    : 'closed';

  return (
    <div
      onClick={() => navigate(`/chat/${conv.id}`)}
      className="flex items-center justify-between py-sm px-md hover:bg-elevated/30 transition-fast cursor-pointer border-b border-hairline last:border-b-0"
    >
      <div className="flex items-center gap-sm min-w-0">
        <div className="h-10 w-10 bg-elevated flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-body-sm text-ink truncate">{conv.contact_name}</p>
          <p className="text-caption text-muted truncate">
            {formatPhone(conv.contact_phone)}
            {conv.last_message && ` · ${truncate(conv.last_message.content, 50)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-sm flex-shrink-0 ml-sm">
        <Badge variant={statusVariant}>{conv.status}</Badge>
        {conv.assigned_agent_name && (
          <span className="text-caption text-muted hidden sm:inline">
            {conv.assigned_agent_name}
          </span>
        )}
        <span className="text-caption text-muted whitespace-nowrap">
          {formatRelativeDate(conv.updated_at)}
        </span>
      </div>
    </div>
  );
}

/* ── Conversations List ── */
function ConversationsList({ status }: { status?: string }) {
  const { data, isLoading } = useConversations({ status });
  const conversations = data?.data ?? [];

  if (isLoading) {
    return <p className="text-body-sm text-muted py-xl text-center">Carregando...</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="text-body-sm text-muted py-xl text-center">
        Nenhuma conversa encontrada
      </p>
    );
  }

  return (
    <div className="bg-card border border-hairline">
      {conversations.map((conv) => (
        <ConversationRow key={conv.id} conv={conv} />
      ))}
    </div>
  );
}

/* ── Page ── */
export default function Conversations() {
  const queryClient = useQueryClient();
  const { on } = useSocket();

  // Socket.io: atualiza lista quando conversa muda
  useEffect(() => {
    const cleanup = on('conversations:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return cleanup;
  }, [on, queryClient]);

  return (
    <div className="space-y-lg max-w-[900px]">
      {/* Header */}
      <div>
        <h2 className="text-display-sm text-ink uppercase">Conversas</h2>
        <MStripe className="mt-sm max-w-[120px]" />
      </div>

      {/* Tabs Filter */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="bot">Bot</TabsTrigger>
          <TabsTrigger value="human">Humano</TabsTrigger>
          <TabsTrigger value="closed">Fechadas</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ConversationsList />
        </TabsContent>
        <TabsContent value="bot">
          <ConversationsList status="bot" />
        </TabsContent>
        <TabsContent value="human">
          <ConversationsList status="human" />
        </TabsContent>
        <TabsContent value="closed">
          <ConversationsList status="closed" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
