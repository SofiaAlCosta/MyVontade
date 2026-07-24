// Armazenamento do token de autenticação (memória + localStorage).
// Manter em memória evita ler o localStorage a cada pedido; o localStorage
// permite manter a sessão entre recarregamentos da página.

const TOKEN_KEY = "myvontade-auth-token";

let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }

  try {
    inMemoryToken = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    inMemoryToken = null;
  }

  return inMemoryToken;
}

export function setAuthToken(token: string) {
  inMemoryToken = token;

  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignorar: sem localStorage a sessão só dura enquanto a página estiver aberta.
  }
}

export function clearAuthToken() {
  inMemoryToken = null;

  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignorar.
  }
}
