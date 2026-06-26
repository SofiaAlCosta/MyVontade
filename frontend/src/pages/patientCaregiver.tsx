import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type {
  CaregiverSharePermissions,
  PatientCaregiverLink,
  User,
} from "../types/user";
import { getCaregiverPermissionLabels } from "../utils/caregiver";
import { hasValidEmailFormat } from "../utils/profile";
import "./patientModule.css";

type PatientCaregiverPageProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDocuments: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

type InvitationFormData = {
  caregiverEmail: string;
  relationshipToPatient: string;
  permissions: CaregiverSharePermissions;
};

type InvitationField = keyof InvitationFormData;
type InvitationErrors = Partial<Record<InvitationField, string>>;
type MessageTone = "success" | "error";

const initialFormData: InvitationFormData = {
  caregiverEmail: "",
  relationshipToPatient: "",
  permissions: {
    canViewInformation: true,
    canViewDecisions: true,
    canViewDocuments: true,
  },
};

function getCaregiverLinksMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Preenche o email do cuidador e a relação antes de enviar o convite.";
  }

  if (error === "invalid_field_format") {
    return "Revê o email indicado antes de continuar.";
  }

  if (error === "caregiver_not_found") {
    return "Não encontrámos um cuidador com esse email. O cuidador precisa de ter conta criada.";
  }

  if (error === "caregiver_already_connected") {
    return "Esse cuidador já está ligado ao teu perfil.";
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
    return "Escolhe pelo menos uma área para partilhar com o cuidador.";
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

function getStatusLabel(status: PatientCaregiverLink["status"]) {
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

export default function PatientCaregiverPage({
  apiUrl,
  user,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDocuments,
  onOpenAccount,
  onLogout,
}: PatientCaregiverPageProps) {
  const [formData, setFormData] = useState<InvitationFormData>(initialFormData);
  const [errors, setErrors] = useState<InvitationErrors>({});
  const [links, setLinks] = useState<PatientCaregiverLink[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [actionLinkId, setActionLinkId] = useState<number | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [editingPermissions, setEditingPermissions] =
    useState<CaregiverSharePermissions>(initialFormData.permissions);

  useEffect(() => {
    let ignore = false;

    const loadLinks = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/caregiver-links`);
        const data = (await response.json()) as {
          error?: string;
          links?: PatientCaregiverLink[];
        };

        if (!response.ok || !Array.isArray(data.links)) {
          if (!ignore) {
            setMessage(getCaregiverLinksMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          setLinks(data.links);
        }
      } catch {
        if (!ignore) {
          setMessage("Não foi possível carregar as ligações com cuidadores.");
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

    if (!formData.caregiverEmail.trim()) {
      nextErrors.caregiverEmail = "Obrigatório";
    } else if (!hasValidEmailFormat(formData.caregiverEmail)) {
      nextErrors.caregiverEmail = "Email inválido";
    }

    if (!formData.relationshipToPatient.trim()) {
      nextErrors.relationshipToPatient = "Obrigatório";
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
      const response = await fetch(`${apiUrl}/api/users/${user.id}/caregiver-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as {
        error?: string;
        link?: PatientCaregiverLink;
      };

      if (!response.ok || !data.link) {
        setMessage(getCaregiverLinksMessage(data.error));
        setMessageTone("error");
        return;
      }

      const nextLink = data.link;

      setLinks((currentLinks) => {
        const nextLinks = currentLinks.filter((link) => link.id !== nextLink.id);
        return [nextLink, ...nextLinks].sort((left, right) => {
          if (left.status !== right.status) {
            return left.status === "active" ? -1 : 1;
          }

          return right.createdAt.localeCompare(left.createdAt);
        });
      });
      setFormData(initialFormData);
      setErrors({});
      setIsInviteFormOpen(false);
      setMessage("Convite enviado com sucesso. O cuidador vai ter de o aceitar.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível enviar o convite ao cuidador.");
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
        `${apiUrl}/api/users/${user.id}/caregiver-links/${linkId}/revoke`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setMessage(getCaregiverLinksMessage(data.error));
        setMessageTone("error");
        return;
      }

      setLinks((currentLinks) => currentLinks.filter((link) => link.id !== linkId));
      if (editingLinkId === linkId) {
        setEditingLinkId(null);
        setEditingPermissions(initialFormData.permissions);
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

  const handleStartEditingPermissions = (link: PatientCaregiverLink) => {
    setEditingLinkId(link.id);
    setEditingPermissions({ ...link.permissions });
    setMessage("");
  };

  const handleCancelEditingPermissions = () => {
    setEditingLinkId(null);
    setEditingPermissions(initialFormData.permissions);
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
      setMessage("Escolhe pelo menos uma área para partilhar com o cuidador.");
      setMessageTone("error");
      return;
    }

    setActionLinkId(linkId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/caregiver-links/${linkId}/permissions`,
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
        link?: PatientCaregiverLink;
      };

      if (!response.ok || !data.link) {
        setMessage(getCaregiverLinksMessage(data.error));
        setMessageTone("error");
        return;
      }

      setLinks((currentLinks) =>
        currentLinks.map((link) => (link.id === data.link?.id ? data.link : link))
      );
      setEditingLinkId(null);
      setEditingPermissions(initialFormData.permissions);
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
            currentScreen="caregiver"
            onOpenHome={onOpenHome}
            onOpenDecisions={onOpenDecisions}
            onOpenCaregiver={onOpenCaregiver}
            onOpenDocuments={onOpenDocuments}
            onOpenAccount={onOpenAccount}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="module-main">
        <section className="module-intro-card module-intro-card-minimal">
          <h1 className="module-title">Ligações com cuidadores</h1>
        </section>

        <section className="module-card">
          <div className="module-section-heading">
            <div className="module-section-heading-group">
              <h2 className="module-card-title">Ligações atuais</h2>
              <span className="module-section-count-circle">{activeLinks.length}</span>
            </div>
            {isLoading && (
              <p className="module-inline-note">A carregar ligações atuais...</p>
            )}
          </div>

          {message && (
            <p
              className={`module-form-message module-form-message-${messageTone}`}
              role="status"
            >
              {message}
            </p>
          )}

          {!isLoading && pendingLinks.length > 0 && (
            <div className="module-stack">
              <h3 className="module-subtitle">Convites pendentes</h3>

              <div className="module-item-list">
                {pendingLinks.map((link) => {
                  const permissionLabels = getCaregiverPermissionLabels(
                    link.permissions
                  );
                  const hasPermissionChanges =
                    editingLinkId === link.id &&
                    !hasSamePermissions(editingPermissions, link.permissions);

                  return (
                    <article key={link.id} className="module-item">
                      <div className="module-item-top">
                        <p className="module-item-title">{link.caregiverName}</p>
                        <span className="module-pill module-pill-warning">
                          {getStatusLabel(link.status)}
                        </span>
                      </div>
                      <p className="module-item-text">{link.caregiverEmail}</p>
                      <p className="module-item-text">
                        Relação: {link.relationshipToPatient}
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
                              disabled={actionLinkId === link.id || !hasPermissionChanges}
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
            </div>
          )}

          {!isLoading && activeLinks.length > 0 && (
            <div className="module-stack">
              <div className="module-item-list">
                {activeLinks.map((link) => {
                  const permissionLabels = getCaregiverPermissionLabels(
                    link.permissions
                  );
                  const hasPermissionChanges =
                    editingLinkId === link.id &&
                    !hasSamePermissions(editingPermissions, link.permissions);

                  return (
                    <article key={link.id} className="module-item">
                      <div className="module-item-top">
                        <p className="module-item-title">{link.caregiverName}</p>
                        <span className="module-pill">{getStatusLabel(link.status)}</span>
                      </div>
                      <p className="module-item-text">{link.caregiverEmail}</p>
                      <p className="module-item-text">
                        Relação: {link.relationshipToPatient}
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
                        Telefone: {link.caregiverPhoneNumber || "Por definir"}
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
                              disabled={actionLinkId === link.id || !hasPermissionChanges}
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
            </div>
          )}

          <div
            className={`module-section-action ${
              hasAnyLinks ? "module-section-action-separated" : ""
            }`}
          >
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
                  Convidar
                </button>
              )}
            </div>

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
                      <span>Email da conta do cuidador</span>
                      {errors.caregiverEmail && (
                        <span className="module-field-error">
                          {errors.caregiverEmail}
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      value={formData.caregiverEmail}
                      aria-invalid={Boolean(errors.caregiverEmail)}
                      className={errors.caregiverEmail ? "module-input-error" : ""}
                      onChange={(event) =>
                        updateField("caregiverEmail", event.target.value)
                      }
                    />
                  </label>

                  <label className="module-field">
                    <div className="module-field-label">
                      <span>Relação com o paciente</span>
                      {errors.relationshipToPatient && (
                        <span className="module-field-error">
                          {errors.relationshipToPatient}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.relationshipToPatient}
                      aria-invalid={Boolean(errors.relationshipToPatient)}
                      className={
                        errors.relationshipToPatient ? "module-input-error" : ""
                      }
                      onChange={(event) =>
                        updateField("relationshipToPatient", event.target.value)
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
                            Email, telefone, número de utente e data de nascimento.
                          </span>
                        </div>
                      </label>

                      <label className="module-check-option">
                        <input
                          type="checkbox"
                          checked={formData.permissions.canViewDecisions}
                          onChange={(event) =>
                            togglePermission("canViewDecisions", event.target.checked)
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
                            togglePermission("canViewDocuments", event.target.checked)
                          }
                        />
                        <div>
                          <strong>Documentos</strong>
                          <span>Ficheiros carregados e respetivo descarregamento.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <p className="module-note">
                    O cuidador precisa de ter uma conta criada com o perfil
                    `cuidador` para poderes enviar o convite.
                  </p>

                  <div className="module-card-actions">
                    <button className="module-card-button" type="submit">
                      {isSaving ? "A enviar..." : "Enviar convite"}
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

