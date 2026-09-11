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
# content/ IS NOT OPTIONAL, and leaving it out did not degrade the blog — it
# stopped the server booting. backend/lib/blog.js reads content/blog at
# startup, so the container died with ENOENT on scandir before it bound a
# port. The Render route never showed it: that build runs npm ci against the
# whole repository checkout, so the directory was always there. The container
# route, which is the documented Docker and VPS path, could not start at all.
COPY content ./content
# The build stamp, so /api/health can say which commit is live. Optional: the
# application falls back to the BUILD_COMMIT environment variable.
COPY BUILD_COMMIT ./BUILD_COMMIT

# Persistent state (the SQLite database + uploaded documents) lives here — mount a
# volume over /app/backend/data in production.
VOLUME ["/app/backend/data"]

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/server.js"]
