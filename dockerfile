# Stage 1: Build
FROM node:20-alpine as build

RUN npm install -g npm@10.3.0

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=build config config
COPY --from=build node_modules node_modules
COPY --from=build src src
COPY --from=build public public
COPY --from=build index.js .
COPY --from=build package.json .

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]