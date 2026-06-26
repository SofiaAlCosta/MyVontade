import { useEffect, useRef, useState } from "react";
import "./patientNavigationMenu.css";

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

  const menuItems = [
    { key: "home", label: "Início", onSelect: onOpenHome },
    { key: "caregiver", label: "Pacientes", onSelect: onOpenCaregiver },
    { key: "account", label: "Conta", onSelect: onOpenAccount },
  ] as const;

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
        aria-label="Abrir menu de navegação"
        onClick={() => setIsOpen((currentState) => !currentState)}
      >
        <span className="patient-nav-menu-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {isOpen && (
        <div
          className="patient-nav-menu-panel"
          role="menu"
          aria-label="Navegação do cuidador"
        >
          <div className="patient-nav-menu-list">
            {menuItems.map((item) => (
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

          <button
            className="patient-nav-menu-item patient-nav-menu-item-logout"
            type="button"
            role="menuitem"
            onClick={() => handleAction(onLogout)}
          >
            Terminar sessão
          </button>
        </div>
      )}
    </div>
  );
}
