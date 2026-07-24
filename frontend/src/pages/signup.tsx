import { useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n";
import type { SignupFormData } from "../types/user";
import {
  formatDoctorLicenseValue,
  formatNineDigitValue,
  getRoleLabel,
  hasValidDoctorLicenseFormat,
  hasValidEmailFormat,
  hasValidNineDigitFormat,
} from "../utils/profile";
import "./signup.css";

type SignupProps = {
  message: string;
  onSignup: (formData: SignupFormData) => Promise<void>;
  onGoToLogin: () => void;
};

type SignupErrors = Partial<Record<keyof SignupFormData, string>>;

const initialFormData: SignupFormData = {
  role: "",
  name: "",
  email: "",
  password: "",
  patientNumber: "",
  dateOfBirth: "",
  phoneNumber: "",
  professionalLicense: "",
  specialty: "",
  relationshipToPatient: "",
};

const roleOptions = ["patient", "doctor", "caregiver"] as const;
const passwordRules = [
  {
    label: "Pelo menos 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "Pelo menos 1 letra maiúscula",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Pelo menos 1 letra minúscula",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "Pelo menos 1 número",
    test: (value: string) => /\d/.test(value),
  },
] as const;

function getEmailValidationMessage(value: string) {
  if (!value.trim()) {
    return "Obrigatório";
  }

  if (!hasValidEmailFormat(value)) {
    return "Email inválido";
  }

  return "";
}

function hasValidPasswordFormat(value: string) {
  return passwordRules.every((rule) => rule.test(value));
}

function getPasswordValidationMessage(value: string) {
  if (!value.trim()) {
    return "Obrigatório";
  }

  if (!hasValidPasswordFormat(value)) {
    return "Palavra-passe inválida";
  }

  return "";
}

export default function Signup({
  message,
  onSignup,
  onGoToLogin,
}: SignupProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<SignupFormData>(initialFormData);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const {
    role,
    name,
    email,
    password,
    patientNumber,
    dateOfBirth,
    phoneNumber,
    professionalLicense,
    specialty,
    relationshipToPatient,
  } = formData;

  const isRoleSelected = role !== "";
  const shouldShowPasswordRules = isPasswordFocused || Boolean(errors.password);

  const clearError = (field: keyof SignupFormData) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const updateField = <Field extends keyof SignupFormData>(
    field: Field,
    value: SignupFormData[Field]
  ) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
    clearError(field);
  };

  const applyValidationMessage = (
    field: keyof SignupFormData,
    validationMessage: string
  ) => {
    setErrors((currentErrors) => {
      if (!validationMessage) {
        if (!currentErrors[field]) {
          return currentErrors;
        }

        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      }

      return {
        ...currentErrors,
        [field]: validationMessage,
      };
    });
  };

  const validateFields = () => {
    const nextErrors: SignupErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Obrigatório";
    }

    const emailValidationMessage = getEmailValidationMessage(email);

    if (emailValidationMessage) {
      nextErrors.email = emailValidationMessage;
    }

    const passwordValidationMessage = getPasswordValidationMessage(password);

    if (passwordValidationMessage) {
      nextErrors.password = passwordValidationMessage;
    }

    if (!phoneNumber.trim()) {
      nextErrors.phoneNumber = "Obrigatório";
    } else if (!hasValidNineDigitFormat(phoneNumber)) {
      nextErrors.phoneNumber = "Deve ter 9 dígitos";
    }

    if (role === "patient") {
      if (!patientNumber.trim()) {
        nextErrors.patientNumber = "Obrigatório";
      } else if (!hasValidNineDigitFormat(patientNumber)) {
        nextErrors.patientNumber = "Deve ter 9 dígitos";
      }

      if (!dateOfBirth.trim()) {
        nextErrors.dateOfBirth = "Obrigatório";
      }
    }

    if (role === "doctor") {
      if (!professionalLicense.trim()) {
        nextErrors.professionalLicense = "Obrigatório";
      } else if (!hasValidDoctorLicenseFormat(professionalLicense)) {
        nextErrors.professionalLicense = "Deve ter 4 a 6 dígitos";
      }

      if (!specialty.trim()) {
        nextErrors.specialty = "Obrigatório";
      }
    }

    if (role === "caregiver" && !relationshipToPatient.trim()) {
      nextErrors.relationshipToPatient = "Obrigatório";
    }

    return nextErrors;
  };

  const resetRoleSpecificFields = (selectedRole: string) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      role: selectedRole,
      patientNumber: "",
      dateOfBirth: "",
      professionalLicense: "",
      specialty: "",
      relationshipToPatient: "",
    }));
    setErrors({});
  };

  const handleSignup = async () => {
    const nextErrors = validateFields();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSignup({
      ...formData,
      email: formData.email.trim(),
    });
  };

  const handleEmailBlur = () => {
    if (!email.trim()) {
      return;
    }

    applyValidationMessage("email", getEmailValidationMessage(email));
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);

    if (!password.trim()) {
      return;
    }

    applyValidationMessage("password", getPasswordValidationMessage(password));
  };

  return (
    <div className={`signup-page${isRoleSelected ? " signup-page-expanded" : ""}`}>
      <section className="info-panel">
        <div>
          <p className="panel-brand">MyVontade</p>
          <div className="panel-intro">
            <h1 className="panel-title">
              {t("A tua vontade, com clareza e segurança.")}
            </h1>
            <p className="panel-text">
              {t(
                "Uma plataforma simples para consultar diretivas, decisões e documentos de saúde."
              )}
            </p>
          </div>
        </div>

        <div className="panel-notes">
          <p>{t("Na plataforma encontras")}</p>
          <ul className="panel-list">
            <li>{t("Clareza para registar a tua vontade")}</li>
            <li>{t("Partilha segura com quem te acompanha")}</li>
            <li>{t("Informação acessível quando for precisa")}</li>
          </ul>
        </div>
      </section>

      <section className="form-side">
        <div className={`form-card${isRoleSelected ? " form-card-expanded" : ""}`}>
          <div className="form-card-top">
            <LanguageSwitcher />
          </div>
          <h2 className="form-title">{t("Registo")}</h2>

          {!role ? (
            <>
              <p className="role-intro">
                {t("Escolhe o perfil com que te queres registar.")}
              </p>

              <div className="role-list">
                {roleOptions.map((option) => (
                  <button
                    key={option}
                    className="role-button"
                    type="button"
                    onClick={() => resetRoleSpecificFields(option)}
                  >
                    {t(getRoleLabel(option))}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="selected-role">
                <div>
                  <span className="selected-role-label">
                    {t("Perfil selecionado")}
                  </span>
                  <strong>{t(getRoleLabel(role))}</strong>
                </div>

                <button
                  className="change-role-button"
                  type="button"
                  onClick={() => {
                    updateField("role", "");
                    setErrors({});
                  }}
                >
                  {t("Alterar perfil")}
                </button>
              </div>

              <div className="form-fields">
                <label className="form-field">
                  <div className="field-label">
                    <span>{t("Nome")}</span>
                    {errors.name && (
                      <span className="field-error">{t(errors.name)}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={t("Nome completo")}
                    required
                    aria-invalid={Boolean(errors.name)}
                    value={name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className={errors.name ? "input-error" : ""}
                  />
                </label>

                <label className="form-field">
                  <div className="field-label">
                    <span>{t("Email")}</span>
                    {errors.email && (
                      <span className="field-error">{t(errors.email)}</span>
                    )}
                  </div>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={t("nome@gmail.com")}
                    required
                    aria-invalid={Boolean(errors.email)}
                    value={email}
                    onChange={(event) => updateField("email", event.target.value)}
                    onBlur={handleEmailBlur}
                    className={errors.email ? "input-error" : ""}
                  />
                </label>

                <label className="form-field">
                  <div className="field-label">
                    <span>{t("Palavra-passe")}</span>
                    {errors.password && (
                      <span className="field-error">{t(errors.password)}</span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={t("Cria uma palavra-passe")}
                    autoComplete="new-password"
                    required
                    aria-invalid={Boolean(errors.password)}
                    value={password}
                    onFocus={() => setIsPasswordFocused(true)}
                    onChange={(event) => updateField("password", event.target.value)}
                    onBlur={handlePasswordBlur}
                    className={errors.password ? "input-error" : ""}
                  />

                  {shouldShowPasswordRules && (
                    <div className="password-rules" aria-live="polite">
                      <p className="password-rules-title">
                        {t("A palavra-passe deve ter:")}
                      </p>
                      <ul className="password-rules-list">
                        {passwordRules.map((rule) => (
                          <li
                            key={rule.label}
                            className={
                              rule.test(password)
                                ? "password-rule password-rule-valid"
                                : "password-rule"
                            }
                          >
                            {t(rule.label)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </label>

                {role === "patient" && (
                  <div className="detail-box">
                    <p className="detail-title">{t("Informação do paciente")}</p>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Número de utente")}</span>
                        {errors.patientNumber && (
                          <span className="field-error">{t(errors.patientNumber)}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="123 456 789"
                        required
                        aria-invalid={Boolean(errors.patientNumber)}
                        value={patientNumber}
                        onChange={(event) =>
                          updateField(
                            "patientNumber",
                            formatNineDigitValue(event.target.value)
                          )
                        }
                        className={errors.patientNumber ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Data de nascimento")}</span>
                        {errors.dateOfBirth && (
                          <span className="field-error">{t(errors.dateOfBirth)}</span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        aria-invalid={Boolean(errors.dateOfBirth)}
                        value={dateOfBirth}
                        onChange={(event) =>
                          updateField("dateOfBirth", event.target.value)
                        }
                        className={errors.dateOfBirth ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Telefone")}</span>
                        {errors.phoneNumber && (
                          <span className="field-error">{t(errors.phoneNumber)}</span>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="912 345 678"
                        required
                        aria-invalid={Boolean(errors.phoneNumber)}
                        value={phoneNumber}
                        onChange={(event) =>
                          updateField(
                            "phoneNumber",
                            formatNineDigitValue(event.target.value)
                          )
                        }
                        className={errors.phoneNumber ? "input-error" : ""}
                      />
                    </label>
                  </div>
                )}

                {role === "doctor" && (
                  <div className="detail-box">
                    <p className="detail-title">{t("Informação profissional")}</p>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Cédula profissional")}</span>
                        {errors.professionalLicense && (
                          <span className="field-error">
                            {t(errors.professionalLicense)}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="12345"
                        required
                        aria-invalid={Boolean(errors.professionalLicense)}
                        value={professionalLicense}
                        onChange={(event) =>
                          updateField(
                            "professionalLicense",
                            formatDoctorLicenseValue(event.target.value)
                          )
                        }
                        className={errors.professionalLicense ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Especialidade")}</span>
                        {errors.specialty && (
                          <span className="field-error">{t(errors.specialty)}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={t("Especialidade")}
                        required
                        aria-invalid={Boolean(errors.specialty)}
                        value={specialty}
                        onChange={(event) => updateField("specialty", event.target.value)}
                        className={errors.specialty ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Telefone")}</span>
                        {errors.phoneNumber && (
                          <span className="field-error">{t(errors.phoneNumber)}</span>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="912 345 678"
                        required
                        aria-invalid={Boolean(errors.phoneNumber)}
                        value={phoneNumber}
                        onChange={(event) =>
                          updateField(
                            "phoneNumber",
                            formatNineDigitValue(event.target.value)
                          )
                        }
                        className={errors.phoneNumber ? "input-error" : ""}
                      />
                    </label>
                  </div>
                )}

                {role === "caregiver" && (
                  <div className="detail-box">
                    <p className="detail-title">{t("Informação do cuidador")}</p>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Relação com o utente")}</span>
                        {errors.relationshipToPatient && (
                          <span className="field-error">
                            {t(errors.relationshipToPatient)}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={t("Ex.: Familiar direto")}
                        required
                        aria-invalid={Boolean(errors.relationshipToPatient)}
                        value={relationshipToPatient}
                        onChange={(event) =>
                          updateField("relationshipToPatient", event.target.value)
                        }
                        className={errors.relationshipToPatient ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>{t("Telefone")}</span>
                        {errors.phoneNumber && (
                          <span className="field-error">{t(errors.phoneNumber)}</span>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="912 345 678"
                        required
                        aria-invalid={Boolean(errors.phoneNumber)}
                        value={phoneNumber}
                        onChange={(event) =>
                          updateField(
                            "phoneNumber",
                            formatNineDigitValue(event.target.value)
                          )
                        }
                        className={errors.phoneNumber ? "input-error" : ""}
                      />
                    </label>
                  </div>
                )}

                <button className="form-button" type="button" onClick={handleSignup}>
                  {t("Criar conta")}
                </button>
              </div>
            </>
          )}

          {message && Object.keys(errors).length === 0 && (
            <p className="form-message" role="status">
              {t(message)}
            </p>
          )}

          <p className="form-switch">
            {t("Já tens conta?")}{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onGoToLogin();
              }}
            >
              {t("Entrar")}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
