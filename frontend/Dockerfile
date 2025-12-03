# Buildear la app web
FROM node:22-alpine AS builder

WORKDIR /app

COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY package.json ./
COPY package-lock.json ./

RUN npm install

ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Levantar el servidor web
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
