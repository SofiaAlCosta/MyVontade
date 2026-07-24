import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type { User } from "../types/user";
import "./patientModule.css";

type AccessLogPageProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDoctor: () => void;
  onOpenDocuments: () => void;
  onOpenAccessLog: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

type AccessLogEntry = {
  id: number;
  action: string;
  resource: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
};

function formatRole(role: string) {
  if (role === "caregiver") {
    return "Cuidador";
  }

  if (role === "doctor") {
    return "Médico";
  }

  if (role === "patient") {
    return "Paciente";
  }

  return role || "Desconhecido";
}

function describeAction(entry: AccessLogEntry) {
  if (entry.action === "view_patient_overview") {
    return "Consultou os teus dados";
  }

  if (entry.action === "download_document") {
    return entry.resource
      ? `Descarregou o documento "${entry.resource}"`
      : "Descarregou um documento";
  }

  return entry.action;
}

function formatDateTime(value: string) {
  if (!value) {
    return "Sem data";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Sem data";
  }

  return parsed.toLocaleString("pt-PT");
}

export default function AccessLogPage({
  apiUrl,
  user,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDoctor,
  onOpenDocuments,
  onOpenAccessLog,
  onOpenAccount,
  onLogout,
}: AccessLogPageProps) {
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    (async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/access-log`);
        const data = (await response.json()) as {
          entries?: AccessLogEntry[];
          error?: string;
        };

        if (ignore) {
          return;
        }

        if (!response.ok || !Array.isArray(data.entries)) {
          setMessage("Não foi possível carregar o registo de acessos.");
          setEntries([]);
          return;
        }

        setEntries(data.entries);
      } catch {
        if (!ignore) {
          setMessage("Não foi possível ligar ao servidor.");
          setEntries([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-brand">MyVontade</div>

        <div className="module-header-actions">
          <PatientNavigationMenu
            currentScreen="accessLog"
            onOpenHome={onOpenHome}
            onOpenDecisions={onOpenDecisions}
            onOpenCaregiver={onOpenCaregiver}
            onOpenDoctor={onOpenDoctor}
            onOpenDocuments={onOpenDocuments}
            onOpenAccessLog={onOpenAccessLog}
            onOpenAccount={onOpenAccount}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="module-main">
        <section className="module-intro-card">
          <h1 className="module-title">Registo de acessos</h1>
          <p className="module-description">
            Quem consultou ou descarregou os teus dados, e quando.
          </p>
        </section>

        <div className="module-grid">
          <section className="module-card">
            {isLoading && (
              <p className="module-inline-note">A carregar o registo...</p>
            )}

            {message && !isLoading && (
              <p className="module-inline-note">{message}</p>
            )}

            {!isLoading && !message && entries.length === 0 && (
              <p className="module-empty-text">
                Ainda ninguém acedeu aos teus dados.
              </p>
            )}

            {!isLoading && entries.length > 0 && (
              <ul className="module-item-list">
                {entries.map((entry) => (
                  <li key={entry.id} className="module-item">
                    <div className="module-item-title">
                      {describeAction(entry)}
                    </div>
                    <div className="module-item-text">
                      {entry.actorName || "Utilizador removido"} ·{" "}
                      {formatRole(entry.actorRole)} · {formatDateTime(entry.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
