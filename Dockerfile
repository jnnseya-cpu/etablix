FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared

# Persistent state (JSON store + uploaded documents) lives here — mount a
# volume over /app/backend/data in production.
VOLUME ["/app/backend/data"]

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/server.js"]
