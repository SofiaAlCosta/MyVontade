import type {
  CaregiverPatientLink,
  CaregiverSharePermissions,
  DashboardCard,
} from "../types/user";
import { formatDate, formatDateTime } from "./date";
import {
  getAvailableSections,
  getPermissionLabels,
  sortLinksByStatus,
  type SharedDetailSection,
} from "./permissions";

export type CaregiverDetailSection = SharedDetailSection;

const caregiverMessages: Record<string, string> = {
  invalid_role: "Esta área está disponível apenas para cuidadores.",
  caregiver_not_found:
    "Não encontrámos um cuidador com esse email. O cuidador precisa de ter conta criada.",
  caregiver_already_connected: "Esse cuidador já está ligado ao teu perfil.",
  link_not_found: "Não foi possível encontrar este convite.",
  access_denied: "Só podes ver pacientes com ligação ativa ao teu perfil.",
  document_not_found: "Não foi possível encontrar este documento.",
  file_not_found: "O ficheiro deste documento já não está disponível.",
  user_not_found: "Não foi possível encontrar este utilizador.",
  missing_required_fields:
    "Preenche o email do cuidador e a relação antes de enviar o convite.",
  invalid_field_format: "Revê o email indicado antes de continuar.",
  missing_permissions:
    "Escolhe pelo menos uma área para partilhar com o cuidador.",
};

const patientCaregiverMessages: Record<string, string> = {
  ...caregiverMessages,
  invalid_role: "Esta área está disponível apenas para pacientes.",
  link_not_found: "Não foi possível encontrar essa ligação.",
};

export function getCaregiverMessage(error: string | undefined) {
  return caregiverMessages[error ?? ""] ?? "Ocorreu um erro. Tenta novamente.";
}

export function getPatientCaregiverMessage(error: string | undefined) {
  return patientCaregiverMessages[error ?? ""] ?? "Ocorreu um erro. Tenta novamente.";
}

export function getCaregiverPermissionLabels(
  permissions: CaregiverSharePermissions
) {
  return getPermissionLabels(permissions);
}

export function getCaregiverAvailableSections(
  permissions: CaregiverSharePermissions
): CaregiverDetailSection[] {
  return getAvailableSections(permissions);
}

export function formatCaregiverDateTime(value: string) {
  return formatDateTime(value);
}

export function formatCaregiverDate(value: string) {
  return formatDate(value);
}

export function getCaregiverStatusToneClass(tone: DashboardCard["tone"]) {
  if (tone === "positive") {
    return "home-status-card-positive";
  }

  if (tone === "warning") {
    return "home-status-card-warning";
  }

  if (tone === "soft") {
    return "home-status-card-soft";
  }

  return "home-status-card-calm";
}

export function sortCaregiverPatientLinks(links: CaregiverPatientLink[]) {
  return sortLinksByStatus(links);
}
