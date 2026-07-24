import { useEffect, useState } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
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
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const displayValue = selectedOption?.label || "Seleciona uma opção";

  return (
    <div className="module-field">
      <div className="module-field-label">
        <span>{label}</span>
        {error && <span className="module-field-error">{error}</span>}
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
          <div className="module-dropdown-menu" role="listbox" aria-label={label}>
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
              Seleciona uma opção
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
                {option.label}
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
  const [formData, setFormData] = useState<PatientDecisions>(initialFormData);
  const [savedFormData, setSavedFormData] =
    useState<PatientDecisions>(initialFormData);
  const [errors, setErrors] = useState<DecisionsErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openField, setOpenField] = useState<DecisionFieldKey | null>(null);

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
          <h1 className="module-title">As Minhas Decisões</h1>
        </section>

        <div className="module-grid">
          <section className="module-card">
            <h2 className="module-card-title">Diretivas principais</h2>

            <form
              className="module-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              {isLoading && (
                <p className="module-inline-note">
                  A carregar as tuas decisões atuais...
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
                    <span>Notas opcionais</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Se quiseres, podes acrescentar uma nota."
                    value={formData.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </label>

                {message && (
                  <p
                    className={`module-form-message module-form-message-${messageTone}`}
                    role="status"
                  >
                    {message}
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
                    {isSaving ? "A guardar..." : "Guardar decisões"}
                  </button>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className="module-card">
            <h2 className="module-card-title">Resumo atual</h2>

            <div className="module-meta-list">
              <div className="module-meta-row">
                <p className="module-meta-label">Preenchidas</p>
                <p className="module-meta-value">{filledDecisionCount} de 3</p>
              </div>
            </div>

            <div className="module-item-list">
              <article className="module-item">
                <p className="module-item-title">Reanimação</p>
                <p className="module-item-text">
                  {formData.resuscitationPreference || "Por definir"}
                </p>
              </article>

              <article className="module-item">
                <p className="module-item-title">Alimentação artificial</p>
                <p className="module-item-text">
                  {formData.artificialFeedingPreference || "Por definir"}
                </p>
              </article>

              <article className="module-item">
                <p className="module-item-title">
                  Quero sentir menos dor ou ficar mais alerta?
                </p>
                <p className="module-item-text">
                  {formData.painManagementPreference || "Por definir"}
                </p>
              </article>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
