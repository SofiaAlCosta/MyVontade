import NavigationMenu from "./NavigationMenu";

type CaregiverScreen = "home" | "caregiver" | "account";

type CaregiverNavigationMenuProps = {
  currentScreen: CaregiverScreen;
  onOpenHome: () => void;
  onOpenCaregiver: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

export default function CaregiverNavigationMenu({
  currentScreen,
  onOpenHome,
  onOpenCaregiver,
  onOpenAccount,
  onLogout,
}: CaregiverNavigationMenuProps) {
  return (
    <NavigationMenu
      currentScreen={currentScreen}
      menuAriaLabel="Navegação do cuidador"
      items={[
        { key: "home", label: "Início", onSelect: onOpenHome },
        { key: "caregiver", label: "Pacientes", onSelect: onOpenCaregiver },
        { key: "account", label: "Conta", onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
