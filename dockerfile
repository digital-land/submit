FROM node:20-alpine
RUN npm install -g npm
COPY package-lock.json .
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]