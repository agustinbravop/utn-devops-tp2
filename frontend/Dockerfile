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

# Placeholder value will be replaced at runtime in entrypoint.sh.
ENV VITE_API_URL=__VITE_API_URL__

RUN npm run build

# Levantar el servidor web.
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY entrypoint.sh /docker-entrypoint.sh
# Ensure file uses Unix line endings and is executable (fixes Windows CRLF issues).
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
