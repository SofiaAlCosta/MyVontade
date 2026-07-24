// Teste fim-a-fim do ciclo de vida da diretiva e do export PDF.
//
// Pré-requisito: API a correr. Requer Node 18+.
//   node backend/scripts/test-decisions.mjs

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
  return { status: response.status, data, response };
}

async function main() {
  const suffix = Date.now();
  const email = `decisoes.${suffix}@exemplo.pt`;
  const password = "Password123!";

  await api("/api/auth/signup", {
    method: "POST",
    body: {
      role: "patient",
      name: "Paciente Decisões",
      email,
      password,
      patientNumber: "123456789",
      dateOfBirth: "1980-02-02",
      phoneNumber: "912345678",
    },
  });
  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  const token = login.data?.token;
  const id = login.data?.user?.id;
  check("paciente com sessão", Boolean(token && id));

  // Guardar decisões.
  const save = await api(`/api/users/${id}/decisions`, {
    method: "PUT",
    token,
    body: {
      resuscitationPreference: "Não reanimar",
      artificialFeedingPreference: "Recusar apoio",
      painManagementPreference: "Sentir menos dor, mesmo com mais sonolência",
      notes: "",
    },
  });
  check("guardar decisões -> 200", save.status === 200, `status ${save.status}`);
  check("estado inicial é rascunho", save.data?.lifecycle?.status === "draft", `status=${save.data?.lifecycle?.status}`);

  // Registar a assinatura (hoje).
  const today = new Date().toISOString().slice(0, 10);
  const register = await api(`/api/users/${id}/decisions/registration`, {
    method: "PUT",
    token,
    body: { signedAt: today },
  });
  check("registar assinatura -> 200", register.status === 200, `status ${register.status}`);
  check("estado passa a ativa", register.data?.lifecycle?.status === "active", `status=${register.data?.lifecycle?.status}`);
  check("valida por 5 anos", (register.data?.lifecycle?.validUntil ?? "").startsWith(String(new Date().getUTCFullYear() + 5)), `validUntil=${register.data?.lifecycle?.validUntil}`);

  // Data futura é rejeitada.
  const future = await api(`/api/users/${id}/decisions/registration`, {
    method: "PUT",
    token,
    body: { signedAt: "2999-01-01" },
  });
  check("data futura -> 400", future.status === 400, `status ${future.status}`);

  // Export PDF.
  const pdf = await fetch(`${BASE}/api/users/${id}/decisions/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = pdf.headers.get("content-type") ?? "";
  check("PDF -> 200", pdf.status === 200, `status ${pdf.status}`);
  check("PDF tem content-type application/pdf", contentType.includes("application/pdf"), contentType);

  // Revogar.
  const revoke = await api(`/api/users/${id}/decisions/revoke`, {
    method: "POST",
    token,
  });
  check("revogar -> 200", revoke.status === 200, `status ${revoke.status}`);
  check("estado passa a revogada", revoke.data?.lifecycle?.status === "revoked", `status=${revoke.data?.lifecycle?.status}`);

  // Histórico tem entradas.
  const history = await api(`/api/users/${id}/decisions/history`, { token });
  check("histórico responde 200", history.status === 200, `status ${history.status}`);
  check("histórico tem pelo menos 1 versão", (history.data?.versions?.length ?? 0) >= 1);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("\nErro ao executar os testes. A API está a correr em", BASE, "?");
  console.error(error.message);
  process.exit(1);
});
