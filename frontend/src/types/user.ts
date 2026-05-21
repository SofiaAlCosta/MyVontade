export type UserRole = "patient" | "doctor" | "caregiver";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type SignupFormData = {
  role: string;
  name: string;
  email: string;
  password: string;
  patientNumber: string;
  dateOfBirth: string;
  phoneNumber: string;
  professionalLicense: string;
  specialty: string;
  relationshipToPatient: string;
};

export type AccountFields = {
  phoneNumber: string;
  patientNumber: string;
  dateOfBirth: string;
  professionalLicense: string;
  specialty: string;
  relationshipToPatient: string;
};

export type AccountProfile = {
  user: User;
  profile: AccountFields;
};

export type DashboardTone = "positive" | "warning" | "calm" | "soft";
export type CaregiverLinkStatus = "pending" | "active";

export type DashboardCardKey =
  | "directives"
  | "caregiver"
  | "documents"
  | "account";

export type DashboardCard = {
  key: DashboardCardKey;
  title: string;
  value: string;
  note: string;
  tone: DashboardTone;
};

export type DashboardDecisionSummary = {
  label: string;
  value: string;
};

export type PatientDashboard = {
  statusCards: DashboardCard[];
  decisionsSummary: DashboardDecisionSummary[];
  nextStep: string;
};

export type PatientDecisions = {
  resuscitationPreference: string;
  artificialFeedingPreference: string;
  painManagementPreference: string;
  notes: string;
};

export type PatientCaregiver = {
  name: string;
  relationshipToPatient: string;
  phoneNumber: string;
  email: string;
};

export type PatientDocument = {
  id: number;
  title: string;
  documentType: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
};

export type PatientCaregiverLink = {
  id: number;
  caregiverId: number;
  caregiverName: string;
  caregiverEmail: string;
  caregiverPhoneNumber: string;
  relationshipToPatient: string;
  status: CaregiverLinkStatus;
  createdAt: string;
  respondedAt: string;
};

export type CaregiverPatientLink = {
  id: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  patientPhoneNumber: string;
  patientNumber: string;
  dateOfBirth: string;
  relationshipToPatient: string;
  status: CaregiverLinkStatus;
  createdAt: string;
  respondedAt: string;
};

export type CaregiverPatientOverview = {
  patient: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    patientNumber: string;
    dateOfBirth: string;
  };
  dashboard: PatientDashboard;
  decisions: PatientDecisions;
  documents: PatientDocument[];
};
