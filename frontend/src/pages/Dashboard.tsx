import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  Mail,
  Bot,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MStripe } from '@/components/ui/MStripe';
import api from '@/lib/api';
import { formatRelativeDate, formatPhone, truncate } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversation';

/* ── Types ── */
interface Stats {
  total_contacts: number;
  contacts_today: number;
  open_conversations: number;
  bot_conversations: number;
  human_conversations: number;
  closed_conversations: number;
  closed_today: number;
  messages_today: number;
  pipeline_summary: { stage: string; color: string; count: number }[];
  agents_active: number;
}

/* ── Stat Card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sublabel?: string;
}) {
  return (
    <Card className="group hover:border-ink/30 transition-fast">
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-label text-muted mb-sm">{label}</p>
          <p className="text-stat">{value}</p>
          {sublabel && (
            <p className="text-caption text-muted mt-xs">{sublabel}</p>
          )}
        </div>
        <div className="h-10 w-10 bg-elevated flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted group-hover:text-ink transition-fast" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Pipeline Bar ── */
function PipelineBar({ stages }: { stages: Stats['pipeline_summary'] }) {
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardContent>
        <p className="text-label text-muted mb-md">Pipeline</p>
        <div className="space-y-sm">
          {stages.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-sm">
              <span className="text-body-sm text-body w-32 truncate">
                {stage.stage}
              </span>
              <div className="flex-1 h-2 bg-elevated overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: total > 0 ? `${(stage.count / total) * 100}%` : '0%',
                    backgroundColor: stage.color || '#1c69d4',
                  }}
                />
              </div>
              <span className="text-caption text-muted w-8 text-right">
                {stage.count}
              </span>
            </div>
          ))}
        </div>
        {stages.length === 0 && (
          <p className="text-body-sm text-muted">Nenhum card no pipeline</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Dashboard Page ── */
export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get('/stats');
      return data;
    },
    refetchInterval: 30_000, // 30 segundos
  });

  const { data: conversations } = useConversations({ page: 1 });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-body text-muted">Carregando dashboard...</p>
      </div>
    );
  }

  const recentConversations = conversations?.data?.slice(0, 5) ?? [];

  return (
    <div className="space-y-lg max-w-[1200px]">
      {/* Header */}
      <div>
        <h2 className="text-display-sm text-ink uppercase">Dashboard</h2>
        <MStripe className="mt-sm max-w-[120px]" />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard
          icon={Users}
          label="Contatos"
          value={stats.total_contacts}
          sublabel={`+${stats.contacts_today} hoje`}
        />
        <StatCard
          icon={MessageSquare}
          label="Conversas Abertas"
          value={stats.open_conversations + stats.bot_conversations + stats.human_conversations}
        />
        <StatCard
          icon={Mail}
          label="Mensagens Hoje"
          value={stats.messages_today}
        />
        <StatCard
          icon={Bot}
          label="Agentes Ativos"
          value={stats.agents_active}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Conversation breakdown */}
        <Card>
          <CardContent>
            <p className="text-label text-muted mb-md">Conversas por Status</p>
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <Bot className="h-4 w-4 text-m-blue" />
                  <span className="text-body-sm">Bot</span>
                </div>
                <span className="text-body-sm text-ink font-bold">{stats.bot_conversations}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <Users className="h-4 w-4 text-success" />
                  <span className="text-body-sm">Humano</span>
                </div>
                <span className="text-body-sm text-ink font-bold">{stats.human_conversations}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <Clock className="h-4 w-4 text-muted" />
                  <span className="text-body-sm">Fechadas</span>
                </div>
                <span className="text-body-sm text-ink font-bold">{stats.closed_conversations}</span>
              </div>
              <div className="border-t border-hairline pt-sm mt-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-body-sm">Fechadas hoje</span>
                  </div>
                  <span className="text-body-sm text-ink font-bold">{stats.closed_today}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline summary */}
        <div className="lg:col-span-2">
          <PipelineBar stages={stats.pipeline_summary} />
        </div>
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardContent>
          <p className="text-label text-muted mb-md">Conversas Recentes</p>
          <div className="divide-y divide-hairline">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between py-sm hover:bg-elevated/30 px-sm -mx-sm transition-fast cursor-pointer"
              >
                <div className="flex items-center gap-sm min-w-0">
                  <div className="h-8 w-8 bg-elevated flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm text-ink truncate">
                      {conv.contact_name}
                    </p>
                    <p className="text-caption text-muted truncate">
                      {conv.contact_phone ? formatPhone(conv.contact_phone) : ''}
                      {conv.last_message ? ` · ${truncate(conv.last_message.content, 40)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-sm flex-shrink-0 ml-sm">
                  <Badge variant={conv.status === 'bot' ? 'bot' : conv.status === 'human' ? 'human' : 'closed'}>
                    {conv.status}
                  </Badge>
                  <span className="text-caption text-muted whitespace-nowrap">
                    {formatRelativeDate(conv.updated_at)}
                  </span>
                </div>
              </div>
            ))}
            {recentConversations.length === 0 && (
              <p className="text-body-sm text-muted py-md text-center">
                Nenhuma conversa recente
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
