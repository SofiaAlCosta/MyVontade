// Teste fim-a-fim da recuperação de palavra-passe.
//
// Pede a recuperação, obtém o token (só devolvido quando EXPOSE_RESET_TOKEN=true),
// redefine a palavra-passe e confirma que a nova funciona e a antiga não, que o
// token é de uso único, e que emails desconhecidos não revelam nada.
//
// Pré-requisito: API a correr. Requer Node 18+.
//   EXPOSE_RESET_TOKEN=true (na API) para o teste correr por completo.
//   node backend/scripts/test-password-reset.mjs

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

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
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

async function main() {
  const suffix = Date.now();
  const email = `reset.${suffix}@exemplo.pt`;
  const oldPassword = "Password123!";
  const newPassword = "NovaPassword456!";

  await api("/api/auth/signup", {
    method: "POST",
    body: {
      role: "patient",
      name: "Paciente Reset",
      email,
      password: oldPassword,
      patientNumber: "123456789",
      dateOfBirth: "1990-01-01",
      phoneNumber: "912345678",
    },
  });

  // Pedido de recuperação — resposta sempre 200 (genérica).
  const forgot = await api("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
  check("forgot-password responde 200", forgot.status === 200, `status ${forgot.status}`);

  const token = forgot.data?.token;

  if (!token) {
    console.log(
      "\nSKIP: o token não foi devolvido (EXPOSE_RESET_TOKEN não está a true)."
    );
    console.log(
      "Para testar a recuperação localmente, define EXPOSE_RESET_TOKEN=true no infrastructure/.env e reinicia a API."
    );
    console.log(`\n${passed} passaram, ${failed} falharam (recuperação ignorada)`);
    process.exit(failed ? 1 : 0);
  }

  // Palavra-passe fraca é rejeitada.
  const weak = await api("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword: "curta" },
  });
  check("reset com password fraca -> 400", weak.status === 400, `status ${weak.status}`);
  check("erro é weak_password", weak.data?.error === "weak_password", `erro=${weak.data?.error}`);

  // Redefinição com token válido.
  const reset = await api("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
  });
  check("reset-password responde 200", reset.status === 200, `status ${reset.status}`);

  // A palavra-passe antiga já não funciona.
  const oldLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: oldPassword },
  });
  check("login com password antiga -> 401", oldLogin.status === 401, `status ${oldLogin.status}`);

  // A nova palavra-passe funciona.
  const newLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: newPassword },
  });
  check("login com password nova -> 200", newLogin.status === 200, `status ${newLogin.status}`);

  // O token é de uso único: reutilizá-lo falha.
  const reuse = await api("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword: "OutraPassword789!" },
  });
  check("reutilizar o token -> 400", reuse.status === 400, `status ${reuse.status}`);
  check(
    "erro é invalid_or_expired_token",
    reuse.data?.error === "invalid_or_expired_token",
    `erro=${reuse.data?.error}`
  );

  // Email desconhecido: resposta genérica, sem token.
  const unknown = await api("/api/auth/forgot-password", {
    method: "POST",
    body: { email: `naoexiste.${suffix}@exemplo.pt` },
  });
  check("forgot de email desconhecido -> 200", unknown.status === 200, `status ${unknown.status}`);
  check("email desconhecido não devolve token", !unknown.data?.token);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("\nErro ao executar os testes. A API está a correr em", BASE, "?");
  console.error(error.message);
  process.exit(1);
});
