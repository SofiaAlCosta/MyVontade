import { useState } from "react";
import "./login.css";

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

  const handleLogin = async () => {
    await onLogin(email, password);
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
          <p>Na plataforma encontra</p>
          <ul className="panel-list">
            <li>Informação organizada num só lugar</li>
            <li>Acesso partilhado com controlo</li>
            <li>Linguagem clara e acessível</li>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Palavra-passe</span>
              <input
                type="password"
                placeholder="Introduz a tua palavra-passe"
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
