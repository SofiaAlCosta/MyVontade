import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";

export default function App() {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
  } = useAuth0();

  const [msg, setMsg] = useState<string>("");

  const callPrivate = async () => {
    const token = await getAccessTokenSilently();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/private`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMsg(data.message ?? JSON.stringify(data));
  };

  if (isLoading) return <div>A carregar…</div>;

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>MyVontade</h1>

      {!isAuthenticated ? (
        <button
          type="button"
          onClick={async () => {
            console.log("CLICK LOGIN");
            try {
              await loginWithRedirect();
              console.log("LOGIN REDIRECT CHAMADO");
            } catch (error) {
              console.error("ERRO LOGIN", error);
            }
          }}>
          Login
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
          >
            Logout
          </button>

          <pre>{JSON.stringify(user, null, 2)}</pre>

          <button type="button" onClick={callPrivate}>
            Chamar API privada
          </button>
          <p>{msg}</p>
        </>
      )}
    </div>
  );
}