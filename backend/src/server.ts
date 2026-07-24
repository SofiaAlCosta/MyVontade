import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { promises as fs } from "fs";
import helmet from "helmet";
import multer from "multer";
import path from "path";
import { Pool } from "pg";

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

const patientDocumentStorageRoot = path.resolve(
  __dirname,
  "..",
  "uploads",
  "patient-documents"
);
const maxPatientDocumentSizeBytes = 10 * 1024 * 1024;
const allowedPatientDocumentExtensions = new Set([
  ".doc",
  ".docx",
  ".jpeg",
  ".jpg",
  ".odt",
  ".pdf",
  ".png",
  ".rtf",
  ".txt",
]);
const allowedPatientDocumentMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nineDigitPattern = /^\d{9}$/;
const doctorLicensePattern = /^\d{4,6}$/;

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function hasValidEmailFormat(value: string) {
  return emailPattern.test(value);
}

function hasValidNineDigitFormat(value: string) {
  return nineDigitPattern.test(value);
}

function hasValidDoctorLicenseFormat(value: string) {
  return doctorLicensePattern.test(value);
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function comparePassword(password: string, storedPassword: string) {
  const parts = storedPassword.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const salt = parts[0];
  const storedHash = parts[1];

  if (!salt || !storedHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (hash.length !== storedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hash, storedHashBuffer);
}

// --- Autenticação por token (JWT HS256, sem dependências externas) ---

const jwtSecret = process.env.JWT_SECRET ?? "";
const jwtExpirySeconds = 60 * 60 * 8; // 8 horas

type AuthTokenPayload = {
  sub: number;
  role: string;
};

function signAuthToken(payload: AuthTokenPayload) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + jwtExpirySeconds };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedBody = Buffer.from(JSON.stringify(body)).toString("base64url");
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

function verifyAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const data = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedBody, "base64url").toString("utf8")
    ) as { sub?: unknown; role?: unknown; exp?: unknown };

    if (typeof decoded.sub !== "number" || typeof decoded.exp !== "number") {
      return null;
    }

    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { sub: decoded.sub, role: String(decoded.role ?? "") };
  } catch {
    return null;
  }
}

type AuthedRequest = express.Request & {
  authUserId?: number;
  authRole?: string;
};

function requireAuth(
  req: AuthedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const header = String(req.headers.authorization ?? "");
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing_token" });
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: "invalid_token" });
  }

  req.authUserId = payload.sub;
  req.authRole = payload.role;

  return next();
}

function requireSelf(
  req: AuthedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (req.authUserId !== userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  return next();
}

// Regista um acesso aos dados de um paciente. Nunca lança: se o registo
// falhar, escreve no log do servidor mas não interrompe o pedido.
async function logAccess(entry: {
  patientUserId: number;
  actorUserId: number;
  actorRole: string;
  action: string;
  resource?: string | null;
}) {
  try {
    await pool.query(
      `
        INSERT INTO access_log (
          patient_user_id,
          actor_user_id,
          actor_role,
          action,
          resource
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        entry.patientUserId,
        entry.actorUserId,
        entry.actorRole,
        entry.action,
        entry.resource ?? null,
      ]
    );
  } catch (error) {
    console.error("Não foi possível registar o acesso.", error);
  }
}

// Limitador simples de tentativas de login (em memória, por IP+email).
const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const loginWindowMs = 15 * 60 * 1000; // 15 minutos
const loginMaxAttempts = 10;

function isLoginRateLimited(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAt > loginWindowMs) {
    return false;
  }

  return entry.count >= loginMaxAttempts;
}

function registerLoginFailure(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAt > loginWindowMs) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }

  entry.count += 1;
}

function clearLoginFailures(key: string) {
  loginAttempts.delete(key);
}

type AccountRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  patient_number: string | null;
  date_of_birth: string | null;
  patient_phone_number: string | null;
  professional_license: string | null;
  specialty: string | null;
  doctor_phone_number: string | null;
  relationship_to_patient: string | null;
  caregiver_phone_number: string | null;
};

type DashboardTone = "positive" | "warning" | "calm" | "soft";
type CaregiverLinkStatus = "pending" | "active";
type CaregiverSharePermissions = {
  canViewInformation: boolean;
  canViewDecisions: boolean;
  canViewDocuments: boolean;
};

type PatientDashboardRow = {
  id: number;
  name: string;
  email: string;
  patient_number: string | null;
  date_of_birth: string | null;
  patient_phone_number: string | null;
  resuscitation_preference: string | null;
  artificial_feeding_preference: string | null;
  pain_management_preference: string | null;
  caregiver_name: string | null;
  caregiver_relationship_to_patient: string | null;
  active_caregiver_count: number;
  pending_caregiver_count: number;
  document_count: number;
};

type PatientDecisionsRow = {
  id: number;
  role: string;
  resuscitation_preference: string | null;
  artificial_feeding_preference: string | null;
  pain_management_preference: string | null;
  notes: string | null;
};

type PatientCaregiverRow = {
  id: number;
  role: string;
  caregiver_name: string | null;
  caregiver_relationship_to_patient: string | null;
  caregiver_phone_number: string | null;
  caregiver_email: string | null;
};

type PatientDocumentRow = {
  id: number;
  title: string;
  document_type: string | null;
  file_name: string;
  file_path: string;
  uploaded_at: string | null;
};

type StoredPatientDocumentRow = PatientDocumentRow & {
  patient_user_id: number;
};

type PatientCaregiverLinkRow = {
  id: number;
  caregiver_user_id: number;
  caregiver_name: string;
  caregiver_email: string;
  caregiver_phone_number: string | null;
  relationship_to_patient: string;
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
  status: CaregiverLinkStatus;
  created_at: string;
  responded_at: string | null;
};

type CaregiverPatientLinkRow = {
  id: number;
  patient_user_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone_number: string | null;
  patient_number: string | null;
  date_of_birth: string | null;
  relationship_to_patient: string;
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
  status: CaregiverLinkStatus;
  created_at: string;
  responded_at: string | null;
};

type ActiveCaregiverLinkAccessRow = {
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
};

type PatientDoctorLinkRow = {
  id: number;
  doctor_user_id: number;
  doctor_name: string;
  doctor_email: string;
  doctor_phone_number: string | null;
  professional_license: string | null;
  specialty: string | null;
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
  status: CaregiverLinkStatus;
  created_at: string;
  responded_at: string | null;
};

type DoctorPatientLinkRow = {
  id: number;
  patient_user_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone_number: string | null;
  patient_number: string | null;
  date_of_birth: string | null;
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
  status: CaregiverLinkStatus;
  created_at: string;
  responded_at: string | null;
};

type ActiveDoctorLinkAccessRow = {
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
};

// Cria as tabelas base (utilizadores e perfis) caso não existam. Tem de
// correr antes das tabelas de links, que referenciam users(id).
async function ensureBaseTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
        CHECK (role IN ('patient', 'doctor', 'caregiver')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      patient_number TEXT,
      date_of_birth DATE,
      phone_number TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctors (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      professional_license TEXT,
      specialty TEXT,
      phone_number TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS caregivers (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      relationship_to_patient TEXT,
      phone_number TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_decisions (
      patient_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      resuscitation_preference TEXT,
      artificial_feeding_preference TEXT,
      pain_management_preference TEXT,
      notes TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS healthcare_proxies (
      patient_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT,
      relationship_to_patient TEXT,
      phone_number TEXT,
      email TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      document_type TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS patient_documents_patient_idx
    ON patient_documents (patient_user_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_log (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS access_log_patient_idx
    ON access_log (patient_user_id, created_at DESC)
  `);
}

async function ensureCaregiverLinksTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_caregiver_links (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship_to_patient TEXT NOT NULL,
      can_view_information BOOLEAN NOT NULL DEFAULT TRUE,
      can_view_decisions BOOLEAN NOT NULL DEFAULT TRUE,
      can_view_documents BOOLEAN NOT NULL DEFAULT TRUE,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'revoked')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ NULL,
      UNIQUE (patient_user_id, caregiver_user_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS patient_caregiver_links_patient_idx
    ON patient_caregiver_links (patient_user_id, status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS patient_caregiver_links_caregiver_idx
    ON patient_caregiver_links (caregiver_user_id, status)
  `);

  await pool.query(`
    ALTER TABLE patient_caregiver_links
    ADD COLUMN IF NOT EXISTS can_view_information BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    ALTER TABLE patient_caregiver_links
    ADD COLUMN IF NOT EXISTS can_view_decisions BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    ALTER TABLE patient_caregiver_links
    ADD COLUMN IF NOT EXISTS can_view_documents BOOLEAN NOT NULL DEFAULT TRUE
  `);
}

async function ensureDoctorLinksTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_doctor_links (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      can_view_information BOOLEAN NOT NULL DEFAULT TRUE,
      can_view_decisions BOOLEAN NOT NULL DEFAULT TRUE,
      can_view_documents BOOLEAN NOT NULL DEFAULT TRUE,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'revoked')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ NULL,
      UNIQUE (patient_user_id, doctor_user_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS patient_doctor_links_patient_idx
    ON patient_doctor_links (patient_user_id, status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS patient_doctor_links_doctor_idx
    ON patient_doctor_links (doctor_user_id, status)
  `);

  await pool.query(`
    ALTER TABLE patient_doctor_links
    ADD COLUMN IF NOT EXISTS can_view_information BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    ALTER TABLE patient_doctor_links
    ADD COLUMN IF NOT EXISTS can_view_decisions BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    ALTER TABLE patient_doctor_links
    ADD COLUMN IF NOT EXISTS can_view_documents BOOLEAN NOT NULL DEFAULT TRUE
  `);
}

function buildCaregiverSharePermissions(row: {
  can_view_information: boolean;
  can_view_decisions: boolean;
  can_view_documents: boolean;
}): CaregiverSharePermissions {
  return {
    canViewInformation: Boolean(row.can_view_information),
    canViewDecisions: Boolean(row.can_view_decisions),
    canViewDocuments: Boolean(row.can_view_documents),
  };
}

function getRequestedCaregiverPermissions(value: unknown): CaregiverSharePermissions {
  const source =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    canViewInformation:
      source.canViewInformation === undefined
        ? true
        : Boolean(source.canViewInformation),
    canViewDecisions:
      source.canViewDecisions === undefined
        ? true
        : Boolean(source.canViewDecisions),
    canViewDocuments:
      source.canViewDocuments === undefined
        ? true
        : Boolean(source.canViewDocuments),
  };
}

function hasAnyCaregiverPermission(permissions: CaregiverSharePermissions) {
  return (
    permissions.canViewInformation ||
    permissions.canViewDecisions ||
    permissions.canViewDocuments
  );
}

function getPatientDocumentStorageDirectory(userId: number) {
  return path.join(patientDocumentStorageRoot, String(userId));
}

function sanitizePatientDocumentBaseName(value: string) {
  const normalizedValue = value
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalizedValue || "document";
}

function createStoredPatientDocumentName(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const baseName = sanitizePatientDocumentBaseName(
    path.basename(originalName, extension)
  );

  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${baseName}${extension}`;
}

function buildStoredPatientDocumentPath(userId: number, fileName: string) {
  return `${userId}/${fileName}`;
}

function resolveStoredPatientDocumentPath(filePath: string) {
  const segments = filePath.split(/[\\/]+/).filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const resolvedPath = path.resolve(patientDocumentStorageRoot, ...segments);
  const relativePath = path.relative(patientDocumentStorageRoot, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return resolvedPath;
}

function isAllowedPatientDocumentFile(file: {
  originalname: string;
  mimetype: string;
}) {
  const extension = path.extname(file.originalname).toLowerCase();

  return (
    allowedPatientDocumentExtensions.has(extension) ||
    allowedPatientDocumentMimeTypes.has(file.mimetype)
  );
}

async function deleteStoredPatientDocument(filePath: string) {
  const resolvedPath = resolveStoredPatientDocumentPath(filePath);

  if (!resolvedPath) {
    return;
  }

  try {
    await fs.unlink(resolvedPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Não foi possível remover o ficheiro do documento.", error);
    }
  }
}

const patientDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const userId = Number.parseInt(String(req.params.id ?? ""), 10);

      if (!Number.isInteger(userId) || userId <= 0) {
        callback(new Error("invalid_user_id"), "");
        return;
      }

      const destinationPath = getPatientDocumentStorageDirectory(userId);

      void fs
        .mkdir(destinationPath, { recursive: true })
        .then(() => {
          callback(null, destinationPath);
        })
        .catch((error: unknown) => {
          callback(error as Error, destinationPath);
        });
    },
    filename: (_req, file, callback) => {
      callback(null, createStoredPatientDocumentName(file.originalname));
    },
  }),
  limits: {
    fileSize: maxPatientDocumentSizeBytes,
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedPatientDocumentFile(file)) {
      callback(new Error("invalid_file"));
      return;
    }

    callback(null, true);
  },
});

function runPatientDocumentUpload(
  req: express.Request,
  res: express.Response
) {
  return new Promise<void>((resolve, reject) => {
    patientDocumentUpload.single("file")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function respondToPatientDocumentUploadError(
  error: unknown,
  res: express.Response
) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "file_too_large" });
    }

    return res.status(400).json({ error: "invalid_file" });
  }

  if (error instanceof Error && error.message === "invalid_file") {
    return res.status(400).json({ error: "invalid_file" });
  }

  if (error instanceof Error && error.message === "invalid_user_id") {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  console.error("Não foi possível processar o upload do documento.", error);
  return res.status(500).json({ error: "server_error" });
}

function buildAccountResponse(row: AccountRow) {
  const phoneNumber =
    row.role === "patient"
      ? row.patient_phone_number
      : row.role === "doctor"
        ? row.doctor_phone_number
        : row.caregiver_phone_number;

  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    },
    profile: {
      phoneNumber: phoneNumber ?? "",
      patientNumber: row.patient_number ?? "",
      dateOfBirth: row.date_of_birth ?? "",
      professionalLicense: row.professional_license ?? "",
      specialty: row.specialty ?? "",
      relationshipToPatient: row.relationship_to_patient ?? "",
    },
  };
}

function hasContent(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function getFilledDecisionCount(row: PatientDashboardRow) {
  return [
    row.resuscitation_preference,
    row.artificial_feeding_preference,
    row.pain_management_preference,
  ].filter(hasContent).length;
}

function getDecisionValue(value: string | null) {
  return value?.trim() || "Por definir";
}

function buildPatientDashboardResponse(row: PatientDashboardRow) {
  const filledDecisionCount = getFilledDecisionCount(row);
  const activeCaregiverCount = Number(row.active_caregiver_count ?? 0);
  const pendingCaregiverCount = Number(row.pending_caregiver_count ?? 0);
  const hasCaregiver = activeCaregiverCount > 0;
  const documentCount = Number(row.document_count ?? 0);
  const hasCompleteAccount = [
    row.name,
    row.email,
    row.patient_phone_number,
    row.patient_number,
    row.date_of_birth,
  ].every(hasContent);

  const directivesTone: DashboardTone =
    filledDecisionCount === 0
      ? "warning"
      : filledDecisionCount < 3
        ? "soft"
        : "positive";
  const directivesValue =
    filledDecisionCount === 0
      ? "Por preencher"
      : filledDecisionCount < 3
        ? "Em curso"
        : "Concluídas";
  const directivesNote =
    filledDecisionCount === 0
      ? "Ainda não existem decisões registadas."
      : filledDecisionCount < 3
        ? `${filledDecisionCount} de 3 decisões principais já foram definidas.`
        : "As 3 decisões principais já foram definidas.";

  const caregiverTone: DashboardTone = hasCaregiver
    ? "positive"
    : pendingCaregiverCount > 0
      ? "warning"
      : "soft";
  const caregiverValue = hasCaregiver
    ? activeCaregiverCount === 1
      ? "1 ligado"
      : `${activeCaregiverCount} ligados`
    : pendingCaregiverCount > 0
      ? "Convite pendente"
      : "Por ligar";
  const caregiverNote = hasCaregiver
    ? `${row.caregiver_name}${hasContent(row.caregiver_relationship_to_patient) ? ` · ${row.caregiver_relationship_to_patient}` : ""}`
    : "Ainda não existe cuidador associado.";

  const resolvedCaregiverNote = hasCaregiver
    ? activeCaregiverCount === 1
      ? "Já existe 1 cuidador ligado a esta conta."
      : `Já existem ${activeCaregiverCount} cuidadores ligados a esta conta.`
    : pendingCaregiverCount > 0
      ? pendingCaregiverCount === 1
        ? "Existe 1 convite de cuidador pendente de aceitação."
        : `Existem ${pendingCaregiverCount} convites de cuidador pendentes de aceitação.`
      : "Ainda não existe nenhum cuidador ligado a uma conta.";

  const documentsTone: DashboardTone =
    documentCount === 0 ? "calm" : "positive";
  const documentsValue =
    documentCount === 0
      ? "Sem ficheiros"
      : documentCount === 1
        ? "1 ficheiro"
        : `${documentCount} ficheiros`;
  const documentsNote =
    documentCount === 0
      ? "Não há documentos carregados nesta área."
      : documentCount === 1
        ? "Existe 1 documento carregado nesta área."
        : `Existem ${documentCount} documentos carregados nesta área.`;

  const accountTone: DashboardTone = hasCompleteAccount ? "positive" : "warning";
  const accountValue = hasCompleteAccount
    ? "Perfil completo"
    : "Perfil incompleto";
  const accountNote = hasCompleteAccount
    ? "Os teus dados principais estão atualizados."
    : "Ainda faltam alguns dados por rever.";

  const nextStep =
    filledDecisionCount === 0
      ? "O melhor ponto de partida é preencher as tuas diretivas principais."
      : !hasCaregiver
        ? "O próximo passo é indicar um cuidador."
        : documentCount === 0
          ? "Podes agora carregar o primeiro documento importante."
          : !hasCompleteAccount
            ? "Revê os teus dados de conta para garantir que estão completos."
            : "O essencial já está tratado. Podes rever as tuas decisões sempre que precisares.";

  return {
    statusCards: [
      {
        key: "directives",
        title: "Diretivas",
        value: directivesValue,
        note: directivesNote,
        tone: directivesTone,
      },
      {
        key: "caregiver",
        title: "Cuidador",
        value: caregiverValue,
        note: resolvedCaregiverNote,
        tone: caregiverTone,
      },
      {
        key: "documents",
        title: "Documentos",
        value: documentsValue,
        note: documentsNote,
        tone: documentsTone,
      },
      {
        key: "account",
        title: "Conta",
        value: accountValue,
        note: accountNote,
        tone: accountTone,
      },
    ],
    decisionsSummary: [
      {
        label: "Reanimação",
        value: getDecisionValue(row.resuscitation_preference),
      },
      {
        label: "Alimentação artificial",
        value: getDecisionValue(row.artificial_feeding_preference),
      },
      {
        label: "Quero sentir menos dor ou ficar mais alerta?",
        value: getDecisionValue(row.pain_management_preference),
      },
    ],
    nextStep,
  };
}

function buildPatientDecisionsResponse(row: PatientDecisionsRow) {
  return {
    resuscitationPreference: row.resuscitation_preference ?? "",
    artificialFeedingPreference: row.artificial_feeding_preference ?? "",
    painManagementPreference: row.pain_management_preference ?? "",
    notes: row.notes ?? "",
  };
}

function buildPatientCaregiverResponse(row: PatientCaregiverRow) {
  return {
    name: row.caregiver_name ?? "",
    relationshipToPatient: row.caregiver_relationship_to_patient ?? "",
    phoneNumber: row.caregiver_phone_number ?? "",
    email: row.caregiver_email ?? "",
  };
}

function buildPatientDocumentResponse(row: PatientDocumentRow) {
  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type ?? "",
    fileName: row.file_name,
    filePath: row.file_path,
    uploadedAt: row.uploaded_at ?? "",
  };
}

function buildPatientCaregiverLinkResponse(row: PatientCaregiverLinkRow) {
  return {
    id: row.id,
    caregiverId: row.caregiver_user_id,
    caregiverName: row.caregiver_name,
    caregiverEmail: row.caregiver_email,
    caregiverPhoneNumber: row.caregiver_phone_number ?? "",
    relationshipToPatient: row.relationship_to_patient,
    permissions: buildCaregiverSharePermissions(row),
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? "",
  };
}

function buildCaregiverPatientLinkResponse(row: CaregiverPatientLinkRow) {
  const permissions = buildCaregiverSharePermissions(row);

  return {
    id: row.id,
    patientId: row.patient_user_id,
    patientName: row.patient_name,
    patientEmail: permissions.canViewInformation ? row.patient_email : "",
    patientPhoneNumber:
      permissions.canViewInformation ? row.patient_phone_number ?? "" : "",
    patientNumber: permissions.canViewInformation ? row.patient_number ?? "" : "",
    dateOfBirth: permissions.canViewInformation ? row.date_of_birth ?? "" : "",
    relationshipToPatient: row.relationship_to_patient,
    permissions,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? "",
  };
}

function buildPatientDoctorLinkResponse(row: PatientDoctorLinkRow) {
  return {
    id: row.id,
    doctorId: row.doctor_user_id,
    doctorName: row.doctor_name,
    doctorEmail: row.doctor_email,
    doctorPhoneNumber: row.doctor_phone_number ?? "",
    professionalLicense: row.professional_license ?? "",
    specialty: row.specialty ?? "",
    permissions: buildCaregiverSharePermissions(row),
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? "",
  };
}

function buildDoctorPatientLinkResponse(row: DoctorPatientLinkRow) {
  const permissions = buildCaregiverSharePermissions(row);

  return {
    id: row.id,
    patientId: row.patient_user_id,
    patientName: row.patient_name,
    patientEmail: permissions.canViewInformation ? row.patient_email : "",
    patientPhoneNumber:
      permissions.canViewInformation ? row.patient_phone_number ?? "" : "",
    patientNumber: permissions.canViewInformation ? row.patient_number ?? "" : "",
    dateOfBirth: permissions.canViewInformation ? row.date_of_birth ?? "" : "",
    permissions,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? "",
  };
}

async function getAccountByUserId(userId: number) {
  const result = await pool.query<AccountRow>(
    `
      SELECT
        users.id,
        users.name,
        users.email,
        users.role,
        patients.patient_number,
        patients.date_of_birth::text AS date_of_birth,
        patients.phone_number AS patient_phone_number,
        doctors.professional_license,
        doctors.specialty,
        doctors.phone_number AS doctor_phone_number,
        caregivers.relationship_to_patient,
        caregivers.phone_number AS caregiver_phone_number
      FROM users
      LEFT JOIN patients ON patients.user_id = users.id
      LEFT JOIN doctors ON doctors.user_id = users.id
      LEFT JOIN caregivers ON caregivers.user_id = users.id
      WHERE users.id = $1
    `,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return buildAccountResponse(row);
}

async function getPatientDashboardByUserId(userId: number) {
  const result = await pool.query<PatientDashboardRow>(
    `
      SELECT
        users.id,
        users.name,
        users.email,
        patients.patient_number,
        patients.date_of_birth::text AS date_of_birth,
        patients.phone_number AS patient_phone_number,
        patient_decisions.resuscitation_preference,
        patient_decisions.artificial_feeding_preference,
        patient_decisions.pain_management_preference,
        healthcare_proxies.name AS caregiver_name,
        healthcare_proxies.relationship_to_patient AS caregiver_relationship_to_patient,
        COALESCE(caregiver_link_totals.active_caregiver_count, 0)::int AS active_caregiver_count,
        COALESCE(caregiver_link_totals.pending_caregiver_count, 0)::int AS pending_caregiver_count,
        COALESCE(document_totals.document_count, 0)::int AS document_count
      FROM users
      INNER JOIN patients ON patients.user_id = users.id
      LEFT JOIN patient_decisions ON patient_decisions.patient_user_id = users.id
      LEFT JOIN healthcare_proxies ON healthcare_proxies.patient_user_id = users.id
      LEFT JOIN (
        SELECT
          patient_user_id,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_caregiver_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_caregiver_count
        FROM patient_caregiver_links
        GROUP BY patient_user_id
      ) AS caregiver_link_totals ON caregiver_link_totals.patient_user_id = users.id
      LEFT JOIN (
        SELECT
          patient_user_id,
          COUNT(*)::int AS document_count
        FROM patient_documents
        GROUP BY patient_user_id
      ) AS document_totals ON document_totals.patient_user_id = users.id
      WHERE users.id = $1
        AND users.role = 'patient'
    `,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return buildPatientDashboardResponse(row);
}

async function getPatientDecisionsByUserId(userId: number) {
  const result = await pool.query<PatientDecisionsRow>(
    `
      SELECT
        users.id,
        users.role,
        patient_decisions.resuscitation_preference,
        patient_decisions.artificial_feeding_preference,
        patient_decisions.pain_management_preference,
        patient_decisions.notes
      FROM users
      INNER JOIN patients ON patients.user_id = users.id
      LEFT JOIN patient_decisions ON patient_decisions.patient_user_id = users.id
      WHERE users.id = $1
        AND users.role = 'patient'
    `,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return buildPatientDecisionsResponse(row);
}

async function getPatientCaregiverByUserId(userId: number) {
  const result = await pool.query<PatientCaregiverRow>(
    `
      SELECT
        users.id,
        users.role,
        healthcare_proxies.name AS caregiver_name,
        healthcare_proxies.relationship_to_patient AS caregiver_relationship_to_patient,
        healthcare_proxies.phone_number AS caregiver_phone_number,
        healthcare_proxies.email AS caregiver_email
      FROM users
      INNER JOIN patients ON patients.user_id = users.id
      LEFT JOIN healthcare_proxies ON healthcare_proxies.patient_user_id = users.id
      WHERE users.id = $1
        AND users.role = 'patient'
    `,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return buildPatientCaregiverResponse(row);
}

async function getPatientDocumentsByUserId(userId: number) {
  const result = await pool.query<PatientDocumentRow>(
    `
      SELECT
        patient_documents.id,
        patient_documents.title,
        patient_documents.document_type,
        patient_documents.file_name,
        patient_documents.file_path,
        patient_documents.uploaded_at::text AS uploaded_at
      FROM users
      INNER JOIN patients ON patients.user_id = users.id
      INNER JOIN patient_documents ON patient_documents.patient_user_id = users.id
      WHERE users.id = $1
        AND users.role = 'patient'
      ORDER BY patient_documents.uploaded_at DESC, patient_documents.id DESC
    `,
    [userId]
  );

  return result.rows.map(buildPatientDocumentResponse);
}

async function getStoredPatientDocumentById(documentId: number) {
  const result = await pool.query<StoredPatientDocumentRow>(
    `
      SELECT
        id,
        patient_user_id,
        title,
        document_type,
        file_name,
        file_path,
        uploaded_at::text AS uploaded_at
      FROM patient_documents
      WHERE id = $1
    `,
    [documentId]
  );

  return result.rows[0] ?? null;
}

async function getPatientCaregiverLinksByUserId(userId: number) {
  const result = await pool.query<PatientCaregiverLinkRow>(
    `
      SELECT
        patient_caregiver_links.id,
        patient_caregiver_links.caregiver_user_id,
        users.name AS caregiver_name,
        users.email AS caregiver_email,
        caregivers.phone_number AS caregiver_phone_number,
        patient_caregiver_links.relationship_to_patient,
        patient_caregiver_links.can_view_information,
        patient_caregiver_links.can_view_decisions,
        patient_caregiver_links.can_view_documents,
        patient_caregiver_links.status,
        patient_caregiver_links.created_at::text AS created_at,
        patient_caregiver_links.responded_at::text AS responded_at
      FROM patient_caregiver_links
      INNER JOIN users ON users.id = patient_caregiver_links.caregiver_user_id
      LEFT JOIN caregivers ON caregivers.user_id = users.id
      WHERE patient_caregiver_links.patient_user_id = $1
        AND patient_caregiver_links.status IN ('pending', 'active')
      ORDER BY
        CASE patient_caregiver_links.status
          WHEN 'active' THEN 0
          ELSE 1
        END,
        patient_caregiver_links.created_at DESC,
        patient_caregiver_links.id DESC
    `,
    [userId]
  );

  return result.rows.map(buildPatientCaregiverLinkResponse);
}

async function getCaregiverPatientLinksByUserId(userId: number) {
  const result = await pool.query<CaregiverPatientLinkRow>(
    `
      SELECT
        patient_caregiver_links.id,
        patient_caregiver_links.patient_user_id,
        users.name AS patient_name,
        users.email AS patient_email,
        patients.phone_number AS patient_phone_number,
        patients.patient_number,
        patients.date_of_birth::text AS date_of_birth,
        patient_caregiver_links.relationship_to_patient,
        patient_caregiver_links.can_view_information,
        patient_caregiver_links.can_view_decisions,
        patient_caregiver_links.can_view_documents,
        patient_caregiver_links.status,
        patient_caregiver_links.created_at::text AS created_at,
        patient_caregiver_links.responded_at::text AS responded_at
      FROM patient_caregiver_links
      INNER JOIN users ON users.id = patient_caregiver_links.patient_user_id
      LEFT JOIN patients ON patients.user_id = users.id
      WHERE patient_caregiver_links.caregiver_user_id = $1
        AND patient_caregiver_links.status IN ('pending', 'active')
      ORDER BY
        CASE patient_caregiver_links.status
          WHEN 'pending' THEN 0
          ELSE 1
        END,
        patient_caregiver_links.created_at DESC,
        patient_caregiver_links.id DESC
    `,
    [userId]
  );

  return result.rows.map(buildCaregiverPatientLinkResponse);
}

async function getActiveCaregiverLinkAccess(
  caregiverUserId: number,
  patientUserId: number
) {
  const result = await pool.query<ActiveCaregiverLinkAccessRow>(
    `
      SELECT
        can_view_information,
        can_view_decisions,
        can_view_documents
      FROM patient_caregiver_links
      WHERE caregiver_user_id = $1
        AND patient_user_id = $2
        AND status = 'active'
    `,
    [caregiverUserId, patientUserId]
  );

  return result.rows[0] ?? null;
}

async function getPatientDoctorLinksByUserId(userId: number) {
  const result = await pool.query<PatientDoctorLinkRow>(
    `
      SELECT
        patient_doctor_links.id,
        patient_doctor_links.doctor_user_id,
        users.name AS doctor_name,
        users.email AS doctor_email,
        doctors.phone_number AS doctor_phone_number,
        doctors.professional_license,
        doctors.specialty,
        patient_doctor_links.can_view_information,
        patient_doctor_links.can_view_decisions,
        patient_doctor_links.can_view_documents,
        patient_doctor_links.status,
        patient_doctor_links.created_at::text AS created_at,
        patient_doctor_links.responded_at::text AS responded_at
      FROM patient_doctor_links
      INNER JOIN users ON users.id = patient_doctor_links.doctor_user_id
      LEFT JOIN doctors ON doctors.user_id = users.id
      WHERE patient_doctor_links.patient_user_id = $1
        AND patient_doctor_links.status IN ('pending', 'active')
      ORDER BY
        CASE patient_doctor_links.status
          WHEN 'active' THEN 0
          ELSE 1
        END,
        patient_doctor_links.created_at DESC,
        patient_doctor_links.id DESC
    `,
    [userId]
  );

  return result.rows.map(buildPatientDoctorLinkResponse);
}

async function getDoctorPatientLinksByUserId(userId: number) {
  const result = await pool.query<DoctorPatientLinkRow>(
    `
      SELECT
        patient_doctor_links.id,
        patient_doctor_links.patient_user_id,
        users.name AS patient_name,
        users.email AS patient_email,
        patients.phone_number AS patient_phone_number,
        patients.patient_number,
        patients.date_of_birth::text AS date_of_birth,
        patient_doctor_links.can_view_information,
        patient_doctor_links.can_view_decisions,
        patient_doctor_links.can_view_documents,
        patient_doctor_links.status,
        patient_doctor_links.created_at::text AS created_at,
        patient_doctor_links.responded_at::text AS responded_at
      FROM patient_doctor_links
      INNER JOIN users ON users.id = patient_doctor_links.patient_user_id
      LEFT JOIN patients ON patients.user_id = users.id
      WHERE patient_doctor_links.doctor_user_id = $1
        AND patient_doctor_links.status IN ('pending', 'active')
      ORDER BY
        CASE patient_doctor_links.status
          WHEN 'pending' THEN 0
          ELSE 1
        END,
        patient_doctor_links.created_at DESC,
        patient_doctor_links.id DESC
    `,
    [userId]
  );

  return result.rows.map(buildDoctorPatientLinkResponse);
}

async function getActiveDoctorLinkAccess(doctorUserId: number, patientUserId: number) {
  const result = await pool.query<ActiveDoctorLinkAccessRow>(
    `
      SELECT
        can_view_information,
        can_view_decisions,
        can_view_documents
      FROM patient_doctor_links
      WHERE doctor_user_id = $1
        AND patient_user_id = $2
        AND status = 'active'
    `,
    [doctorUserId, patientUserId]
  );

  return result.rows[0] ?? null;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-check", async (req, res) => {
  const result = await pool.query("SELECT 1 as ok");
  res.json({ db: result.rows[0].ok });
});

// Todas as rotas /api/users/:id exigem token válido e que :id seja o
// próprio utilizador autenticado. O acesso cruzado (cuidador/médico a um
// paciente) continua a ser validado pelos links dentro de cada endpoint.
app.use("/api/users/:id", requireAuth, requireSelf);

app.get("/api/users/:id/dashboard", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const dashboard = await getPatientDashboardByUserId(userId);

  if (!dashboard) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json(dashboard);
});

// Registo de acessos do paciente: quem (cuidador/médico) viu ou descarregou
// os seus dados, e quando. Protegido por requireSelf, portanto só o próprio
// paciente consegue ver o seu registo.
app.get("/api/users/:id/access-log", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const result = await pool.query<{
    id: number;
    action: string;
    resource: string | null;
    actor_role: string | null;
    actor_name: string | null;
    created_at: string;
  }>(
    `
      SELECT
        access_log.id,
        access_log.action,
        access_log.resource,
        access_log.actor_role,
        actor.name AS actor_name,
        access_log.created_at::text AS created_at
      FROM access_log
      LEFT JOIN users AS actor ON actor.id = access_log.actor_user_id
      WHERE access_log.patient_user_id = $1
      ORDER BY access_log.created_at DESC, access_log.id DESC
      LIMIT 200
    `,
    [userId]
  );

  return res.json({
    entries: result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      resource: row.resource ?? "",
      actorName: row.actor_name ?? "",
      actorRole: row.actor_role ?? "",
      createdAt: row.created_at,
    })),
  });
});

app.get("/api/users/:id/decisions", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const decisions = await getPatientDecisionsByUserId(userId);

  if (!decisions) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json(decisions);
});

app.get("/api/users/:id/caregiver", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const caregiver = await getPatientCaregiverByUserId(userId);

  if (!caregiver) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json(caregiver);
});

app.get("/api/users/:id/caregiver-links", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const links = await getPatientCaregiverLinksByUserId(userId);
  return res.json({ links });
});

app.post("/api/users/:id/caregiver-links", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const caregiverEmail = String(req.body.caregiverEmail ?? "")
    .trim()
    .toLowerCase();
  const relationshipToPatient = String(
    req.body.relationshipToPatient ?? ""
  ).trim();
  const permissions = getRequestedCaregiverPermissions(req.body.permissions);

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const missingFields: string[] = [];

  if (!caregiverEmail) {
    missingFields.push("caregiverEmail");
  }

  if (!relationshipToPatient) {
    missingFields.push("relationshipToPatient");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields,
    });
  }

  if (!hasAnyCaregiverPermission(permissions)) {
    return res.status(400).json({ error: "missing_permissions" });
  }

  if (!hasValidEmailFormat(caregiverEmail)) {
    return res.status(400).json({
      error: "invalid_field_format",
      invalidFields: ["caregiverEmail"],
    });
  }

  const caregiverResult = await pool.query<{ id: number }>(
    `
      SELECT users.id
      FROM users
      INNER JOIN caregivers ON caregivers.user_id = users.id
      WHERE users.email = $1
        AND users.role = 'caregiver'
    `,
    [caregiverEmail]
  );

  const caregiverId = caregiverResult.rows[0]?.id;

  if (!caregiverId) {
    return res.status(404).json({ error: "caregiver_not_found" });
  }

  const existingLinkResult = await pool.query<{
    id: number;
    status: string;
  }>(
    `
      SELECT id, status
      FROM patient_caregiver_links
      WHERE patient_user_id = $1
        AND caregiver_user_id = $2
    `,
    [userId, caregiverId]
  );

  const existingLink = existingLinkResult.rows[0];

  if (existingLink?.status === "active") {
    return res.status(409).json({ error: "caregiver_already_connected" });
  }

  let linkId: number | undefined;
  let statusCode = 201;

  if (existingLink?.id) {
    statusCode = 200;

    const updateResult = await pool.query<{ id: number }>(
      `
        UPDATE patient_caregiver_links
        SET relationship_to_patient = $3,
            can_view_information = $4,
            can_view_decisions = $5,
            can_view_documents = $6,
            status = 'pending',
            responded_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND patient_user_id = $2
        RETURNING id
      `,
      [
        existingLink.id,
        userId,
        relationshipToPatient,
        permissions.canViewInformation,
        permissions.canViewDecisions,
        permissions.canViewDocuments,
      ]
    );

    linkId = updateResult.rows[0]?.id;
  } else {
    const insertResult = await pool.query<{ id: number }>(
      `
        INSERT INTO patient_caregiver_links (
          patient_user_id,
          caregiver_user_id,
          relationship_to_patient,
          can_view_information,
          can_view_decisions,
          can_view_documents
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        userId,
        caregiverId,
        relationshipToPatient,
        permissions.canViewInformation,
        permissions.canViewDecisions,
        permissions.canViewDocuments,
      ]
    );

    linkId = insertResult.rows[0]?.id;
  }

  if (!linkId) {
    return res.status(500).json({ error: "server_error" });
  }

  const links = await getPatientCaregiverLinksByUserId(userId);
  const link = links.find((entry) => entry.id === linkId);

  if (!link) {
    return res.status(500).json({ error: "server_error" });
  }

  return res.status(statusCode).json({ link });
});

app.post("/api/users/:id/caregiver-links/:linkId/revoke", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const linkId = Number.parseInt(String(req.params.linkId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: "invalid_link_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const updateResult = await pool.query(
    `
      UPDATE patient_caregiver_links
      SET status = 'revoked',
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND patient_user_id = $2
        AND status IN ('pending', 'active')
    `,
    [linkId, userId]
  );

  if (updateResult.rowCount === 0) {
    return res.status(404).json({ error: "link_not_found" });
  }

  return res.json({ status: "revoked" });
});

app.put("/api/users/:id/caregiver-links/:linkId/permissions", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const linkId = Number.parseInt(String(req.params.linkId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: "invalid_link_id" });
  }

  const permissions = getRequestedCaregiverPermissions(req.body.permissions);

  if (!hasAnyCaregiverPermission(permissions)) {
    return res.status(400).json({ error: "missing_permissions" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const updateResult = await pool.query<{ id: number }>(
    `
      UPDATE patient_caregiver_links
      SET can_view_information = $3,
          can_view_decisions = $4,
          can_view_documents = $5,
          updated_at = NOW()
      WHERE id = $1
        AND patient_user_id = $2
        AND status IN ('pending', 'active')
      RETURNING id
    `,
    [
      linkId,
      userId,
      permissions.canViewInformation,
      permissions.canViewDecisions,
      permissions.canViewDocuments,
    ]
  );

  const updatedLinkId = updateResult.rows[0]?.id;

  if (!updatedLinkId) {
    return res.status(404).json({ error: "link_not_found" });
  }

  const links = await getPatientCaregiverLinksByUserId(userId);
  const link = links.find((entry) => entry.id === updatedLinkId);

  if (!link) {
    return res.status(500).json({ error: "server_error" });
  }

  return res.json({ link });
});

app.get("/api/users/:id/doctor-links", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const links = await getPatientDoctorLinksByUserId(userId);
  return res.json({ links });
});

app.post("/api/users/:id/doctor-links", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const doctorEmail = String(req.body.doctorEmail ?? "")
    .trim()
    .toLowerCase();
  const permissions = getRequestedCaregiverPermissions(req.body.permissions);

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  if (!doctorEmail) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields: ["doctorEmail"],
    });
  }

  if (!hasAnyCaregiverPermission(permissions)) {
    return res.status(400).json({ error: "missing_permissions" });
  }

  if (!hasValidEmailFormat(doctorEmail)) {
    return res.status(400).json({
      error: "invalid_field_format",
      invalidFields: ["doctorEmail"],
    });
  }

  const doctorResult = await pool.query<{ id: number }>(
    `
      SELECT users.id
      FROM users
      INNER JOIN doctors ON doctors.user_id = users.id
      WHERE users.email = $1
        AND users.role = 'doctor'
    `,
    [doctorEmail]
  );

  const doctorId = doctorResult.rows[0]?.id;

  if (!doctorId) {
    return res.status(404).json({ error: "doctor_not_found" });
  }

  const existingLinkResult = await pool.query<{
    id: number;
    status: string;
  }>(
    `
      SELECT id, status
      FROM patient_doctor_links
      WHERE patient_user_id = $1
        AND doctor_user_id = $2
    `,
    [userId, doctorId]
  );

  const existingLink = existingLinkResult.rows[0];

  if (existingLink?.status === "active") {
    return res.status(409).json({ error: "doctor_already_connected" });
  }

  let linkId: number | undefined;
  let statusCode = 201;

  if (existingLink?.id) {
    statusCode = 200;

    const updateResult = await pool.query<{ id: number }>(
      `
        UPDATE patient_doctor_links
        SET can_view_information = $3,
            can_view_decisions = $4,
            can_view_documents = $5,
            status = 'pending',
            responded_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND patient_user_id = $2
        RETURNING id
      `,
      [
        existingLink.id,
        userId,
        permissions.canViewInformation,
        permissions.canViewDecisions,
        permissions.canViewDocuments,
      ]
    );

    linkId = updateResult.rows[0]?.id;
  } else {
    const insertResult = await pool.query<{ id: number }>(
      `
        INSERT INTO patient_doctor_links (
          patient_user_id,
          doctor_user_id,
          can_view_information,
          can_view_decisions,
          can_view_documents
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        userId,
        doctorId,
        permissions.canViewInformation,
        permissions.canViewDecisions,
        permissions.canViewDocuments,
      ]
    );

    linkId = insertResult.rows[0]?.id;
  }

  if (!linkId) {
    return res.status(500).json({ error: "server_error" });
  }

  const links = await getPatientDoctorLinksByUserId(userId);
  const link = links.find((entry) => entry.id === linkId);

  if (!link) {
    return res.status(500).json({ error: "server_error" });
  }

  return res.status(statusCode).json({ link });
});

app.post("/api/users/:id/doctor-links/:linkId/revoke", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const linkId = Number.parseInt(String(req.params.linkId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: "invalid_link_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const updateResult = await pool.query(
    `
      UPDATE patient_doctor_links
      SET status = 'revoked',
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND patient_user_id = $2
        AND status IN ('pending', 'active')
    `,
    [linkId, userId]
  );

  if (updateResult.rowCount === 0) {
    return res.status(404).json({ error: "link_not_found" });
  }

  return res.json({ status: "revoked" });
});

app.put("/api/users/:id/doctor-links/:linkId/permissions", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const linkId = Number.parseInt(String(req.params.linkId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: "invalid_link_id" });
  }

  const permissions = getRequestedCaregiverPermissions(req.body.permissions);

  if (!hasAnyCaregiverPermission(permissions)) {
    return res.status(400).json({ error: "missing_permissions" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const updateResult = await pool.query<{ id: number }>(
    `
      UPDATE patient_doctor_links
      SET can_view_information = $3,
          can_view_decisions = $4,
          can_view_documents = $5,
          updated_at = NOW()
      WHERE id = $1
        AND patient_user_id = $2
        AND status IN ('pending', 'active')
      RETURNING id
    `,
    [
      linkId,
      userId,
      permissions.canViewInformation,
      permissions.canViewDecisions,
      permissions.canViewDocuments,
    ]
  );

  const updatedLinkId = updateResult.rows[0]?.id;

  if (!updatedLinkId) {
    return res.status(404).json({ error: "link_not_found" });
  }

  const links = await getPatientDoctorLinksByUserId(userId);
  const link = links.find((entry) => entry.id === updatedLinkId);

  if (!link) {
    return res.status(500).json({ error: "server_error" });
  }

  return res.json({ link });
});

app.get("/api/users/:id/patient-links", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "caregiver") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const links = await getCaregiverPatientLinksByUserId(userId);
  return res.json({ links });
});

app.get("/api/users/:id/patient-links/:patientId/overview", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const patientId = Number.parseInt(String(req.params.patientId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({ error: "invalid_patient_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "caregiver") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const accessRow = await getActiveCaregiverLinkAccess(userId, patientId);

  if (!accessRow) {
    return res.status(403).json({ error: "access_denied" });
  }

  const permissions = buildCaregiverSharePermissions(accessRow);

  const [account, dashboard, decisions, documents] = await Promise.all([
    permissions.canViewInformation
      ? getAccountByUserId(patientId)
      : Promise.resolve(null),
    permissions.canViewDecisions
      ? getPatientDashboardByUserId(patientId)
      : Promise.resolve(null),
    permissions.canViewDecisions
      ? getPatientDecisionsByUserId(patientId)
      : Promise.resolve(null),
    permissions.canViewDocuments
      ? getPatientDocumentsByUserId(patientId)
      : Promise.resolve([]),
  ]);

  if (
    (permissions.canViewInformation &&
      (!account || account.user.role !== "patient")) ||
    (permissions.canViewDecisions && (!dashboard || !decisions))
  ) {
    return res.status(404).json({ error: "user_not_found" });
  }

  await logAccess({
    patientUserId: patientId,
    actorUserId: userId,
    actorRole: role,
    action: "view_patient_overview",
  });

  return res.json({
    permissions,
    patient:
      permissions.canViewInformation && account
        ? {
            id: account.user.id,
            name: account.user.name,
            email: account.user.email,
            phoneNumber: account.profile.phoneNumber,
            patientNumber: account.profile.patientNumber,
            dateOfBirth: account.profile.dateOfBirth,
          }
        : null,
    dashboard: permissions.canViewDecisions ? dashboard : null,
    decisions: permissions.canViewDecisions ? decisions : null,
    documents,
  });
});

app.post("/api/users/:id/patient-links/:linkId/accept", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const linkId = Number.parseInt(String(req.params.linkId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: "invalid_link_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "caregiver") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const updateResult = await pool.query<{ id: number }>(
    `
      UPDATE patient_caregiver_links
      SET status = 'active',
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND caregiver_user_id = $2
        AND status = 'pending'
      RETURNING id
    `,
    [linkId, userId]
  );

  const acceptedLinkId = updateResult.rows[0]?.id;

  if (!acceptedLinkId) {
    return res.status(404).json({ error: "link_not_found" });
  }

  const links = await getCaregiverPatientLinksByUserId(userId);
  const link = links.find((entry) => entry.id === acceptedLinkId);

  if (!link) {
    return res.status(500).json({ error: "server_error" });
  }

  return res.json({ link });
});

app.get("/api/users/:id/doctor-patient-links", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "doctor") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const links = await getDoctorPatientLinksByUserId(userId);
  return res.json({ links });
});

app.get("/api/users/:id/doctor-patient-links/:patientId/overview", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const patientId = Number.parseInt(String(req.params.patientId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({ error: "invalid_patient_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "doctor") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const accessRow = await getActiveDoctorLinkAccess(userId, patientId);

  if (!accessRow) {
    return res.status(403).json({ error: "access_denied" });
  }

  const permissions = buildCaregiverSharePermissions(accessRow);

  const [account, dashboard, decisions, documents] = await Promise.all([
    permissions.canViewInformation
      ? getAccountByUserId(patientId)
      : Promise.resolve(null),
    permissions.canViewDecisions
      ? getPatientDashboardByUserId(patientId)
      : Promise.resolve(null),
    permissions.canViewDecisions
      ? getPatientDecisionsByUserId(patientId)
      : Promise.resolve(null),
    permissions.canViewDocuments
      ? getPatientDocumentsByUserId(patientId)
      : Promise.resolve([]),
  ]);

  if (
    (permissions.canViewInformation &&
      (!account || account.user.role !== "patient")) ||
    (permissions.canViewDecisions && (!dashboard || !decisions))
  ) {
    return res.status(404).json({ error: "user_not_found" });
  }

  await logAccess({
    patientUserId: patientId,
    actorUserId: userId,
    actorRole: role,
    action: "view_patient_overview",
  });

  return res.json({
    permissions,
    patient:
      permissions.canViewInformation && account
        ? {
            id: account.user.id,
            name: account.user.name,
            email: account.user.email,
            phoneNumber: account.profile.phoneNumber,
            patientNumber: account.profile.patientNumber,
            dateOfBirth: account.profile.dateOfBirth,
          }
        : null,
    dashboard: permissions.canViewDecisions ? dashboard : null,
    decisions: permissions.canViewDecisions ? decisions : null,
    documents,
  });
});

app.post("/api/users/:id/doctor-patient-links/:linkId/accept", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const linkId = Number.parseInt(String(req.params.linkId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(linkId) || linkId <= 0) {
    return res.status(400).json({ error: "invalid_link_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "doctor") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const updateResult = await pool.query<{ id: number }>(
    `
      UPDATE patient_doctor_links
      SET status = 'active',
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND doctor_user_id = $2
        AND status = 'pending'
      RETURNING id
    `,
    [linkId, userId]
  );

  const acceptedLinkId = updateResult.rows[0]?.id;

  if (!acceptedLinkId) {
    return res.status(404).json({ error: "link_not_found" });
  }

  const links = await getDoctorPatientLinksByUserId(userId);
  const link = links.find((entry) => entry.id === acceptedLinkId);

  if (!link) {
    return res.status(500).json({ error: "server_error" });
  }

  return res.json({ link });
});

app.get("/api/users/:id/documents", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const documents = await getPatientDocumentsByUserId(userId);

  return res.json({ documents });
});

app.get("/api/users/:id/documents/:documentId/file", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const documentId = Number.parseInt(String(req.params.documentId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(documentId) || documentId <= 0) {
    return res.status(400).json({ error: "invalid_document_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  const storedDocument = await getStoredPatientDocumentById(documentId);

  if (!storedDocument) {
    return res.status(404).json({ error: "document_not_found" });
  }

  if (role === "patient") {
    if (storedDocument.patient_user_id !== userId) {
      return res.status(403).json({ error: "access_denied" });
    }
  } else if (role === "caregiver") {
    const accessRow = await getActiveCaregiverLinkAccess(
      userId,
      storedDocument.patient_user_id
    );

    if (!accessRow || !accessRow.can_view_documents) {
      return res.status(403).json({ error: "access_denied" });
    }
  } else if (role === "doctor") {
    const accessRow = await getActiveDoctorLinkAccess(
      userId,
      storedDocument.patient_user_id
    );

    if (!accessRow || !accessRow.can_view_documents) {
      return res.status(403).json({ error: "access_denied" });
    }
  } else {
    return res.status(400).json({ error: "invalid_role" });
  }

  const resolvedPath = resolveStoredPatientDocumentPath(storedDocument.file_path);

  if (!resolvedPath) {
    return res.status(404).json({ error: "file_not_found" });
  }

  try {
    await fs.access(resolvedPath);
  } catch {
    return res.status(404).json({ error: "file_not_found" });
  }

  if (role !== "patient") {
    await logAccess({
      patientUserId: storedDocument.patient_user_id,
      actorUserId: userId,
      actorRole: role,
      action: "download_document",
      resource: storedDocument.file_name,
    });
  }

  return res.download(resolvedPath, storedDocument.file_name);
});

app.get("/api/users/:id/account", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const account = await getAccountByUserId(userId);

  if (!account) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json(account);
});

app.delete("/api/users/:id/account", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const password = String(req.body.password ?? "");

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!password) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields: ["password"],
    });
  }

  const userResult = await pool.query<{ role: string; password: string }>(
    `
      SELECT role, password
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const user = userResult.rows[0];

  if (!user?.role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (!comparePassword(password, user.password)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const client = await pool.connect();
  let storedDocumentFilePaths: string[] = [];

  try {
    await client.query("BEGIN");

    const documentFilePathResult = await client.query<{ file_path: string }>(
      `
        SELECT file_path
        FROM patient_documents
        WHERE patient_user_id = $1
      `,
      [userId]
    );

    storedDocumentFilePaths = documentFilePathResult.rows.map(
      (row) => row.file_path
    );

    await client.query(
      `
        DELETE FROM patient_caregiver_links
        WHERE patient_user_id = $1
           OR caregiver_user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM patient_doctor_links
        WHERE patient_user_id = $1
           OR doctor_user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM patient_documents
        WHERE patient_user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM patient_decisions
        WHERE patient_user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM healthcare_proxies
        WHERE patient_user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM patients
        WHERE user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM doctors
        WHERE user_id = $1
      `,
      [userId]
    );

    await client.query(
      `
        DELETE FROM caregivers
        WHERE user_id = $1
      `,
      [userId]
    );

    const deleteUserResult = await client.query(
      `
        DELETE FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (deleteUserResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "user_not_found" });
    }

    await client.query("COMMIT");
    await Promise.all(
      storedDocumentFilePaths.map((filePath) =>
        deleteStoredPatientDocument(filePath)
      )
    );
    return res.json({ status: "deleted" });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

app.put("/api/users/:id/decisions", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const resuscitationPreference = String(
    req.body.resuscitationPreference ?? ""
  ).trim();
  const artificialFeedingPreference = String(
    req.body.artificialFeedingPreference ?? ""
  ).trim();
  const painManagementPreference = String(
    req.body.painManagementPreference ?? ""
  ).trim();
  const notes = String(req.body.notes ?? "").trim();

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const missingFields: string[] = [];

  if (!resuscitationPreference) {
    missingFields.push("resuscitationPreference");
  }

  if (!artificialFeedingPreference) {
    missingFields.push("artificialFeedingPreference");
  }

  if (!painManagementPreference) {
    missingFields.push("painManagementPreference");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields,
    });
  }

  await pool.query(
    `
      INSERT INTO patient_decisions (
        patient_user_id,
        resuscitation_preference,
        artificial_feeding_preference,
        pain_management_preference,
        notes,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (patient_user_id)
      DO UPDATE SET
        resuscitation_preference = EXCLUDED.resuscitation_preference,
        artificial_feeding_preference = EXCLUDED.artificial_feeding_preference,
        pain_management_preference = EXCLUDED.pain_management_preference,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `,
    [
      userId,
      resuscitationPreference,
      artificialFeedingPreference,
      painManagementPreference,
      notes || null,
    ]
  );

  const decisions = await getPatientDecisionsByUserId(userId);

  if (!decisions) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json(decisions);
});

app.put("/api/users/:id/caregiver", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const name = String(req.body.name ?? "").trim();
  const relationshipToPatient = String(
    req.body.relationshipToPatient ?? ""
  ).trim();
  const phoneNumber = normalizeDigits(String(req.body.phoneNumber ?? ""));
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const missingFields: string[] = [];

  if (!name) {
    missingFields.push("name");
  }

  if (!relationshipToPatient) {
    missingFields.push("relationshipToPatient");
  }

  if (!phoneNumber && !email) {
    missingFields.push("contact");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields,
    });
  }

  const invalidFields: string[] = [];

  if (phoneNumber && !hasValidNineDigitFormat(phoneNumber)) {
    invalidFields.push("phoneNumber");
  }

  if (email && !hasValidEmailFormat(email)) {
    invalidFields.push("email");
  }

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: "invalid_field_format",
      invalidFields,
    });
  }

  await pool.query(
    `
      INSERT INTO healthcare_proxies (
        patient_user_id,
        name,
        relationship_to_patient,
        phone_number,
        email
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (patient_user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        relationship_to_patient = EXCLUDED.relationship_to_patient,
        phone_number = EXCLUDED.phone_number,
        email = EXCLUDED.email
    `,
    [userId, name, relationshipToPatient, phoneNumber || null, email || null]
  );

  const caregiver = await getPatientCaregiverByUserId(userId);

  if (!caregiver) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json(caregiver);
});

app.post("/api/users/:id/documents", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  try {
    await runPatientDocumentUpload(req, res);
  } catch (error) {
    return respondToPatientDocumentUploadError(error, res);
  }

  const title = String(req.body.title ?? "").trim();
  const documentType = String(req.body.documentType ?? "").trim();
  const uploadedFile = req.file;
  const missingFields: string[] = [];

  if (!title) {
    missingFields.push("title");
  }

  if (!uploadedFile) {
    missingFields.push("file");
  }

  if (missingFields.length > 0) {
    if (uploadedFile?.filename) {
      await deleteStoredPatientDocument(
        buildStoredPatientDocumentPath(userId, uploadedFile.filename)
      );
    }

    return res.status(400).json({
      error: "missing_required_fields",
      missingFields,
    });
  }

  if (!uploadedFile) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields: ["file"],
    });
  }

  const fileName = uploadedFile.originalname.trim();
  const filePath = buildStoredPatientDocumentPath(userId, uploadedFile.filename);
  let documentResult;

  try {
    documentResult = await pool.query<PatientDocumentRow>(
      `
        INSERT INTO patient_documents (
          patient_user_id,
          title,
          document_type,
          file_name,
          file_path
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          title,
          document_type,
          file_name,
          file_path,
          uploaded_at::text AS uploaded_at
      `,
      [userId, title, documentType || null, fileName, filePath]
    );
  } catch (error) {
    await deleteStoredPatientDocument(filePath);
    console.error("Não foi possível guardar o documento na base de dados.", error);
    return res.status(500).json({ error: "server_error" });
  }

  const document = documentResult.rows[0];

  if (!document) {
    await deleteStoredPatientDocument(filePath);
    return res.status(500).json({ error: "server_error" });
  }

  return res.status(201).json({
    document: buildPatientDocumentResponse(document),
  });
});

app.delete("/api/users/:id/documents/:documentId", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);
  const documentId = Number.parseInt(String(req.params.documentId ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (!Number.isInteger(documentId) || documentId <= 0) {
    return res.status(400).json({ error: "invalid_document_id" });
  }

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  if (role !== "patient") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const deleteResult = await pool.query<{ file_path: string }>(
    `
      DELETE FROM patient_documents
      WHERE id = $1
        AND patient_user_id = $2
      RETURNING file_path
    `,
    [documentId, userId]
  );

  if (deleteResult.rowCount === 0) {
    return res.status(404).json({ error: "document_not_found" });
  }

  const deletedDocument = deleteResult.rows[0];

  if (deletedDocument?.file_path) {
    await deleteStoredPatientDocument(deletedDocument.file_path);
  }

  return res.json({ status: "deleted" });
});

app.put("/api/users/:id/account", async (req, res) => {
  const userId = Number.parseInt(String(req.params.id ?? ""), 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();
  const phoneNumber = normalizeDigits(String(req.body.phoneNumber ?? ""));
  const patientNumber = normalizeDigits(String(req.body.patientNumber ?? ""));
  const dateOfBirth = String(req.body.dateOfBirth ?? "").trim();
  const professionalLicense = normalizeDigits(
    String(req.body.professionalLicense ?? "")
  );
  const specialty = String(req.body.specialty ?? "").trim();
  const relationshipToPatient = String(
    req.body.relationshipToPatient ?? ""
  ).trim();
  const newPassword = String(req.body.newPassword ?? "");

  const userResult = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const role = userResult.rows[0]?.role;

  if (!role) {
    return res.status(404).json({ error: "user_not_found" });
  }

  const missingFields: string[] = [];

  if (!name) {
    missingFields.push("name");
  }

  if (!email) {
    missingFields.push("email");
  }

  if (!phoneNumber) {
    missingFields.push("phoneNumber");
  }

  if (role === "patient") {
    if (!patientNumber) {
      missingFields.push("patientNumber");
    }

    if (!dateOfBirth) {
      missingFields.push("dateOfBirth");
    }
  }

  if (role === "doctor") {
    if (!professionalLicense) {
      missingFields.push("professionalLicense");
    }

    if (!specialty) {
      missingFields.push("specialty");
    }
  }

  if (role === "caregiver" && !relationshipToPatient) {
    missingFields.push("relationshipToPatient");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields,
    });
  }

  const invalidFields: string[] = [];

  if (!hasValidEmailFormat(email)) {
    invalidFields.push("email");
  }

  if (!hasValidNineDigitFormat(phoneNumber)) {
    invalidFields.push("phoneNumber");
  }

  if (role === "patient" && !hasValidNineDigitFormat(patientNumber)) {
    invalidFields.push("patientNumber");
  }

  if (
    role === "doctor" &&
    !hasValidDoctorLicenseFormat(professionalLicense)
  ) {
    invalidFields.push("professionalLicense");
  }

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: "invalid_field_format",
      invalidFields,
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE users
        SET name = $1,
            email = $2,
            password = COALESCE($3, password)
        WHERE id = $4
      `,
      [name, email, newPassword ? hashPassword(newPassword) : null, userId]
    );

    if (role === "patient") {
      const patientResult = await client.query(
        `
          UPDATE patients
          SET patient_number = $2,
              date_of_birth = $3,
              phone_number = $4
          WHERE user_id = $1
        `,
        [userId, patientNumber, dateOfBirth, phoneNumber]
      );

      if (patientResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "user_not_found" });
      }
    }

    if (role === "doctor") {
      const doctorResult = await client.query(
        `
          UPDATE doctors
          SET professional_license = $2,
              specialty = $3,
              phone_number = $4
          WHERE user_id = $1
        `,
        [userId, professionalLicense, specialty, phoneNumber]
      );

      if (doctorResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "user_not_found" });
      }
    }

    if (role === "caregiver") {
      const caregiverResult = await client.query(
        `
          UPDATE caregivers
          SET relationship_to_patient = $2,
              phone_number = $3
          WHERE user_id = $1
        `,
        [userId, relationshipToPatient, phoneNumber]
      );

      if (caregiverResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "user_not_found" });
      }
    }

    await client.query("COMMIT");

    const updatedAccount = await getAccountByUserId(userId);

    if (!updatedAccount) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json(updatedAccount);
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({ error: "user_already_exists" });
    }

    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const role = String(req.body.role ?? "").trim();
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password ?? "");
  const patientNumber = normalizeDigits(String(req.body.patientNumber ?? ""));
  const dateOfBirth = String(req.body.dateOfBirth ?? "").trim();
  const phoneNumber = normalizeDigits(String(req.body.phoneNumber ?? ""));
  const professionalLicense = normalizeDigits(
    String(req.body.professionalLicense ?? "")
  );
  const specialty = String(req.body.specialty ?? "").trim();
  const relationshipToPatient = String(
    req.body.relationshipToPatient ?? ""
  ).trim();

  const missingFields: string[] = [];

  if (!role) {
    missingFields.push("role");
  }

  if (!name) {
    missingFields.push("name");
  }

  if (!email) {
    missingFields.push("email");
  }

  if (!password) {
    missingFields.push("password");
  }

  if (role === "patient") {
    if (!patientNumber) {
      missingFields.push("patientNumber");
    }

    if (!dateOfBirth) {
      missingFields.push("dateOfBirth");
    }

    if (!phoneNumber) {
      missingFields.push("phoneNumber");
    }
  }

  if (role === "doctor") {
    if (!professionalLicense) {
      missingFields.push("professionalLicense");
    }

    if (!specialty) {
      missingFields.push("specialty");
    }

    if (!phoneNumber) {
      missingFields.push("phoneNumber");
    }
  }

  if (role === "caregiver") {
    if (!relationshipToPatient) {
      missingFields.push("relationshipToPatient");
    }

    if (!phoneNumber) {
      missingFields.push("phoneNumber");
    }
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "missing_required_fields",
      missingFields,
    });
  }

  if (!["patient", "doctor", "caregiver"].includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }

  const invalidFields: string[] = [];

  if (email && !hasValidEmailFormat(email)) {
    invalidFields.push("email");
  }

  if (role === "patient" && patientNumber && !hasValidNineDigitFormat(patientNumber)) {
    invalidFields.push("patientNumber");
  }

  if (
    role === "doctor" &&
    professionalLicense &&
    !hasValidDoctorLicenseFormat(professionalLicense)
  ) {
    invalidFields.push("professionalLicense");
  }

  if (
    ["patient", "doctor", "caregiver"].includes(role) &&
    phoneNumber &&
    !hasValidNineDigitFormat(phoneNumber)
  ) {
    invalidFields.push("phoneNumber");
  }

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: "invalid_field_format",
      invalidFields,
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: number }>(
      `
        INSERT INTO users (name, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [name, email, hashPassword(password), role]
    );

    const userId = userResult.rows[0]?.id;

    if (!userId) {
      throw new Error("User was not created");
    }

    if (role === "patient") {
      await client.query(
        `
          INSERT INTO patients (user_id, patient_number, date_of_birth, phone_number)
          VALUES ($1, $2, $3, $4)
        `,
        [userId, patientNumber, dateOfBirth || null, phoneNumber || null]
      );
    }

    if (role === "doctor") {
      await client.query(
        `
          INSERT INTO doctors (user_id, professional_license, specialty, phone_number)
          VALUES ($1, $2, $3, $4)
        `,
        [userId, professionalLicense, specialty || null, phoneNumber || null]
      );
    }

    if (role === "caregiver") {
      await client.query(
        `
          INSERT INTO caregivers (user_id, relationship_to_patient, phone_number)
          VALUES ($1, $2, $3)
        `,
        [userId, relationshipToPatient || null, phoneNumber || null]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({ message: "signup_success" });
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({ error: "user_already_exists" });
    }

    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email || !password) {
    return res.status(400).json({ error: "missing_required_fields" });
  }

  const rateLimitKey = `${req.ip ?? "unknown"}:${email}`;

  if (isLoginRateLimited(rateLimitKey)) {
    return res.status(429).json({ error: "too_many_attempts" });
  }

  const result = await pool.query<{
    id: number;
    name: string;
    email: string;
    password: string;
    role: string;
  }>(
    `
      SELECT id, name, email, password, role
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user || !comparePassword(password, user.password)) {
    registerLoginFailure(rateLimitKey);
    return res.status(401).json({ error: "invalid_credentials" });
  }

  clearLoginFailures(rateLimitKey);

  const token = signAuthToken({ sub: user.id, role: user.role });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// Valida o token atual e devolve o utilizador correspondente.
app.get("/api/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  const result = await pool.query<{
    id: number;
    name: string;
    email: string;
    role: string;
  }>(
    `
      SELECT id, name, email, role
      FROM users
      WHERE id = $1
    `,
    [req.authUserId]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json({ user });
});

const port = Number(process.env.PORT ?? 3001);

async function startServer() {
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET em falta ou demasiado curto (mínimo 32 caracteres)."
    );
  }

  await ensureBaseTables();
  await ensureCaregiverLinksTable();
  await ensureDoctorLinksTable();

  app.listen(port, () => {
    console.log(`API a correr na porta ${port}`);
  });
}

void startServer().catch((error) => {
  console.error("Não foi possível iniciar a API.", error);
  process.exit(1);
});
