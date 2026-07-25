# Publicar a MyVontade (grátis) para uma demo

Arquitetura no grátis: **base de dados no Neon**, **backend no Render**,
**frontend na Vercel**. A app já lê tudo por variáveis de ambiente, por isso
só é preciso ligar os fios.

> Avisos para uma demo: o backend grátis do Render **adormece** (o 1.º acesso
> demora ~1 min); os **documentos carregados não persistem** (disco efémero);
> e **não deves usar dados reais de pacientes** num host público gratuito
> (RGPD). Usa dados fictícios.

## 1. Base de dados — Neon

1. Cria conta em https://neon.tech e um projeto (escolhe uma região na Europa).
2. Copia a *connection string* (algo como
   `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`).
   Guarda-a — é o `DATABASE_URL`.

## 2. Backend — Render

Opção simples (dashboard):

1. https://render.com → **New → Web Service** → liga o repositório do GitHub.
2. **Root Directory:** `backend` (o Render deteta o `Dockerfile`).
3. **Plan:** Free. **Health Check Path:** `/api/health`.
4. **Environment** → adiciona:
   - `DATABASE_URL` = a string do Neon
   - `JWT_SECRET` = gera um valor forte (≥32 caracteres)
   - `EXPOSE_RESET_TOKEN` = `false`
   - (SMTP opcional; sem ele o link de recuperação vai para os logs)
5. Faz deploy. No fim tens um URL tipo `https://myvontade-api.onrender.com`.
   Testa `https://…/api/health` (deve responder 200).

> Alternativa: importar o `render.yaml` deste repositório
> (**New → Blueprint**) — cria o serviço já com as variáveis por preencher.

O backend cria as tabelas sozinho no primeiro arranque.

## 3. Frontend — Vercel

1. https://vercel.com → **New Project** → importa o mesmo repositório.
2. **Root Directory:** `frontend` (deteta Vite; build `npm run build`, saída `dist`).
3. **Environment Variables:** `VITE_API_URL` = o URL do backend do Render
   (ex.: `https://myvontade-api.onrender.com`).
4. Deploy. Tens um URL tipo `https://myvontade.vercel.app`.

## 4. Fechar o círculo (CORS + emails)

No Render, define agora e volta a fazer deploy do backend:

- `FRONTEND_ORIGIN` = o URL da Vercel (ex.: `https://myvontade.vercel.app`)
- `APP_BASE_URL` = o mesmo URL (usado nos links de recuperação de palavra-passe)

Ordem resumida: **backend primeiro** (para teres o URL) → **frontend** com
`VITE_API_URL` → **voltar ao backend** para preencher `FRONTEND_ORIGIN`/`APP_BASE_URL`.

## 5. Verificar

- Abre o URL da Vercel, cria uma conta (dados fictícios) e percorre o fluxo.
- Testa a recuperação de palavra-passe: sem SMTP, o link aparece nos **logs do
  serviço no Render**.

## Notas de produção (fora do âmbito de uma demo)

- Compilar o backend com `tsc` e correr `node dist/server.js` (em vez de
  `ts-node-dev`).
- Armazenamento de objetos (S3) para os documentos persistirem.
- Backups da base de dados e monitorização.
