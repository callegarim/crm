import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { MStripe } from '@/components/ui/MStripe';
import api from '@/lib/api';

/* ── Types ── */
interface SettingsData {
  business_hours?: { start: string; end: string };
  away_message?: string;
  evolution_url?: string;
  [key: string]: unknown;
}

/* ── Page ── */
export default function Settings() {
  const queryClient = useQueryClient();

  // Form state
  const [hoursStart, setHoursStart] = useState('08:00');
  const [hoursEnd, setHoursEnd] = useState('18:00');
  const [awayMessage, setAwayMessage] = useState('');
  const [evolutionUrl, setEvolutionUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch settings
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      if (settings.business_hours) {
        setHoursStart(settings.business_hours.start || '08:00');
        setHoursEnd(settings.business_hours.end || '18:00');
      }
      if (settings.away_message) setAwayMessage(settings.away_message as string);
      if (settings.evolution_url) setEvolutionUrl(settings.evolution_url as string);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (body: Partial<SettingsData>) => {
      const { data } = await api.put('/settings', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSaveGeneral = () => {
    saveMutation.mutate({ away_message: awayMessage });
  };

  const handleSaveEvolution = () => {
    saveMutation.mutate({ evolution_url: evolutionUrl });
  };

  const handleSaveHours = () => {
    saveMutation.mutate({
      business_hours: { start: hoursStart, end: hoursEnd },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-body text-muted">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-[800px]">
      {/* Header */}
      <div>
        <h2 className="text-display-sm text-ink uppercase">Configurações</h2>
        <MStripe className="mt-sm max-w-[120px]" />
      </div>

      {/* Success feedback */}
      {saveSuccess && (
        <div className="bg-success/10 border border-success/30 px-md py-sm">
          <p className="text-body-sm text-success">✅ Configurações salvas com sucesso!</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="evolution">Evolution API</TabsTrigger>
          <TabsTrigger value="hours">Horário Comercial</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardContent className="space-y-md">
              <div className="space-y-xs">
                <label className="text-label text-muted">Mensagem de Ausência</label>
                <Textarea
                  value={awayMessage}
                  onChange={(e) => setAwayMessage(e.target.value)}
                  placeholder="Mensagem enviada fora do horário comercial..."
                  className="min-h-[150px]"
                  id="settings-away-message"
                />
                <p className="text-caption text-muted">
                  Esta mensagem é enviada automaticamente quando o atendimento está fora do horário comercial.
                </p>
              </div>
              <Button
                variant="m-blue"
                onClick={handleSaveGeneral}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolution API Tab */}
        <TabsContent value="evolution">
          <Card>
            <CardContent className="space-y-md">
              <div className="space-y-xs">
                <label className="text-label text-muted">URL da Evolution API</label>
                <Input
                  value={evolutionUrl}
                  onChange={(e) => setEvolutionUrl(e.target.value)}
                  placeholder="https://evolution.seudominio.com"
                  type="url"
                  id="settings-evolution-url"
                />
                <p className="text-caption text-muted">
                  URL base da Evolution API para envio/recebimento de mensagens WhatsApp.
                </p>
              </div>
              <Button
                variant="m-blue"
                onClick={handleSaveEvolution}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Hours Tab */}
        <TabsContent value="hours">
          <Card>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="text-label text-muted">Abertura</label>
                  <Input
                    type="time"
                    value={hoursStart}
                    onChange={(e) => setHoursStart(e.target.value)}
                    id="settings-hours-start"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-label text-muted">Fechamento</label>
                  <Input
                    type="time"
                    value={hoursEnd}
                    onChange={(e) => setHoursEnd(e.target.value)}
                    id="settings-hours-end"
                  />
                </div>
              </div>
              <p className="text-caption text-muted">
                Fora do horário comercial, a mensagem de ausência será enviada automaticamente.
              </p>
              <Button
                variant="m-blue"
                onClick={handleSaveHours}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
