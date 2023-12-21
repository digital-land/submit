FROM node:20-alpine

RUN npm install -g npm

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

ENV PORT=5000

expose 5000

CMD ["npm", "start"]