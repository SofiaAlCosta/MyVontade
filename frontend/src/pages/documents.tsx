import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import PatientNavigationMenu from "../components/PatientNavigationMenu";
import type { PatientDocument, User } from "../types/user";
import "./patientModule.css";

type DocumentsPageProps = {
  apiUrl: string;
  user: User;
  onOpenHome: () => void;
  onOpenDecisions: () => void;
  onOpenCaregiver: () => void;
  onOpenDocuments: () => void;
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

export default function DocumentsPage({
  apiUrl,
  user,
  onOpenHome,
  onOpenDecisions,
  onOpenCaregiver,
  onOpenDocuments,
  onOpenAccount,
  onLogout,
}: DocumentsPageProps) {
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
            onOpenDocuments={onOpenDocuments}
            onOpenAccount={onOpenAccount}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="module-main">
        <section className="module-intro-card">
          <h1 className="module-title">Documentos</h1>
          <p className="module-description">
            Carrega aqui os teus documentos.
          </p>
        </section>

        <div className="module-grid">
          <section className="module-card">
            <h2 className="module-card-title">Adicionar documento</h2>

            <form
              className="module-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              {isLoading && (
                <p className="module-inline-note">
                  A carregar os documentos atuais...
                </p>
              )}

              <fieldset className="module-fieldset" disabled={isLoading || isSaving}>
                <label className="module-field">
                  <div className="module-field-label">
                    <span>Título</span>
                    {errors.title && (
                      <span className="module-field-error">{errors.title}</span>
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
                    <span>Tipo de documento</span>
                  </div>
                  <select
                    value={formData.documentType}
                    onChange={(event) =>
                      updateField("documentType", event.target.value)
                    }
                  >
                    <option value="">Seleciona uma opção</option>
                    {documentTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="module-field">
                  <div className="module-field-label">
                    <span>Ficheiro</span>
                    {errors.file && (
                      <span className="module-field-error">{errors.file}</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedDocumentTypes}
                    aria-invalid={Boolean(errors.file)}
                    className={errors.file ? "module-input-error" : ""}
                    onChange={handleFileSelection}
                  />
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
                    {message}
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
                    {isSaving ? "A guardar..." : "Guardar documento"}
                  </button>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className="module-card">
            <h2 className="module-card-title">Resumo atual</h2>

            <div className="module-meta-list">
              <div className="module-meta-row">
                <p className="module-meta-label">Paciente</p>
                <p className="module-meta-value">{user.name}</p>
              </div>
              <div className="module-meta-row">
                <p className="module-meta-label">Total</p>
                <p className="module-meta-value">
                  {documents.length === 1
                    ? "1 documento"
                    : `${documents.length} documentos`}
                </p>
              </div>
              <div className="module-meta-row">
                <p className="module-meta-label">Último registo</p>
                <p className="module-meta-value">
                  {latestDocument
                    ? formatDocumentDate(latestDocument.uploadedAt)
                    : "Sem documentos"}
                </p>
              </div>
            </div>

            {documents.length === 0 ? (
              <>
                {!loadMessage && (
                  <p className="module-empty-text">
                    Ainda não existem documentos registados nesta área.
                  </p>
                )}
                {loadMessage && <p className="module-note">{loadMessage}</p>}
              </>
            ) : (
              <div className="module-item-list">
                {documents.map((document) => (
                  <article key={document.id} className="module-item">
                    <div className="module-item-top">
                      <p className="module-item-title">{document.title}</p>
                      {document.documentType && (
                        <span className="module-pill">{document.documentType}</span>
                      )}
                    </div>
                    <p className="module-item-text">{document.fileName}</p>
                    <p className="module-note">
                      Registado a {formatDocumentDate(document.uploadedAt)}
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
                          ? "A descarregar..."
                          : "Descarregar"}
                      </button>
                      <button
                        className="module-inline-button module-inline-button-danger"
                        type="button"
                        onClick={() => void handleDelete(document.id)}
                        disabled={
                          deletingId === document.id || downloadingId === document.id
                        }
                      >
                        {deletingId === document.id ? "A remover..." : "Remover"}
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
