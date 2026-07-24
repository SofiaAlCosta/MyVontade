import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import PermissionFields from "../components/PermissionFields";
import { useI18n } from "../i18n";
import type {
  CaregiverSharePermissions,
  PatientCaregiverLink,
  User,
} from "../types/user";
import { formatDateTime } from "../utils/date";
import {
  getPatientCaregiverMessage,
  getCaregiverPermissionLabels,
} from "../utils/caregiver";
import {
  getLinkStatusLabel,
  hasAnyPermission,
  hasSamePermissions,
  sortLinksByStatus,
} from "../utils/permissions";
import { hasValidEmailFormat } from "../utils/profile";
import "./patientModule.css";

type PatientCaregiverPageProps = {
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

type InvitationFormData = {
  caregiverEmail: string;
  relationshipToPatient: string;
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
  caregiverEmail: "",
  relationshipToPatient: "",
  permissions: initialPermissions,
};

export default function PatientCaregiverPage({
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
}: PatientCaregiverPageProps) {
  const { t } = useI18n();
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
    useState<CaregiverSharePermissions>(initialPermissions);

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
            setMessage(getPatientCaregiverMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          setLinks(sortLinksByStatus(data.links));
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

    if (!hasAnyPermission(formData.permissions)) {
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
        setMessage(getPatientCaregiverMessage(data.error));
        setMessageTone("error");
        return;
      }

      const nextLink = data.link;

      setLinks((currentLinks) => {
        const nextLinks = currentLinks.filter((link) => link.id !== nextLink.id);
        return sortLinksByStatus([nextLink, ...nextLinks]);
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
        setMessage(getPatientCaregiverMessage(data.error));
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

  const handleStartEditingPermissions = (link: PatientCaregiverLink) => {
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

    if (!hasAnyPermission(editingPermissions)) {
      setMessage(getPatientCaregiverMessage("missing_permissions"));
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
        setMessage(getPatientCaregiverMessage(data.error));
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
            currentScreen="caregiver"
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
        <section className="module-intro-card module-intro-card-minimal">
          <h1 className="module-title">{t("Ligações com cuidadores")}</h1>
        </section>

        <section className="module-card">
          <div className="module-section-heading">
            <div className="module-section-heading-group">
              <h2 className="module-card-title">{t("Ligações atuais")}</h2>
              <span className="module-section-count-circle">{links.length}</span>
            </div>
            {isLoading && (
              <p className="module-inline-note">{t("A carregar ligações atuais...")}</p>
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
                  <h3 className="module-subtitle">{t("Convidar cuidador")}</h3>
                  <p className="module-inline-note">
                    {t(
                      "Envia um convite e define as áreas que o cuidador vai poder consultar."
                    )}
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
                      {t("Fechar formulário")}
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
                      {t("Convidar cuidador")}
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <p
                  className={`module-form-message module-form-message-${messageTone}`}
                  role="status"
                >
                  {t(message)}
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
                        <span>{t("Email da conta do cuidador")}</span>
                        {errors.caregiverEmail && (
                          <span className="module-field-error">
                            {t(errors.caregiverEmail)}
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
                        <span>{t("Relação com o paciente")}</span>
                        {errors.relationshipToPatient && (
                          <span className="module-field-error">
                            {t(errors.relationshipToPatient)}
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
                        <span>{t("Áreas que queres partilhar")}</span>
                        {errors.permissions && (
                          <span className="module-field-error">
                            {t(errors.permissions)}
                          </span>
                        )}
                      </div>

                      <PermissionFields
                        permissions={formData.permissions}
                        onToggle={togglePermission}
                      />
                    </div>

                    <p className="module-note">
                      {t(
                        "O cuidador precisa de ter uma conta criada com o perfil `cuidador` para poderes enviar o convite."
                      )}
                    </p>

                    <div className="module-card-actions">
                      <button className="module-card-button" type="submit">
                        {isSaving ? t("A enviar...") : t("Enviar convite")}
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
                    <h3 className="module-subtitle">{t("Convites pendentes")}</h3>
                    <span className="module-section-count-circle">
                      {pendingLinks.length}
                    </span>
                  </div>
                </div>

                <div className="module-item-list module-item-list-tight">
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
                            {t(getLinkStatusLabel(link.status))}
                          </span>
                        </div>
                        <p className="module-item-text">{link.caregiverEmail}</p>
                        <p className="module-item-text">
                          {t("Relação:")} {link.relationshipToPatient}
                        </p>
                        <div className="module-tag-list">
                          {permissionLabels.map((label) => (
                            <span key={label} className="module-tag">
                              {t(label)}
                            </span>
                          ))}
                        </div>

                        {editingLinkId === link.id && (
                          <div className="module-inline-editor">
                            <p className="module-inline-editor-title">
                              {t("Alterar permissões")}
                            </p>

                            <PermissionFields
                              permissions={editingPermissions}
                              onToggle={handleToggleEditingPermission}
                              variant="inline"
                            />
                          </div>
                        )}

                        <p className="module-note">
                          {t("Convite enviado em {date}.", {
                            date: formatDateTime(link.createdAt),
                          })}
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
                                  ? t("A guardar...")
                                  : t("Guardar permissões")}
                              </button>
                              <button
                                className="module-inline-button"
                                type="button"
                                disabled={actionLinkId === link.id}
                                onClick={handleCancelEditingPermissions}
                              >
                                {t("Cancelar")}
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
                              {t("Alterar permissões")}
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
                              ? t("A cancelar...")
                              : t("Cancelar convite")}
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
                <div className="module-item-list module-item-list-tight">
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
                          <span className="module-pill">
                            {t(getLinkStatusLabel(link.status))}
                          </span>
                        </div>
                        <p className="module-item-text">{link.caregiverEmail}</p>
                        <p className="module-item-text">
                          {t("Relação:")} {link.relationshipToPatient}
                        </p>
                        <div className="module-tag-list">
                          {permissionLabels.map((label) => (
                            <span key={label} className="module-tag">
                              {t(label)}
                            </span>
                          ))}
                        </div>

                        {editingLinkId === link.id && (
                          <div className="module-inline-editor">
                            <p className="module-inline-editor-title">
                              {t("Alterar permissões")}
                            </p>

                            <PermissionFields
                              permissions={editingPermissions}
                              onToggle={handleToggleEditingPermission}
                              variant="inline"
                            />
                          </div>
                        )}

                        <p className="module-item-text">
                          {t("Telefone:")}{" "}
                          {link.caregiverPhoneNumber || t("Por definir")}
                        </p>
                        <p className="module-note">
                          {t("Ligação aceite em {date}.", {
                            date: formatDateTime(link.respondedAt),
                          })}
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
                                  ? t("A guardar...")
                                  : t("Guardar permissões")}
                              </button>
                              <button
                                className="module-inline-button"
                                type="button"
                                disabled={actionLinkId === link.id}
                                onClick={handleCancelEditingPermissions}
                              >
                                {t("Cancelar")}
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
                              {t("Alterar permissões")}
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
                              ? t("A remover...")
                              : t("Remover ligação")}
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
                  <h3 className="module-subtitle">
                    {t("Ainda sem cuidadores ligados")}
                  </h3>
                  <p className="module-inline-note">
                    {t(
                      "Quando um cuidador aceitar o teu convite, a ligação vai aparecer aqui."
                    )}
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

