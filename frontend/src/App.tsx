import { useEffect, useState } from "react";
import AccessLogPage from "./pages/accessLog";
import AccountPage from "./pages/account";
import CaregiverHome from "./pages/caregiverHome";
import CaregiverPatientsPage from "./pages/caregiverPatients";
import DecisionsPage from "./pages/decisions";
import DoctorHome from "./pages/doctorHome";
import DoctorPatientsPage from "./pages/doctorPatients";
import DocumentsPage from "./pages/documents";
import ForgotPassword from "./pages/forgotPassword";
import Login from "./pages/login";
import PatientCaregiverPage from "./pages/patientCaregiver";
import PatientDoctorPage from "./pages/patientDoctor";
import PatientHome from "./pages/patientHome";
import ResetPassword from "./pages/resetPassword";
import Signup from "./pages/signup";
import type { SignupFormData, User } from "./types/user";
import { AUTH_LOGOUT_EVENT } from "./utils/apiClient";
import { clearAuthToken, getAuthToken, setAuthToken } from "./utils/authToken";
import "./App.css";

type Screen =
  | "login"
  | "signup"
  | "home"
  | "account"
  | "decisions"
  | "caregiver"
  | "doctor"
  | "caregiverPatients"
  | "doctorPatients"
  | "documents"
  | "accessLog"
  | "forgotPassword"
  | "resetPassword";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const LAST_LOGIN_EMAIL_KEY = "myvontade-last-login-email";

const authMessages: Record<string, string> = {
  missing_required_fields: "Preenche os campos obrigatórios.",
  invalid_role: "Escolhe um tipo de utilizador válido.",
  user_already_exists: "Já existe uma conta com estes dados.",
  invalid_credentials: "Email ou palavra-passe inválidos.",
  invalid_field_format: "Existem campos com formato inválido.",
  weak_password: "A palavra-passe deve ter pelo menos 8 caracteres.",
  invalid_or_expired_token:
    "Esta ligação de recuperação é inválida ou expirou. Pede uma nova.",
  too_many_attempts: "Demasiadas tentativas. Tenta novamente mais tarde.",
};

function getResetTokenFromHash(): string {
  const hash = window.location.hash;

  if (!hash.startsWith("#reset")) {
    return "";
  }

  const queryStart = hash.indexOf("?");

  if (queryStart === -1) {
    return "";
  }

  const params = new URLSearchParams(hash.slice(queryStart + 1));
  return params.get("token") ?? "";
}

function getInitialScreen(): Screen {
  const hash = window.location.hash;

  if (hash.startsWith("#reset")) {
    return "resetPassword";
  }

  if (hash === "#forgot") {
    return "forgotPassword";
  }

  return hash === "#signup" ? "signup" : "login";
}

function getErrorMessage(error: string | undefined) {
  return authMessages[error ?? ""] ?? "Ocorreu um erro. Tenta novamente.";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [restoringSession, setRestoringSession] = useState(true);
  const [resetToken] = useState(getResetTokenFromHash);

  // Ao arrancar, se houver um token guardado, validá-lo e recuperar a sessão.
  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setRestoringSession(false);
      return;
    }

    let ignore = false;

    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`);

        if (ignore) {
          return;
        }

        if (response.ok) {
          const data = (await response.json()) as { user?: User };

          if (data.user) {
            setCurrentUser(data.user);
            setScreen("home");
          } else {
            clearAuthToken();
          }
        } else {
          clearAuthToken();
        }
      } catch {
        clearAuthToken();
      } finally {
        if (!ignore) {
          setRestoringSession(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Reagir a logout forçado (token expirado/inválido detetado pelo interceptor).
  useEffect(() => {
    const handleForcedLogout = () => {
      setCurrentUser(null);
      setScreen("login");
      setMessage("A tua sessão expirou. Entra novamente.");
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);

    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    };
  }, []);

  useEffect(() => {
    let nextHash = "";

    if (currentUser) {
      nextHash = `#${screen}`;
    } else if (screen === "signup") {
      nextHash = "#signup";
    } else if (screen === "forgotPassword") {
      nextHash = "#forgot";
    } else if (screen === "resetPassword") {
      nextHash = resetToken ? `#reset?token=${resetToken}` : "#reset";
    }

    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;

    window.history.replaceState(null, "", nextUrl);

    if (!currentUser) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [currentUser, screen, resetToken]);

  const openScreen = (nextScreen: Screen, clearMessage = false) => {
    if (clearMessage) {
      setMessage("");
    }

    setScreen(nextScreen);
  };

  const openLogin = () => openScreen("login", true);
  const openSignup = () => openScreen("signup", true);
  const openForgotPassword = () => openScreen("forgotPassword", true);
  const openHome = () => openScreen("home");
  const openAccount = () => openScreen("account");
  const openDecisions = () => openScreen("decisions");
  const openCaregiver = () => openScreen("caregiver");
  const openDoctor = () => openScreen("doctor");
  const openCaregiverPatients = () => openScreen("caregiverPatients");
  const openDoctorPatients = () => openScreen("doctorPatients");
  const openDocuments = () => openScreen("documents");
  const openAccessLog = () => openScreen("accessLog");

  const patientNavigation =
    currentUser?.role === "patient"
      ? {
          onOpenHome: openHome,
          onOpenDecisions: openDecisions,
          onOpenCaregiver: openCaregiver,
          onOpenDoctor: openDoctor,
          onOpenDocuments: openDocuments,
          onOpenAccessLog: openAccessLog,
          onOpenAccount: openAccount,
        }
      : undefined;

  const caregiverNavigation =
    currentUser?.role === "caregiver"
      ? {
          onOpenHome: openHome,
          onOpenCaregiver: openCaregiverPatients,
          onOpenAccount: openAccount,
        }
      : undefined;

  const doctorNavigation =
    currentUser?.role === "doctor"
      ? {
          onOpenHome: openHome,
          onOpenPatients: openDoctorPatients,
          onOpenAccount: openAccount,
        }
      : undefined;

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    openLogin();
  };

  const handleAccountDeleted = () => {
    const deletedEmail = normalizeEmail(currentUser?.email ?? "");
    const savedEmail = normalizeEmail(
      window.localStorage.getItem(LAST_LOGIN_EMAIL_KEY) ?? ""
    );

    if (deletedEmail && savedEmail === deletedEmail) {
      window.localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
    }

    clearAuthToken();
    setCurrentUser(null);
    setMessage("Conta eliminada com sucesso.");
    setScreen("login");
  };

  const handleSignup = async (formData: SignupFormData) => {
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setMessage(getErrorMessage(data.error));
        return;
      }

      window.localStorage.setItem(
        LAST_LOGIN_EMAIL_KEY,
        normalizeEmail(formData.email)
      );
      setMessage("Conta criada com sucesso. Agora já podes entrar.");
      setScreen("login");
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setMessage("");

    try {
      const normalizedEmail = normalizeEmail(email);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: User;
        token?: string;
      };

      if (!response.ok || !data.user || !data.token) {
        setMessage(getErrorMessage(data.error));
        return;
      }

      window.localStorage.setItem(LAST_LOGIN_EMAIL_KEY, normalizedEmail);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setScreen("home");
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
    }
  };

  const handleForgotPassword = async (email: string) => {
    setMessage("");

    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });

      // Resposta sempre genérica, para não revelar que emails têm conta.
      setMessage(
        "Se existir uma conta com esse email, enviámos instruções para recuperar a palavra-passe."
      );
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
    }
  };

  const handleResetPassword = async (token: string, newPassword: string) => {
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(getErrorMessage(data.error));
        return;
      }

      setMessage("Palavra-passe alterada com sucesso. Já podes entrar.");
      setScreen("login");
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
    }
  };

  const renderAccountPage = () => {
    if (!currentUser) {
      return null;
    }

    return (
      <AccountPage
        apiUrl={API_URL}
        user={currentUser}
        onBack={openHome}
        onAccountDeleted={handleAccountDeleted}
        onLogout={handleLogout}
        onUserUpdated={setCurrentUser}
        patientNavigation={patientNavigation}
        caregiverNavigation={caregiverNavigation}
        doctorNavigation={doctorNavigation}
      />
    );
  };

  if (restoringSession) {
    return (
      <div className="app-shell">
        <p style={{ padding: "2rem", textAlign: "center" }}>A carregar…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-shell">
        {screen === "signup" ? (
          <Signup
            message={message}
            onGoToLogin={openLogin}
            onSignup={handleSignup}
          />
        ) : screen === "forgotPassword" ? (
          <ForgotPassword
            message={message}
            onForgotPassword={handleForgotPassword}
            onGoToLogin={openLogin}
          />
        ) : screen === "resetPassword" ? (
          <ResetPassword
            token={resetToken}
            message={message}
            onResetPassword={handleResetPassword}
            onGoToLogin={openLogin}
          />
        ) : (
          <Login
            message={message}
            onGoToSignup={openSignup}
            onGoToForgotPassword={openForgotPassword}
            onLogin={handleLogin}
          />
        )}
      </div>
    );
  }

  if (screen === "account") {
    return renderAccountPage();
  }

  if (currentUser.role === "patient") {
    switch (screen) {
      case "decisions":
        return (
          <DecisionsPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={openHome}
            onOpenDecisions={openDecisions}
            onOpenCaregiver={openCaregiver}
            onOpenDoctor={openDoctor}
            onOpenDocuments={openDocuments}
            onOpenAccessLog={openAccessLog}
            onOpenAccount={openAccount}
            onLogout={handleLogout}
          />
        );
      case "documents":
        return (
          <DocumentsPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={openHome}
            onOpenDecisions={openDecisions}
            onOpenCaregiver={openCaregiver}
            onOpenDoctor={openDoctor}
            onOpenDocuments={openDocuments}
            onOpenAccessLog={openAccessLog}
            onOpenAccount={openAccount}
            onLogout={handleLogout}
          />
        );
      case "caregiver":
        return (
          <PatientCaregiverPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={openHome}
            onOpenDecisions={openDecisions}
            onOpenCaregiver={openCaregiver}
            onOpenDoctor={openDoctor}
            onOpenDocuments={openDocuments}
            onOpenAccessLog={openAccessLog}
            onOpenAccount={openAccount}
            onLogout={handleLogout}
          />
        );
      case "doctor":
        return (
          <PatientDoctorPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={openHome}
            onOpenDecisions={openDecisions}
            onOpenCaregiver={openCaregiver}
            onOpenDoctor={openDoctor}
            onOpenDocuments={openDocuments}
            onOpenAccessLog={openAccessLog}
            onOpenAccount={openAccount}
            onLogout={handleLogout}
          />
        );
      case "accessLog":
        return (
          <AccessLogPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={openHome}
            onOpenDecisions={openDecisions}
            onOpenCaregiver={openCaregiver}
            onOpenDoctor={openDoctor}
            onOpenDocuments={openDocuments}
            onOpenAccessLog={openAccessLog}
            onOpenAccount={openAccount}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <PatientHome
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={openHome}
            onOpenDecisions={openDecisions}
            onOpenCaregiver={openCaregiver}
            onOpenDoctor={openDoctor}
            onOpenDocuments={openDocuments}
            onOpenAccessLog={openAccessLog}
            onOpenAccount={openAccount}
            onLogout={handleLogout}
          />
        );
    }
  }

  if (currentUser.role === "caregiver") {
    return screen === "caregiverPatients" ? (
      <CaregiverPatientsPage
        apiUrl={API_URL}
        user={currentUser}
        onOpenHome={openHome}
        onOpenCaregiver={openCaregiverPatients}
        onOpenAccount={openAccount}
        onLogout={handleLogout}
      />
    ) : (
      <CaregiverHome
        apiUrl={API_URL}
        user={currentUser}
        onOpenHome={openHome}
        onOpenCaregiver={openCaregiverPatients}
        onOpenAccount={openAccount}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser.role === "doctor") {
    return screen === "doctorPatients" ? (
      <DoctorPatientsPage
        apiUrl={API_URL}
        user={currentUser}
        onOpenHome={openHome}
        onOpenPatients={openDoctorPatients}
        onOpenAccount={openAccount}
        onLogout={handleLogout}
      />
    ) : (
      <DoctorHome
        apiUrl={API_URL}
        user={currentUser}
        onOpenHome={openHome}
        onOpenPatients={openDoctorPatients}
        onOpenAccount={openAccount}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}
