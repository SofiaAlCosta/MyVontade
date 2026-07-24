import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import PermissionFields from "../components/PermissionFields";
import { useI18n } from "../i18n";
import type {
  CaregiverSharePermissions,
  PatientDoctorLink,
  User,
} from "../types/user";
import { formatDateTime } from "../utils/date";
import {
  getPatientDoctorMessage,
  getDoctorPermissionLabels,
} from "../utils/doctor";
import {
  getLinkStatusLabel,
  hasAnyPermission,
  hasSamePermissions,
  sortLinksByStatus,
} from "../utils/permissions";
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
  onOpenAccessLog?: () => void;
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

export default function PatientDoctorPage({
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
}: PatientDoctorPageProps) {
  const { t } = useI18n();
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
            setMessage(getPatientDoctorMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          setLinks(sortLinksByStatus(data.links));
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
        setMessage(getPatientDoctorMessage(data.error));
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
        setMessage(getPatientDoctorMessage(data.error));
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

    if (!hasAnyPermission(editingPermissions)) {
      setMessage(getPatientDoctorMessage("missing_permissions"));
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
        setMessage(getPatientDoctorMessage(data.error));
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
            onOpenAccessLog={onOpenAccessLog}
            onOpenAccount={onOpenAccount}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="module-main">
        <section className="module-intro-card module-intro-card-minimal">
          <h1 className="module-title">{t("Ligações com Médicos")}</h1>
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
                  <h3 className="module-subtitle">{t("Convidar médico")}</h3>
                  <p className="module-inline-note">
                    {t(
                      "Envia um convite e escolhe exatamente o que queres partilhar com o médico."
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
                      {t("Convidar médico")}
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
                        <span>{t("Email da conta do médico")}</span>
                        {errors.doctorEmail && (
                          <span className="module-field-error">
                            {t(errors.doctorEmail)}
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
                        "O médico precisa de ter uma conta criada com o perfil `médico` para poderes enviar o convite."
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
                            {t(getLinkStatusLabel(link.status))}
                          </span>
                        </div>
                        <p className="module-item-text">{link.doctorEmail}</p>
                        <p className="module-item-text">
                          {t("Especialidade:")} {link.specialty || t("Por definir")}
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
                            {t(getLinkStatusLabel(link.status))}
                          </span>
                        </div>
                        <p className="module-item-text">{link.doctorEmail}</p>
                        <p className="module-item-text">
                          {t("Especialidade:")} {link.specialty || t("Por definir")}
                        </p>
                        <p className="module-item-text">
                          {t("Cédula:")}{" "}
                          {link.professionalLicense || t("Por definir")}
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
                          {link.doctorPhoneNumber || t("Por definir")}
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
                    {t("Ainda sem médicos ligados")}
                  </h3>
                  <p className="module-inline-note">
                    {t(
                      "Quando um médico aceitar o teu convite, a ligação vai aparecer aqui."
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
