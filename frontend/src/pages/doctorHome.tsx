import { useEffect, useState } from "react";
import DoctorNavigationMenu from "../components/DoctorNavigationMenu";
import type { AccountProfile, DoctorPatientLink, User } from "../types/user";
import {
  formatDoctorDateTime,
  getDoctorMessage,
  getDoctorPermissionLabels,
  sortDoctorPatientLinks,
} from "../utils/doctor";
import { getFirstName } from "../utils/profile";
import "./patientHome.css";

type DoctorHomeProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenPatients: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

type MessageTone = "success" | "error";

function getDoctorAccountMessage(error: string | undefined) {
  if (error === "user_not_found") {
    return "Não foi possível carregar a informação profissional deste perfil.";
  }

  return "Não foi possível carregar a informação profissional.";
}

function getProfileValue(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue || "Por definir";
}

export default function DoctorHome({
  apiUrl,
  user,
  onOpenHome,
  onOpenPatients,
  onOpenAccount,
  onLogout,
}: DoctorHomeProps) {
  const [links, setLinks] = useState<DoctorPatientLink[]>([]);
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [accountMessage, setAccountMessage] = useState("");
  const [isLinksLoading, setIsLinksLoading] = useState(true);
  const [isAccountLoading, setIsAccountLoading] = useState(true);
  const [actionLinkId, setActionLinkId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadLinks = async () => {
      setIsLinksLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `${apiUrl}/api/users/${user.id}/doctor-patient-links`
        );
        const data = (await response.json()) as {
          error?: string;
          links?: DoctorPatientLink[];
        };

        if (!response.ok || !Array.isArray(data.links)) {
          if (!ignore) {
            setMessage(getDoctorMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          setLinks(sortDoctorPatientLinks(data.links));
        }
      } catch {
        if (!ignore) {
          setMessage("Não foi possível carregar os pacientes ligados a este perfil.");
          setMessageTone("error");
        }
      } finally {
        if (!ignore) {
          setIsLinksLoading(false);
        }
      }
    };

    void loadLinks();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  useEffect(() => {
    let ignore = false;

    const loadAccount = async () => {
      setIsAccountLoading(true);
      setAccountMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/account`);
        const data = (await response.json()) as Partial<AccountProfile> & {
          error?: string;
        };

        if (!response.ok || !data.user || !data.profile) {
          if (!ignore) {
            setAccountMessage(getDoctorAccountMessage(data.error));
          }
          return;
        }

        if (!ignore) {
          setAccount(data as AccountProfile);
        }
      } catch {
        if (!ignore) {
          setAccountMessage("Não foi possível carregar a informação profissional.");
        }
      } finally {
        if (!ignore) {
          setIsAccountLoading(false);
        }
      }
    };

    void loadAccount();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  const activeLinks = links.filter((link) => link.status === "active");
  const pendingLinks = links.filter((link) => link.status === "pending");
  const latestAcceptedLink = activeLinks[0] ?? null;
  const latestPendingLink = pendingLinks[0] ?? null;
  const primaryPatient = latestAcceptedLink;
  const extraActivePatientCount = Math.max(0, activeLinks.length - 1);
  const patientsWithDecisionAccess = activeLinks.filter(
    (link) => link.permissions.canViewDecisions
  ).length;
  const patientsWithDocumentAccess = activeLinks.filter(
    (link) => link.permissions.canViewDocuments
  ).length;
  const profile = account?.profile;
  const doctorEmail = account?.user.email ?? user.email;
  const doctorPhoneNumber = getProfileValue(profile?.phoneNumber);
  const doctorLicense = getProfileValue(profile?.professionalLicense);
  const doctorSpecialty = getProfileValue(profile?.specialty);
  const hasCompleteProfile =
    Boolean(profile?.phoneNumber?.trim()) &&
    Boolean(profile?.professionalLicense?.trim()) &&
    Boolean(profile?.specialty?.trim());

  const handleAccept = async (linkId: number) => {
    setActionLinkId(linkId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/doctor-patient-links/${linkId}/accept`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as {
        error?: string;
        link?: DoctorPatientLink;
      };

      if (!response.ok || !data.link) {
        setMessage(getDoctorMessage(data.error));
        setMessageTone("error");
        return;
      }

      const nextLink = data.link;

      setLinks((currentLinks) =>
        sortDoctorPatientLinks([
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
            <DoctorNavigationMenu
              currentScreen="home"
              onOpenHome={onOpenHome}
              onOpenPatients={onOpenPatients}
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
                <p className="home-overview-label">Diretivas visíveis</p>
                <strong className="home-overview-value">
                  {patientsWithDecisionAccess}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">Documentos visíveis</p>
                <strong className="home-overview-value">
                  {patientsWithDocumentAccess}
                </strong>
              </div>
            </div>
          </article>

          <article className="home-overview-card home-overview-card-activity">
            <div className="home-section-header">
              <h2>Últimas atualizações</h2>
            </div>

            <div className="home-overview-list">
              <div className="home-overview-item">
                <p className="home-overview-label">Último paciente</p>
                <strong className="home-overview-value">
                  {latestAcceptedLink?.patientName ||
                    latestPendingLink?.patientName ||
                    "Sem registo"}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">Último acesso</p>
                <strong className="home-overview-value">
                  {latestAcceptedLink
                    ? formatDoctorDateTime(latestAcceptedLink.respondedAt)
                    : "Sem registo"}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">Último convite</p>
                <strong className="home-overview-value">
                  {latestPendingLink
                    ? formatDoctorDateTime(latestPendingLink.createdAt)
                    : "Sem registo"}
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

        {accountMessage && !isAccountLoading && (
          <section className="home-section">
            <p className="home-feedback-message home-feedback-message-error">
              {accountMessage}
            </p>
          </section>
        )}

        <div className="home-association-grid">
          <section className="home-section home-panel-card home-caregiver-panel">
            <div className="home-section-header">
              <h2>Pacientes</h2>
            </div>

            {primaryPatient ? (
              <div className="home-caregiver-sheet home-caregiver-sheet-active">
                <div className="home-caregiver-sheet-head">
                  <h3 className="home-caregiver-sheet-title">
                    {primaryPatient.patientName}
                  </h3>
                  <span className="home-connection-pill">Ativo</span>
                </div>

                <dl className="home-caregiver-sheet-list">
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">Contacto</dt>
                    <dd className="home-caregiver-sheet-value">
                      {primaryPatient.permissions.canViewInformation ? (
                        <div className="home-caregiver-sheet-value-stack">
                          <span>{primaryPatient.patientEmail || "Email por definir"}</span>
                          <span>
                            {primaryPatient.patientPhoneNumber || "Telefone por definir"}
                          </span>
                        </div>
                      ) : (
                        "Não partilhado"
                      )}
                    </dd>
                  </div>

                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">Áreas visíveis</dt>
                    <dd className="home-caregiver-sheet-value">
                      <div className="home-inline-pill-list home-inline-pill-list-end">
                        {getDoctorPermissionLabels(primaryPatient.permissions).map(
                          (label) => (
                            <span key={label} className="home-inline-pill">
                              {label}
                            </span>
                          )
                        )}
                      </div>
                    </dd>
                  </div>

                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">
                      Ligação ativa desde
                    </dt>
                    <dd className="home-caregiver-sheet-value">
                      {formatDoctorDateTime(primaryPatient.respondedAt)}
                    </dd>
                  </div>

                  {(extraActivePatientCount > 0 || pendingLinks.length > 0) && (
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">Mais informação</dt>
                      <dd className="home-caregiver-sheet-value">
                        {extraActivePatientCount > 0
                          ? extraActivePatientCount === 1
                            ? "Existe mais 1 paciente ativo."
                            : `Existem mais ${extraActivePatientCount} pacientes ativos.`
                          : pendingLinks.length === 1
                            ? "Existe 1 convite pendente."
                            : `Existem ${pendingLinks.length} convites pendentes.`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <div className="home-caregiver-sheet">
                <div className="home-caregiver-sheet-head">
                  <h3 className="home-caregiver-sheet-title">
                    Sem pacientes ligados
                  </h3>
                  <span
                    className={`home-connection-pill ${
                      pendingLinks.length > 0 ? "home-connection-pill-warning" : ""
                    }`}
                  >
                    {pendingLinks.length > 0 ? "Pendente" : "Sem ligação"}
                  </span>
                </div>

                <dl className="home-caregiver-sheet-list">
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">Estado</dt>
                    <dd className="home-caregiver-sheet-value">
                      {pendingLinks.length > 0
                        ? "Tens convites por aceitar"
                        : "Ainda não tens acessos ativos"}
                    </dd>
                  </div>
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">Quando aparecer</dt>
                    <dd className="home-caregiver-sheet-value">
                      Quando um paciente partilhar acesso contigo
                    </dd>
                  </div>
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">Vais ver</dt>
                    <dd className="home-caregiver-sheet-value">
                      Diretivas, documentos e informação clínica
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </section>

          <section className="home-section home-panel-card home-caregiver-panel home-association-panel-secondary">
            <div className="home-section-header">
              <h2>Conta profissional</h2>
            </div>

            <div className="home-caregiver-sheet">
              <div className="home-caregiver-sheet-head">
                <h3 className="home-caregiver-sheet-title">{user.name}</h3>
                <span
                  className={`home-connection-pill ${
                    !hasCompleteProfile && !isAccountLoading
                      ? "home-connection-pill-warning"
                      : ""
                  }`}
                >
                  {isAccountLoading
                    ? "A carregar"
                    : hasCompleteProfile
                      ? "Pronto"
                      : "Por rever"}
                </span>
              </div>

              <dl className="home-caregiver-sheet-list">
                <div className="home-caregiver-sheet-row">
                  <dt className="home-caregiver-sheet-label">Especialidade</dt>
                  <dd className="home-caregiver-sheet-value">
                    {isAccountLoading ? "A carregar..." : doctorSpecialty}
                  </dd>
                </div>

                <div className="home-caregiver-sheet-row">
                  <dt className="home-caregiver-sheet-label">Cédula</dt>
                  <dd className="home-caregiver-sheet-value">
                    {isAccountLoading ? "A carregar..." : doctorLicense}
                  </dd>
                </div>

                <div className="home-caregiver-sheet-row">
                  <dt className="home-caregiver-sheet-label">Contacto</dt>
                  <dd className="home-caregiver-sheet-value">
                    <div className="home-caregiver-sheet-value-stack">
                      <span>{doctorEmail}</span>
                      <span>
                        {isAccountLoading ? "A carregar..." : doctorPhoneNumber}
                      </span>
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        {pendingLinks.length > 0 && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>Convites por aceitar</h2>
            </div>

            <div className="home-connection-list">
              {pendingLinks.map((link) => {
                const permissionLabels = getDoctorPermissionLabels(link.permissions);

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
                      <div className="home-inline-pill-list">
                        {permissionLabels.map((label) => (
                          <span key={label} className="home-inline-pill">
                            {label}
                          </span>
                        ))}
                      </div>
                      <p>Pedido enviado em {formatDoctorDateTime(link.createdAt)}</p>
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

        {!isAccountLoading && !hasCompleteProfile && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>Próximo passo</h2>
            </div>

            <p className="home-association-empty-text">Perfil por completar</p>
            <p className="home-next-step-text">
              Confirma a tua cédula, especialidade e telefone para deixares o
              perfil profissional pronto.
            </p>

            <div className="home-connection-actions">
              <button
                className="home-action-button"
                type="button"
                onClick={onOpenAccount}
              >
                Abrir conta
              </button>
            </div>
          </section>
        )}

        {isLinksLoading && (
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
