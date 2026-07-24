import { useState, type FormEvent } from "react";
import "./login.css";

type ForgotPasswordProps = {
  message: string;
  onForgotPassword: (email: string) => Promise<void>;
  onGoToLogin: () => void;
};

export default function ForgotPassword({
  message,
  onForgotPassword,
  onGoToLogin,
}: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onForgotPassword(email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="info-panel">
        <div>
          <p className="panel-brand">MyVontade</p>
          <div className="panel-intro">
            <h1 className="panel-title">Recuperar o acesso à tua conta.</h1>
            <p className="panel-text">
              Indica o teu email e enviamos as instruções para definires uma
              nova palavra-passe.
            </p>
          </div>
        </div>
      </section>

      <section className="form-side">
        <div className="form-card">
          <h2 className="form-title">Recuperar palavra-passe</h2>

          <form className="form-fields" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="nome@exemplo.pt"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <button className="form-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "A enviar..." : "Enviar instruções"}
            </button>
          </form>

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <p className="form-switch">
            Lembraste-te?{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onGoToLogin();
              }}
            >
              Voltar a entrar
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
