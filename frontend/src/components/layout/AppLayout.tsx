import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useSocket } from '@/hooks/useSocket';

/**
 * AppLayout — wrapper das páginas autenticadas.
 * Sidebar fixa à esquerda + TopBar no topo + conteúdo principal.
 * Inicializa a conexão Socket.io automaticamente.
 */
export default function AppLayout() {
  const { socket } = useSocket();

  // Socket.io: conecta ao montar
  useEffect(() => {
    if (!socket) return;
    // Socket está conectado via hook — nada a fazer aqui
  }, [socket]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar fixa */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 ml-sidebar flex flex-col">
        <TopBar />
        <main className="flex-1 p-lg overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
