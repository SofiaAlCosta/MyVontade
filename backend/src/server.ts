import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { Pool } from "pg";
import { auth } from "express-oauth2-jwt-bearer";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-check", async (req, res) => {
  const result = await pool.query("SELECT 1 as ok");
  res.json({ db: result.rows[0].ok });
});

app.get("/api/private", checkJwt, (req, res) => {
  res.json({ message: "Token válido" });
});

app.use((err: any, req: any, res: any, next: any) => {
  if (err?.name === "UnauthorizedError") {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.status(500).json({ error: "server_error" });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API a correr na porta ${port}`);
});