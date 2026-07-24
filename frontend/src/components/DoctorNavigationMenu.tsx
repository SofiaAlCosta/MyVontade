import { useI18n } from "../i18n";
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
  const { t } = useI18n();

  return (
    <NavigationMenu
      currentScreen={currentScreen}
      menuAriaLabel={t("Navegação do médico")}
      items={[
        { key: "home", label: t("Início"), onSelect: onOpenHome },
        { key: "patients", label: t("Pacientes"), onSelect: onOpenPatients },
        { key: "account", label: t("Conta"), onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
