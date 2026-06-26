import type {
  CaregiverPatientLink,
  CaregiverSharePermissions,
  DashboardCard,
} from "../types/user";

export type CaregiverDetailSection =
  | "information"
  | "decisions"
  | "documents";

export function getCaregiverMessage(error: string | undefined) {
  if (error === "invalid_role") {
    return "Esta área está disponível apenas para cuidadores.";
  }

  if (error === "link_not_found") {
    return "Não foi possível encontrar este convite.";
  }

  if (error === "access_denied") {
    return "Só podes ver pacientes com ligação ativa ao teu perfil.";
  }

  if (error === "document_not_found") {
    return "Não foi possível encontrar este documento.";
  }

  if (error === "file_not_found") {
    return "O ficheiro deste documento já não está disponível.";
  }

  if (error === "user_not_found") {
    return "Não foi possível encontrar este utilizador.";
  }

  if (error === "missing_permissions") {
    return "Escolhe pelo menos uma área para partilhar com o cuidador.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

export function getCaregiverPermissionLabels(
  permissions: CaregiverSharePermissions
) {
  const labels: string[] = [];

  if (permissions.canViewInformation) {
    labels.push("Informação");
  }

  if (permissions.canViewDecisions) {
    labels.push("Decisões");
  }

  if (permissions.canViewDocuments) {
    labels.push("Documentos");
  }

  return labels;
}

export function getCaregiverAvailableSections(
  permissions: CaregiverSharePermissions
): CaregiverDetailSection[] {
  const sections: CaregiverDetailSection[] = [];

  if (permissions.canViewInformation) {
    sections.push("information");
  }

  if (permissions.canViewDecisions) {
    sections.push("decisions");
  }

  if (permissions.canViewDocuments) {
    sections.push("documents");
  }

  return sections;
}

export function formatCaregiverDateTime(value: string) {
  if (!value) {
    return "Data indisponível";
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

export function formatCaregiverDate(value: string) {
  if (!value) {
    return "Por definir";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Por definir";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
  }).format(date);
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
  return [...links].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    const leftDate =
      left.status === "active"
        ? left.respondedAt || left.createdAt
        : left.createdAt;
    const rightDate =
      right.status === "active"
        ? right.respondedAt || right.createdAt
        : right.createdAt;

    return rightDate.localeCompare(leftDate);
  });
}
