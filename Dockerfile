# ---- Production image for the Unit Task Tracker ----
FROM node:22-alpine

# Version is passed in by Jenkins at build time (e.g. 1.0.15)
ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="unit-task-tracker" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.source="https://github.com/Virajjj11/SIT223-Sprint1-Group"

WORKDIR /app

# Install only production dependencies.
# --ignore-scripts stops third-party packages running install scripts (SonarCloud security finding).
# npm, npx, yarn and corepack are then removed: the app doesn't need them at runtime,
# and removing them shrinks the image and its attack surface (fewer CVEs for Trivy to find).
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Copy only the application code (no tests, no secrets)
COPY src ./src
COPY public ./public

ENV NODE_ENV=production PORT=3000 APP_VERSION=$APP_VERSION
EXPOSE 3000

# Run as the non-root "node" user
USER node

# Docker checks /health so it knows if the app is healthy
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
