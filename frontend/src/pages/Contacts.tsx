import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import { formatPhone, formatDate } from '@/lib/utils';

/* ── Types ── */
interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactsResponse {
  data: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* ── Page ── */
export default function Contacts() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  // Fetch contacts
  const { data, isLoading } = useQuery<ContactsResponse>({
    queryKey: ['contacts', page, search, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/contacts', { params });
      return data;
    },
  });

  // Create contact
  const createContact = useMutation({
    mutationFn: async (body: { name: string; phone: string; email?: string; status: string }) => {
      const { data } = await api.post('/contacts', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      closeDialog();
    },
  });

  // Update contact
  const updateContact = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Contact> }) => {
      const { data } = await api.put(`/contacts/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      closeDialog();
    },
  });

  const contacts = data?.data ?? [];
  const pagination = data?.pagination;

  const openCreateDialog = () => {
    setEditingContact(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormStatus('active');
    setDialogOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormEmail(contact.email || '');
    setFormStatus(contact.status);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingContact(null);
  };

  const handleSubmit = () => {
    const body = {
      name: formName,
      phone: formPhone,
      email: formEmail || undefined,
      status: formStatus,
    };

    if (editingContact) {
      updateContact.mutate({ id: editingContact.id, body });
    } else {
      createContact.mutate(body);
    }
  };

  return (
    <div className="space-y-lg max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-display-sm text-ink uppercase">Contatos</h2>
          <MStripe className="mt-sm max-w-[120px]" />
        </div>
        <Button variant="m-blue" onClick={openCreateDialog} id="contacts-new-btn">
          <Plus className="h-4 w-4 mr-2" />
          Novo Contato
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-md">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-10"
            id="contacts-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-body-sm text-muted py-xl text-center">Carregando...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={() => openEditDialog(contact)}
                >
                  <TableCell className="text-ink">{contact.name}</TableCell>
                  <TableCell>{formatPhone(contact.phone)}</TableCell>
                  <TableCell>{contact.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={contact.status === 'active' ? 'active' : 'inactive'}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{contact.assigned_to_name || '—'}</TableCell>
                  <TableCell className="text-muted">{formatDate(contact.created_at)}</TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-xl text-muted">
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-caption text-muted">
                {pagination.total} contatos · Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-md">
            <div className="space-y-xs">
              <label className="text-label text-muted">Nome</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome completo"
                id="contact-name-input"
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label text-muted">Telefone</label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="5511999999999"
                id="contact-phone-input"
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label text-muted">Email</label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                id="contact-email-input"
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label text-muted">Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger id="contact-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              variant="m-blue"
              onClick={handleSubmit}
              disabled={!formName || !formPhone || createContact.isPending || updateContact.isPending}
            >
              {(createContact.isPending || updateContact.isPending)
                ? 'Salvando...'
                : editingContact
                ? 'Salvar'
                : 'Criar Contato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
