import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type { AccountProfile, SignupFormData, User } from "../types/user";
import {
  formatDoctorLicenseValue,
  formatNineDigitValue,
  getRoleLabel,
  hasValidDoctorLicenseFormat,
  hasValidEmailFormat,
  hasValidNineDigitFormat,
} from "../utils/profile";
import "./account.css";

type AccountPageProps = {
  apiUrl: string;
  user: User;
  onBack: () => void;
  onAccountDeleted: () => void;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
  patientNavigation?: {
    onOpenHome: () => void;
    onOpenDecisions: () => void;
    onOpenCaregiver: () => void;
    onOpenDocuments: () => void;
    onOpenAccount: () => void;
  };
};

type AccountFormData = Pick<
  SignupFormData,
  | "phoneNumber"
  | "patientNumber"
  | "dateOfBirth"
  | "professionalLicense"
  | "specialty"
  | "relationshipToPatient"
> & {
  name: string;
  email: string;
};

type AccountErrors = Partial<Record<keyof AccountFormData, string>>;
type MessageTone = "success" | "error";
type AccountSection = "personal" | "profile" | "delete";
type DeleteModalStep = "confirm" | "password";

const accountFormFields: Array<keyof AccountFormData> = [
  "name",
  "email",
  "phoneNumber",
  "patientNumber",
  "dateOfBirth",
  "professionalLicense",
  "specialty",
  "relationshipToPatient",
];

function createInitialFormData(user: User): AccountFormData {
  return {
    name: user.name,
    email: user.email,
    phoneNumber: "",
    patientNumber: "",
    dateOfBirth: "",
    professionalLicense: "",
    specialty: "",
    relationshipToPatient: "",
  };
}

function createFormData(account: AccountProfile): AccountFormData {
  return {
    name: account.user.name,
    email: account.user.email,
    phoneNumber: formatNineDigitValue(account.profile.phoneNumber),
    patientNumber: formatNineDigitValue(account.profile.patientNumber),
    dateOfBirth: account.profile.dateOfBirth,
    professionalLicense: formatDoctorLicenseValue(
      account.profile.professionalLicense
    ),
    specialty: account.profile.specialty,
    relationshipToPatient: account.profile.relationshipToPatient,
  };
}

function getAccountMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Preenche os campos obrigatórios antes de guardar.";
  }

  if (error === "invalid_field_format") {
    return "Existem campos com formato inválido.";
  }

  if (error === "user_already_exists") {
    return "Já existe uma conta com este email.";
  }

  if (error === "user_not_found") {
    return "Não foi possível encontrar esta conta.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

function getDeleteAccountMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Introduz a tua palavra-passe para continuar.";
  }

  if (error === "invalid_credentials") {
    return "A palavra-passe introduzida não está correta.";
  }

  if (error === "user_not_found") {
    return "Não foi possível encontrar esta conta.";
  }

  return "Não foi possível eliminar a conta. Tenta novamente.";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "MV";
}

function getPhotoStorageKey(userId: number) {
  return `myvontade-profile-photo-${userId}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result ?? ""));
    };

    reader.onerror = () => {
      reject(new Error("file_read_error"));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(new Error("image_load_error"));
    };

    image.src = source;
  });
}

async function prepareProfilePhoto(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  const size = 320;
  const cropSize = Math.min(image.width, image.height);
  const sourceX = (image.width - cropSize) / 2;
  const sourceY = (image.height - cropSize) / 2;

  canvas.width = size;
  canvas.height = size;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL("image/jpeg", 0.88);
}

function hasSameFormData(left: AccountFormData, right: AccountFormData) {
  return accountFormFields.every((field) => left[field] === right[field]);
}

export default function AccountPage({
  apiUrl,
  user,
  onBack,
  onAccountDeleted,
  onLogout,
  onUserUpdated,
  patientNavigation,
}: AccountPageProps) {
  const [formData, setFormData] = useState<AccountFormData>(() =>
    createInitialFormData(user)
  );
  const [savedFormData, setSavedFormData] = useState<AccountFormData>(() =>
    createInitialFormData(user)
  );
  const [errors, setErrors] = useState<AccountErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalStep, setDeleteModalStep] =
    useState<DeleteModalStep>("confirm");
  const [activeSection, setActiveSection] = useState<AccountSection>("personal");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deletePasswordInputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = isLoading || isSaving || isDeleting;
  const hasChanges = !isLoading && !hasSameFormData(formData, savedFormData);

  useEffect(() => {
    let ignore = false;

    const loadAccount = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/account`);
        const data = (await response.json()) as Partial<AccountProfile> & {
          error?: string;
        };

        if (!response.ok || !data.user || !data.profile) {
          if (!ignore) {
            setMessage(getAccountMessage(data.error));
            setMessageTone("error");
          }
          return;
        }

        if (!ignore) {
          const nextFormData = createFormData(data as AccountProfile);
          setFormData(nextFormData);
          setSavedFormData(nextFormData);
          onUserUpdated(data.user);
        }
      } catch {
        if (!ignore) {
          setMessage("Não foi possível carregar os dados da conta.");
          setMessageTone("error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadAccount();

    return () => {
      ignore = true;
    };
  }, [apiUrl, onUserUpdated, user.id]);

  useEffect(() => {
    const storedPhoto = window.localStorage.getItem(getPhotoStorageKey(user.id));
    setProfilePhoto(storedPhoto);
  }, [user.id]);

  useEffect(() => {
    const storageKey = getPhotoStorageKey(user.id);

    if (profilePhoto) {
      window.localStorage.setItem(storageKey, profilePhoto);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, [profilePhoto, user.id]);

  useEffect(() => {
    if (isDeleteModalOpen && deleteModalStep === "password") {
      deletePasswordInputRef.current?.focus();
    }
  }, [deleteModalStep, isDeleteModalOpen]);

  const clearError = (field: keyof AccountFormData) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const updateField = <Field extends keyof AccountFormData>(
    field: Field,
    value: AccountFormData[Field]
  ) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
    clearError(field);
  };

  const resetDeleteFlow = () => {
    setDeleteMessage("");
    setDeletePassword("");
    setDeleteModalStep("confirm");
    setIsDeleteModalOpen(false);
  };

  const openDeleteModal = () => {
    setDeleteMessage("");
    setDeletePassword("");
    setDeleteModalStep("confirm");
    setIsDeleteModalOpen(true);
  };

  const handleSectionChange = (section: AccountSection) => {
    setActiveSection(section);

    if (section !== "delete") {
      resetDeleteFlow();
    }
  };

  const validateFields = () => {
    const nextErrors: AccountErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Obrigatório";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Obrigatório";
    } else if (!hasValidEmailFormat(formData.email)) {
      nextErrors.email = "Email inválido";
    }

    if (!formData.phoneNumber.trim()) {
      nextErrors.phoneNumber = "Obrigatório";
    } else if (!hasValidNineDigitFormat(formData.phoneNumber)) {
      nextErrors.phoneNumber = "Deve ter 9 dígitos";
    }

    if (user.role === "patient") {
      if (!formData.patientNumber.trim()) {
        nextErrors.patientNumber = "Obrigatório";
      } else if (!hasValidNineDigitFormat(formData.patientNumber)) {
        nextErrors.patientNumber = "Deve ter 9 dígitos";
      }

      if (!formData.dateOfBirth.trim()) {
        nextErrors.dateOfBirth = "Obrigatório";
      }
    }

    if (user.role === "doctor") {
      if (!formData.professionalLicense.trim()) {
        nextErrors.professionalLicense = "Obrigatório";
      } else if (
        !hasValidDoctorLicenseFormat(formData.professionalLicense)
      ) {
        nextErrors.professionalLicense = "Deve ter 4 a 6 dígitos";
      }

      if (!formData.specialty.trim()) {
        nextErrors.specialty = "Obrigatório";
      }
    }

    if (user.role === "caregiver" && !formData.relationshipToPatient.trim()) {
      nextErrors.relationshipToPatient = "Obrigatório";
    }

    return nextErrors;
  };

  const handleSave = async () => {
    if (!hasChanges) {
      return;
    }

    setDeleteMessage("");
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
      const response = await fetch(`${apiUrl}/api/users/${user.id}/account`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          patientNumber: formData.patientNumber,
          dateOfBirth: formData.dateOfBirth,
          professionalLicense: formData.professionalLicense,
          specialty: formData.specialty,
          relationshipToPatient: formData.relationshipToPatient,
        }),
      });

      const data = (await response.json()) as Partial<AccountProfile> & {
        error?: string;
      };

      if (!response.ok || !data.user || !data.profile) {
        setMessage(getAccountMessage(data.error));
        setMessageTone("error");
        return;
      }

      onUserUpdated(data.user);
      const nextFormData = createFormData(data as AccountProfile);
      setFormData(nextFormData);
      setSavedFormData(nextFormData);
      setErrors({});
      setMessage("Alterações guardadas com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível guardar as alterações.");
      setMessageTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setMessage("Seleciona um ficheiro de imagem válido.");
      setMessageTone("error");
      event.target.value = "";
      return;
    }

    try {
      const nextPhoto = await prepareProfilePhoto(selectedFile);
      setProfilePhoto(nextPhoto);
    } catch {
      setMessage("Não foi possível atualizar a foto de perfil.");
      setMessageTone("error");
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteModalContinue = () => {
    setDeleteMessage("");
    setDeleteModalStep("password");
  };

  const handleDeleteModalBack = () => {
    if (isDeleting) {
      return;
    }

    handleDeleteModalClose();
  };

  const handleDeleteModalClose = () => {
    if (isDeleting) {
      return;
    }

    resetDeleteFlow();
  };

  const handleDeleteAccount = async () => {
    let accountDeleted = false;

    if (!deletePassword) {
      setDeleteMessage("Introduz a tua palavra-passe para continuar.");
      return;
    }

    setIsDeleting(true);
    setDeleteMessage("");
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setDeleteMessage(getDeleteAccountMessage(data.error));

        if (data.error === "invalid_credentials") {
          setDeletePassword("");
        }

        return;
      }

      accountDeleted = true;
      window.localStorage.removeItem(getPhotoStorageKey(user.id));
      onAccountDeleted();
    } catch {
      setDeleteMessage("Não foi possível eliminar a conta.");
    } finally {
      if (!accountDeleted) {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="account-page">
      <header className="account-header">
        <div className="account-brand">MyVontade</div>

        <div className="account-header-actions">
          {user.role === "patient" && patientNavigation ? (
            <PatientNavigationMenu
              currentScreen="account"
              onOpenHome={patientNavigation.onOpenHome}
              onOpenDecisions={patientNavigation.onOpenDecisions}
              onOpenCaregiver={patientNavigation.onOpenCaregiver}
              onOpenDocuments={patientNavigation.onOpenDocuments}
              onOpenAccount={patientNavigation.onOpenAccount}
              onLogout={onLogout}
            />
          ) : (
            <>
              <button
                className="account-header-button"
                type="button"
                onClick={onBack}
              >
                Voltar ao início
              </button>
              <button
                className="account-logout-button"
                type="button"
                onClick={onLogout}
              >
                Terminar sessão
              </button>
            </>
          )}
        </div>
      </header>

      <div className="account-body">
        <aside className="account-sidebar">
          <section className="account-profile-card">
            <button
              className="account-avatar-button"
              type="button"
              onClick={handlePhotoClick}
            >
              {profilePhoto ? (
                <img
                  className="account-avatar-image"
                  src={profilePhoto}
                  alt={`Foto de perfil de ${user.name}`}
                />
              ) : (
                <span className="account-avatar-fallback">
                  {getInitials(user.name)}
                </span>
              )}

              <span className="account-avatar-overlay">Editar</span>
            </button>

            <input
              ref={fileInputRef}
              className="account-file-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            <div className="account-profile-copy">
              <h2 className="account-profile-name">{user.name}</h2>
              <p className="account-profile-role">{getRoleLabel(user.role)}</p>
            </div>
          </section>

          <nav className="account-sidebar-nav" aria-label="Navegação da conta">
            <button
              className={`account-nav-item ${
                activeSection === "personal" ? "account-nav-item-active" : ""
              }`}
              type="button"
              onClick={() => handleSectionChange("personal")}
            >
              Informação pessoal
            </button>

            <button
              className={`account-nav-item ${
                activeSection === "profile" ? "account-nav-item-active" : ""
              }`}
              type="button"
              onClick={() => handleSectionChange("profile")}
            >
              Dados do perfil
            </button>
            <button
              className={`account-nav-item account-nav-item-danger ${
                activeSection === "delete" ? "account-nav-item-danger-active" : ""
              }`}
              type="button"
              onClick={() => handleSectionChange("delete")}
            >
              Eliminar conta
            </button>
          </nav>
        </aside>

        <main
          className={`account-main ${
            activeSection === "delete" ? "account-main-delete" : ""
          }`}
        >
          <div className="account-main-heading">
            <h1 className="account-main-title">A Minha Conta</h1>
          </div>

          <form
            className="account-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <fieldset className="account-fieldset" disabled={isBusy}>
              {isLoading && (
                <p className="account-inline-note">
                  A carregar os dados atuais da conta...
                </p>
              )}

              {activeSection === "personal" && (
                <section className="account-card">
                  <h2 className="account-card-title">Informação pessoal</h2>

                  <div className="account-fields-grid">
                    <label className="account-field">
                      <div className="account-field-label">
                        <span>Nome completo</span>
                        {errors.name && (
                          <span className="account-field-error">{errors.name}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Nome completo"
                        aria-invalid={Boolean(errors.name)}
                        className={errors.name ? "account-input-error" : ""}
                        value={formData.name}
                        onChange={(event) => updateField("name", event.target.value)}
                      />
                    </label>

                    <label className="account-field">
                      <div className="account-field-label">
                        <span>Email</span>
                        {errors.email && (
                          <span className="account-field-error">{errors.email}</span>
                        )}
                      </div>
                      <input
                        type="email"
                        placeholder="nome@exemplo.pt"
                        aria-invalid={Boolean(errors.email)}
                        className={errors.email ? "account-input-error" : ""}
                        value={formData.email}
                        onChange={(event) => updateField("email", event.target.value)}
                      />
                    </label>

                    <label className="account-field">
                      <div className="account-field-label">
                        <span>Telefone</span>
                        {errors.phoneNumber && (
                          <span className="account-field-error">
                            {errors.phoneNumber}
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="912 345 678"
                        aria-invalid={Boolean(errors.phoneNumber)}
                        className={errors.phoneNumber ? "account-input-error" : ""}
                        value={formData.phoneNumber}
                        onChange={(event) =>
                          updateField(
                            "phoneNumber",
                            formatNineDigitValue(event.target.value)
                          )
                        }
                      />
                    </label>
                  </div>
                </section>
              )}

              {activeSection === "profile" && (
                <section className="account-card">
                  <h2 className="account-card-title">Dados do perfil</h2>

                  <div className="account-fields-grid">
                    {user.role === "patient" && (
                      <>
                        <label className="account-field">
                          <div className="account-field-label">
                            <span>Número de utente</span>
                            {errors.patientNumber && (
                              <span className="account-field-error">
                                {errors.patientNumber}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="123 456 789"
                            aria-invalid={Boolean(errors.patientNumber)}
                            className={
                              errors.patientNumber ? "account-input-error" : ""
                            }
                            value={formData.patientNumber}
                            onChange={(event) =>
                              updateField(
                                "patientNumber",
                                formatNineDigitValue(event.target.value)
                              )
                            }
                          />
                        </label>

                        <label className="account-field">
                          <div className="account-field-label">
                            <span>Data de nascimento</span>
                            {errors.dateOfBirth && (
                              <span className="account-field-error">
                                {errors.dateOfBirth}
                              </span>
                            )}
                          </div>
                          <input
                            type="date"
                            aria-invalid={Boolean(errors.dateOfBirth)}
                            className={errors.dateOfBirth ? "account-input-error" : ""}
                            value={formData.dateOfBirth}
                            onChange={(event) =>
                              updateField("dateOfBirth", event.target.value)
                            }
                          />
                        </label>
                      </>
                    )}

                    {user.role === "doctor" && (
                      <>
                        <label className="account-field">
                          <div className="account-field-label">
                            <span>Cédula profissional</span>
                            {errors.professionalLicense && (
                              <span className="account-field-error">
                                {errors.professionalLicense}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="12345"
                            aria-invalid={Boolean(errors.professionalLicense)}
                            className={
                              errors.professionalLicense ? "account-input-error" : ""
                            }
                            value={formData.professionalLicense}
                            onChange={(event) =>
                              updateField(
                                "professionalLicense",
                                formatDoctorLicenseValue(event.target.value)
                              )
                            }
                          />
                        </label>

                        <label className="account-field">
                          <div className="account-field-label">
                            <span>Especialidade</span>
                            {errors.specialty && (
                              <span className="account-field-error">
                                {errors.specialty}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Especialidade"
                            aria-invalid={Boolean(errors.specialty)}
                            className={errors.specialty ? "account-input-error" : ""}
                            value={formData.specialty}
                            onChange={(event) =>
                              updateField("specialty", event.target.value)
                            }
                          />
                        </label>
                      </>
                    )}

                    {user.role === "caregiver" && (
                      <label className="account-field">
                        <div className="account-field-label">
                          <span>Relação com o utente</span>
                          {errors.relationshipToPatient && (
                            <span className="account-field-error">
                              {errors.relationshipToPatient}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex.: Familiar direto"
                          aria-invalid={Boolean(errors.relationshipToPatient)}
                          className={
                            errors.relationshipToPatient ? "account-input-error" : ""
                          }
                          value={formData.relationshipToPatient}
                          onChange={(event) =>
                            updateField("relationshipToPatient", event.target.value)
                          }
                        />
                      </label>
                    )}
                  </div>
                </section>
              )}

              {activeSection === "delete" && (
                <div className="account-danger-zone" aria-live="polite">
                  <div className="account-danger-copy">
                    <h2 className="account-danger-title">Eliminar conta</h2>
                    <p className="account-danger-text">
                      Esta ação remove a tua conta e os dados associados de
                      forma permanente.
                    </p>
                  </div>
                  <p className="account-danger-warning">
                    Antes de apagar tudo, vamos pedir uma confirmação e a tua
                    palavra-passe por segurança.
                  </p>
                  <button
                    className="account-danger-delete-button"
                    type="button"
                    onClick={openDeleteModal}
                    disabled={isBusy}
                  >
                    Eliminar conta
                  </button>
                </div>
              )}

              {message && (
                <p
                  className={`account-form-message account-form-message-${messageTone}`}
                  role="status"
                >
                  {message}
                </p>
              )}

              {activeSection !== "delete" && (
              <div className="account-actions">
                <button
                  className={`account-save-button ${
                    hasChanges ? "account-save-button-active" : ""
                  }`}
                  type="submit"
                  disabled={isBusy || !hasChanges}
                >
                  {isSaving ? "A guardar..." : "Guardar alterações"}
                </button>
              </div>
              )}

            </fieldset>
          </form>
        </main>
      </div>

      {isDeleteModalOpen && (
        <div className="account-modal-backdrop">
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-modal-title"
          >
            {deleteModalStep === "confirm" ? (
              <>
                <div className="account-modal-copy">
                  <h2
                    id="delete-account-modal-title"
                    className="account-modal-title"
                  >
                    Tens a certeza?
                  </h2>
                  <p className="account-modal-text">
                    Se continuares, a tua conta e todos os dados associados vão
                    ser removidos de forma permanente.
                  </p>
                </div>

                <div className="account-modal-actions">
                  <button
                    className="account-modal-secondary-button"
                    type="button"
                    onClick={handleDeleteModalClose}
                  >
                    Cancelar
                  </button>
                  <button
                    className="account-modal-primary-button"
                    type="button"
                    onClick={handleDeleteModalContinue}
                  >
                    Sim, continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="account-modal-copy">
                  <h2
                    id="delete-account-modal-title"
                    className="account-modal-title"
                  >
                    Introduz a tua palavra-passe
                  </h2>
                  <p className="account-modal-text">
                    Por segurança, precisamos da tua palavra-passe antes de
                    apagar a conta.
                  </p>
                </div>

                <label className="account-modal-field">
                  <span className="account-modal-label">Palavra-passe</span>
                  <input
                    ref={deletePasswordInputRef}
                    className="account-modal-input"
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(event) => {
                      setDeletePassword(event.target.value);

                      if (deleteMessage) {
                        setDeleteMessage("");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleDeleteAccount();
                      }
                    }}
                    disabled={isDeleting}
                  />
                </label>

                {deleteMessage && (
                  <p className="account-danger-message" role="status">
                    {deleteMessage}
                  </p>
                )}

                <div className="account-modal-actions">
                  <button
                    className="account-modal-secondary-button"
                    type="button"
                    onClick={handleDeleteModalBack}
                    disabled={isDeleting}
                  >
                    Voltar
                  </button>
                  <button
                    className="account-modal-danger-button"
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "A eliminar..." : "Eliminar conta"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
