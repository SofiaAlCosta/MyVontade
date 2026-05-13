import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-check", async (req, res) => {
  const result = await pool.query("SELECT 1 as ok");
  res.json({ db: result.rows[0].ok });
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
    return res.status(401).json({ error: "invalid_credentials" });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API a correr na porta ${port}`);
});
