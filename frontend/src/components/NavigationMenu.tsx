import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import "./patientNavigationMenu.css";

type NavigationItem<Screen extends string> = {
  key: Screen;
  label: string;
  onSelect: () => void;
};

type NavigationMenuProps<Screen extends string> = {
  currentScreen: Screen;
  items: NavigationItem<Screen>[];
  menuAriaLabel: string;
  onLogout: () => void;
};

export default function NavigationMenu<Screen extends string>({
  currentScreen,
  items,
  menuAriaLabel,
  onLogout,
}: NavigationMenuProps<Screen>) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="patient-nav-menu" ref={menuRef}>
      <button
        className={`patient-nav-menu-toggle ${
          isOpen ? "patient-nav-menu-toggle-open" : ""
        }`}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("Abrir menu de navegação")}
        onClick={() => setIsOpen((currentState) => !currentState)}
      >
        <span className="patient-nav-menu-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {isOpen && (
        <div className="patient-nav-menu-panel" role="menu" aria-label={menuAriaLabel}>
          <div className="patient-nav-menu-list">
            {items.map((item) => (
              <button
                key={item.key}
                className={`patient-nav-menu-item ${
                  currentScreen === item.key ? "patient-nav-menu-item-active" : ""
                }`}
                type="button"
                role="menuitem"
                onClick={() => handleAction(item.onSelect)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="patient-nav-menu-divider" />

          <div className="patient-nav-menu-language">
            <LanguageSwitcher />
          </div>

          <button
            className="patient-nav-menu-item patient-nav-menu-item-logout"
            type="button"
            role="menuitem"
            onClick={() => handleAction(onLogout)}
          >
            {t("Terminar sessão")}
          </button>
        </div>
      )}
    </div>
  );
}
