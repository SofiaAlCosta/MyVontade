import { useEffect, useState } from "react";
import "./login.css";

const LAST_LOGIN_EMAIL_KEY = "myvontade-last-login-email";

type LoginProps = {
  message: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToSignup: () => void;
};

export default function Login({
  message,
  onLogin,
  onGoToSignup,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(LAST_LOGIN_EMAIL_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleLogin = async () => {
    await onLogin(email, password);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);

    if (value.trim()) {
      window.localStorage.setItem(LAST_LOGIN_EMAIL_KEY, value.trim());
      return;
    }

    window.localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
  };

  return (
    <div className="login-page">
      <section className="info-panel">
        <div>
          <p className="panel-brand">MyVontade</p>
          <h1 className="panel-title">A tua vontade, com clareza e segurança.</h1>
          <p className="panel-text">
            Uma plataforma simples para consultar diretivas, decisões e
            documentos de saúde.
          </p>
        </div>

        <div className="panel-notes">
          <p>Na plataforma encontras</p>
          <ul className="panel-list">
            <li>Clareza para registar a tua vontade</li>
            <li>Partilha segura com quem te acompanha</li>
            <li>Informação acessível quando for precisa</li>
          </ul>
        </div>
      </section>

      <section className="form-side">
        <div className="form-card">
          <h2 className="form-title">Entrar</h2>

          <div className="form-fields">
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="nome@exemplo.pt"
                autoComplete="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Palavra-passe</span>
              <input
                type="password"
                placeholder="Introduz a tua palavra-passe"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button className="form-button" type="button" onClick={handleLogin}>
              Entrar
            </button>
          </div>

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <p className="form-switch">
            Ainda não tens conta?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onGoToSignup();
              }}
            >
              Regista-te
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
