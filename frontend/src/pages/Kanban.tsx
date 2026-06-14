import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Phone, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { formatPhone, formatRelativeDate } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';

/* ── Types ── */
interface Stage {
  id: number;
  name: string;
  color: string;
  order_index: number;
}

interface PipelineCard {
  id: string;
  contact_id: string;
  stage_id: number;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  stage_name: string;
  stage_color: string;
  assigned_to_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/* ── Draggable Card ── */
function KanbanCard({ card }: { card: PipelineCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="mb-sm hover:border-ink/30 transition-fast cursor-grab active:cursor-grabbing group">
        <div className="flex items-start gap-xs">
          <button {...listeners} className="mt-1 text-muted hover:text-ink transition-fast">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-ink truncate font-light">
              {card.contact_name}
            </p>
            <div className="flex items-center gap-xxs mt-xxs text-caption text-muted">
              <Phone className="h-3 w-3" />
              <span>{formatPhone(card.contact_phone)}</span>
            </div>
            {card.assigned_to_name && (
              <div className="flex items-center gap-xxs mt-xxs text-caption text-muted">
                <User className="h-3 w-3" />
                <span>{card.assigned_to_name}</span>
              </div>
            )}
            <p className="text-caption text-muted mt-xs">
              {formatRelativeDate(card.updated_at)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Column ── */
function KanbanColumn({
  stage,
  cards,
  onAddCard,
}: {
  stage: Stage;
  cards: PipelineCard[];
  onAddCard: (stageId: number) => void;
}) {
  return (
    <div className="flex-shrink-0 w-72">
      {/* Column header */}
      <div className="flex items-center justify-between mb-sm px-xs">
        <div className="flex items-center gap-sm">
          <div
            className="h-3 w-3"
            style={{ backgroundColor: stage.color || '#1c69d4' }}
          />
          <span className="text-label text-ink">{stage.name}</span>
          <Badge variant="default" className="text-[10px]">
            {cards.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onAddCard(stage.id)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Column content */}
      <div className="bg-soft border border-hairline p-sm min-h-[400px] max-h-[calc(100vh-220px)] overflow-y-auto">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
        {cards.length === 0 && (
          <p className="text-caption text-muted text-center py-xl">
            Nenhum card
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Kanban Page ── */
export default function Kanban() {
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [newCardContactId, setNewCardContactId] = useState('');

  // Fetch stages
  const { data: stages = [] } = useQuery<Stage[]>({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data } = await api.get('/pipeline/stages');
      return data;
    },
  });

  // Fetch cards
  const { data: cards = [] } = useQuery<PipelineCard[]>({
    queryKey: ['pipeline-cards'],
    queryFn: async () => {
      const { data } = await api.get('/pipeline/cards');
      return data;
    },
  });

  // Fetch contacts for the add card dialog
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-simple'],
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params: { limit: 100 } });
      return data;
    },
  });

  // Move card mutation
  const moveCard = useMutation({
    mutationFn: async ({ cardId, stageId }: { cardId: string; stageId: number }) => {
      const { data } = await api.put(`/pipeline/cards/${cardId}`, { stage_id: stageId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-cards'] });
    },
  });

  // Create card mutation
  const createCard = useMutation({
    mutationFn: async ({ contactId, stageId }: { contactId: string; stageId: number }) => {
      const { data } = await api.post('/pipeline/cards', {
        contact_id: contactId,
        stage_id: stageId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-cards'] });
      setAddDialogOpen(false);
      setNewCardContactId('');
    },
  });

  // Socket.io: card-moved
  useEffect(() => {
    const cleanup = on('card-moved', () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-cards'] });
    });
    return cleanup;
  }, [on, queryClient]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find what stage the card was dropped on
    const draggedCard = cards.find((c) => c.id === active.id);
    if (!draggedCard) return;

    // Try to find the target stage — either from the card dropped on, or the column
    const targetCard = cards.find((c) => c.id === over.id);
    if (targetCard && targetCard.stage_id !== draggedCard.stage_id) {
      moveCard.mutate({ cardId: draggedCard.id, stageId: targetCard.stage_id });
    }
  };

  const handleAddCard = (stageId: number) => {
    setSelectedStageId(stageId);
    setAddDialogOpen(true);
  };

  const handleCreateCard = () => {
    if (!newCardContactId || !selectedStageId) return;
    createCard.mutate({ contactId: newCardContactId, stageId: selectedStageId });
  };

  const contacts = contactsData?.data ?? [];

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div>
        <h2 className="text-display-sm text-ink uppercase">Pipeline</h2>
        <MStripe className="mt-sm max-w-[120px]" />
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-md overflow-x-auto pb-md no-scrollbar">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={cards.filter((c) => c.stage_id === stage.id)}
              onAddCard={handleAddCard}
            />
          ))}
        </div>
      </DndContext>

      {/* Add Card Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-md">
            <div className="space-y-xs">
              <label className="text-label text-muted">Contato</label>
              <Select value={newCardContactId} onValueChange={setNewCardContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact: { id: string; name: string; phone: string }) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} — {formatPhone(contact.phone)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="m-blue"
              onClick={handleCreateCard}
              disabled={!newCardContactId || createCard.isPending}
            >
              {createCard.isPending ? 'Criando...' : 'Criar Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
