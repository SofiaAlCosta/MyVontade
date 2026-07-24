import { useEffect, useState } from "react";
import DoctorNavigationMenu from "../components/DoctorNavigationMenu";
import { useI18n } from "../i18n";
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
  const { t } = useI18n();
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
          <h1 className="home-title">
            {t("Olá, {name}", { name: getFirstName(user.name) })}
          </h1>
        </section>

        <section className="home-overview-grid home-overview-grid-compact">
          <article className="home-overview-card home-overview-card-caregiver-access">
            <div className="home-section-header">
              <h2>{t("Acessos recebidos")}</h2>
            </div>

            <div className="home-overview-list">
              <div className="home-overview-item">
                <p className="home-overview-label">{t("Pacientes com acesso ativo")}</p>
                <strong className="home-overview-value">{activeLinks.length}</strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">{t("Diretivas visíveis")}</p>
                <strong className="home-overview-value">
                  {patientsWithDecisionAccess}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">{t("Documentos visíveis")}</p>
                <strong className="home-overview-value">
                  {patientsWithDocumentAccess}
                </strong>
              </div>
            </div>
          </article>

          <article className="home-overview-card home-overview-card-activity">
            <div className="home-section-header">
              <h2>{t("Últimas atualizações")}</h2>
            </div>

            <div className="home-overview-list">
              <div className="home-overview-item">
                <p className="home-overview-label">{t("Último paciente")}</p>
                <strong className="home-overview-value">
                  {latestAcceptedLink?.patientName ||
                    latestPendingLink?.patientName ||
                    t("Sem registo")}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">{t("Último acesso")}</p>
                <strong className="home-overview-value">
                  {latestAcceptedLink
                    ? formatDoctorDateTime(latestAcceptedLink.respondedAt)
                    : t("Sem registo")}
                </strong>
              </div>
              <div className="home-overview-item">
                <p className="home-overview-label">{t("Último convite")}</p>
                <strong className="home-overview-value">
                  {latestPendingLink
                    ? formatDoctorDateTime(latestPendingLink.createdAt)
                    : t("Sem registo")}
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
              {t(message)}
            </p>
          </section>
        )}

        {accountMessage && !isAccountLoading && (
          <section className="home-section">
            <p className="home-feedback-message home-feedback-message-error">
              {t(accountMessage)}
            </p>
          </section>
        )}

        <div className="home-association-grid">
          <section className="home-section home-panel-card home-caregiver-panel">
            <div className="home-section-header">
              <h2>{t("Pacientes")}</h2>
            </div>

            {primaryPatient ? (
              <div className="home-caregiver-sheet home-caregiver-sheet-active">
                <div className="home-caregiver-sheet-head">
                  <h3 className="home-caregiver-sheet-title">
                    {primaryPatient.patientName}
                  </h3>
                  <span className="home-connection-pill">{t("Ativo")}</span>
                </div>

                <dl className="home-caregiver-sheet-list">
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">{t("Contacto")}</dt>
                    <dd className="home-caregiver-sheet-value">
                      {primaryPatient.permissions.canViewInformation ? (
                        <div className="home-caregiver-sheet-value-stack">
                          <span>{primaryPatient.patientEmail || t("Email por definir")}</span>
                          <span>
                            {primaryPatient.patientPhoneNumber || t("Telefone por definir")}
                          </span>
                        </div>
                      ) : (
                        t("Não partilhado")
                      )}
                    </dd>
                  </div>

                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">{t("Áreas visíveis")}</dt>
                    <dd className="home-caregiver-sheet-value">
                      <div className="home-inline-pill-list home-inline-pill-list-end">
                        {getDoctorPermissionLabels(primaryPatient.permissions).map(
                          (label) => (
                            <span key={label} className="home-inline-pill">
                              {t(label)}
                            </span>
                          )
                        )}
                      </div>
                    </dd>
                  </div>

                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">
                      {t("Ligação ativa desde")}
                    </dt>
                    <dd className="home-caregiver-sheet-value">
                      {formatDoctorDateTime(primaryPatient.respondedAt)}
                    </dd>
                  </div>

                  {(extraActivePatientCount > 0 || pendingLinks.length > 0) && (
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Mais informação")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        {extraActivePatientCount > 0
                          ? extraActivePatientCount === 1
                            ? t("Existe mais 1 paciente ativo.")
                            : t("Existem mais {count} pacientes ativos.", {
                                count: extraActivePatientCount,
                              })
                          : pendingLinks.length === 1
                            ? t("Existe 1 convite pendente.")
                            : t("Existem {count} convites pendentes.", {
                                count: pendingLinks.length,
                              })}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <div className="home-caregiver-sheet">
                <div className="home-caregiver-sheet-head">
                  <h3 className="home-caregiver-sheet-title">
                    {t("Sem pacientes ligados")}
                  </h3>
                  <span
                    className={`home-connection-pill ${
                      pendingLinks.length > 0 ? "home-connection-pill-warning" : ""
                    }`}
                  >
                    {pendingLinks.length > 0 ? t("Pendente") : t("Sem ligação")}
                  </span>
                </div>

                <dl className="home-caregiver-sheet-list">
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">{t("Estado")}</dt>
                    <dd className="home-caregiver-sheet-value">
                      {pendingLinks.length > 0
                        ? t("Tens convites por aceitar")
                        : t("Ainda não tens acessos ativos")}
                    </dd>
                  </div>
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">{t("Quando aparecer")}</dt>
                    <dd className="home-caregiver-sheet-value">
                      {t("Quando um paciente partilhar acesso contigo")}
                    </dd>
                  </div>
                  <div className="home-caregiver-sheet-row">
                    <dt className="home-caregiver-sheet-label">{t("Vais ver")}</dt>
                    <dd className="home-caregiver-sheet-value">
                      {t("Diretivas, documentos e informação clínica")}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </section>

          <section className="home-section home-panel-card home-caregiver-panel home-association-panel-secondary">
            <div className="home-section-header">
              <h2>{t("Conta profissional")}</h2>
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
                    ? t("A carregar")
                    : hasCompleteProfile
                      ? t("Pronto")
                      : t("Por rever")}
                </span>
              </div>

              <dl className="home-caregiver-sheet-list">
                <div className="home-caregiver-sheet-row">
                  <dt className="home-caregiver-sheet-label">{t("Especialidade")}</dt>
                  <dd className="home-caregiver-sheet-value">
                    {isAccountLoading ? t("A carregar...") : t(doctorSpecialty)}
                  </dd>
                </div>

                <div className="home-caregiver-sheet-row">
                  <dt className="home-caregiver-sheet-label">{t("Cédula")}</dt>
                  <dd className="home-caregiver-sheet-value">
                    {isAccountLoading ? t("A carregar...") : t(doctorLicense)}
                  </dd>
                </div>

                <div className="home-caregiver-sheet-row">
                  <dt className="home-caregiver-sheet-label">{t("Contacto")}</dt>
                  <dd className="home-caregiver-sheet-value">
                    <div className="home-caregiver-sheet-value-stack">
                      <span>{doctorEmail}</span>
                      <span>
                        {isAccountLoading ? t("A carregar...") : t(doctorPhoneNumber)}
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
              <h2>{t("Convites por aceitar")}</h2>
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
                            {t("O paciente não partilhou a área de informação.")}
                          </p>
                        )}
                      </div>
                      <span className="home-connection-pill home-connection-pill-warning">
                        {t("Pendente")}
                      </span>
                    </div>

                    <div className="home-connection-meta">
                      <div className="home-inline-pill-list">
                        {permissionLabels.map((label) => (
                          <span key={label} className="home-inline-pill">
                            {t(label)}
                          </span>
                        ))}
                      </div>
                      <p>
                        {t("Pedido enviado em {date}", {
                          date: formatDoctorDateTime(link.createdAt),
                        })}
                      </p>
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
                        {actionLinkId === link.id
                          ? t("A aceitar...")
                          : t("Aceitar convite")}
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
              <h2>{t("Próximo passo")}</h2>
            </div>

            <p className="home-association-empty-text">{t("Perfil por completar")}</p>
            <p className="home-next-step-text">
              {t(
                "Confirma a tua cédula, especialidade e telefone para deixares o perfil profissional pronto."
              )}
            </p>

            <div className="home-connection-actions">
              <button
                className="home-action-button"
                type="button"
                onClick={onOpenAccount}
              >
                {t("Abrir conta")}
              </button>
            </div>
          </section>
        )}

        {isLinksLoading && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>{t("A carregar")}</h2>
            </div>

            <p className="home-next-step-text">
              {t("Estamos a preparar as ligações deste perfil.")}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
