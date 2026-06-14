// backend/src/services/socket.service.js
// Gerencia broadcast WebSocket via Socket.io

const jwt = require('jsonwebtoken');
const env = require('../config/env');

let ioInstance = null;

const socketService = {
  /**
   * Inicializa o Socket.io com autenticação JWT no handshake.
   * Chamado uma vez no server.js.
   */
  init(io) {
    ioInstance = io;

    // Auth JWT no handshake — rejeita conexões sem token válido
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Token de autenticação não fornecido'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Token inválido'));
      }
    });

    // Conexão estabelecida
    io.on('connection', (socket) => {
      console.log(`🔌 Socket conectado: ${socket.user.email} (${socket.id})`);

      // Entra na sala de uma conversa
      socket.on('joinConversation', (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`📥 ${socket.user.email} entrou na conversa ${conversationId}`);
      });

      // Sai da sala de uma conversa
      socket.on('leaveConversation', (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
      });

      // Desconexão
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Socket desconectado: ${socket.user.email} — ${reason}`);
      });
    });

    console.log('✅ Socket.io inicializado com auth JWT');
  },

  /**
   * Envia nova mensagem para todos na sala da conversa
   */
  broadcastNewMessage(conversationId, message) {
    if (!ioInstance) return;
    ioInstance.to(`conversation:${conversationId}`).emit('new-message', message);
    // Broadcast global para atualizar lista de conversas
    ioInstance.emit('conversations:updated', { conversationId });
  },

  /**
   * Notifica mudança de status de uma conversa
   */
  broadcastConversationUpdate(conversationId, data) {
    if (!ioInstance) return;
    ioInstance.to(`conversation:${conversationId}`).emit('conversation:status-changed', data);
    ioInstance.emit('conversations:updated', { conversationId });
  },

  /**
   * Notifica movimentação de card no pipeline (broadcast global)
   */
  broadcastPipelineUpdate(cardData) {
    if (!ioInstance) return;
    ioInstance.emit('pipeline:card-moved', cardData);
  },

  /**
   * Retorna instância do io
   */
  getIO() {
    return ioInstance;
  },
};

module.exports = socketService;
