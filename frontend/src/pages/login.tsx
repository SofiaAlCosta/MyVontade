import { useEffect, useState, type FormEvent } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n";
import "./login.css";

const LAST_LOGIN_EMAIL_KEY = "myvontade-last-login-email";
const LOGIN_EMAIL_HISTORY_KEY = "myvontade-login-email-history";
const MAX_SAVED_EMAILS = 6;

function saveEmailToHistory(savedEmails: string[], value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return savedEmails;
  }

  return [
    trimmedValue,
    ...savedEmails.filter(
      (savedEmail) => savedEmail.toLowerCase() !== trimmedValue.toLowerCase()
    ),
  ].slice(0, MAX_SAVED_EMAILS);
}

function persistLoginEmailHistory(savedEmails: string[]) {
  window.localStorage.setItem(
    LOGIN_EMAIL_HISTORY_KEY,
    JSON.stringify(savedEmails)
  );
}

function readSavedLoginEmails() {
  let savedEmails: string[] = [];

  try {
    const storedHistory = window.localStorage.getItem(LOGIN_EMAIL_HISTORY_KEY);

    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);

      if (Array.isArray(parsedHistory)) {
        savedEmails = parsedHistory.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        );
      }
    }
  } catch {
    savedEmails = [];
  }

  const legacyEmail = window.localStorage.getItem(LAST_LOGIN_EMAIL_KEY)?.trim() ?? "";
  const mergedHistory = legacyEmail
    ? saveEmailToHistory(savedEmails, legacyEmail)
    : savedEmails;

  persistLoginEmailHistory(mergedHistory);
  window.localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);

  return mergedHistory;
}

type LoginProps = {
  message: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToSignup: () => void;
  onGoToForgotPassword: () => void;
};

export default function Login({
  message,
  onLogin,
  onGoToSignup,
  onGoToForgotPassword,
}: LoginProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [isEmailHistoryVisible, setIsEmailHistoryVisible] = useState(false);

  useEffect(() => {
    setSavedEmails(readSavedLoginEmails());
  }, []);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (trimmedEmail) {
      const nextSavedEmails = saveEmailToHistory(savedEmails, trimmedEmail);
      setSavedEmails(nextSavedEmails);
      persistLoginEmailHistory(nextSavedEmails);
    }

    setEmail(trimmedEmail);
    setIsEmailHistoryVisible(false);
    await onLogin(trimmedEmail, password);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setIsEmailHistoryVisible(true);
  };

  const handleEmailSelect = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setIsEmailHistoryVisible(false);
  };

  const filteredSavedEmails = savedEmails.filter((savedEmail) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return true;
    }

    return savedEmail.toLowerCase().includes(normalizedEmail);
  });

  const shouldShowEmailHistory =
    isEmailHistoryVisible && filteredSavedEmails.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleLogin();
  };

  return (
    <div className="login-page">
      <section className="info-panel">
        <div>
          <p className="panel-brand">MyVontade</p>
          <div className="panel-intro">
            <h1 className="panel-title">
              {t("A tua vontade, com clareza e segurança.")}
            </h1>
            <p className="panel-text">
              {t(
                "Uma plataforma simples para consultar diretivas, decisões e documentos de saúde."
              )}
            </p>
          </div>
        </div>

        <div className="panel-notes">
          <p>{t("Na plataforma encontras")}</p>
          <ul className="panel-list">
            <li>{t("Clareza para registar a tua vontade")}</li>
            <li>{t("Partilha segura com quem te acompanha")}</li>
            <li>{t("Informação acessível quando for precisa")}</li>
          </ul>
        </div>
      </section>

      <section className="form-side">
        <div className="form-card">
          <div className="form-card-top">
            <LanguageSwitcher />
          </div>
          <h2 className="form-title">{t("Entrar")}</h2>

          <form className="form-fields" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>{t("Email")}</span>
              <div className="email-field-group">
                <input
                  type="email"
                  placeholder={t("nome@exemplo.pt")}
                  autoComplete="off"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onFocus={() => setIsEmailHistoryVisible(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setIsEmailHistoryVisible(false);
                    }, 120);
                  }}
                  aria-expanded={shouldShowEmailHistory}
                  aria-haspopup="listbox"
                />

                {shouldShowEmailHistory && (
                  <div className="email-history" role="listbox" aria-label={t("Histórico de emails")}>
                    {filteredSavedEmails.map((savedEmail) => (
                      <button
                        key={savedEmail}
                        className="email-history-item"
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleEmailSelect(savedEmail);
                        }}
                      >
                        {savedEmail}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="form-field">
              <span>{t("Palavra-passe")}</span>
              <input
                type="password"
                placeholder={t("Introduz a tua palavra-passe")}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button className="form-button" type="submit">
              {t("Entrar")}
            </button>
          </form>

          <p className="form-switch">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onGoToForgotPassword();
              }}
            >
              {t("Esqueceste-te da palavra-passe?")}
            </a>
          </p>

          {message && (
            <p className="form-message" role="status">
              {t(message)}
            </p>
          )}

          <p className="form-switch">
            {t("Ainda não tens conta?")}{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onGoToSignup();
              }}
            >
              {t("Regista-te")}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
