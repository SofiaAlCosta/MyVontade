import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import { useI18n } from "../i18n";
import type { PatientDocument, User } from "../types/user";
import "./patientModule.css";

type DocumentsPageProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDoctor: () => void;
  onOpenDocuments: () => void;
  onOpenAccessLog?: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
};

type DocumentFormData = {
  title: string;
  documentType: string;
};

type DocumentField = keyof DocumentFormData | "file";
type DocumentErrors = Partial<Record<DocumentField, string>>;
type MessageTone = "success" | "error";

const initialFormData: DocumentFormData = {
  title: "",
  documentType: "",
};
const maxDocumentSizeBytes = 10 * 1024 * 1024;
const acceptedDocumentTypes =
  ".pdf,.doc,.docx,.txt,.rtf,.odt,.png,.jpg,.jpeg";

const documentTypeOptions = [
  "Testamento vital",
  "Diretiva legal",
  "Relatório clínico",
  "Autorização",
  "Outro",
];

function getDocumentsMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Indica o título e seleciona um ficheiro antes de guardar.";
  }

  if (error === "invalid_file") {
    return "Seleciona um PDF, Word, texto ou imagem suportada.";
  }

  if (error === "file_too_large") {
    return "O ficheiro tem de ter no máximo 10 MB.";
  }

  if (error === "invalid_role") {
    return "Esta área está disponível apenas para pacientes.";
  }

  if (error === "user_not_found") {
    return "Não foi possível encontrar estes documentos.";
  }

  if (error === "document_not_found") {
    return "Não foi possível encontrar este documento.";
  }

  if (error === "file_not_found") {
    return "O ficheiro deste documento já não está disponível.";
  }

  if (error === "access_denied") {
    return "Não tens permissão para abrir este documento.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

function formatDocumentDate(value: string) {
  if (!value) {
    return "Sem data";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sem data";
  }

  return parsedDate.toLocaleDateString("pt-PT");
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileBadgeLabel(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toUpperCase();

  if (!extension) {
    return "DOC";
  }

  return extension.slice(0, 4);
}

function DocumentTypeSelect({
  value,
  options,
  isOpen,
  onOpen,
  onClose,
  onChange,
}: {
  value: string;
  options: string[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="module-dropdown-shell"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`module-dropdown-button ${
          isOpen ? "module-dropdown-button-open" : ""
        }`}
        onClick={() => {
          if (isOpen) {
            onClose();
            return;
          }

          onOpen();
        }}
      >
        <span
          className={`module-dropdown-button-text ${
            value ? "" : "module-dropdown-button-text-placeholder"
          }`}
        >
          {value ? t(value) : t("Seleciona uma opção")}
        </span>
        <span
          aria-hidden="true"
          className={`module-dropdown-caret ${
            isOpen ? "module-dropdown-caret-open" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="module-dropdown-menu" role="listbox" aria-label={t("Tipo de documento")}>
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={`module-dropdown-option ${
              !value ? "module-dropdown-option-selected" : ""
            }`}
            onMouseDown={(event) => {
              event.preventDefault();
              onChange("");
              onClose();
            }}
          >
            {t("Seleciona uma opção")}
          </button>

          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`module-dropdown-option ${
                value === option ? "module-dropdown-option-selected" : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                onClose();
              }}
            >
              {t(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage({
  apiUrl,
  user,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDoctor,
  onOpenDocuments,
  onOpenAccessLog,
  onOpenAccount,
  onLogout,
}: DocumentsPageProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
  const [errors, setErrors] = useState<DocumentErrors>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [message, setMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isDocumentTypeOpen, setIsDocumentTypeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = Boolean(formData.title.trim() && selectedFile);
  const latestDocument = documents[0];

  useEffect(() => {
    let ignore = false;

    const loadDocuments = async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${user.id}/documents`);
        const data = (await response.json()) as
          | { documents?: PatientDocument[]; error?: string }
          | undefined;

        if (!response.ok || !Array.isArray(data?.documents)) {
          if (!ignore) {
            setLoadMessage(getDocumentsMessage(data?.error));
          }
          return;
        }

        if (!ignore) {
          setDocuments(data.documents);
        }
      } catch {
        if (!ignore) {
          setLoadMessage("Não foi possível carregar os teus documentos.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      ignore = true;
    };
  }, [apiUrl, user.id]);

  const clearError = (field: DocumentField) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const updateField = <Field extends keyof DocumentFormData>(
    field: Field,
    value: DocumentFormData[Field]
  ) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
    clearError(field);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    clearError("file");

    if (!nextFile) {
      setSelectedFile(null);
      return;
    }

    if (nextFile.size > maxDocumentSizeBytes) {
      setSelectedFile(null);
      setErrors((currentErrors) => ({
        ...currentErrors,
        file: "Max. 10 MB",
      }));
      setMessage("Seleciona um ficheiro até 10 MB.");
      setMessageTone("error");
      event.target.value = "";
      return;
    }

    setSelectedFile(nextFile);
    setMessage("");
  };

  const validateFields = () => {
    const nextErrors: DocumentErrors = {};

    if (!formData.title.trim()) {
      nextErrors.title = "Obrigatório";
    }

    if (!selectedFile) {
      nextErrors.file = "Obrigatório";
    }

    return nextErrors;
  };

  const handleSave = async () => {
    const nextErrors = validateFields();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage("Revê os campos assinalados antes de guardar.");
      setMessageTone("error");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const requestBody = new FormData();
      requestBody.append("title", formData.title.trim());

      if (formData.documentType.trim()) {
        requestBody.append("documentType", formData.documentType.trim());
      }

      if (selectedFile) {
        requestBody.append("file", selectedFile);
      }

      const response = await fetch(`${apiUrl}/api/users/${user.id}/documents`, {
        method: "POST",
        body: requestBody,
      });

      const data = (await response.json()) as
        | { document?: PatientDocument; error?: string }
        | undefined;

      if (!response.ok || !data?.document) {
        setMessage(getDocumentsMessage(data?.error));
        setMessageTone("error");
        return;
      }

      const createdDocument = data.document;

      setDocuments((currentDocuments) => [createdDocument, ...currentDocuments]);
      setFormData(initialFormData);
      setSelectedFile(null);
      setIsDocumentTypeOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setErrors({});
      setMessage("Documento guardado com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível guardar este documento.");
      setMessageTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    setDownloadingId(documentId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/documents/${documentId}/file`
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const data = (await response.json()) as { error?: string } | undefined;
          setMessage(getDocumentsMessage(data?.error));
        } else {
          setMessage("Não foi possível descarregar este documento.");
        }

        setMessageTone("error");
        return;
      }

      const fileBlob = await response.blob();
      const objectUrl = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      setMessage("Não foi possível descarregar este documento.");
      setMessageTone("error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (documentId: number) => {
    setDeletingId(documentId);
    setMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as { error?: string } | undefined;

      if (!response.ok) {
        setMessage(getDocumentsMessage(data?.error));
        setMessageTone("error");
        return;
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId)
      );
      setMessage("Documento removido com sucesso.");
      setMessageTone("success");
    } catch {
      setMessage("Não foi possível remover este documento.");
      setMessageTone("error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-brand">MyVontade</div>

        <div className="module-header-actions">
          <PatientNavigationMenu
            currentScreen="documents"
            onOpenHome={onOpenHome}
            onOpenDecisions={onOpenDecisions}
            onOpenCaregiver={onOpenCaregiver}
            onOpenDoctor={onOpenDoctor}
            onOpenDocuments={onOpenDocuments}
            onOpenAccessLog={onOpenAccessLog}
            onOpenAccount={onOpenAccount}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="module-main">
        <section className="module-intro-card module-intro-card-minimal">
          <h1 className="module-title">{t("Documentos")}</h1>
        </section>

        <div className="module-grid">
          <section className="module-card">
            <h2 className="module-card-title">{t("Adicionar documento")}</h2>

            <form
              className="module-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              {isLoading && (
                <p className="module-inline-note">
                  {t("A carregar os documentos atuais...")}
                </p>
              )}

              <fieldset className="module-fieldset" disabled={isLoading || isSaving}>
                <label className="module-field">
                  <div className="module-field-label">
                    <span>{t("Título")}</span>
                    {errors.title && (
                      <span className="module-field-error">{t(errors.title)}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.title}
                    aria-invalid={Boolean(errors.title)}
                    className={errors.title ? "module-input-error" : ""}
                    onChange={(event) => updateField("title", event.target.value)}
                  />
                </label>

                <label className="module-field">
                  <div className="module-field-label">
                    <span>{t("Tipo de documento")}</span>
                  </div>
                  <DocumentTypeSelect
                    value={formData.documentType}
                    options={documentTypeOptions}
                    isOpen={isDocumentTypeOpen}
                    onOpen={() => setIsDocumentTypeOpen(true)}
                    onClose={() => setIsDocumentTypeOpen(false)}
                    onChange={(value) => updateField("documentType", value)}
                  />
                </label>

                <label className="module-field">
                  <div className="module-field-label">
                    <span>{t("Ficheiro")}</span>
                    {errors.file && (
                      <span className="module-field-error">{t(errors.file)}</span>
                    )}
                  </div>
                  <div className={`module-file-picker ${errors.file ? "module-input-error" : ""}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={acceptedDocumentTypes}
                      aria-invalid={Boolean(errors.file)}
                      className="module-file-input-hidden"
                      onChange={handleFileSelection}
                    />
                    <button
                      className="module-file-picker-button"
                      type="button"
                      disabled={isLoading || isSaving}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("Escolher ficheiro")}
                    </button>
                    <span
                      className={`module-file-picker-name ${
                        selectedFile ? "" : "module-file-picker-name-placeholder"
                      }`}
                    >
                      {selectedFile
                        ? selectedFile.name
                        : t("Nenhum ficheiro selecionado")}
                    </span>
                  </div>
                </label>

                {selectedFile && (
                  <div className="module-upload-card">
                    <div className="module-upload-icon">
                      {getFileBadgeLabel(selectedFile.name)}
                    </div>
                    <p className="module-item-title">{selectedFile.name}</p>
                    <p className="module-note">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                )}

                {message && (
                  <p
                    className={`module-form-message module-form-message-${messageTone}`}
                    role="status"
                  >
                    {t(message)}
                  </p>
                )}

                <div className="module-card-actions">
                  <button
                    className={`module-card-button ${
                      canSubmit ? "" : "module-card-button-muted"
                    }`}
                    type="submit"
                    disabled={!canSubmit || isLoading || isSaving}
                  >
                    {isSaving ? t("A guardar...") : t("Guardar documento")}
                  </button>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className="module-card">
            <h2 className="module-card-title">{t("Resumo atual")}</h2>

            <div className="module-meta-list">
              <div className="module-meta-row">
                <p className="module-meta-label">{t("Total")}</p>
                <p className="module-meta-value">
                  {documents.length === 1
                    ? t("1 documento")
                    : t("{count} documentos", { count: documents.length })}
                </p>
              </div>
              <div className="module-meta-row">
                <p className="module-meta-label">{t("Último registo")}</p>
                <p className="module-meta-value">
                  {latestDocument
                    ? t(formatDocumentDate(latestDocument.uploadedAt))
                    : t("Sem documentos")}
                </p>
              </div>
            </div>

            {documents.length === 0 ? (
              <>
                {!loadMessage && (
                  <p className="module-empty-text">
                    {t("Ainda não existem documentos registados nesta área.")}
                  </p>
                )}
                {loadMessage && <p className="module-note">{t(loadMessage)}</p>}
              </>
            ) : (
              <div className="module-item-list">
                {documents.map((document) => (
                  <article key={document.id} className="module-item">
                    <div className="module-item-top">
                      <p className="module-item-title">{document.title}</p>
                      {document.documentType && (
                        <span className="module-pill">
                          {t(document.documentType)}
                        </span>
                      )}
                    </div>
                    <p className="module-item-text">{document.fileName}</p>
                    <p className="module-note">
                      {t("Registado a {date}", {
                        date: formatDocumentDate(document.uploadedAt),
                      })}
                    </p>
                    <div className="module-inline-actions">
                      <button
                        className="module-inline-button"
                        type="button"
                        onClick={() =>
                          void handleDownload(document.id, document.fileName)
                        }
                        disabled={
                          downloadingId === document.id || deletingId === document.id
                        }
                      >
                        {downloadingId === document.id
                          ? t("A descarregar...")
                          : t("Descarregar")}
                      </button>
                      <button
                        className="module-inline-button module-inline-button-danger"
                        type="button"
                        onClick={() => void handleDelete(document.id)}
                        disabled={
                          deletingId === document.id || downloadingId === document.id
                        }
                      >
                        {deletingId === document.id ? t("A remover...") : t("Remover")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {documents.length > 0 && loadMessage && (
              <p className="module-note">{loadMessage}</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
