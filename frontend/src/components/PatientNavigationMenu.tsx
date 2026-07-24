import { useI18n } from "../i18n";
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
  const { t } = useI18n();

  return (
    <NavigationMenu
      currentScreen={currentScreen}
      menuAriaLabel={t("Navegação do paciente")}
      items={[
        { key: "home", label: t("Início"), onSelect: onOpenHome },
        { key: "decisions", label: t("Decisões"), onSelect: onOpenDecisions },
        { key: "caregiver", label: t("Cuidador"), onSelect: onOpenCaregiver },
        { key: "doctor", label: t("Médico"), onSelect: onOpenDoctor },
        { key: "documents", label: t("Documentos"), onSelect: onOpenDocuments },
        ...(onOpenAccessLog
          ? [
              {
                key: "accessLog" as const,
                label: t("Acessos"),
                onSelect: onOpenAccessLog,
              },
            ]
          : []),
        { key: "account", label: t("Conta"), onSelect: onOpenAccount },
      ]}
      onLogout={onLogout}
    />
  );
}
