FROM node:22-alpine

WORKDIR /usr/src/app

COPY src ./src
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

RUN npm install

ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV PORT=80

RUN npm run build

CMD ["npm", "start"]

EXPOSE 80
