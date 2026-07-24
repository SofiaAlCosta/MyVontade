import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import { useI18n } from "../i18n";
import type { PatientDecisions, User } from "../types/user";
import "./patientModule.css";

type DecisionsPageProps = {
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

type DecisionsErrors = Partial<Record<keyof PatientDecisions, string>>;
type MessageTone = "success" | "error";
type DecisionFieldKey =
  | "resuscitationPreference"
  | "artificialFeedingPreference"
  | "painManagementPreference";
type DecisionOption = {
  value: string;
  label: string;
};

const initialFormData: PatientDecisions = {
  resuscitationPreference: "",
  artificialFeedingPreference: "",
  painManagementPreference: "",
  notes: "",
};

const resuscitationOptions = [
  { value: "Tentar reanimação", label: "Tentar reanimação" },
  { value: "Não reanimar", label: "Não reanimar" },
];

const artificialFeedingOptions = [
  { value: "Aceitar apoio", label: "Aceitar apoio" },
  { value: "Recusar apoio", label: "Recusar apoio" },
];

const painManagementOptions = [
  {
    value: "Sentir menos dor, mesmo com mais sonolência",
    label: "Sentir menos dor, mesmo com mais sonolência",
  },
  {
    value: "Ficar mais alerta, mesmo com algum desconforto",
    label: "Ficar mais alerta, mesmo com algum desconforto",
  },
];

type DecisionSelectProps = {
  field: DecisionFieldKey;
  label: string;
  value: string;
  options: DecisionOption[];
  error?: string;
  isOpen: boolean;
  disabled?: boolean;
  onOpen: (field: DecisionFieldKey) => void;
  onClose: () => void;
  onChange: (field: DecisionFieldKey, value: string) => void;
};

function DecisionSelect({
  field,
  label,
  value,
  options,
  error,
  isOpen,
  disabled = false,
  onOpen,
  onClose,
  onChange,
}: DecisionSelectProps) {
  const { t } = useI18n();
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const displayValue = selectedOption
    ? t(selectedOption.label)
    : t("Seleciona uma opção");

  return (
    <div className="module-field">
      <div className="module-field-label">
        <span>{t(label)}</span>
        {error && <span className="module-field-error">{t(error)}</span>}
      </div>

      <div
        className="module-dropdown-shell"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onClose();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={Boolean(error)}
          className={`module-dropdown-button ${
            error ? "module-input-error" : ""
          } ${isOpen ? "module-dropdown-button-open" : ""}`}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              onClose();
              return;
            }

            onOpen(field);
          }}
        >
          <span
            className={`module-dropdown-button-text ${
              selectedOption ? "" : "module-dropdown-button-text-placeholder"
            }`}
          >
            {displayValue}
          </span>
          <span
            aria-hidden="true"
            className={`module-dropdown-caret ${
              isOpen ? "module-dropdown-caret-open" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="module-dropdown-menu" role="listbox" aria-label={t(label)}>
            <button
              type="button"
              role="option"
              aria-selected={!selectedOption}
              className={`module-dropdown-option ${
                !selectedOption ? "module-dropdown-option-selected" : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(field, "");
                onClose();
              }}
            >
              {t("Seleciona uma opção")}
            </button>

            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`module-dropdown-option ${
                  value === option.value ? "module-dropdown-option-selected" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(field, option.value);
                  onClose();
                }}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function hasSameFormData(left: PatientDecisions, right: PatientDecisions) {
  return (
    left.resuscitationPreference === right.resuscitationPreference &&
    left.artificialFeedingPreference === right.artificialFeedingPreference &&
    left.painManagementPreference === right.painManagementPreference &&
    left.notes === right.notes
  );
}

function getFilledDecisionCount(formData: PatientDecisions) {
  return [
    formData.resuscitationPreference,
    formData.artificialFeedingPreference,
    formData.painManagementPreference,
  ].filter((value) => value.trim()).length;
}

type DecisionsLifecycle = {
  status: "draft" | "active" | "expiring" | "expired" | "outdated" | "revoked";
  signedAt: string;
  validUntil: string;
  revokedAt: string;
  daysUntilExpiry: number | null;
};

const lifecycleStatusLabels: Record<DecisionsLifecycle["status"], string> = {
  draft: "Rascunho — ainda não registada",
  active: "Ativa",
  expiring: "A caducar",
  expired: "Caducada",
  outdated: "Alterada após o registo",
  revoked: "Revogada",
};

function formatIsoDate(value: string) {
  if (!value) {
    return "—";
  }
  const [y, m, d] = value.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

function getDecisionsMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Preenche as decisões principais antes de guardar.";
  }

  if (error === "invalid_role") {
    return "Esta área está disponível apenas para pacientes.";
  }

  if (error === "user_not_found") {
    return "Não foi possível encontrar estas diretivas.";
  }

  if (error === "invalid_date") {
    return "Indica uma data de assinatura válida.";
  }

  if (error === "future_date") {
    return "A data de assinatura não pode ser no futuro.";
  }

  if (error === "decisions_required") {
    return "Define e guarda as decisões antes de registar.";
  }

  if (error === "nothing_to_revoke") {
    return "Não há uma diretiva ativa para revogar.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

export default function DecisionsPage({
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
}: DecisionsPageProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<PatientDecisions>(initialFormData);
  const [savedFormData, setSavedFormData] =
    useState<PatientDecisions>(initialFormData);
  const [errors, setErrors] = useState<DecisionsErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openField, setOpenField] = useState<DecisionFieldKey | null>(null);
  const [lifecycle, setLifecycle] = useState<DecisionsLifecycle | null>(null);
  const [signedAtInput, setSignedAtInput] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const hasChanges = !isLoading && !hasSameFormData(formData, savedFormData);
  const filledDecisionCount = getFilledDecisionCount(formData);

  useEffect(() => {
    let ignore = false;

    const loadDecisions = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/decisions`);
        const data = (await response.json()) as Partial<PatientDecisions> & {
          error?: string;
          lifecycle?: DecisionsLifecycle;
        };

        if (
          !response.ok ||
          typeof data.resuscitationPreference !== "string" ||
          typeof data.artificialFeedingPreference !== "string" ||
          typeof data.painManagementPreference !== "string" ||
          typeof data.notes !== "string"
        ) {
          if (!ignore) {
            setMessage(getDecisionsMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          const nextFormData: PatientDecisions = {
            resuscitationPreference: data.resuscitationPreference,
            artificialFeedingPreference: data.artificialFeedingPreference,
            painManagementPreference: data.painManagementPreference,
            notes: data.notes,
          };

          setFormData(nextFormData);
          setSavedFormData(nextFormData);
          setLifecycle(data.lifecycle ?? null);
        }
      } catch {
        if (!ignore) {
          setMessage("Não foi possível carregar as tuas decisões.");
          setMessageTone("error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadDecisions();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  const clearError = (field: keyof PatientDecisions) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const updateField = <Field extends keyof PatientDecisions>(
    field: Field,
    value: PatientDecisions[Field]
  ) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
    clearError(field);
  };

  const validateFields = () => {
    const nextErrors: DecisionsErrors = {};

    if (!formData.resuscitationPreference.trim()) {
      nextErrors.resuscitationPreference = "Obrigatório";
    }

    if (!formData.artificialFeedingPreference.trim()) {
      nextErrors.artificialFeedingPreference = "Obrigatório";
    }

    if (!formData.painManagementPreference.trim()) {
      nextErrors.painManagementPreference = "Obrigatório";
    }

    return nextErrors;
  };

  const handleSave = async () => {
    if (!hasChanges) {
      return;
    }

    const nextErrors = validateFields();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage("Revê os campos assinalados antes de guardar.");
      setMessageTone("error");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/decisions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as Partial<PatientDecisions> & {
        error?: string;
        lifecycle?: DecisionsLifecycle;
      };

      if (
        !response.ok ||
        typeof data.resuscitationPreference !== "string" ||
        typeof data.artificialFeedingPreference !== "string" ||
        typeof data.painManagementPreference !== "string" ||
        typeof data.notes !== "string"
      ) {
        setMessage(getDecisionsMessage(data.error));
        setMessageTone("error");
        return;
      }

      const nextFormData: PatientDecisions = {
        resuscitationPreference: data.resuscitationPreference,
        artificialFeedingPreference: data.artificialFeedingPreference,
        painManagementPreference: data.painManagementPreference,
        notes: data.notes,
      };

      setFormData(nextFormData);
      setSavedFormData(nextFormData);
      setLifecycle(data.lifecycle ?? null);
      setErrors({});
      setMessage("Decisões guardadas com sucesso.");
      setMessageTone("success");
      setOpenField(null);
    } catch {
      setMessage("Não foi possível guardar as tuas decisões.");
      setMessageTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegister = async () => {
    if (!signedAtInput) {
      setMessage("Indica uma data de assinatura válida.");
      setMessageTone("error");
      return;
    }

    setIsRegistering(true);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/decisions/registration`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedAt: signedAtInput }),
        }
      );

      const data = (await response.json()) as {
        error?: string;
        lifecycle?: DecisionsLifecycle;
      };

      if (!response.ok) {
        setMessage(getDecisionsMessage(data.error));
        setMessageTone("error");
        return;
      }

      setLifecycle(data.lifecycle ?? null);
      setSignedAtInput("");
      setMessage("Registo guardado com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
      setMessageTone("error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/decisions/revoke`,
        { method: "POST" }
      );

      const data = (await response.json()) as {
        error?: string;
        lifecycle?: DecisionsLifecycle;
      };

      if (!response.ok) {
        setMessage(getDecisionsMessage(data.error));
        setMessageTone("error");
        return;
      }

      setLifecycle(data.lifecycle ?? null);
      setMessage("Diretiva revogada.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
      setMessageTone("error");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/decisions/pdf`
      );

      if (!response.ok) {
        setMessage("Não foi possível gerar o PDF.");
        setMessageTone("error");
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "diretiva-antecipada-de-vontade.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
      setMessageTone("error");
    } finally {
      setIsDownloading(false);
    }
  };

  const isRevoked = lifecycle?.status === "revoked";
  const isRegistered = Boolean(lifecycle?.signedAt) && !isRevoked;

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-brand">MyVontade</div>

        <div className="module-header-actions">
          <PatientNavigationMenu
            currentScreen="decisions"
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
          <h1 className="module-title">{t("As Minhas Decisões")}</h1>
        </section>

        <section className="module-card">
          <div className="module-section-heading">
            <div className="module-section-heading-group">
              <h2 className="module-card-title">{t("Estado da diretiva")}</h2>
              {lifecycle && (
                <span
                  className={`module-pill ${
                    lifecycle.status === "expired" ||
                    lifecycle.status === "revoked" ||
                    lifecycle.status === "expiring" ||
                    lifecycle.status === "outdated"
                      ? "module-pill-warning"
                      : ""
                  }`}
                >
                  {t(lifecycleStatusLabels[lifecycle.status])}
                </span>
              )}
            </div>
          </div>

          <p className="module-inline-note">
            {!lifecycle || lifecycle.status === "draft"
              ? t("Ainda não registaste esta diretiva no RENTEV.")
              : lifecycle.status === "revoked"
                ? t("Esta diretiva foi revogada.")
                : lifecycle.status === "expired"
                  ? t("A validade caducou. Renova a diretiva no RENTEV.")
                  : lifecycle.status === "outdated"
                    ? t(
                        "Alteraste as decisões após o registo. Considera re-registar no RENTEV."
                      )
                    : lifecycle.status === "expiring"
                      ? t(
                          "Caduca em {count} dias. Considera renovar no RENTEV.",
                          { count: lifecycle.daysUntilExpiry ?? 0 }
                        )
                      : t("Válida até {date}.", {
                          date: formatIsoDate(lifecycle.validUntil),
                        })}
          </p>

          {isRegistered && (
            <div className="module-meta-list">
              <div className="module-meta-row">
                <p className="module-meta-label">{t("Data de assinatura")}</p>
                <p className="module-meta-value">
                  {formatIsoDate(lifecycle?.signedAt ?? "")}
                </p>
              </div>
              <div className="module-meta-row">
                <p className="module-meta-label">{t("Válida até")}</p>
                <p className="module-meta-value">
                  {formatIsoDate(lifecycle?.validUntil ?? "")}
                </p>
              </div>
            </div>
          )}

          <div className="module-field">
            <div className="module-field-label">
              <span>{t("Data de assinatura/registo no RENTEV")}</span>
            </div>
            <input
              type="date"
              value={signedAtInput}
              max={new Date().toISOString().slice(0, 10)}
              disabled={isRegistering}
              onChange={(event) => setSignedAtInput(event.target.value)}
            />
          </div>

          <div className="module-inline-actions">
            <button
              className="module-inline-button"
              type="button"
              disabled={isRegistering || !signedAtInput}
              onClick={() => void handleRegister()}
            >
              {isRegistering ? t("A guardar...") : t("Registar assinatura")}
            </button>

            <button
              className="module-inline-button"
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownloadPdf()}
            >
              {isDownloading ? t("A gerar...") : t("Descarregar PDF")}
            </button>

            {isRegistered && (
              <button
                className="module-inline-button module-inline-button-danger"
                type="button"
                disabled={isRevoking}
                onClick={() => void handleRevoke()}
              >
                {isRevoking ? t("A revogar...") : t("Revogar diretiva")}
              </button>
            )}
          </div>

          <p className="module-note">
            {t(
              "A MyVontade ajuda-te a preparar e organizar a tua diretiva, mas não é o registo legal. O registo oficial é feito no RENTEV."
            )}
          </p>
        </section>

        <div className="module-grid">
          <section className="module-card">
            <h2 className="module-card-title">{t("Diretivas principais")}</h2>

            <form
              className="module-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              {isLoading && (
                <p className="module-inline-note">
                  {t("A carregar as tuas decisões atuais...")}
                </p>
              )}

              <fieldset className="module-fieldset" disabled={isLoading || isSaving}>
                <DecisionSelect
                  field="resuscitationPreference"
                  label="Reanimação"
                  value={formData.resuscitationPreference}
                  options={resuscitationOptions}
                  error={errors.resuscitationPreference}
                  isOpen={openField === "resuscitationPreference"}
                  disabled={isLoading || isSaving}
                  onOpen={setOpenField}
                  onClose={() => setOpenField(null)}
                  onChange={updateField}
                />

                <DecisionSelect
                  field="artificialFeedingPreference"
                  label="Alimentação artificial"
                  value={formData.artificialFeedingPreference}
                  options={artificialFeedingOptions}
                  error={errors.artificialFeedingPreference}
                  isOpen={openField === "artificialFeedingPreference"}
                  disabled={isLoading || isSaving}
                  onOpen={setOpenField}
                  onClose={() => setOpenField(null)}
                  onChange={updateField}
                />

                <DecisionSelect
                  field="painManagementPreference"
                  label="Quero sentir menos dor ou ficar mais alerta?"
                  value={formData.painManagementPreference}
                  options={painManagementOptions}
                  error={errors.painManagementPreference}
                  isOpen={openField === "painManagementPreference"}
                  disabled={isLoading || isSaving}
                  onOpen={setOpenField}
                  onClose={() => setOpenField(null)}
                  onChange={updateField}
                />

                <label className="module-field">
                  <div className="module-field-label">
                    <span>{t("Notas opcionais")}</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={t("Se quiseres, podes acrescentar uma nota.")}
                    value={formData.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </label>

                {message && (
                  <p
                    className={`module-form-message module-form-message-${messageTone}`}
                    role="status"
                  >
                    {t(message)}
                  </p>
                )}

                <div className="module-card-actions">
                  <button
                    className={`module-card-button ${
                      hasChanges ? "" : "module-card-button-muted"
                    }`}
                    type="submit"
                    disabled={!hasChanges || isLoading || isSaving}
                  >
                    {isSaving ? t("A guardar...") : t("Guardar decisões")}
                  </button>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className="module-card">
            <h2 className="module-card-title">{t("Resumo atual")}</h2>

            <div className="module-meta-list">
              <div className="module-meta-row">
                <p className="module-meta-label">{t("Preenchidas")}</p>
                <p className="module-meta-value">
                  {t("{count} de 3", { count: filledDecisionCount })}
                </p>
              </div>
            </div>

            <div className="module-item-list">
              <article className="module-item">
                <p className="module-item-title">{t("Reanimação")}</p>
                <p className="module-item-text">
                  {t(formData.resuscitationPreference || "Por definir")}
                </p>
              </article>

              <article className="module-item">
                <p className="module-item-title">{t("Alimentação artificial")}</p>
                <p className="module-item-text">
                  {t(formData.artificialFeedingPreference || "Por definir")}
                </p>
              </article>

              <article className="module-item">
                <p className="module-item-title">
                  {t("Quero sentir menos dor ou ficar mais alerta?")}
                </p>
                <p className="module-item-text">
                  {t(formData.painManagementPreference || "Por definir")}
                </p>
              </article>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
