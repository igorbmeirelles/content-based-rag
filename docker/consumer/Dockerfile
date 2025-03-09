FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

COPY tsconfig.json ./

RUN npm install

COPY .env ./

COPY ./src ./src

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "npm", "run", "consumer-dev" ]