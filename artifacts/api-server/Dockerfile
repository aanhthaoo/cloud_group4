FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY artifacts/api-server ./artifacts/api-server

RUN pnpm install --filter ./artifacts/api-server --prod

WORKDIR /app/artifacts/api-server

EXPOSE 5000

CMD ["node", "src/index.js"]
