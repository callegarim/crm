import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Bot, Thermometer, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { MStripe } from '@/components/ui/MStripe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import api from '@/lib/api';

/* ── Types ── */
interface Agent {
  id: string;
  name: string;
  role: string | null;
  system_prompt: string;
  llm_model: string;
  temperature: number;
  typing_delay_ms: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ── Agent Card ── */
function AgentCard({
  agent,
  onEdit,
}: {
  agent: Agent;
  onEdit: (agent: Agent) => void;
}) {
  return (
    <Card className="hover:border-ink/30 transition-fast">
      <CardContent className="space-y-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-sm">
            <div className="h-10 w-10 bg-elevated flex items-center justify-center">
              <Bot className="h-5 w-5 text-m-blue" />
            </div>
            <div>
              <p className="text-body-sm text-ink">{agent.name}</p>
              {agent.role && (
                <p className="text-caption text-muted">{agent.role}</p>
              )}
            </div>
          </div>
          <Badge variant={agent.is_active ? 'active' : 'inactive'}>
            {agent.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className="flex items-center gap-lg text-caption text-muted">
          <div className="flex items-center gap-xxs">
            <Bot className="h-3 w-3" />
            <span>{agent.llm_model}</span>
          </div>
          <div className="flex items-center gap-xxs">
            <Thermometer className="h-3 w-3" />
            <span>{agent.temperature}</span>
          </div>
          <div className="flex items-center gap-xxs">
            <Clock className="h-3 w-3" />
            <span>{(agent.typing_delay_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>

        <p className="text-body-sm text-body line-clamp-2 font-light">
          {agent.system_prompt}
        </p>

        <Button variant="outline" size="sm" onClick={() => onEdit(agent)} className="w-full">
          Editar
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Page ── */
export default function Agents() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formModel, setFormModel] = useState('llama-3.3-70b-versatile');
  const [formTemp, setFormTemp] = useState('0.7');
  const [formDelay, setFormDelay] = useState('5000');
  const [formActive, setFormActive] = useState(true);

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents');
      return data;
    },
  });

  // Create agent
  const createAgent = useMutation({
    mutationFn: async (body: Partial<Agent>) => {
      const { data } = await api.post('/agents', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      closeDialog();
    },
  });

  // Update agent
  const updateAgent = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Agent> }) => {
      const { data } = await api.put(`/agents/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      closeDialog();
    },
  });

  const openCreateDialog = () => {
    setEditingAgent(null);
    setFormName('');
    setFormRole('');
    setFormPrompt('');
    setFormModel('llama-3.3-70b-versatile');
    setFormTemp('0.7');
    setFormDelay('5000');
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormRole(agent.role || '');
    setFormPrompt(agent.system_prompt);
    setFormModel(agent.llm_model);
    setFormTemp(String(agent.temperature));
    setFormDelay(String(agent.typing_delay_ms));
    setFormActive(agent.is_active);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAgent(null);
  };

  const handleSubmit = () => {
    const body = {
      name: formName,
      role: formRole || null,
      system_prompt: formPrompt,
      llm_model: formModel,
      temperature: parseFloat(formTemp),
      typing_delay_ms: parseInt(formDelay),
      is_active: formActive,
    };

    if (editingAgent) {
      updateAgent.mutate({ id: editingAgent.id, body });
    } else {
      createAgent.mutate(body);
    }
  };

  return (
    <div className="space-y-lg max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-display-sm text-ink uppercase">Agentes IA</h2>
          <MStripe className="mt-sm max-w-[120px]" />
        </div>
        <Button variant="m-blue" onClick={openCreateDialog} id="agents-new-btn">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-body-sm text-muted py-xl text-center">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onEdit={openEditDialog} />
          ))}
          {agents.length === 0 && (
            <p className="text-body-sm text-muted col-span-full text-center py-xl">
              Nenhum agente criado
            </p>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Editar Agente' : 'Novo Agente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-md max-h-[60vh] overflow-y-auto pr-sm">
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="text-label text-muted">Nome</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do agente"
                  id="agent-name-input"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label text-muted">Role</label>
                <Input
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="Ex: Atendimento, Vendas"
                  id="agent-role-input"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="text-label text-muted">System Prompt</label>
              <Textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="Instruções para o agente de IA..."
                className="min-h-[200px]"
                id="agent-prompt-input"
              />
            </div>

            <div className="grid grid-cols-3 gap-md">
              <div className="space-y-xs">
                <label className="text-label text-muted">Modelo LLM</label>
                <Select value={formModel} onValueChange={setFormModel}>
                  <SelectTrigger id="agent-model-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-xs">
                <label className="text-label text-muted">Temperatura</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formTemp}
                  onChange={(e) => setFormTemp(e.target.value)}
                  id="agent-temp-input"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label text-muted">Delay (ms)</label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  max="60000"
                  value={formDelay}
                  onChange={(e) => setFormDelay(e.target.value)}
                  id="agent-delay-input"
                />
              </div>
            </div>

            <div className="flex items-center gap-sm">
              <label className="text-label text-muted">Status:</label>
              <Button
                variant={formActive ? 'm-blue' : 'outline'}
                size="sm"
                onClick={() => setFormActive(true)}
              >
                Ativo
              </Button>
              <Button
                variant={!formActive ? 'danger' : 'outline'}
                size="sm"
                onClick={() => setFormActive(false)}
              >
                Inativo
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              variant="m-blue"
              onClick={handleSubmit}
              disabled={!formName || !formPrompt || createAgent.isPending || updateAgent.isPending}
            >
              {(createAgent.isPending || updateAgent.isPending) ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
