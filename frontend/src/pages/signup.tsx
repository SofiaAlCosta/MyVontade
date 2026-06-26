import { useState } from "react";
import {
  formatDoctorLicenseValue,
  formatNineDigitValue,
  getRoleLabel,
  hasValidDoctorLicenseFormat,
  hasValidEmailFormat,
  hasValidNineDigitFormat,
} from "../utils/profile";
import "./signup.css";

type SignupFormData = {
  role: string;
  name: string;
  email: string;
  password: string;
  patientNumber: string;
  dateOfBirth: string;
  phoneNumber: string;
  professionalLicense: string;
  specialty: string;
  relationshipToPatient: string;
};

type SignupProps = {
  message: string;
  onSignup: (formData: SignupFormData) => Promise<void>;
  onGoToLogin: () => void;
};

type SignupErrors = Partial<Record<keyof SignupFormData, string>>;

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
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [professionalLicense, setProfessionalLicense] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [relationshipToPatient, setRelationshipToPatient] = useState("");
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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

    if (role === "patient") {
      if (!patientNumber.trim()) {
        nextErrors.patientNumber = "Obrigatório";
      } else if (!hasValidNineDigitFormat(patientNumber)) {
        nextErrors.patientNumber = "Deve ter 9 dígitos";
      }

      if (!dateOfBirth.trim()) {
        nextErrors.dateOfBirth = "Obrigatório";
      }

      if (!phoneNumber.trim()) {
        nextErrors.phoneNumber = "Obrigatório";
      } else if (!hasValidNineDigitFormat(phoneNumber)) {
        nextErrors.phoneNumber = "Deve ter 9 dígitos";
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

      if (!phoneNumber.trim()) {
        nextErrors.phoneNumber = "Obrigatório";
      } else if (!hasValidNineDigitFormat(phoneNumber)) {
        nextErrors.phoneNumber = "Deve ter 9 dígitos";
      }
    }

    if (role === "caregiver") {
      if (!relationshipToPatient.trim()) {
        nextErrors.relationshipToPatient = "Obrigatório";
      }

      if (!phoneNumber.trim()) {
        nextErrors.phoneNumber = "Obrigatório";
      } else if (!hasValidNineDigitFormat(phoneNumber)) {
        nextErrors.phoneNumber = "Deve ter 9 dígitos";
      }
    }

    return nextErrors;
  };

  const resetRoleSpecificFields = () => {
    setPatientNumber("");
    setDateOfBirth("");
    setProfessionalLicense("");
    setSpecialty("");
    setRelationshipToPatient("");
    setErrors({});
  };

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    resetRoleSpecificFields();
  };

  const handleSignup = async () => {
    const nextErrors = validateFields();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSignup({
      role,
      name,
      email: email.trim(),
      password,
      patientNumber,
      dateOfBirth,
      phoneNumber,
      professionalLicense,
      specialty,
      relationshipToPatient,
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
            <h1 className="panel-title">A tua vontade, com clareza e segurança.</h1>
            <p className="panel-text">
              Uma plataforma simples para consultar diretivas, decisões e
              documentos de saúde.
            </p>
          </div>
        </div>

        <div className="panel-notes">
          <p>Na plataforma encontras</p>
          <ul className="panel-list">
            <li>Clareza para registar a tua vontade</li>
            <li>Partilha segura com quem te acompanha</li>
            <li>Informação acessível quando for precisa</li>
          </ul>
        </div>
      </section>

      <section className="form-side">
        <div className={`form-card${isRoleSelected ? " form-card-expanded" : ""}`}>
          <h2 className="form-title">Registo</h2>

          {!role ? (
            <>
              <p className="role-intro">
                Escolhe o perfil com que te queres registar.
              </p>

              <div className="role-list">
                {roleOptions.map((option) => (
                  <button
                    key={option}
                    className="role-button"
                    type="button"
                    onClick={() => handleRoleSelect(option)}
                  >
                    {getRoleLabel(option)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="selected-role">
                <div>
                  <span className="selected-role-label">Perfil selecionado</span>
                  <strong>{getRoleLabel(role)}</strong>
                </div>

                <button
                  className="change-role-button"
                  type="button"
                  onClick={() => {
                    setRole("");
                    setErrors({});
                  }}
                >
                  Alterar perfil
                </button>
              </div>

              <div className="form-fields">
                <label className="form-field">
                  <div className="field-label">
                    <span>Nome</span>
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    required
                    aria-invalid={Boolean(errors.name)}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearError("name");
                    }}
                    className={errors.name ? "input-error" : ""}
                  />
                </label>

                <label className="form-field">
                  <div className="field-label">
                    <span>Email</span>
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="nome@gmail.com"
                    required
                    aria-invalid={Boolean(errors.email)}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError("email");
                    }}
                    onBlur={handleEmailBlur}
                    className={errors.email ? "input-error" : ""}
                  />
                </label>

                <label className="form-field">
                  <div className="field-label">
                    <span>Palavra-passe</span>
                    {errors.password && (
                      <span className="field-error">{errors.password}</span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="Cria uma palavra-passe"
                    autoComplete="new-password"
                    required
                    aria-invalid={Boolean(errors.password)}
                    value={password}
                    onFocus={() => setIsPasswordFocused(true)}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearError("password");
                    }}
                    onBlur={handlePasswordBlur}
                    className={errors.password ? "input-error" : ""}
                  />

                  {shouldShowPasswordRules && (
                    <div className="password-rules" aria-live="polite">
                      <p className="password-rules-title">A palavra-passe deve ter:</p>
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
                            {rule.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </label>

                {role === "patient" && (
                  <div className="detail-box">
                    <p className="detail-title">Informação do paciente</p>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Número de utente</span>
                        {errors.patientNumber && (
                          <span className="field-error">{errors.patientNumber}</span>
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
                        onChange={(event) => {
                          setPatientNumber(formatNineDigitValue(event.target.value));
                          clearError("patientNumber");
                        }}
                        className={errors.patientNumber ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Data de nascimento</span>
                        {errors.dateOfBirth && (
                          <span className="field-error">{errors.dateOfBirth}</span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        aria-invalid={Boolean(errors.dateOfBirth)}
                        value={dateOfBirth}
                        onChange={(event) => {
                          setDateOfBirth(event.target.value);
                          clearError("dateOfBirth");
                        }}
                        className={errors.dateOfBirth ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Telefone</span>
                        {errors.phoneNumber && (
                          <span className="field-error">{errors.phoneNumber}</span>
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
                        onChange={(event) => {
                          setPhoneNumber(formatNineDigitValue(event.target.value));
                          clearError("phoneNumber");
                        }}
                        className={errors.phoneNumber ? "input-error" : ""}
                      />
                    </label>
                  </div>
                )}

                {role === "doctor" && (
                  <div className="detail-box">
                    <p className="detail-title">Informação profissional</p>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Cédula profissional</span>
                        {errors.professionalLicense && (
                          <span className="field-error">
                            {errors.professionalLicense}
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
                        onChange={(event) => {
                          setProfessionalLicense(
                            formatDoctorLicenseValue(event.target.value)
                          );
                          clearError("professionalLicense");
                        }}
                        className={errors.professionalLicense ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Especialidade</span>
                        {errors.specialty && (
                          <span className="field-error">{errors.specialty}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Especialidade"
                        required
                        aria-invalid={Boolean(errors.specialty)}
                        value={specialty}
                        onChange={(event) => {
                          setSpecialty(event.target.value);
                          clearError("specialty");
                        }}
                        className={errors.specialty ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Telefone</span>
                        {errors.phoneNumber && (
                          <span className="field-error">{errors.phoneNumber}</span>
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
                        onChange={(event) => {
                          setPhoneNumber(formatNineDigitValue(event.target.value));
                          clearError("phoneNumber");
                        }}
                        className={errors.phoneNumber ? "input-error" : ""}
                      />
                    </label>
                  </div>
                )}

                {role === "caregiver" && (
                  <div className="detail-box">
                    <p className="detail-title">Informação do cuidador</p>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Relação com o utente</span>
                        {errors.relationshipToPatient && (
                          <span className="field-error">
                            {errors.relationshipToPatient}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex.: Familiar direto"
                        required
                        aria-invalid={Boolean(errors.relationshipToPatient)}
                        value={relationshipToPatient}
                        onChange={(event) => {
                          setRelationshipToPatient(event.target.value);
                          clearError("relationshipToPatient");
                        }}
                        className={errors.relationshipToPatient ? "input-error" : ""}
                      />
                    </label>

                    <label className="form-field">
                      <div className="field-label">
                        <span>Telefone</span>
                        {errors.phoneNumber && (
                          <span className="field-error">{errors.phoneNumber}</span>
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
                        onChange={(event) => {
                          setPhoneNumber(formatNineDigitValue(event.target.value));
                          clearError("phoneNumber");
                        }}
                        className={errors.phoneNumber ? "input-error" : ""}
                      />
                    </label>
                  </div>
                )}

                <button className="form-button" type="button" onClick={handleSignup}>
                  Criar conta
                </button>
              </div>
            </>
          )}

          {message && Object.keys(errors).length === 0 && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <p className="form-switch">
            Já tens conta?{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onGoToLogin();
              }}
            >
              Entrar
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
