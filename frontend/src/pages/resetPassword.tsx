import { useState, type FormEvent } from "react";
import "./login.css";

type ResetPasswordProps = {
  token: string;
  message: string;
  onResetPassword: (token: string, newPassword: string) => Promise<void>;
  onGoToLogin: () => void;
};

export default function ResetPassword({
  token,
  message,
  onResetPassword,
  onGoToLogin,
}: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missingToken = !token;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (newPassword.length < 8) {
      setLocalError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("As palavras-passe não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onResetPassword(token, newPassword);
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
            <h1 className="panel-title">Definir uma nova palavra-passe.</h1>
            <p className="panel-text">
              Escolhe uma palavra-passe segura para voltares a aceder à tua
              conta.
            </p>
          </div>
        </div>
      </section>

      <section className="form-side">
        <div className="form-card">
          <h2 className="form-title">Nova palavra-passe</h2>

          {missingToken ? (
            <p className="form-message" role="status">
              Ligação inválida. Pede uma nova recuperação de palavra-passe.
            </p>
          ) : (
            <form className="form-fields" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Nova palavra-passe</span>
                <input
                  type="password"
                  placeholder="Pelo menos 8 caracteres"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Confirmar palavra-passe</span>
                <input
                  type="password"
                  placeholder="Repete a palavra-passe"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              <button
                className="form-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "A guardar..." : "Guardar nova palavra-passe"}
              </button>
            </form>
          )}

          {localError && (
            <p className="form-message" role="status">
              {localError}
            </p>
          )}

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <p className="form-switch">
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
