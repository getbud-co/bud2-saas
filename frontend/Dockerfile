# ── Dev: Vite dev server com hot-reload ──
FROM node:24.15.0-alpine AS dev
WORKDIR /app
ARG NODE_AUTH_TOKEN
COPY package*.json .npmrc ./
RUN npm install && rm -f .npmrc
COPY . .
RUN rm -f .npmrc
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Build ──
FROM node:24.15.0-alpine AS builder
WORKDIR /app
ARG NODE_AUTH_TOKEN
COPY package*.json .npmrc ./
RUN npm install && rm -f .npmrc
COPY . .
RUN rm -f .npmrc
RUN npm run build

# ── Prod: nginx ──
FROM nginx:stable-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
