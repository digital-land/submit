FROM node:20-alpine

RUN npm install -g npm

COPY package.json .

RUN npm install

COPY . .

ENV PORT=3000

expose 3000

CMD ["npm", "start"]