FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Scripts are skipped so the husky prepare hook does not run without a git repository
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build -- --configuration production

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build --chown=nginx:nginx /app/dist/sofia-web-spa /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 nginx/40-runtime-env.sh /docker-entrypoint.d/40-runtime-env.sh

EXPOSE 8080
