import NavigationMenu from "./NavigationMenu";

type DoctorScreen = "home" | "patients" | "account";

type DoctorNavigationMenuProps = {
  currentScreen: DoctorScreen;
  onOpenHome: () => void;
  onOpenPatients: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

export default function DoctorNavigationMenu({
  currentScreen,
  onOpenHome,
  onOpenPatients,
  onOpenAccount,
  onLogout,
}: DoctorNavigationMenuProps) {
  return (
    <NavigationMenu
      currentScreen={currentScreen}
      menuAriaLabel="Navegação do médico"
      items={[
        { key: "home", label: "Início", onSelect: onOpenHome },
        { key: "patients", label: "Pacientes", onSelect: onOpenPatients },
        { key: "account", label: "Conta", onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
