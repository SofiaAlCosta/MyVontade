const roleLabels: Record<string, string> = {
  patient: "Paciente",
  doctor: "Médico",
  caregiver: "Cuidador",
};

const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const nineDigitPattern = /^\d{9}$/;
const doctorLicensePattern = /^\d{4,6}$/;

export function getRoleLabel(role: string) {
  return roleLabels[role] ?? "Utilizador";
}

export function getFirstName(name: string) {
  const [firstName = ""] = name.trim().split(/\s+/);
  return firstName || "Utilizador";
}

export function formatNineDigitValue(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  const parts = digits.match(/.{1,3}/g);
  return parts?.join(" ") ?? "";
}

export function formatDoctorLicenseValue(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function hasValidEmailFormat(value: string) {
  return emailPattern.test(value.trim());
}

export function hasValidNineDigitFormat(value: string) {
  return nineDigitPattern.test(value.replace(/\D/g, ""));
}

export function hasValidDoctorLicenseFormat(value: string) {
  return doctorLicensePattern.test(value.replace(/\D/g, ""));
}
