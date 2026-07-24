import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import { useI18n } from "../i18n";
import type {
  DashboardDecisionSummary,
  PatientCaregiverLink,
  PatientDashboard,
  PatientDoctorLink,
  PatientDocument,
  User,
} from "../types/user";
import { formatDateTime } from "../utils/date";
import { sortLinksByStatus } from "../utils/permissions";
import { getFirstName } from "../utils/profile";
import "./patientHome.css";

type HomeProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDoctor: () => void;
  onOpenDocuments: () => void;
  onOpenAccessLog?: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

const fallbackDecisionsSummary: DashboardDecisionSummary[] = [
  { label: "Reanimação", value: "Por definir" },
  { label: "Alimentação artificial", value: "Por definir" },
  {
    label: "Quero sentir menos dor ou ficar mais alerta?",
    value: "Por definir",
  },
];

type TranslateFn = (
  text: string,
  params?: Record<string, string | number>
) => string;

function getPendingCaregiverText(t: TranslateFn, count: number) {
  if (count <= 0) {
    return "";
  }

  return count === 1
    ? t("Existe 1 convite de cuidador pendente.")
    : t("Existem {count} convites de cuidador pendentes.", { count });
}

function getPendingDoctorText(t: TranslateFn, count: number) {
  if (count <= 0) {
    return "";
  }

  return count === 1
    ? t("Existe 1 convite de médico pendente.")
    : t("Existem {count} convites de médico pendentes.", { count });
}

export default function PatientHome({
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
}: HomeProps) {
  const { t } = useI18n();
  const [decisionsSummary, setDecisionsSummary] = useState<
    DashboardDecisionSummary[]
  >(fallbackDecisionsSummary);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [caregiverLinks, setCaregiverLinks] = useState<PatientCaregiverLink[]>(
    []
  );
  const [doctorLinks, setDoctorLinks] = useState<PatientDoctorLink[]>([]);

  useEffect(() => {
    if (user.role !== "patient") {
      setDecisionsSummary(fallbackDecisionsSummary);
      setDocuments([]);
      setCaregiverLinks([]);
      setDoctorLinks([]);
      return;
    }

    let ignore = false;

    const loadDashboard = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/dashboard`);
        const data = (await response.json()) as Partial<PatientDashboard>;

        if (!response.ok || !Array.isArray(data.decisionsSummary)) {
          if (!ignore) {
            setDecisionsSummary(fallbackDecisionsSummary);
          }
          return;
        }

        if (!ignore) {
          setDecisionsSummary(
            data.decisionsSummary as DashboardDecisionSummary[]
          );
        }
      } catch {
        if (!ignore) {
          setDecisionsSummary(fallbackDecisionsSummary);
        }
      }
    };

    const loadCaregiverLinks = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/users/${user.id}/caregiver-links`
        );
        const data = (await response.json()) as {
          links?: PatientCaregiverLink[];
        };

        if (!response.ok || !Array.isArray(data.links)) {
          if (!ignore) {
            setCaregiverLinks([]);
          }
          return;
        }

        if (!ignore) {
          setCaregiverLinks(sortLinksByStatus(data.links));
        }
      } catch {
        if (!ignore) {
          setCaregiverLinks([]);
        }
      }
    };

    const loadDoctorLinks = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/doctor-links`);
        const data = (await response.json()) as {
          links?: PatientDoctorLink[];
        };

        if (!response.ok || !Array.isArray(data.links)) {
          if (!ignore) {
            setDoctorLinks([]);
          }
          return;
        }

        if (!ignore) {
          setDoctorLinks(sortLinksByStatus(data.links));
        }
      } catch {
        if (!ignore) {
          setDoctorLinks([]);
        }
      }
    };

    const loadDocuments = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/documents`);
        const data = (await response.json()) as {
          documents?: PatientDocument[];
        };

        if (!response.ok || !Array.isArray(data.documents)) {
          if (!ignore) {
            setDocuments([]);
          }
          return;
        }

        if (!ignore) {
          setDocuments(data.documents);
        }
      } catch {
        if (!ignore) {
          setDocuments([]);
        }
      }
    };

    void Promise.all([
      loadDashboard(),
      loadCaregiverLinks(),
      loadDoctorLinks(),
      loadDocuments(),
    ]);

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id, user.role]);

  const activeCaregiverLinks = caregiverLinks.filter(
    (link) => link.status === "active"
  );
  const pendingCaregiverLinks = caregiverLinks.filter(
    (link) => link.status === "pending"
  );
  const activeDoctorLinks = doctorLinks.filter((link) => link.status === "active");
  const pendingDoctorLinks = doctorLinks.filter((link) => link.status === "pending");
  const primaryCaregiver = activeCaregiverLinks[0] ?? null;
  const primaryDoctor = activeDoctorLinks[0] ?? null;
  const extraActiveCaregiverCount = Math.max(0, activeCaregiverLinks.length - 1);
  const extraActiveDoctorCount = Math.max(0, activeDoctorLinks.length - 1);
  const completedDecisionCount = decisionsSummary.filter(
    (decision) => decision.value.trim() !== "Por definir"
  ).length;
  const pendingChecklistItems: string[] = [];

  if (completedDecisionCount < 3) {
    pendingChecklistItems.push(
      completedDecisionCount === 0
        ? t("Ainda não existem diretivas principais definidas.")
        : t("Faltam {count} diretivas por completar.", {
            count: 3 - completedDecisionCount,
          })
    );
  }

  if (documents.length === 0) {
    pendingChecklistItems.push(t("Ainda não tens documentos carregados."));
  }

  if (activeCaregiverLinks.length === 0) {
    pendingChecklistItems.push(
      pendingCaregiverLinks.length > 0
        ? getPendingCaregiverText(t, pendingCaregiverLinks.length)
        : t("Ainda não existe cuidador associado.")
    );
  }

  const hasPendingChecklist = pendingChecklistItems.length > 0;
  const latestDocument = documents[0] ?? null;
  const latestCaregiverActivity =
    activeCaregiverLinks[0]?.respondedAt ||
    pendingCaregiverLinks[0]?.createdAt ||
    "";
  const latestDoctorActivity =
    activeDoctorLinks[0]?.respondedAt || pendingDoctorLinks[0]?.createdAt || "";
  const latestConnectionActivity = [latestCaregiverActivity, latestDoctorActivity]
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
  const connectedDoctorCount = activeDoctorLinks.length;
  const latestDocumentText = latestDocument
    ? formatDateTime(latestDocument.uploadedAt)
    : t("Sem registo");
  const latestConnectionActivityText = latestConnectionActivity
    ? formatDateTime(latestConnectionActivity)
    : t("Sem registo");

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-brand">MyVontade</div>

          <div className="home-header-actions">
            <PatientNavigationMenu
              currentScreen="home"
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
        </div>
      </header>

      <main className="home-main">
        <section className="home-intro-card home-intro-card-minimal">
          <h1 className="home-title">
            {t("Olá, {name}", { name: getFirstName(user.name) })}
          </h1>
        </section>

        <section className="home-section home-panel-card home-priority-panel">
          <div className="home-section-header">
            <h2>{t("Decisões principais")}</h2>
          </div>

          <div className="home-decision-list home-decision-list-priority">
            {decisionsSummary.map((decision) => {
              const isDefined = decision.value.trim() !== "Por definir";

              return (
                <div
                  key={decision.label}
                  className={`home-decision-row ${
                    isDefined
                      ? "home-decision-row-defined"
                      : "home-decision-row-pending"
                  }`}
                >
                  <span className="home-decision-label">{t(decision.label)}</span>

                  <div className="home-decision-meta">
                    <strong className="home-decision-value">
                      {t(decision.value)}
                    </strong>
                    <span
                      className={`home-decision-state-pill ${
                        isDefined
                          ? "home-decision-state-pill-defined"
                          : "home-decision-state-pill-pending"
                      }`}
                    >
                      {isDefined ? t("Definida") : t("Pendente")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="home-content-stack">
          <section
            className={`home-overview-grid ${
              hasPendingChecklist ? "" : "home-overview-grid-compact"
            }`}
          >
            {hasPendingChecklist && (
              <article className="home-overview-card home-overview-card-wide">
                <div className="home-section-header">
                  <h2>{t("O que falta tratar")}</h2>
                </div>

                <div className="home-overview-checklist">
                  {pendingChecklistItems.map((item) => (
                    <div key={item} className="home-overview-check-row">
                      <span className="home-overview-check-dot" />
                      <p className="home-overview-check-text">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <article className="home-overview-card home-overview-card-caregiver-access">
              <div className="home-section-header">
                <h2>{t("Quem tem acesso")}</h2>
              </div>

              <div className="home-overview-list">
                <div className="home-overview-item">
                  <p className="home-overview-label">{t("Cuidadores ativos")}</p>
                  <strong className="home-overview-value">
                    {activeCaregiverLinks.length}
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">{t("Convites pendentes")}</p>
                  <strong className="home-overview-value">
                    {pendingCaregiverLinks.length}
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">{t("Médicos ligados")}</p>
                  <strong className="home-overview-value">
                    {connectedDoctorCount}
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
                  <p className="home-overview-label">{t("Diretivas definidas")}</p>
                  <strong className="home-overview-value">
                    {completedDecisionCount}/3
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">{t("Último documento")}</p>
                  <strong className="home-overview-value">
                    {latestDocumentText}
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">{t("Última ligação")}</p>
                  <strong className="home-overview-value">
                    {latestConnectionActivityText}
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <div className="home-association-grid">
            <section className="home-section home-panel-card home-caregiver-panel">
              <div className="home-section-header">
                <h2>{t("Cuidador")}</h2>
              </div>

              {primaryCaregiver ? (
                <div className="home-caregiver-sheet home-caregiver-sheet-active">
                  <div className="home-caregiver-sheet-head">
                    <h3 className="home-caregiver-sheet-title">
                      {primaryCaregiver.caregiverName}
                    </h3>
                    <span className="home-connection-pill">{t("Ativo")}</span>
                  </div>

                  <dl className="home-caregiver-sheet-list">
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Contacto")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        <div className="home-caregiver-sheet-value-stack">
                          <span>
                            {primaryCaregiver.caregiverEmail || t("Email por definir")}
                          </span>
                          <span>
                            {primaryCaregiver.caregiverPhoneNumber ||
                              t("Telefone por definir")}
                          </span>
                        </div>
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        {t("Relação contigo")}
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {primaryCaregiver.relationshipToPatient}
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        {t("Ligação ativa desde")}
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {primaryCaregiver.respondedAt
                          ? formatDateTime(primaryCaregiver.respondedAt)
                          : t("Agora mesmo")}
                      </dd>
                    </div>

                    {(extraActiveCaregiverCount > 0 ||
                      pendingCaregiverLinks.length > 0) && (
                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          {t("Mais informação")}
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          {extraActiveCaregiverCount > 0
                            ? extraActiveCaregiverCount === 1
                              ? t("Existe mais 1 cuidador ativo.")
                              : t("Existem mais {count} cuidadores ativos.", {
                                  count: extraActiveCaregiverCount,
                                })
                            : getPendingCaregiverText(
                                t,
                                pendingCaregiverLinks.length
                              )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : (
                <div className="home-caregiver-sheet">
                  <div className="home-caregiver-sheet-head">
                    <h3 className="home-caregiver-sheet-title">
                      {t("Sem cuidador associado")}
                    </h3>
                    <span
                      className={`home-connection-pill ${
                        pendingCaregiverLinks.length > 0
                          ? "home-connection-pill-warning"
                          : ""
                      }`}
                    >
                      {pendingCaregiverLinks.length > 0
                        ? t("Pendente")
                        : t("Por ligar")}
                    </span>
                  </div>

                  <dl className="home-caregiver-sheet-list">
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Estado")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingCaregiverLinks.length > 0
                          ? t("Convite pendente")
                          : t("Sem cuidador associado")}
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        {t("Próximo passo")}
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingCaregiverLinks.length > 0
                          ? getPendingCaregiverText(
                              t,
                              pendingCaregiverLinks.length
                            )
                          : t("Abrir a área do cuidador")}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>

            <section className="home-section home-panel-card home-caregiver-panel home-association-panel-secondary">
              <div className="home-section-header">
                <h2>{t("Médico")}</h2>
              </div>

              {primaryDoctor ? (
                <div className="home-caregiver-sheet home-caregiver-sheet-active">
                  <div className="home-caregiver-sheet-head">
                    <h3 className="home-caregiver-sheet-title">
                      {primaryDoctor.doctorName}
                    </h3>
                    <span className="home-connection-pill">{t("Ativo")}</span>
                  </div>

                  <dl className="home-caregiver-sheet-list">
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Contacto")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        <div className="home-caregiver-sheet-value-stack">
                          <span>{primaryDoctor.doctorEmail || t("Email por definir")}</span>
                          <span>
                            {primaryDoctor.doctorPhoneNumber || t("Telefone por definir")}
                          </span>
                        </div>
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Especialidade")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        {primaryDoctor.specialty || t("Por definir")}
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Cédula")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        {primaryDoctor.professionalLicense || t("Por definir")}
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        {t("Ligação ativa desde")}
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {primaryDoctor.respondedAt
                          ? formatDateTime(primaryDoctor.respondedAt)
                          : t("Agora mesmo")}
                      </dd>
                    </div>

                    {(extraActiveDoctorCount > 0 || pendingDoctorLinks.length > 0) && (
                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          {t("Mais informação")}
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          {extraActiveDoctorCount > 0
                            ? extraActiveDoctorCount === 1
                              ? t("Existe mais 1 médico ativo.")
                              : t("Existem mais {count} médicos ativos.", {
                                  count: extraActiveDoctorCount,
                                })
                            : getPendingDoctorText(t, pendingDoctorLinks.length)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : (
                <div className="home-caregiver-sheet">
                  <div className="home-caregiver-sheet-head">
                    <h3 className="home-caregiver-sheet-title">
                      {t("Sem médico associado")}
                    </h3>
                    <span className="home-connection-pill home-connection-pill-warning">
                      {pendingDoctorLinks.length > 0
                        ? t("Pendente")
                        : t("Sem ligação")}
                    </span>
                  </div>

                  <dl className="home-caregiver-sheet-list">
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Estado")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingDoctorLinks.length > 0
                          ? t("Convite pendente")
                          : t("Sem médico ligado")}
                      </dd>
                    </div>
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        {t("Próximo passo")}
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingDoctorLinks.length > 0
                          ? getPendingDoctorText(t, pendingDoctorLinks.length)
                          : t("Abrir a área do médico")}
                      </dd>
                    </div>
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">{t("Informação")}</dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingDoctorLinks.length > 0
                          ? t("O convite foi enviado e está à espera de aceitação.")
                          : t("Os dados do médico vão aparecer aqui")}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
