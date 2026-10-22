# Node 22, because the store uses node:sqlite from the standard library —
# a real transactional database with no dependency to install and no server
# to host. See backend/lib/store.js.
#
# THE TAG FLOATS ON PURPOSE, AND THE BUILD MUST PULL FOR THAT TO MEAN ANYTHING.
# node:22-alpine tracks the newest 22.x, so a security release reaches this
# image without anybody editing this line — but only if the build fetches the
# tag again. `docker build` on its own reuses the cached base layer, which is
# how this container was still running 22.22.2 the day after Node shipped
# 22.23.4 to fix an out-of-bounds write in the Brotli decoder that can lead to
# remote code execution (CVE-2026-111497). That one matters here specifically:
# the signals watcher fetches fifteen external sites, and Node's fetch asks
# for Brotli by default, so the decoder sees data this business does not
# control. deploy.sh and staging.sh therefore build with --pull.
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
