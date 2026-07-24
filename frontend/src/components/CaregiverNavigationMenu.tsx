import { useI18n } from "../i18n";
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
  const { t } = useI18n();

  return (
    <NavigationMenu
      currentScreen={currentScreen}
      menuAriaLabel={t("Navegação do cuidador")}
      items={[
        { key: "home", label: t("Início"), onSelect: onOpenHome },
        { key: "caregiver", label: t("Pacientes"), onSelect: onOpenCaregiver },
        { key: "account", label: t("Conta"), onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
