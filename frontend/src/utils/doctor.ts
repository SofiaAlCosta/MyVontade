import type {
  CaregiverSharePermissions,
  DoctorPatientLink,
} from "../types/user";

export type DoctorDetailSection = "information" | "decisions" | "documents";

export function getDoctorMessage(error: string | undefined) {
  if (error === "invalid_role") {
    return "Esta área está disponível apenas para médicos.";
  }

  if (error === "doctor_not_found") {
    return "Não encontrámos um médico com esse email. O médico precisa de ter conta criada.";
  }

  if (error === "doctor_already_connected") {
    return "Esse médico já está ligado ao teu perfil.";
  }

  if (error === "link_not_found") {
    return "Não foi possível encontrar esta ligação.";
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
    return "Escolhe pelo menos uma área para partilhar com o médico.";
  }

  if (error === "missing_required_fields") {
    return "Preenche o email do médico antes de enviar o convite.";
  }

  if (error === "invalid_field_format") {
    return "Revê o email indicado antes de continuar.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

export function getDoctorPermissionLabels(
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

export function getDoctorAvailableSections(
  permissions: CaregiverSharePermissions
): DoctorDetailSection[] {
  const sections: DoctorDetailSection[] = [];

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

export function formatDoctorDateTime(value: string) {
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

export function formatDoctorDate(value: string) {
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

export function sortDoctorPatientLinks(links: DoctorPatientLink[]) {
  return [...links].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    const leftDate =
      left.status === "active" ? left.respondedAt || left.createdAt : left.createdAt;
    const rightDate =
      right.status === "active"
        ? right.respondedAt || right.createdAt
        : right.createdAt;

    return rightDate.localeCompare(leftDate);
  });
}
