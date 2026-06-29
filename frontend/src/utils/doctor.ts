import type {
  CaregiverSharePermissions,
  DoctorPatientLink,
} from "../types/user";
import { formatDate, formatDateTime } from "./date";
import {
  getAvailableSections,
  getPermissionLabels,
  sortLinksByStatus,
  type SharedDetailSection,
} from "./permissions";

export type DoctorDetailSection = SharedDetailSection;

const doctorMessages: Record<string, string> = {
  invalid_role: "Esta área está disponível apenas para médicos.",
  doctor_not_found:
    "Não encontrámos um médico com esse email. O médico precisa de ter conta criada.",
  doctor_already_connected: "Esse médico já está ligado ao teu perfil.",
  link_not_found: "Não foi possível encontrar esta ligação.",
  access_denied: "Só podes ver pacientes com ligação ativa ao teu perfil.",
  document_not_found: "Não foi possível encontrar este documento.",
  file_not_found: "O ficheiro deste documento já não está disponível.",
  user_not_found: "Não foi possível encontrar este utilizador.",
  missing_permissions: "Escolhe pelo menos uma área para partilhar com o médico.",
  missing_required_fields:
    "Preenche o email do médico antes de enviar o convite.",
  invalid_field_format: "Revê o email indicado antes de continuar.",
};

const patientDoctorMessages: Record<string, string> = {
  ...doctorMessages,
  invalid_role: "Esta área está disponível apenas para pacientes.",
  link_not_found: "Não foi possível encontrar essa ligação.",
};

export function getDoctorMessage(error: string | undefined) {
  return doctorMessages[error ?? ""] ?? "Ocorreu um erro. Tenta novamente.";
}

export function getPatientDoctorMessage(error: string | undefined) {
  return patientDoctorMessages[error ?? ""] ?? "Ocorreu um erro. Tenta novamente.";
}

export function getDoctorPermissionLabels(
  permissions: CaregiverSharePermissions
) {
  return getPermissionLabels(permissions);
}

export function getDoctorAvailableSections(
  permissions: CaregiverSharePermissions
): DoctorDetailSection[] {
  return getAvailableSections(permissions);
}

export function formatDoctorDateTime(value: string) {
  return formatDateTime(value);
}

export function formatDoctorDate(value: string) {
  return formatDate(value);
}

export function sortDoctorPatientLinks(links: DoctorPatientLink[]) {
  return sortLinksByStatus(links);
}
