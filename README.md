# MyVontade

## Como colocar o projeto a funcionar

### Pré-requisitos

- Docker Desktop aberto
- Node.js instalado
- `npm` disponível no terminal

### Primeira vez

1. Na raiz do projeto, entra na pasta da infraestrutura:

```powershell
cd infrastructure
```

2. Inicia a base de dados e a API:

```powershell
docker compose up -d
```

3. Volta à raiz e entra no frontend:

```powershell
cd ..
cd frontend
```

4. Instala as dependências do frontend:

```powershell
npm install
```

5. Arranca o frontend:

```powershell
npm run dev
```

6. Abre no navegador:

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
- Não é preciso arrancar o backend manualmente fora do Docker

### Como parar tudo

Para parar os serviços Docker:

```powershell
cd infrastructure
docker compose down
```

Para parar o frontend, usa `Ctrl + C` no terminal onde correste `npm run dev`.

### Nota

Se adicionares novas dependências ao frontend, volta a correr:

```powershell
npm install
```
