import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type {
  DashboardDecisionSummary,
  PatientCaregiverLink,
  PatientDashboard,
  PatientDocument,
  User,
} from "../types/user";
import { getFirstName } from "../utils/profile";
import "./patientHome.css";

type HomeProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDocuments: () => void;
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

function formatDateTime(value: string) {
  if (!value) {
    return "Agora mesmo";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPendingCaregiverText(count: number) {
  if (count <= 0) {
    return "";
  }

  return count === 1
    ? "Existe 1 convite de cuidador pendente."
    : `Existem ${count} convites de cuidador pendentes.`;
}

export default function PatientHome({
  apiUrl,
  user,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDocuments,
  onOpenAccount,
  onLogout,
}: HomeProps) {
  const [decisionsSummary, setDecisionsSummary] = useState<
    DashboardDecisionSummary[]
  >(fallbackDecisionsSummary);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [caregiverLinks, setCaregiverLinks] = useState<PatientCaregiverLink[]>(
    []
  );

  useEffect(() => {
    if (user.role !== "patient") {
      setDecisionsSummary(fallbackDecisionsSummary);
      setDocuments([]);
      setCaregiverLinks([]);
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
          setCaregiverLinks(data.links);
        }
      } catch {
        if (!ignore) {
          setCaregiverLinks([]);
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

    void Promise.all([loadDashboard(), loadCaregiverLinks(), loadDocuments()]);

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
  const primaryCaregiver = activeCaregiverLinks[0] ?? null;
  const extraActiveCaregiverCount = Math.max(0, activeCaregiverLinks.length - 1);
  const completedDecisionCount = decisionsSummary.filter(
    (decision) => decision.value.trim() !== "Por definir"
  ).length;
  const pendingChecklistItems: string[] = [];

  if (completedDecisionCount < 3) {
    pendingChecklistItems.push(
      completedDecisionCount === 0
        ? "Ainda não existem diretivas principais definidas."
        : `Faltam ${3 - completedDecisionCount} diretivas por completar.`
    );
  }

  if (documents.length === 0) {
    pendingChecklistItems.push("Ainda não tens documentos carregados.");
  }

  if (activeCaregiverLinks.length === 0) {
    pendingChecklistItems.push(
      pendingCaregiverLinks.length > 0
        ? getPendingCaregiverText(pendingCaregiverLinks.length)
        : "Ainda não existe cuidador associado."
    );
  }

  const hasPendingChecklist = pendingChecklistItems.length > 0;
  const latestDocument = documents[0] ?? null;
  const latestCaregiverActivity =
    activeCaregiverLinks[0]?.respondedAt ||
    pendingCaregiverLinks[0]?.createdAt ||
    "";
  const connectedDoctorCount = 0;
  const latestDocumentText = latestDocument
    ? formatDateTime(latestDocument.uploadedAt)
    : "Sem registo";
  const latestCaregiverActivityText = latestCaregiverActivity
    ? formatDateTime(latestCaregiverActivity)
    : "Sem registo";

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
              onOpenDocuments={onOpenDocuments}
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

        <section className="home-section home-panel-card home-priority-panel">
          <div className="home-section-header">
            <h2>Decisões principais</h2>
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
                  <span className="home-decision-label">{decision.label}</span>

                  <div className="home-decision-meta">
                    <strong className="home-decision-value">
                      {decision.value}
                    </strong>
                    <span
                      className={`home-decision-state-pill ${
                        isDefined
                          ? "home-decision-state-pill-defined"
                          : "home-decision-state-pill-pending"
                      }`}
                    >
                      {isDefined ? "Definida" : "Pendente"}
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
                  <h2>O que falta tratar</h2>
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
                <h2>Quem tem acesso</h2>
              </div>

              <div className="home-overview-list">
                <div className="home-overview-item">
                  <p className="home-overview-label">Cuidadores ativos</p>
                  <strong className="home-overview-value">
                    {activeCaregiverLinks.length}
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">Convites pendentes</p>
                  <strong className="home-overview-value">
                    {pendingCaregiverLinks.length}
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">Médicos ligados</p>
                  <strong className="home-overview-value">
                    {connectedDoctorCount}
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
                  <p className="home-overview-label">Diretivas definidas</p>
                  <strong className="home-overview-value">
                    {completedDecisionCount}/3
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">Último documento</p>
                  <strong className="home-overview-value">
                    {latestDocumentText}
                  </strong>
                </div>
                <div className="home-overview-item">
                  <p className="home-overview-label">Última ligação</p>
                  <strong className="home-overview-value">
                    {latestCaregiverActivityText}
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <div className="home-association-grid">
            <section className="home-section home-panel-card home-caregiver-panel">
              <div className="home-section-header">
                <h2>Cuidador</h2>
              </div>

              {primaryCaregiver ? (
                <div className="home-caregiver-sheet home-caregiver-sheet-active">
                  <div className="home-caregiver-sheet-head">
                    <h3 className="home-caregiver-sheet-title">
                      {primaryCaregiver.caregiverName}
                    </h3>
                    <span className="home-connection-pill">Ativo</span>
                  </div>

                  <dl className="home-caregiver-sheet-list">
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">Contacto</dt>
                      <dd className="home-caregiver-sheet-value">
                        <div className="home-caregiver-sheet-value-stack">
                          <span>
                            {primaryCaregiver.caregiverEmail ||
                              "Email por definir"}
                          </span>
                          <span>
                            {primaryCaregiver.caregiverPhoneNumber ||
                              "Telefone por definir"}
                          </span>
                        </div>
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        Relação contigo
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {primaryCaregiver.relationshipToPatient}
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        Ligação ativa desde
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {formatDateTime(primaryCaregiver.respondedAt)}
                      </dd>
                    </div>

                    {(extraActiveCaregiverCount > 0 ||
                      pendingCaregiverLinks.length > 0) && (
                      <div className="home-caregiver-sheet-row">
                        <dt className="home-caregiver-sheet-label">
                          Mais informação
                        </dt>
                        <dd className="home-caregiver-sheet-value">
                          {extraActiveCaregiverCount > 0
                            ? extraActiveCaregiverCount === 1
                              ? "Existe mais 1 cuidador ativo."
                              : `Existem mais ${extraActiveCaregiverCount} cuidadores ativos.`
                            : getPendingCaregiverText(
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
                      Sem cuidador associado
                    </h3>
                    <span
                      className={`home-connection-pill ${
                        pendingCaregiverLinks.length > 0
                          ? "home-connection-pill-warning"
                          : ""
                      }`}
                    >
                      {pendingCaregiverLinks.length > 0
                        ? "Pendente"
                        : "Por ligar"}
                    </span>
                  </div>

                  <dl className="home-caregiver-sheet-list">
                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">Estado</dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingCaregiverLinks.length > 0
                          ? "Convite pendente"
                          : "Sem cuidador associado"}
                      </dd>
                    </div>

                    <div className="home-caregiver-sheet-row">
                      <dt className="home-caregiver-sheet-label">
                        Próximo passo
                      </dt>
                      <dd className="home-caregiver-sheet-value">
                        {pendingCaregiverLinks.length > 0
                          ? getPendingCaregiverText(pendingCaregiverLinks.length)
                          : "Abrir a área do cuidador"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>

            <section className="home-section home-panel-card home-caregiver-panel home-association-panel-secondary">
              <div className="home-section-header">
                <h2>Médico</h2>
              </div>

              <div className="home-caregiver-sheet home-association-empty home-association-empty-compact">
                <div className="home-caregiver-sheet-head">
                  <h3 className="home-caregiver-sheet-title">
                    Ainda não tens médico ligado
                  </h3>
                  <span className="home-connection-pill home-connection-pill-warning">
                    Sem ligação
                  </span>
                </div>

                <div className="home-association-empty-body">
                  <p className="home-association-empty-text">
                    Neste momento não existe nenhum médico associado a esta
                    conta.
                  </p>
                  <p className="home-association-empty-note">
                    Quando tiveres um médico ligado ao teu perfil, os dados dele
                    vão aparecer aqui.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
