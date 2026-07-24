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
