import NavigationMenu from "./NavigationMenu";

type PatientScreen =
  | "home"
  | "decisions"
  | "caregiver"
  | "doctor"
  | "documents"
  | "accessLog"
  | "account";

type PatientNavigationMenuProps = {
  currentScreen: PatientScreen;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDoctor: () => void;
  onOpenDocuments: () => void;
  onOpenAccessLog?: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

export default function PatientNavigationMenu({
  currentScreen,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDoctor,
  onOpenDocuments,
  onOpenAccessLog,
  onOpenAccount,
  onLogout,
}: PatientNavigationMenuProps) {
  return (
    <NavigationMenu
      currentScreen={currentScreen}
      menuAriaLabel="Navegação do paciente"
      items={[
        { key: "home", label: "Início", onSelect: onOpenHome },
        { key: "decisions", label: "Decisões", onSelect: onOpenDecisions },
        { key: "caregiver", label: "Cuidador", onSelect: onOpenCaregiver },
        { key: "doctor", label: "Médico", onSelect: onOpenDoctor },
        { key: "documents", label: "Documentos", onSelect: onOpenDocuments },
        ...(onOpenAccessLog
          ? [
              {
                key: "accessLog" as const,
                label: "Acessos",
                onSelect: onOpenAccessLog,
              },
            ]
          : []),
        { key: "account", label: "Conta", onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
