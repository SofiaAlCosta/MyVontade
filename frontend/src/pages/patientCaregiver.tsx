import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type { PatientCaregiverLink, User } from "../types/user";
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
};

type InvitationField = keyof InvitationFormData;
type InvitationErrors = Partial<Record<InvitationField, string>>;
type MessageTone = "success" | "error";

const initialFormData: InvitationFormData = {
  caregiverEmail: "",
  relationshipToPatient: "",
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
  const [formData, setFormData] =
    useState<InvitationFormData>(initialFormData);
  const [errors, setErrors] = useState<InvitationErrors>({});
  const [links, setLinks] = useState<PatientCaregiverLink[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLinkId, setActionLinkId] = useState<number | null>(null);

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

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validateFields();

    if (Object.keys(nextErrors).length > 0) {
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
      setMessage("Ligação removida com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível atualizar esta ligação.");
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
        <section className="module-intro-card">
          <h1 className="module-title">Ligações com cuidadores</h1>
          <p className="module-description">
            Gere aqui os teus cuidadores.
          </p>
        </section>

        <div className="module-grid">
          <section className="module-card">
            <h2 className="module-card-title">Convidar cuidador</h2>

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

                <p className="module-note">
                  O cuidador precisa de ter uma conta criada com o perfil
                  `cuidador` para poderes enviar o convite.
                </p>

                {message && (
                  <p
                    className={`module-form-message module-form-message-${messageTone}`}
                    role="status"
                  >
                    {message}
                  </p>
                )}

                <div className="module-card-actions">
                  <button className="module-card-button" type="submit">
                    {isSaving ? "A enviar..." : "Enviar convite"}
                  </button>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className="module-card">
            <h2 className="module-card-title">Resumo</h2>

            <div className="module-summary-grid">
              <article className="module-summary-stat">
                <strong>{activeLinks.length}</strong>
                <span>cuidadores ligados</span>
              </article>

              <article className="module-summary-stat">
                <strong>{pendingLinks.length}</strong>
                <span>convites pendentes</span>
              </article>
            </div>

            <article className="module-item">
              <p className="module-item-title">Paciente</p>
              <p className="module-item-text">{user.name}</p>
            </article>
          </aside>
        </div>

        <section className="module-card">
          <div className="module-section-heading">
            <h2 className="module-card-title">Ligações atuais</h2>
            {isLoading && (
              <p className="module-inline-note">A carregar ligações atuais...</p>
            )}
          </div>

          {!isLoading && links.length === 0 && (
            <p className="module-empty-text">
              Ainda não existe nenhum cuidador ligado a esta conta. O primeiro
              convite que enviares vai aparecer aqui.
            </p>
          )}

          {!isLoading && pendingLinks.length > 0 && (
            <div className="module-stack">
              <h3 className="module-subtitle">Convites pendentes</h3>

              <div className="module-item-list">
                {pendingLinks.map((link) => (
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
                    <p className="module-note">
                      Convite enviado em {formatDateTime(link.createdAt)}.
                    </p>

                    <div className="module-inline-actions">
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
                ))}
              </div>
            </div>
          )}

          {!isLoading && activeLinks.length > 0 && (
            <div className="module-stack">
              <h3 className="module-subtitle">Cuidadores ligados</h3>

              <div className="module-item-list">
                {activeLinks.map((link) => (
                  <article key={link.id} className="module-item">
                    <div className="module-item-top">
                      <p className="module-item-title">{link.caregiverName}</p>
                      <span className="module-pill">{getStatusLabel(link.status)}</span>
                    </div>
                    <p className="module-item-text">{link.caregiverEmail}</p>
                    <p className="module-item-text">
                      Relação: {link.relationshipToPatient}
                    </p>
                    <p className="module-item-text">
                      Telefone: {link.caregiverPhoneNumber || "Por definir"}
                    </p>
                    <p className="module-note">
                      Ligação aceite em {formatDateTime(link.respondedAt)}.
                    </p>

                    <div className="module-inline-actions">
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
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
