# MyVontade

## Como colocar o projeto a funcionar

### Pré-requisitos

- Docker Desktop aberto
- Node.js instalado
- `npm` disponível no terminal

### Primeira vez

1. Na raiz do projeto, entre na pasta da infraestrutura:

```powershell
cd infrastructure
```

1a. Crie o ficheiro `.env` (a partir de `.env.example`) e defina um `JWT_SECRET`.
A API não arranca sem um segredo com pelo menos 32 caracteres. Para gerar um:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

2. Inicie a base de dados e a API:

```powershell
docker compose up -d
```

3. Volte à raiz e entre no frontend:

```powershell
cd ..
cd frontend
```

4. Instale as dependências do frontend:

```powershell
npm install
```

5. Arranque o frontend:

```powershell
npm run dev
```

6. Abra no navegador:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

### Utilização normal

Depois da primeira vez, normalmente basta:

```powershell
cd infrastructure
docker compose up -d
cd ..
cd frontend
npm run dev
```

### O que corre em cada parte

- `docker compose up -d` arranca a base de dados PostgreSQL e a API
- `npm run dev` na pasta `frontend` arranca a interface web
- Não é necessário arrancar o backend manualmente fora do Docker

### Como parar tudo

Para parar os serviços Docker:

```powershell
cd infrastructure
docker compose down
```

Para parar o frontend, use `Ctrl + C` no terminal onde executou `npm run dev`.

### Nota

Se adicionar novas dependências ao frontend, execute novamente:

```powershell
npm install
```

## Testes

Existem testes end-to-end da autenticação e do registo de acessos em
`backend/scripts/`. Com a API a correr (`docker compose up -d`), execute:

```powershell
cd backend
npm run test:e2e
```

Para verificar os tipos do backend sem instalar dependências localmente, pode
usar o contentor da API:

```powershell
docker compose exec api npm run typecheck
```

## Recuperação de palavra-passe (email)

O fluxo de "esqueci-me da palavra-passe" envia um link por email. Configure as
credenciais SMTP no `infrastructure/.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_PORT`, `SMTP_SECURE`, `MAIL_FROM`) e o `APP_BASE_URL` do frontend.

- **Sem SMTP configurado** (desenvolvimento): o link não é enviado por email, é
  escrito nos logs da API. Veja com `docker compose logs api`.
- **Testar sem email**: defina `EXPOSE_RESET_TOKEN=true` no `.env` (nunca em
  produção) para o endpoint devolver o token na resposta.

Depois de adicionar a dependência de email, reinicie a API para instalar:

```powershell
cd infrastructure
docker compose up -d --build
```

## Integração contínua (CI)

O workflow `.github/workflows/ci.yml` corre automaticamente em cada `push` e
`pull request`:

- **Backend**: arranca um PostgreSQL, verifica os tipos (`npm run typecheck`) e
  corre os testes end-to-end (`npm run test:e2e`).
- **Frontend**: faz o build (`npm run build`), que inclui a verificação de tipos.
