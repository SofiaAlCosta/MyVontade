import { useEffect, useState } from "react";
import CaregiverNavigationMenu from "../components/CaregiverNavigationMenu";
import type { CaregiverPatientLink, User } from "../types/user";
import { getFirstName } from "../utils/profile";
import {
  formatCaregiverDateTime,
  getCaregiverMessage,
  getCaregiverPermissionLabels,
  sortCaregiverPatientLinks,
} from "../utils/caregiver";
import "./patientHome.css";

type CaregiverHomeProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenCaregiver: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

type MessageTone = "success" | "error";

export default function CaregiverHome({
  apiUrl,
  user,
  onOpenHome,
  onOpenCaregiver,
  onOpenAccount,
  onLogout,
}: CaregiverHomeProps) {
  const [links, setLinks] = useState<CaregiverPatientLink[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLinkId, setActionLinkId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadLinks = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/patient-links`);
        const data = (await response.json()) as {
          error?: string;
          links?: CaregiverPatientLink[];
        };

        if (!response.ok || !Array.isArray(data.links)) {
          if (!ignore) {
            setMessage(getCaregiverMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          setLinks(sortCaregiverPatientLinks(data.links));
        }
      } catch {
        if (!ignore) {
          setMessage("Não foi possível carregar os pacientes ligados a este perfil.");
          setMessageTone("error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadLinks();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  const pendingLinks = links.filter((link) => link.status === "pending");
  const activeLinks = links.filter((link) => link.status === "active");
  const latestAcceptedLink = activeLinks[0] ?? null;
  const latestPendingLink = pendingLinks[0] ?? null;

  const handleAccept = async (linkId: number) => {
    setActionLinkId(linkId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/patient-links/${linkId}/accept`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as {
        error?: string;
        link?: CaregiverPatientLink;
      };

      if (!response.ok || !data.link) {
        setMessage(getCaregiverMessage(data.error));
        setMessageTone("error");
        return;
      }

      const nextLink = data.link;

      setLinks((currentLinks) =>
        sortCaregiverPatientLinks([
          nextLink,
          ...currentLinks.filter((link) => link.id !== nextLink.id),
        ])
      );
      setMessage("Ligação aceite com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível aceitar este convite.");
      setMessageTone("error");
    } finally {
      setActionLinkId(null);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-brand">MyVontade</div>

          <div className="home-header-actions">
            <CaregiverNavigationMenu
              currentScreen="home"
              onOpenHome={onOpenHome}
              onOpenCaregiver={onOpenCaregiver}
              onOpenAccount={onOpenAccount}
              onLogout={onLogout}
            />
          </div>
        </div>
      </header>

      <main className="home-main">
        <section className="home-intro-card home-intro-card-minimal">
          <h1 className="home-title">Olá, {getFirstName(user.name)}</h1>
        </section>

        {activeLinks.length > 0 && (
          <section className="home-section home-panel-card home-caregiver-panel">
            <div className="home-section-header">
              <h2>Pacientes ativos</h2>
            </div>

            <div className="home-detail-stack">
              {activeLinks.map((link) => {
                const permissionLabels = getCaregiverPermissionLabels(
                  link.permissions
                );

                return (
                  <div
                    key={link.id}
                    className="home-caregiver-sheet home-caregiver-sheet-active"
                  >
                    <div className="home-caregiver-sheet-head">
                      <h3 className="home-caregiver-sheet-title">
                        {link.patientName}
                      </h3>
                      <span className="home-connection-pill">Ativo</span>
                    </div>

                    <dl className="home-caregiver-sheet-list">
                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          Áreas partilhadas
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          <div className="home-inline-pill-list home-inline-pill-list-end">
                            {permissionLabels.map((label) => (
                              <span key={label} className="home-inline-pill">
                                {label}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>

                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          Informação do paciente
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          {link.permissions.canViewInformation ? (
                            <div className="home-caregiver-sheet-value-stack">
                              <span>{link.patientEmail || "Email por definir"}</span>
                              <span>
                                {link.patientPhoneNumber || "Telefone por definir"}
                              </span>
                            </div>
                          ) : (
                            "Não partilhada"
                          )}
                        </dd>
                      </div>

                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          Relação contigo
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          {link.relationshipToPatient}
                        </dd>
                      </div>

                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          Acesso ativo desde
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          {formatCaregiverDateTime(link.respondedAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="home-overview-grid home-overview-grid-compact">
          <article className="home-overview-card home-overview-card-caregiver-access">
            <div className="home-section-header">
              <h2>Acessos recebidos</h2>
            </div>

            <div className="home-overview-list">
              <div className="home-overview-item">
                <p className="home-overview-label">Pacientes com acesso ativo</p>
                <strong className="home-overview-value">{activeLinks.length}</strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">Convites pendentes</p>
                <strong className="home-overview-value">{pendingLinks.length}</strong>
              </div>
            </div>
          </article>

          <article className="home-overview-card">
            <div className="home-section-header">
              <h2>Últimas atualizações</h2>
            </div>

            <div className="home-overview-list">
              <div className="home-overview-item">
                <p className="home-overview-label">Último acesso aceite</p>
                <strong className="home-overview-value">
                  {latestAcceptedLink
                    ? formatCaregiverDateTime(latestAcceptedLink.respondedAt)
                    : "Sem registo"}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">Último convite recebido</p>
                <strong className="home-overview-value">
                  {latestPendingLink
                    ? formatCaregiverDateTime(latestPendingLink.createdAt)
                    : "Sem registo"}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">Paciente mais recente</p>
                <strong className="home-overview-value">
                  {latestAcceptedLink?.patientName || "Sem registo"}
                </strong>
              </div>
            </div>
          </article>
        </section>

        {message && (
          <section className="home-section">
            <p
              className={`home-feedback-message home-feedback-message-${messageTone}`}
              role="status"
            >
              {message}
            </p>
          </section>
        )}

        {pendingLinks.length > 0 && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>Convites por aceitar</h2>
            </div>

            <div className="home-connection-list">
              {pendingLinks.map((link) => {
                const permissionLabels = getCaregiverPermissionLabels(
                  link.permissions
                );

                return (
                  <article
                    key={link.id}
                    className="home-connection-card home-connection-card-compact"
                  >
                    <div className="home-connection-top">
                      <div>
                        <p className="home-connection-title">{link.patientName}</p>
                        {link.patientEmail ? (
                          <p className="home-connection-subtitle">{link.patientEmail}</p>
                        ) : (
                          <p className="home-connection-subtitle">
                            O paciente não partilhou a área de informação.
                          </p>
                        )}
                      </div>
                      <span className="home-connection-pill home-connection-pill-warning">
                        Pendente
                      </span>
                    </div>

                    <div className="home-connection-meta">
                      <p>Relação: {link.relationshipToPatient}</p>
                      <div className="home-inline-pill-list">
                        {permissionLabels.map((label) => (
                          <span key={label} className="home-inline-pill">
                            {label}
                          </span>
                        ))}
                      </div>
                      <p>Pedido enviado em {formatCaregiverDateTime(link.createdAt)}</p>
                    </div>

                    <div className="home-connection-actions">
                      <button
                        className="home-action-button"
                        type="button"
                        disabled={actionLinkId === link.id}
                        onClick={() => {
                          void handleAccept(link.id);
                        }}
                      >
                        {actionLinkId === link.id ? "A aceitar..." : "Aceitar convite"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!isLoading && activeLinks.length === 0 && pendingLinks.length === 0 && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>Ainda sem pacientes ligados</h2>
            </div>

            <p className="home-next-step-text">
              Quando um paciente aceitar partilhar acesso contigo, o nome dele vai
              aparecer na área <strong>Pacientes</strong> do menu.
            </p>
          </section>
        )}

        {isLoading && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>A carregar</h2>
            </div>

            <p className="home-next-step-text">
              Estamos a preparar as ligações deste perfil.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
