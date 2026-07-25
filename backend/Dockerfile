FROM node:24-alpine

WORKDIR /app

# Instala dependências (inclui devDependencies porque a app arranca via
# ts-node-dev em modo transpile-only). Para uma demo é suficiente; uma versão
# de produção "a sério" compilaria com tsc e correria node dist/server.js.
COPY package*.json ./
RUN npm ci --include=dev

COPY . .

ENV NODE_ENV=production

# A app usa a variável PORT (definida pelo Render); 3001 é só o valor local.
EXPOSE 3001

CMD ["npm", "run", "start"]
