import { useState } from "react";
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

const roleOptions = [
  { value: "patient", label: "Paciente" },
  { value: "doctor", label: "Médico" },
  { value: "caregiver", label: "Cuidador" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nineDigitPattern = /^\d{9}$/;
const doctorLicensePattern = /^\d{4,6}$/;

function formatNineDigitValue(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  const parts = digits.match(/.{1,3}/g);
  return parts?.join(" ") ?? "";
}

function formatDoctorLicenseValue(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function hasValidEmailFormat(value: string) {
  return emailPattern.test(value.trim());
}

function hasValidNineDigitFormat(value: string) {
  return nineDigitPattern.test(value.replace(/\D/g, ""));
}

function hasValidDoctorLicenseFormat(value: string) {
  return doctorLicensePattern.test(value.replace(/\D/g, ""));
}

function getRoleLabel(role: string) {
  return roleOptions.find((option) => option.value === role)?.label ?? "Utilizador";
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

  const validateFields = () => {
    const nextErrors: SignupErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Obrigatório";
    }

    if (!email.trim()) {
      nextErrors.email = "Obrigatório";
    } else if (!hasValidEmailFormat(email)) {
      nextErrors.email = "Email inválido";
    }

    if (!password.trim()) {
      nextErrors.password = "Obrigatório";
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

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    setPatientNumber("");
    setDateOfBirth("");
    setProfessionalLicense("");
    setSpecialty("");
    setRelationshipToPatient("");
    setErrors({});
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
      email,
      password,
      patientNumber,
      dateOfBirth,
      phoneNumber,
      professionalLicense,
      specialty,
      relationshipToPatient,
    });
  };

  return (
    <div className="signup-page">
      <section className="info-panel">
        <div>
          <p className="panel-brand">MyVontade</p>
          <h1 className="panel-title">Registo simples para decisões em saúde.</h1>
          <p className="panel-text">
            Cria a tua conta de forma simples, clara e ajustada ao teu perfil.
          </p>
        </div>

        <div className="panel-notes">
          <p>Ao criar a conta</p>
          <ul className="panel-list">
            <li>Perfil ajustado ao teu papel</li>
            <li>Apenas a informação necessária</li>
            <li>Campos simples e fáceis de preencher</li>
          </ul>
        </div>
      </section>

      <section className="form-side">
        <div className="form-card">
          <h2 className="form-title">Registo</h2>

          {!role ? (
            <>
              <p className="role-intro">
                Escolhe o perfil com que te queres registar.
              </p>

              <div className="role-list">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    className="role-button"
                    type="button"
                    onClick={() => handleRoleSelect(option.value)}
                  >
                    {option.label}
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
                    onChange={(e) => {
                      setName(e.target.value);
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
                    placeholder="nome@exemplo.pt"
                    required
                    aria-invalid={Boolean(errors.email)}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
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
                    required
                    aria-invalid={Boolean(errors.password)}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError("password");
                    }}
                    className={errors.password ? "input-error" : ""}
                  />
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
                        onChange={(e) => {
                          setPatientNumber(formatNineDigitValue(e.target.value));
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
                        onChange={(e) => {
                          setDateOfBirth(e.target.value);
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
                        onChange={(e) => {
                          setPhoneNumber(formatNineDigitValue(e.target.value));
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
                        onChange={(e) => {
                          setProfessionalLicense(
                            formatDoctorLicenseValue(e.target.value)
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
                        onChange={(e) => {
                          setSpecialty(e.target.value);
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
                        onChange={(e) => {
                          setPhoneNumber(formatNineDigitValue(e.target.value));
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
                        onChange={(e) => {
                          setRelationshipToPatient(e.target.value);
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
                        onChange={(e) => {
                          setPhoneNumber(formatNineDigitValue(e.target.value));
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
              onClick={(e) => {
                e.preventDefault();
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
