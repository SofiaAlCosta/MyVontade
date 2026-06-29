import NavigationMenu from "./NavigationMenu";

type PatientScreen =
  | "home"
  | "decisions"
  | "caregiver"
  | "doctor"
  | "documents"
  | "account";

type PatientNavigationMenuProps = {
  currentScreen: PatientScreen;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDoctor: () => void;
  onOpenDocuments: () => void;
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
        { key: "account", label: "Conta", onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
