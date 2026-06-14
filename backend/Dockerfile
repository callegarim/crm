FROM node:20-alpine AS base

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --only=production

# Copia source
COPY src/ ./src/

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

EXPOSE 3001

CMD ["node", "src/server.js"]
