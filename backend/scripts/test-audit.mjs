// Teste fim-a-fim do registo de acessos (audit log).
//
// Fluxo: cria um paciente e um cuidador, o paciente convida o cuidador,
// o cuidador aceita e consulta os dados do paciente, e verifica-se que essa
// consulta aparece no registo de acessos do paciente (e que o cuidador NÃO
// consegue ler o registo do paciente).
//
// Pré-requisito: API a correr (docker compose up -d). Requer Node 18+.
//   node backend/scripts/test-audit.mjs

const BASE = process.env.API_URL ?? "http://localhost:3001";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? `  -> ${detail}` : ""}`);
  }
}

async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

async function signupAndLogin(payload) {
  await api("/api/auth/signup", { method: "POST", body: payload });
  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email: payload.email, password: payload.password },
  });
  return { token: login.data?.token, id: login.data?.user?.id };
}

async function main() {
  const suffix = Date.now();
  const password = "Password123!";

  const patient = await signupAndLogin({
    role: "patient",
    name: "Paciente Audit",
    email: `audit.paciente.${suffix}@exemplo.pt`,
    password,
    patientNumber: "123456789",
    dateOfBirth: "1985-05-05",
    phoneNumber: "912345678",
  });
  check("paciente criado e com sessão", Boolean(patient.token && patient.id));

  const caregiver = await signupAndLogin({
    role: "caregiver",
    name: "Cuidador Audit",
    email: `audit.cuidador.${suffix}@exemplo.pt`,
    password,
    relationshipToPatient: "Filho",
    phoneNumber: "913333333",
  });
  check("cuidador criado e com sessão", Boolean(caregiver.token && caregiver.id));

  // Paciente convida o cuidador.
  const invite = await api(`/api/users/${patient.id}/caregiver-links`, {
    method: "POST",
    token: patient.token,
    body: {
      caregiverEmail: `audit.cuidador.${suffix}@exemplo.pt`,
      relationshipToPatient: "Filho",
      permissions: {
        canViewInformation: true,
        canViewDecisions: true,
        canViewDocuments: true,
      },
    },
  });
  check("paciente convida cuidador (2xx)", invite.status >= 200 && invite.status < 300, `status ${invite.status}`);

  // Cuidador encontra o link pendente e aceita-o.
  const links = await api(`/api/users/${caregiver.id}/patient-links`, {
    token: caregiver.token,
  });
  const link = links.data?.links?.find((l) => l.patientId === patient.id);
  check("cuidador vê o convite pendente", Boolean(link), `links=${JSON.stringify(links.data)}`);

  const accept = await api(
    `/api/users/${caregiver.id}/patient-links/${link?.id}/accept`,
    { method: "POST", token: caregiver.token }
  );
  check("cuidador aceita o link (2xx)", accept.status >= 200 && accept.status < 300, `status ${accept.status}`);

  // Cuidador consulta os dados do paciente (isto deve ficar registado).
  const overview = await api(
    `/api/users/${caregiver.id}/patient-links/${patient.id}/overview`,
    { token: caregiver.token }
  );
  check("cuidador consulta o overview (200)", overview.status === 200, `status ${overview.status}`);

  // Paciente vê o seu registo de acessos.
  const log = await api(`/api/users/${patient.id}/access-log`, {
    token: patient.token,
  });
  check("registo de acessos responde 200", log.status === 200, `status ${log.status}`);

  const entry = log.data?.entries?.find(
    (e) => e.action === "view_patient_overview"
  );
  check("consulta do cuidador aparece no registo", Boolean(entry));
  check("registo identifica o papel (cuidador)", entry?.actorRole === "caregiver", `actorRole=${entry?.actorRole}`);
  check("registo identifica quem acedeu", entry?.actorName === "Cuidador Audit", `actorName=${entry?.actorName}`);

  // O cuidador NÃO pode ler o registo do paciente (IDOR).
  const forbidden = await api(`/api/users/${patient.id}/access-log`, {
    token: caregiver.token,
  });
  check("cuidador não acede ao registo do paciente (403)", forbidden.status === 403, `status ${forbidden.status}`);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("\nErro ao executar os testes. A API está a correr em", BASE, "?");
  console.error(error.message);
  process.exit(1);
});
