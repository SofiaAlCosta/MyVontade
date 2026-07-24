// Teste fim-a-fim da camada de autenticação/autorização.
//
// Pré-requisito: a API tem de estar a correr (docker compose up -d).
// Uso:
//   node backend/scripts/test-auth.mjs
//   API_URL=http://localhost:3001 node backend/scripts/test-auth.mjs
//
// Requer Node 18+ (usa fetch global). Não instala dependências.

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

async function main() {
  const suffix = Date.now();
  const email = `teste.auth.${suffix}@exemplo.pt`;
  const password = "Password123!";

  // 1. Criar um paciente de teste.
  const signupRes = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "patient",
      name: "Paciente de Teste",
      email,
      password,
      patientNumber: "123456789",
      dateOfBirth: "1990-01-01",
      phoneNumber: "912345678",
    }),
  });
  check("signup do paciente devolve 2xx", signupRes.ok, `status ${signupRes.status}`);

  // 2. Login devolve token + user.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  check("login devolve 200", loginRes.status === 200, `status ${loginRes.status}`);
  check("login devolve token", typeof loginData.token === "string" && loginData.token.length > 0);
  check("login devolve user.id", Number.isInteger(loginData.user?.id));

  const token = loginData.token;
  const userId = loginData.user?.id;
  const auth = { Authorization: `Bearer ${token}` };

  // 3. Aceder ao dashboard SEM token -> 401.
  const noToken = await fetch(`${BASE}/api/users/${userId}/dashboard`);
  check("dashboard sem token -> 401", noToken.status === 401, `status ${noToken.status}`);

  // 4. Aceder ao dashboard COM token válido -> 200.
  const withToken = await fetch(`${BASE}/api/users/${userId}/dashboard`, { headers: auth });
  check("dashboard com token válido -> 200", withToken.status === 200, `status ${withToken.status}`);

  // 5. IDOR: aceder ao dashboard de OUTRO utilizador com o meu token -> 403.
  const otherId = userId + 1;
  const idor = await fetch(`${BASE}/api/users/${otherId}/dashboard`, { headers: auth });
  check("IDOR (id de outro utilizador) -> 403", idor.status === 403, `status ${idor.status}`);

  // 6. Token adulterado -> 401.
  const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");
  const tamperedRes = await fetch(`${BASE}/api/users/${userId}/dashboard`, {
    headers: { Authorization: `Bearer ${tampered}` },
  });
  check("token adulterado -> 401", tamperedRes.status === 401, `status ${tamperedRes.status}`);

  // 7. /api/auth/me com token -> 200 e id correto.
  const meRes = await fetch(`${BASE}/api/auth/me`, { headers: auth });
  const meData = await meRes.json().catch(() => ({}));
  check("/auth/me com token -> 200", meRes.status === 200, `status ${meRes.status}`);
  check("/auth/me devolve o utilizador correto", meData.user?.id === userId);

  // 8. Rate limit: tentativas repetidas com password errada -> acaba em 429.
  let sawRateLimit = false;
  for (let i = 0; i < 12; i += 1) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "errada" }),
    });
    if (r.status === 429) {
      sawRateLimit = true;
      break;
    }
  }
  check("rate limit do login -> 429 após várias tentativas", sawRateLimit);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("\nErro ao executar os testes. A API está a correr em", BASE, "?");
  console.error(error.message);
  process.exit(1);
});
