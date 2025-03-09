FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

COPY tsconfig.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 3000
