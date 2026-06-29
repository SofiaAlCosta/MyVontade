import type {
  CaregiverLinkStatus,
  CaregiverSharePermissions,
} from "../types/user";

export type SharedDetailSection = "information" | "decisions" | "documents";

type PermissionConfig = {
  key: keyof CaregiverSharePermissions;
  label: string;
  section: SharedDetailSection;
};

type SortableLink = {
  status: CaregiverLinkStatus;
  createdAt: string;
  respondedAt: string;
};

const permissionConfig: PermissionConfig[] = [
  {
    key: "canViewInformation",
    label: "Informação",
    section: "information",
  },
  {
    key: "canViewDecisions",
    label: "Decisões",
    section: "decisions",
  },
  {
    key: "canViewDocuments",
    label: "Documentos",
    section: "documents",
  },
];

export function getPermissionLabels(permissions: CaregiverSharePermissions) {
  return permissionConfig
    .filter(({ key }) => permissions[key])
    .map(({ label }) => label);
}

export function getAvailableSections(
  permissions: CaregiverSharePermissions
): SharedDetailSection[] {
  return permissionConfig
    .filter(({ key }) => permissions[key])
    .map(({ section }) => section);
}

export function hasAnyPermission(permissions: CaregiverSharePermissions) {
  return permissionConfig.some(({ key }) => permissions[key]);
}

export function hasSamePermissions(
  left: CaregiverSharePermissions,
  right: CaregiverSharePermissions
) {
  return permissionConfig.every(({ key }) => left[key] === right[key]);
}

export function getLinkStatusLabel(status: CaregiverLinkStatus) {
  return status === "active" ? "Ligado" : "Pendente";
}

export function sortLinksByStatus<T extends SortableLink>(links: T[]) {
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
