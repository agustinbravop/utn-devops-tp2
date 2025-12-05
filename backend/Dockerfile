FROM node:22-alpine

WORKDIR /usr/src/app

COPY src ./src
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

RUN npm install

ENV REDIS_URL=redis://localhost:6379
ENV PORT=80
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
ENV LOG_LEVEL=info

RUN npm run build

CMD ["npm", "start"]

EXPOSE 80
