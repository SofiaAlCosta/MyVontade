import { useEffect, useMemo, useState } from "react";
import DoctorNavigationMenu from "../components/DoctorNavigationMenu";
import type {
  DoctorPatientLink,
  DoctorPatientOverview,
  User,
} from "../types/user";
import {
  formatDoctorDate,
  formatDoctorDateTime,
  getDoctorAvailableSections,
  getDoctorMessage,
  sortDoctorPatientLinks,
  type DoctorDetailSection,
} from "../utils/doctor";
import "./patientHome.css";

type DoctorPatientsPageProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenPatients: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

export default function DoctorPatientsPage({
  apiUrl,
  user,
  onOpenHome,
  onOpenPatients,
  onOpenAccount,
  onLogout,
}: DoctorPatientsPageProps) {
  const [links, setLinks] = useState<DoctorPatientLink[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeSection, setActiveSection] =
    useState<DoctorDetailSection>("information");
  const [overview, setOverview] = useState<DoctorPatientOverview | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [overviewMessage, setOverviewMessage] = useState("");
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<
    number | null
  >(null);

  useEffect(() => {
    let ignore = false;

    const loadLinks = async () => {
      setIsLoading(true);
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
          setIsLoading(false);
        }
      }
    };

    void loadLinks();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  const activeLinks = links.filter((link) => link.status === "active");
  const pendingLinks = links.filter((link) => link.status === "pending");

  useEffect(() => {
    if (activeLinks.length === 0) {
      setSelectedPatientId(null);
      setOverview(null);
      setOverviewMessage("");
      return;
    }

    if (
      selectedPatientId !== null &&
      !activeLinks.some((link) => link.patientId === selectedPatientId)
    ) {
      setSelectedPatientId(null);
      setOverview(null);
      setOverviewMessage("");
    }
  }, [activeLinks, selectedPatientId]);

  const selectedLink =
    activeLinks.find((link) => link.patientId === selectedPatientId) ?? null;
  const hasSelectedPatient = selectedLink !== null;
  const availableSections = useMemo(
    () => (selectedLink ? getDoctorAvailableSections(selectedLink.permissions) : []),
    [selectedLink]
  );
  const activeSectionTitle =
    activeSection === "decisions"
      ? "Decisões"
      : activeSection === "documents"
        ? "Documentos"
        : "Informação";

  useEffect(() => {
    if (!selectedLink) {
      setActiveSection("information");
      return;
    }

    if (availableSections.length === 0) {
      setActiveSection("information");
      return;
    }

    if (!availableSections.includes(activeSection)) {
      setActiveSection(availableSections[0]);
    }
  }, [activeSection, availableSections, selectedLink]);

  useEffect(() => {
    if (!selectedPatientId) {
      setOverview(null);
      setOverviewMessage("");
      return;
    }

    let ignore = false;

    const loadOverview = async () => {
      setIsOverviewLoading(true);
      setOverviewMessage("");

      try {
        const response = await fetch(
          `${apiUrl}/api/users/${user.id}/doctor-patient-links/${selectedPatientId}/overview`
        );
        const data = (await response.json()) as {
          error?: string;
          permissions?: DoctorPatientOverview["permissions"];
          patient?: DoctorPatientOverview["patient"];
          dashboard?: DoctorPatientOverview["dashboard"];
          decisions?: DoctorPatientOverview["decisions"];
          documents?: DoctorPatientOverview["documents"];
        };

        if (!response.ok || !data.permissions || !Array.isArray(data.documents)) {
          if (!ignore) {
            setOverview(null);
            setOverviewMessage(getDoctorMessage(data.error));
          }
          return;
        }

        if (!ignore) {
          setOverview({
            permissions: data.permissions,
            patient: data.patient ?? null,
            dashboard: data.dashboard ?? null,
            decisions: data.decisions ?? null,
            documents: data.documents,
          });
        }
      } catch {
        if (!ignore) {
          setOverview(null);
          setOverviewMessage("Não foi possível carregar o resumo do paciente.");
        }
      } finally {
        if (!ignore) {
          setIsOverviewLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      ignore = true;
    };
  }, [apiUrl, selectedPatientId, user.id]);

  const handleDownloadDocument = async (documentId: number, fileName: string) => {
    setDownloadingDocumentId(documentId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/documents/${documentId}/file`
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const data = (await response.json()) as { error?: string } | undefined;
          setMessage(getDoctorMessage(data?.error));
        } else {
          setMessage("Não foi possível descarregar este documento.");
        }

        setMessageTone("error");
        return;
      }

      const fileBlob = await response.blob();
      const objectUrl = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setMessage("Documento descarregado com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível descarregar este documento.");
      setMessageTone("error");
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-brand">MyVontade</div>

          <div className="home-header-actions">
            <DoctorNavigationMenu
              currentScreen="patients"
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
          <h1 className="home-title home-title-wide">Ligações com pacientes</h1>
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

        {!isLoading && activeLinks.length === 0 && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>Área dos pacientes</h2>
            </div>

            <p className="home-next-step-text">
              {pendingLinks.length > 0
                ? "Ainda não tens pacientes ativos. Primeiro aceita os convites na página inicial do médico."
                : "Quando tiveres um paciente com acesso ativo, ele vai aparecer aqui para consultares apenas as áreas que ele partilhou contigo."}
            </p>
          </section>
        )}

        {activeLinks.length > 0 && (
          <section className="home-section caregiver-detail-shell">
            <div className="caregiver-detail-layout caregiver-detail-layout-profile">
              <aside className="caregiver-detail-sidebar caregiver-detail-sidebar-profile">
                <section className="caregiver-detail-card caregiver-patient-list-card">
                  <p className="home-next-step-text caregiver-patient-picker-note">
                    Seleciona um paciente para abrir a informação partilhada.
                  </p>

                  <div className="caregiver-patient-list">
                    {activeLinks.map((link) => (
                      <button
                        key={link.id}
                        className={`caregiver-detail-nav-button caregiver-patient-list-button ${
                          selectedPatientId === link.patientId
                            ? "caregiver-patient-list-button-active"
                            : ""
                        }`}
                        type="button"
                        aria-pressed={selectedPatientId === link.patientId}
                        onClick={() => {
                          setSelectedPatientId((currentPatientId) =>
                            currentPatientId === link.patientId ? null : link.patientId
                          );
                        }}
                      >
                        <span className="caregiver-patient-list-button-name">
                          {link.patientName}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {hasSelectedPatient && availableSections.length > 0 && (
                  <nav
                    className="caregiver-detail-card caregiver-detail-nav-card"
                    aria-label="Navegação do paciente selecionado"
                  >
                    <p className="home-status-title">Menu do paciente</p>

                    <div className="caregiver-detail-nav">
                      {selectedLink.permissions.canViewInformation && (
                        <button
                          className={`caregiver-detail-nav-button ${
                            activeSection === "information"
                              ? "caregiver-detail-nav-button-active"
                              : ""
                          }`}
                          type="button"
                          aria-pressed={activeSection === "information"}
                          onClick={() => setActiveSection("information")}
                        >
                          Informação
                        </button>
                      )}

                      {selectedLink.permissions.canViewDecisions && (
                        <button
                          className={`caregiver-detail-nav-button ${
                            activeSection === "decisions"
                              ? "caregiver-detail-nav-button-active"
                              : ""
                          }`}
                          type="button"
                          aria-pressed={activeSection === "decisions"}
                          onClick={() => setActiveSection("decisions")}
                        >
                          Decisões
                        </button>
                      )}

                      {selectedLink.permissions.canViewDocuments && (
                        <button
                          className={`caregiver-detail-nav-button ${
                            activeSection === "documents"
                              ? "caregiver-detail-nav-button-active"
                              : ""
                          }`}
                          type="button"
                          aria-pressed={activeSection === "documents"}
                          onClick={() => setActiveSection("documents")}
                        >
                          Documentos
                        </button>
                      )}
                    </div>
                  </nav>
                )}
              </aside>

              {hasSelectedPatient && (
                <section className="caregiver-detail-main caregiver-detail-main-profile">
                  <div className="caregiver-detail-main-heading">
                    <h1 className="caregiver-detail-main-title">
                      {activeSectionTitle}
                    </h1>
                  </div>

                  {isOverviewLoading && (
                    <p className="home-next-step-text">
                      A carregar os dados partilhados do paciente selecionado...
                    </p>
                  )}

                  {!isOverviewLoading && overviewMessage && (
                    <p className="home-feedback-message home-feedback-message-error">
                      {overviewMessage}
                    </p>
                  )}

                  {!isOverviewLoading &&
                    overview &&
                    activeSection === "information" &&
                    overview.patient && (
                      <section className="home-section home-panel-card caregiver-info-card">
                        <div className="caregiver-info-list">
                          <div className="caregiver-info-row">
                            <span className="caregiver-info-label">Email</span>
                            <strong className="caregiver-info-value">
                              {overview.patient.email}
                            </strong>
                          </div>
                          <div className="caregiver-info-row">
                            <span className="caregiver-info-label">Telefone</span>
                            <strong className="caregiver-info-value">
                              {overview.patient.phoneNumber || "Por definir"}
                            </strong>
                          </div>
                          <div className="caregiver-info-row">
                            <span className="caregiver-info-label">
                              Número de utente
                            </span>
                            <strong className="caregiver-info-value">
                              {overview.patient.patientNumber || "Por definir"}
                            </strong>
                          </div>
                          <div className="caregiver-info-row">
                            <span className="caregiver-info-label">
                              Data de nascimento
                            </span>
                            <strong className="caregiver-info-value">
                              {formatDoctorDate(overview.patient.dateOfBirth)}
                            </strong>
                          </div>
                          <div className="caregiver-info-row">
                            <span className="caregiver-info-label">
                              Ligação ativa desde
                            </span>
                            <strong className="caregiver-info-value">
                              {formatDoctorDateTime(selectedLink.respondedAt)}
                            </strong>
                          </div>
                        </div>
                      </section>
                    )}

                  {!isOverviewLoading &&
                    overview &&
                    activeSection === "decisions" &&
                    overview.dashboard &&
                    overview.decisions && (
                      <div className="home-detail-stack">
                        <section className="home-section home-panel-card">
                          <div className="home-decision-list">
                            {overview.dashboard.decisionsSummary.map((decision) => (
                              <div key={decision.label} className="home-decision-row">
                                <span className="home-decision-label">
                                  {decision.label}
                                </span>
                                <strong className="home-decision-value">
                                  {decision.value}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="home-section home-panel-card">
                          <div className="home-section-header">
                            <h2>Notas</h2>
                          </div>

                          <div className="home-caregiver-notes home-caregiver-notes-no-border">
                            <p className="home-caregiver-notes-label">
                              Notas registadas
                            </p>
                            <p className="home-next-step-text">
                              {overview.decisions.notes ||
                                "Não existem notas adicionais."}
                            </p>
                          </div>
                        </section>
                      </div>
                    )}

                  {!isOverviewLoading &&
                    overview &&
                    activeSection === "documents" && (
                      <section className="home-section home-panel-card">
                        {overview.documents.length === 0 ? (
                          <p className="home-next-step-text">
                            Este paciente ainda não carregou documentos nesta área.
                          </p>
                        ) : (
                          <div className="home-connection-list">
                            {overview.documents.map((document) => (
                              <article key={document.id} className="home-connection-card">
                                <div className="home-connection-top">
                                  <div>
                                    <p className="home-connection-title">
                                      {document.title}
                                    </p>
                                    <p className="home-connection-subtitle">
                                      {document.documentType || "Documento geral"}
                                    </p>
                                  </div>
                                  <span className="home-connection-pill">
                                    Partilhado
                                  </span>
                                </div>

                                <div className="home-connection-meta">
                                  <p>Ficheiro: {document.fileName}</p>
                                  <p>
                                    Carregado em{" "}
                                    {formatDoctorDateTime(document.uploadedAt)}
                                  </p>
                                </div>

                                <div className="home-connection-actions">
                                  <button
                                    className="home-action-button"
                                    type="button"
                                    disabled={downloadingDocumentId === document.id}
                                    onClick={() => {
                                      void handleDownloadDocument(
                                        document.id,
                                        document.fileName
                                      );
                                    }}
                                  >
                                    {downloadingDocumentId === document.id
                                      ? "A descarregar..."
                                      : "Descarregar documento"}
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                </section>
              )}
            </div>
          </section>
        )}

        {isLoading && (
          <section className="home-section home-panel-card">
            <div className="home-section-header">
              <h2>A carregar</h2>
            </div>

            <p className="home-next-step-text">
              Estamos a preparar os pacientes ligados a este perfil.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
