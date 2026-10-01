# Shared runtime for build and production
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-trixie-slim AS base

RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app
USER node

# Stage 1: Build
FROM base AS build

COPY --chown=node:node package.json package-lock.json .

RUN npm ci

COPY --chown=node:node . .

RUN npm run build

# Stage 2: Production
FROM base AS production

WORKDIR /app

COPY --from=build --chown=node:node /app/config config
COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/src src
COPY --from=build --chown=node:node /app/public public
COPY --from=build --chown=node:node /app/index.js .
COPY --from=build --chown=node:node /app/package.json .

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

ARG DEPLOY_TIME
ENV DEPLOY_TIME=$DEPLOY_TIME

ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
