import { useI18n, type Language } from "../i18n";
import "./languageSwitcher.css";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className="language-switcher"
      role="group"
      aria-label={t("Idioma")}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`language-switcher-option ${
            language === option.value ? "language-switcher-option-active" : ""
          }`}
          aria-pressed={language === option.value}
          onClick={() => setLanguage(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
