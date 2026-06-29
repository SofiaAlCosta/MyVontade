import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type {
  CaregiverSharePermissions,
  PatientDoctorLink,
  User,
} from "../types/user";
import { getDoctorPermissionLabels } from "../utils/doctor";
import { hasValidEmailFormat } from "../utils/profile";
import "./patientModule.css";

type PatientDoctorPageProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDoctor: () => void;
  onOpenDocuments: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

type InvitationFormData = {
  doctorEmail: string;
  permissions: CaregiverSharePermissions;
};

type InvitationField = keyof InvitationFormData;
type InvitationErrors = Partial<Record<InvitationField, string>>;
type MessageTone = "success" | "error";

const initialPermissions: CaregiverSharePermissions = {
  canViewInformation: true,
  canViewDecisions: true,
  canViewDocuments: true,
};

const initialFormData: InvitationFormData = {
  doctorEmail: "",
  permissions: initialPermissions,
};

function getDoctorLinksMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Preenche o email do médico antes de enviar o convite.";
  }

  if (error === "invalid_field_format") {
    return "Revê o email indicado antes de continuar.";
  }

  if (error === "doctor_not_found") {
    return "Não encontrámos um médico com esse email. O médico precisa de ter conta criada.";
  }

  if (error === "doctor_already_connected") {
    return "Esse médico já está ligado ao teu perfil.";
  }

  if (error === "invalid_role") {
    return "Esta área está disponível apenas para pacientes.";
  }

  if (error === "link_not_found") {
    return "Não foi possível encontrar essa ligação.";
  }

  if (error === "user_not_found") {
    return "Não foi possível encontrar este utilizador.";
  }

  if (error === "missing_permissions") {
    return "Escolhe pelo menos uma área para partilhar com o médico.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

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

function getStatusLabel(status: PatientDoctorLink["status"]) {
  return status === "active" ? "Ligado" : "Pendente";
}

function hasSamePermissions(
  left: CaregiverSharePermissions,
  right: CaregiverSharePermissions
) {
  return (
    left.canViewInformation === right.canViewInformation &&
    left.canViewDecisions === right.canViewDecisions &&
    left.canViewDocuments === right.canViewDocuments
  );
}

function sortPatientDoctorLinks(links: PatientDoctorLink[]) {
  return [...links].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    const leftDate =
      left.status === "active" ? left.respondedAt || left.createdAt : left.createdAt;
    const rightDate =
      right.status === "active"
        ? right.respondedAt || right.createdAt
        : right.createdAt;

    return rightDate.localeCompare(leftDate);
  });
}

export default function PatientDoctorPage({
  apiUrl,
  user,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDoctor,
  onOpenDocuments,
  onOpenAccount,
  onLogout,
}: PatientDoctorPageProps) {
  const [formData, setFormData] = useState<InvitationFormData>(initialFormData);
  const [errors, setErrors] = useState<InvitationErrors>({});
  const [links, setLinks] = useState<PatientDoctorLink[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [actionLinkId, setActionLinkId] = useState<number | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [editingPermissions, setEditingPermissions] =
    useState<CaregiverSharePermissions>(initialPermissions);

  useEffect(() => {
    let ignore = false;

    const loadLinks = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/doctor-links`);
        const data = (await response.json()) as {
          error?: string;
          links?: PatientDoctorLink[];
        };

        if (!response.ok || !Array.isArray(data.links)) {
          if (!ignore) {
            setMessage(getDoctorLinksMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          setLinks(sortPatientDoctorLinks(data.links));
        }
      } catch {
        if (!ignore) {
          setMessage("Não foi possível carregar as ligações com médicos.");
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
  const hasAnyLinks = links.length > 0;

  const updateField = <Field extends InvitationField>(
    field: Field,
    value: InvitationFormData[Field]
  ) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const togglePermission = (
    key: keyof CaregiverSharePermissions,
    checked: boolean
  ) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      permissions: {
        ...currentFormData.permissions,
        [key]: checked,
      },
    }));

    setErrors((currentErrors) => {
      if (!currentErrors.permissions) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors.permissions;
      return nextErrors;
    });
  };

  const validateFields = () => {
    const nextErrors: InvitationErrors = {};

    if (!formData.doctorEmail.trim()) {
      nextErrors.doctorEmail = "Obrigatório";
    } else if (!hasValidEmailFormat(formData.doctorEmail)) {
      nextErrors.doctorEmail = "Email inválido";
    }

    if (
      !formData.permissions.canViewInformation &&
      !formData.permissions.canViewDecisions &&
      !formData.permissions.canViewDocuments
    ) {
      nextErrors.permissions = "Escolhe pelo menos uma opção";
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validateFields();

    if (Object.keys(nextErrors).length > 0) {
      setIsInviteFormOpen(true);
      setErrors(nextErrors);
      setMessage("Revê os campos assinalados antes de enviar o convite.");
      setMessageTone("error");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/doctor-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as {
        error?: string;
        link?: PatientDoctorLink;
      };

      if (!response.ok || !data.link) {
        setMessage(getDoctorLinksMessage(data.error));
        setMessageTone("error");
        return;
      }

      const nextLink = data.link;

      setLinks((currentLinks) => {
        const nextLinks = currentLinks.filter((link) => link.id !== nextLink.id);
        return sortPatientDoctorLinks([nextLink, ...nextLinks]);
      });
      setFormData(initialFormData);
      setErrors({});
      setIsInviteFormOpen(false);
      setMessage("Convite enviado com sucesso. O médico vai ter de o aceitar.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível enviar o convite ao médico.");
      setMessageTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (linkId: number) => {
    setActionLinkId(linkId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/doctor-links/${linkId}/revoke`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setMessage(getDoctorLinksMessage(data.error));
        setMessageTone("error");
        return;
      }

      setLinks((currentLinks) => currentLinks.filter((link) => link.id !== linkId));
      if (editingLinkId === linkId) {
        setEditingLinkId(null);
        setEditingPermissions(initialPermissions);
      }
      setMessage("Ligação removida com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível atualizar esta ligação.");
      setMessageTone("error");
    } finally {
      setActionLinkId(null);
    }
  };

  const handleStartEditingPermissions = (link: PatientDoctorLink) => {
    setEditingLinkId(link.id);
    setEditingPermissions({ ...link.permissions });
    setMessage("");
  };

  const handleCancelEditingPermissions = () => {
    setEditingLinkId(null);
    setEditingPermissions(initialPermissions);
  };

  const handleToggleEditingPermission = (
    key: keyof CaregiverSharePermissions,
    checked: boolean
  ) => {
    setEditingPermissions((currentPermissions) => ({
      ...currentPermissions,
      [key]: checked,
    }));
  };

  const handleSavePermissions = async (linkId: number) => {
    const currentLink = links.find((link) => link.id === linkId);

    if (!currentLink || hasSamePermissions(editingPermissions, currentLink.permissions)) {
      return;
    }

    if (
      !editingPermissions.canViewInformation &&
      !editingPermissions.canViewDecisions &&
      !editingPermissions.canViewDocuments
    ) {
      setMessage("Escolhe pelo menos uma área para partilhar com o médico.");
      setMessageTone("error");
      return;
    }

    setActionLinkId(linkId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/doctor-links/${linkId}/permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissions: editingPermissions,
          }),
        }
      );

      const data = (await response.json()) as {
        error?: string;
        link?: PatientDoctorLink;
      };

      if (!response.ok || !data.link) {
        setMessage(getDoctorLinksMessage(data.error));
        setMessageTone("error");
        return;
      }

      setLinks((currentLinks) =>
        currentLinks.map((link) => (link.id === data.link?.id ? data.link : link))
      );
      setEditingLinkId(null);
      setEditingPermissions(initialPermissions);
      setMessage("Permissões atualizadas com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível atualizar as permissões desta ligação.");
      setMessageTone("error");
    } finally {
      setActionLinkId(null);
    }
  };

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-brand">MyVontade</div>

        <div className="module-header-actions">
          <PatientNavigationMenu
            currentScreen="doctor"
            onOpenHome={onOpenHome}
            onOpenDecisions={onOpenDecisions}
            onOpenCaregiver={onOpenCaregiver}
            onOpenDoctor={onOpenDoctor}
            onOpenDocuments={onOpenDocuments}
            onOpenAccount={onOpenAccount}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="module-main">
        <section className="module-intro-card module-intro-card-minimal">
          <h1 className="module-title">Médico</h1>
        </section>

        <section className="module-card">
          <div className="module-section-heading">
            <div className="module-section-heading-group">
              <h2 className="module-card-title">Ligações atuais</h2>
              <span className="module-section-count-circle">{links.length}</span>
            </div>
            {isLoading && (
              <p className="module-inline-note">A carregar ligações atuais...</p>
            )}
          </div>

          <div className="module-management-layout">
            <section
              className={`module-action-panel ${
                isInviteFormOpen ? "module-action-panel-open" : ""
              }`}
            >
              <div className="module-action-panel-header">
                <div className="module-action-panel-copy">
                  <h3 className="module-subtitle">Convidar médico</h3>
                  <p className="module-inline-note">
                    Envia um convite e escolhe exatamente o que queres
                    partilhar com o médico.
                  </p>
                </div>

                <div className="module-card-action module-card-action-start">
                  {isInviteFormOpen ? (
                    <button
                      className="module-inline-button"
                      type="button"
                      onClick={() => {
                        setIsInviteFormOpen(false);
                        setErrors({});
                      }}
                    >
                      Fechar formulário
                    </button>
                  ) : (
                    <button
                      className="module-card-button module-card-button-compact"
                      type="button"
                      onClick={() => {
                        setIsInviteFormOpen(true);
                        setMessage("");
                      }}
                    >
                      Convidar médico
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <p
                  className={`module-form-message module-form-message-${messageTone}`}
                  role="status"
                >
                  {message}
                </p>
              )}

              {isInviteFormOpen && (
                <form
                  className="module-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                  }}
                >
                  <fieldset className="module-fieldset" disabled={isSaving}>
                    <label className="module-field">
                      <div className="module-field-label">
                        <span>Email da conta do médico</span>
                        {errors.doctorEmail && (
                          <span className="module-field-error">
                            {errors.doctorEmail}
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={formData.doctorEmail}
                        aria-invalid={Boolean(errors.doctorEmail)}
                        className={errors.doctorEmail ? "module-input-error" : ""}
                        onChange={(event) =>
                          updateField("doctorEmail", event.target.value)
                        }
                      />
                    </label>

                    <div className="module-field">
                      <div className="module-field-label">
                        <span>Áreas que queres partilhar</span>
                        {errors.permissions && (
                          <span className="module-field-error">
                            {errors.permissions}
                          </span>
                        )}
                      </div>

                      <div className="module-check-list">
                        <label className="module-check-option">
                          <input
                            type="checkbox"
                            checked={formData.permissions.canViewInformation}
                            onChange={(event) =>
                              togglePermission(
                                "canViewInformation",
                                event.target.checked
                              )
                            }
                          />
                          <div>
                            <strong>Informação</strong>
                            <span>
                              Email, telefone, número de utente e data de
                              nascimento.
                            </span>
                          </div>
                        </label>

                        <label className="module-check-option">
                          <input
                            type="checkbox"
                            checked={formData.permissions.canViewDecisions}
                            onChange={(event) =>
                              togglePermission(
                                "canViewDecisions",
                                event.target.checked
                              )
                            }
                          />
                          <div>
                            <strong>Decisões</strong>
                            <span>Diretivas principais e notas registadas.</span>
                          </div>
                        </label>

                        <label className="module-check-option">
                          <input
                            type="checkbox"
                            checked={formData.permissions.canViewDocuments}
                            onChange={(event) =>
                              togglePermission(
                                "canViewDocuments",
                                event.target.checked
                              )
                            }
                          />
                          <div>
                            <strong>Documentos</strong>
                            <span>
                              Ficheiros carregados e respetivo descarregamento.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <p className="module-note">
                      O médico precisa de ter uma conta criada com o perfil
                      `médico` para poderes enviar o convite.
                    </p>

                    <div className="module-card-actions">
                      <button className="module-card-button" type="submit">
                        {isSaving ? "A enviar..." : "Enviar convite"}
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
            </section>

            {!isLoading && pendingLinks.length > 0 && (
              <section className="module-collection-panel">
                <div className="module-collection-header">
                  <div className="module-section-heading-group">
                    <h3 className="module-subtitle">Convites pendentes</h3>
                    <span className="module-section-count-circle">
                      {pendingLinks.length}
                    </span>
                  </div>
                </div>

                <div className="module-item-list module-item-list-tight">
                  {pendingLinks.map((link) => {
                    const permissionLabels = getDoctorPermissionLabels(
                      link.permissions
                    );
                    const hasPermissionChanges =
                      editingLinkId === link.id &&
                      !hasSamePermissions(editingPermissions, link.permissions);

                    return (
                      <article key={link.id} className="module-item">
                        <div className="module-item-top">
                          <p className="module-item-title">{link.doctorName}</p>
                          <span className="module-pill module-pill-warning">
                            {getStatusLabel(link.status)}
                          </span>
                        </div>
                        <p className="module-item-text">{link.doctorEmail}</p>
                        <p className="module-item-text">
                          Especialidade: {link.specialty || "Por definir"}
                        </p>
                        <div className="module-tag-list">
                          {permissionLabels.map((label) => (
                            <span key={label} className="module-tag">
                              {label}
                            </span>
                          ))}
                        </div>

                        {editingLinkId === link.id && (
                          <div className="module-inline-editor">
                            <p className="module-inline-editor-title">
                              Alterar permissões
                            </p>

                            <div className="module-check-list module-check-list-compact">
                              <label className="module-check-option module-check-option-compact">
                                <input
                                  type="checkbox"
                                  checked={editingPermissions.canViewInformation}
                                  onChange={(event) =>
                                    handleToggleEditingPermission(
                                      "canViewInformation",
                                      event.target.checked
                                    )
                                  }
                                />
                                <div>
                                  <strong>Informação</strong>
                                  <span>Dados pessoais do paciente.</span>
                                </div>
                              </label>

                              <label className="module-check-option module-check-option-compact">
                                <input
                                  type="checkbox"
                                  checked={editingPermissions.canViewDecisions}
                                  onChange={(event) =>
                                    handleToggleEditingPermission(
                                      "canViewDecisions",
                                      event.target.checked
                                    )
                                  }
                                />
                                <div>
                                  <strong>Decisões</strong>
                                  <span>Diretivas e notas registadas.</span>
                                </div>
                              </label>

                              <label className="module-check-option module-check-option-compact">
                                <input
                                  type="checkbox"
                                  checked={editingPermissions.canViewDocuments}
                                  onChange={(event) =>
                                    handleToggleEditingPermission(
                                      "canViewDocuments",
                                      event.target.checked
                                    )
                                  }
                                />
                                <div>
                                  <strong>Documentos</strong>
                                  <span>Ficheiros carregados.</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}

                        <p className="module-note">
                          Convite enviado em {formatDateTime(link.createdAt)}.
                        </p>

                        <div className="module-inline-actions">
                          {editingLinkId === link.id ? (
                            <>
                              <button
                                className={`module-inline-button ${
                                  hasPermissionChanges
                                    ? ""
                                    : "module-inline-button-muted"
                                }`}
                                type="button"
                                disabled={
                                  actionLinkId === link.id ||
                                  !hasPermissionChanges
                                }
                                onClick={() => {
                                  void handleSavePermissions(link.id);
                                }}
                              >
                                {actionLinkId === link.id
                                  ? "A guardar..."
                                  : "Guardar permissões"}
                              </button>
                              <button
                                className="module-inline-button"
                                type="button"
                                disabled={actionLinkId === link.id}
                                onClick={handleCancelEditingPermissions}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              className="module-inline-button"
                              type="button"
                              disabled={actionLinkId === link.id}
                              onClick={() => {
                                handleStartEditingPermissions(link);
                              }}
                            >
                              Alterar permissões
                            </button>
                          )}

                          <button
                            className="module-inline-button"
                            type="button"
                            disabled={actionLinkId === link.id}
                            onClick={() => {
                              void handleRevoke(link.id);
                            }}
                          >
                            {actionLinkId === link.id
                              ? "A cancelar..."
                              : "Cancelar convite"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {!isLoading && activeLinks.length > 0 && (
              <section className="module-collection-panel">
                <div className="module-collection-header">
                  <div className="module-section-heading-group">
                    <h3 className="module-subtitle">Médicos ligados</h3>
                    <span className="module-section-count-circle">
                      {activeLinks.length}
                    </span>
                  </div>
                  <p className="module-inline-note">
                    Estes acessos já foram aceites.
                  </p>
                </div>

                <div className="module-item-list module-item-list-tight">
                  {activeLinks.map((link) => {
                    const permissionLabels = getDoctorPermissionLabels(
                      link.permissions
                    );
                    const hasPermissionChanges =
                      editingLinkId === link.id &&
                      !hasSamePermissions(editingPermissions, link.permissions);

                    return (
                      <article key={link.id} className="module-item">
                        <div className="module-item-top">
                          <p className="module-item-title">{link.doctorName}</p>
                          <span className="module-pill">
                            {getStatusLabel(link.status)}
                          </span>
                        </div>
                        <p className="module-item-text">{link.doctorEmail}</p>
                        <p className="module-item-text">
                          Especialidade: {link.specialty || "Por definir"}
                        </p>
                        <p className="module-item-text">
                          Cédula: {link.professionalLicense || "Por definir"}
                        </p>
                        <div className="module-tag-list">
                          {permissionLabels.map((label) => (
                            <span key={label} className="module-tag">
                              {label}
                            </span>
                          ))}
                        </div>

                        {editingLinkId === link.id && (
                          <div className="module-inline-editor">
                            <p className="module-inline-editor-title">
                              Alterar permissões
                            </p>

                            <div className="module-check-list module-check-list-compact">
                              <label className="module-check-option module-check-option-compact">
                                <input
                                  type="checkbox"
                                  checked={editingPermissions.canViewInformation}
                                  onChange={(event) =>
                                    handleToggleEditingPermission(
                                      "canViewInformation",
                                      event.target.checked
                                    )
                                  }
                                />
                                <div>
                                  <strong>Informação</strong>
                                  <span>Dados pessoais do paciente.</span>
                                </div>
                              </label>

                              <label className="module-check-option module-check-option-compact">
                                <input
                                  type="checkbox"
                                  checked={editingPermissions.canViewDecisions}
                                  onChange={(event) =>
                                    handleToggleEditingPermission(
                                      "canViewDecisions",
                                      event.target.checked
                                    )
                                  }
                                />
                                <div>
                                  <strong>Decisões</strong>
                                  <span>Diretivas e notas registadas.</span>
                                </div>
                              </label>

                              <label className="module-check-option module-check-option-compact">
                                <input
                                  type="checkbox"
                                  checked={editingPermissions.canViewDocuments}
                                  onChange={(event) =>
                                    handleToggleEditingPermission(
                                      "canViewDocuments",
                                      event.target.checked
                                    )
                                  }
                                />
                                <div>
                                  <strong>Documentos</strong>
                                  <span>Ficheiros carregados.</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}

                        <p className="module-item-text">
                          Telefone: {link.doctorPhoneNumber || "Por definir"}
                        </p>
                        <p className="module-note">
                          Ligação aceite em {formatDateTime(link.respondedAt)}.
                        </p>

                        <div className="module-inline-actions">
                          {editingLinkId === link.id ? (
                            <>
                              <button
                                className={`module-inline-button ${
                                  hasPermissionChanges
                                    ? ""
                                    : "module-inline-button-muted"
                                }`}
                                type="button"
                                disabled={
                                  actionLinkId === link.id ||
                                  !hasPermissionChanges
                                }
                                onClick={() => {
                                  void handleSavePermissions(link.id);
                                }}
                              >
                                {actionLinkId === link.id
                                  ? "A guardar..."
                                  : "Guardar permissões"}
                              </button>
                              <button
                                className="module-inline-button"
                                type="button"
                                disabled={actionLinkId === link.id}
                                onClick={handleCancelEditingPermissions}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              className="module-inline-button"
                              type="button"
                              disabled={actionLinkId === link.id}
                              onClick={() => {
                                handleStartEditingPermissions(link);
                              }}
                            >
                              Alterar permissões
                            </button>
                          )}

                          <button
                            className="module-inline-button"
                            type="button"
                            disabled={actionLinkId === link.id}
                            onClick={() => {
                              void handleRevoke(link.id);
                            }}
                          >
                            {actionLinkId === link.id
                              ? "A remover..."
                              : "Remover ligação"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {!isLoading && !hasAnyLinks && !isInviteFormOpen && (
              <section className="module-collection-panel module-collection-panel-empty">
                <div className="module-collection-copy">
                  <h3 className="module-subtitle">Ainda sem médicos ligados</h3>
                  <p className="module-inline-note">
                    Quando um médico aceitar o teu convite, a ligação vai
                    aparecer aqui.
                  </p>
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
