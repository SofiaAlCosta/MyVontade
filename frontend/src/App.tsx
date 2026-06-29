import { useEffect, useState } from "react";
import AccountPage from "./pages/account";
import CaregiverHome from "./pages/caregiverHome";
import CaregiverPatientsPage from "./pages/caregiverPatients";
import DecisionsPage from "./pages/decisions";
import DoctorHome from "./pages/doctorHome";
import DoctorPatientsPage from "./pages/doctorPatients";
import DocumentsPage from "./pages/documents";
import Login from "./pages/login";
import PatientCaregiverPage from "./pages/patientCaregiver";
import PatientDoctorPage from "./pages/patientDoctor";
import PatientHome from "./pages/patientHome";
import Signup from "./pages/signup";
import type { SignupFormData, User } from "./types/user";
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
  | "documents";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const LAST_LOGIN_EMAIL_KEY = "myvontade-last-login-email";

function getInitialScreen(): Screen {
  return window.location.hash === "#signup" ? "signup" : "login";
}

function getErrorMessage(error: string | undefined) {
  if (error === "missing_required_fields") {
    return "Preenche os campos obrigatórios.";
  }

  if (error === "invalid_role") {
    return "Escolhe um tipo de utilizador válido.";
  }

  if (error === "user_already_exists") {
    return "Já existe uma conta com estes dados.";
  }

  if (error === "invalid_credentials") {
    return "Email ou palavra-passe inválidos.";
  }

  if (error === "invalid_field_format") {
    return "Existem campos com formato inválido.";
  }

  return "Ocorreu um erro. Tenta novamente.";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nextHash = currentUser
      ? `#${screen}`
      : screen === "signup"
        ? "#signup"
        : "";
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;

    window.history.replaceState(null, "", nextUrl);

    if (!currentUser) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [currentUser, screen]);

  const goToLogin = () => {
    setMessage("");
    setScreen("login");
  };

  const goToSignup = () => {
    setMessage("");
    setScreen("signup");
  };

  const goToHome = () => {
    setScreen("home");
  };

  const goToAccount = () => {
    setScreen("account");
  };

  const goToDecisions = () => {
    setScreen("decisions");
  };

  const goToCaregiver = () => {
    setScreen("caregiver");
  };

  const goToDoctor = () => {
    setScreen("doctor");
  };

  const goToCaregiverPatients = () => {
    setScreen("caregiverPatients");
  };

  const goToDoctorPatients = () => {
    setScreen("doctorPatients");
  };

  const goToDocuments = () => {
    setScreen("documents");
  };

  const patientNavigation =
    currentUser?.role === "patient"
      ? {
          onOpenHome: goToHome,
          onOpenDecisions: goToDecisions,
          onOpenCaregiver: goToCaregiver,
          onOpenDoctor: goToDoctor,
          onOpenDocuments: goToDocuments,
          onOpenAccount: goToAccount,
        }
      : undefined;

  const caregiverNavigation =
    currentUser?.role === "caregiver"
      ? {
          onOpenHome: goToHome,
          onOpenCaregiver: goToCaregiverPatients,
          onOpenAccount: goToAccount,
        }
      : undefined;

  const doctorNavigation =
    currentUser?.role === "doctor"
      ? {
          onOpenHome: goToHome,
          onOpenPatients: goToDoctorPatients,
          onOpenAccount: goToAccount,
        }
      : undefined;

  const handleLogout = () => {
    setCurrentUser(null);
    setMessage("");
    setScreen("login");
  };

  const handleAccountDeleted = () => {
    const deletedEmail = currentUser?.email.trim().toLowerCase();
    const savedEmail = window.localStorage
      .getItem(LAST_LOGIN_EMAIL_KEY)
      ?.trim()
      .toLowerCase();

    if (deletedEmail && savedEmail === deletedEmail) {
      window.localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
    }

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
        formData.email.trim().toLowerCase()
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
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: User;
      };

      if (!response.ok || !data.user) {
        setMessage(getErrorMessage(data.error));
        return;
      }

      window.localStorage.setItem(
        LAST_LOGIN_EMAIL_KEY,
        email.trim().toLowerCase()
      );
      setCurrentUser(data.user);
      setScreen("home");
    } catch {
      setMessage("Não foi possível ligar ao servidor.");
    }
  };

  if (currentUser) {
    if (currentUser.role === "patient") {
      if (screen === "account") {
        return (
          <AccountPage
            apiUrl={API_URL}
            user={currentUser}
            onBack={goToHome}
            onAccountDeleted={handleAccountDeleted}
            onLogout={handleLogout}
            onUserUpdated={setCurrentUser}
            patientNavigation={patientNavigation}
            caregiverNavigation={caregiverNavigation}
            doctorNavigation={doctorNavigation}
          />
        );
      }

      if (screen === "decisions") {
        return (
          <DecisionsPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={goToHome}
            onOpenDecisions={goToDecisions}
            onOpenCaregiver={goToCaregiver}
            onOpenDoctor={goToDoctor}
            onOpenDocuments={goToDocuments}
            onOpenAccount={goToAccount}
            onLogout={handleLogout}
          />
        );
      }

      if (screen === "documents") {
        return (
          <DocumentsPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={goToHome}
            onOpenDecisions={goToDecisions}
            onOpenCaregiver={goToCaregiver}
            onOpenDoctor={goToDoctor}
            onOpenDocuments={goToDocuments}
            onOpenAccount={goToAccount}
            onLogout={handleLogout}
          />
        );
      }

      if (screen === "caregiver") {
        return (
          <PatientCaregiverPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={goToHome}
            onOpenDecisions={goToDecisions}
            onOpenCaregiver={goToCaregiver}
            onOpenDoctor={goToDoctor}
            onOpenDocuments={goToDocuments}
            onOpenAccount={goToAccount}
            onLogout={handleLogout}
          />
        );
      }

      if (screen === "doctor") {
        return (
          <PatientDoctorPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={goToHome}
            onOpenDecisions={goToDecisions}
            onOpenCaregiver={goToCaregiver}
            onOpenDoctor={goToDoctor}
            onOpenDocuments={goToDocuments}
            onOpenAccount={goToAccount}
            onLogout={handleLogout}
          />
        );
      }

      return (
        <PatientHome
          apiUrl={API_URL}
          user={currentUser}
          onOpenHome={goToHome}
          onOpenDecisions={goToDecisions}
          onOpenCaregiver={goToCaregiver}
          onOpenDoctor={goToDoctor}
          onOpenDocuments={goToDocuments}
          onOpenAccount={goToAccount}
          onLogout={handleLogout}
        />
      );
    }

    if (currentUser.role === "caregiver") {
      if (screen === "account") {
        return (
          <AccountPage
            apiUrl={API_URL}
            user={currentUser}
            onBack={goToHome}
            onAccountDeleted={handleAccountDeleted}
            onLogout={handleLogout}
            onUserUpdated={setCurrentUser}
            patientNavigation={patientNavigation}
            caregiverNavigation={caregiverNavigation}
            doctorNavigation={doctorNavigation}
          />
        );
      }

      if (screen === "caregiverPatients") {
        return (
          <CaregiverPatientsPage
            apiUrl={API_URL}
            user={currentUser}
            onOpenHome={goToHome}
            onOpenCaregiver={goToCaregiverPatients}
            onOpenAccount={goToAccount}
            onLogout={handleLogout}
          />
        );
      }

      return (
        <CaregiverHome
          apiUrl={API_URL}
          user={currentUser}
          onOpenHome={goToHome}
          onOpenCaregiver={goToCaregiverPatients}
          onOpenAccount={goToAccount}
          onLogout={handleLogout}
        />
      );
    }

    if (screen === "account") {
      return (
        <AccountPage
          apiUrl={API_URL}
          user={currentUser}
          onBack={goToHome}
          onAccountDeleted={handleAccountDeleted}
          onLogout={handleLogout}
          onUserUpdated={setCurrentUser}
          patientNavigation={patientNavigation}
          caregiverNavigation={caregiverNavigation}
          doctorNavigation={doctorNavigation}
        />
      );
    }

    if (screen === "doctorPatients") {
      return (
        <DoctorPatientsPage
          apiUrl={API_URL}
          user={currentUser}
          onOpenHome={goToHome}
          onOpenPatients={goToDoctorPatients}
          onOpenAccount={goToAccount}
          onLogout={handleLogout}
        />
      );
    }

    if (currentUser.role === "doctor") {
      return (
        <DoctorHome
          apiUrl={API_URL}
          user={currentUser}
          onOpenHome={goToHome}
          onOpenPatients={goToDoctorPatients}
          onOpenAccount={goToAccount}
          onLogout={handleLogout}
        />
      );
    }

    return null;
  }

  return (
    <div className="app-shell">
      {screen === "login" ? (
        <Login
          message={message}
          onGoToSignup={goToSignup}
          onLogin={handleLogin}
        />
      ) : (
        <Signup
          message={message}
          onGoToLogin={goToLogin}
          onSignup={handleSignup}
        />
      )}
    </div>
  );
}
