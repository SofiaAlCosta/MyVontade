// Interceptor global de fetch: injeta o cabeçalho Authorization em todos os
// pedidos à API e reage a respostas 401 (token inválido/expirado) limpando a
// sessão e avisando a aplicação. Assim não é preciso alterar cada chamada
// fetch espalhada pelas páginas.

import { clearAuthToken, getAuthToken } from "./authToken";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const AUTH_LOGOUT_EVENT = "myvontade:auth-logout";

let installed = false;

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

export function installApiClient() {
  if (installed) {
    return;
  }

  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = resolveUrl(input);
    const isApiRequest = url.startsWith(API_URL);
    const token = getAuthToken();

    let nextInit = init;

    if (isApiRequest && token) {
      const headers = new Headers(init.headers ?? {});

      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      nextInit = { ...init, headers };
    }

    const response = await originalFetch(input, nextInit);

    if (isApiRequest && response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
    }

    return response;
  };
}
