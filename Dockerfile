# Node 22, because the store uses node:sqlite from the standard library —
# a real transactional database with no dependency to install and no server
# to host. See backend/lib/store.js.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared

# Persistent state (the SQLite database + uploaded documents) lives here — mount a
# volume over /app/backend/data in production.
VOLUME ["/app/backend/data"]

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/server.js"]
