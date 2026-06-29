import type { CaregiverSharePermissions } from "../types/user";

type PermissionFieldKey = keyof CaregiverSharePermissions;
type PermissionFieldsVariant = "invite" | "inline";

type PermissionOption = {
  key: PermissionFieldKey;
  label: string;
  descriptions: Record<PermissionFieldsVariant, string>;
};

type PermissionFieldsProps = {
  permissions: CaregiverSharePermissions;
  onToggle: (key: PermissionFieldKey, checked: boolean) => void;
  variant?: PermissionFieldsVariant;
};

const permissionOptions: PermissionOption[] = [
  {
    key: "canViewInformation",
    label: "Informação",
    descriptions: {
      invite: "Email, telefone, número de utente e data de nascimento.",
      inline: "Dados pessoais do paciente.",
    },
  },
  {
    key: "canViewDecisions",
    label: "Decisões",
    descriptions: {
      invite: "Diretivas principais e notas registadas.",
      inline: "Diretivas e notas registadas.",
    },
  },
  {
    key: "canViewDocuments",
    label: "Documentos",
    descriptions: {
      invite: "Ficheiros carregados e respetivo descarregamento.",
      inline: "Ficheiros carregados.",
    },
  },
];

export default function PermissionFields({
  permissions,
  onToggle,
  variant = "invite",
}: PermissionFieldsProps) {
  const isInline = variant === "inline";
  const listClassName = isInline
    ? "module-check-list module-check-list-compact"
    : "module-check-list";
  const optionClassName = isInline
    ? "module-check-option module-check-option-compact"
    : "module-check-option";

  return (
    <div className={listClassName}>
      {permissionOptions.map((option) => (
        <label key={option.key} className={optionClassName}>
          <input
            type="checkbox"
            checked={permissions[option.key]}
            onChange={(event) => onToggle(option.key, event.target.checked)}
          />
          <div>
            <strong>{option.label}</strong>
            <span>{option.descriptions[variant]}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
