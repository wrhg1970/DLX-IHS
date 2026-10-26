import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback, useMemo } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Role, DEFAULT_ROLES, getSystemRoles, setInMemorySystemRoles } from "../utils/permissionCheck";
import { safeLocalStorageSet } from "../utils/storage";
import {
  sendTaskAssignmentNotification,
  sendTaskDeadlineNotification,
  checkAndNotifyUpcomingDeadlines,
  TaskNotificationResult
} from "../utils/notifications";
import { calculateEnrollmentStatus, EnrollmentStatus } from "../utils/enrollmentStatus";
import { CreditType } from "../utils/creditType";
import {
  BackupScheduleConfig,
  DEFAULT_BACKUP_SCHEDULE,
  uploadBackupToGoogleDrive,
  isGoogleDriveTokenAvailable
} from "../utils/googleDriveBackup";

let lastId = Date.now();
export const generateUniqueId = (): number => {
  const now = Date.now();
  if (now > lastId) {
    lastId = now;
  } else {
    lastId++;
  }
  return lastId * 1050 + Math.floor(Math.random() * 1000);
};

export type SLAStatusLevel = 'en_tiempo' | 'por_vencer' | 'vencido';

export interface InstitutionSLAInfo {
  institutionId: number;
  institutionName: string;
  lastInteractionDate: string | null;
  lastInteractionType: string;
  daysInactive: number;
  slaLimitDays: number;
  status: SLAStatusLevel;
  label: string;
  indicatorName: string;
  isOverdue: boolean;
  overdueDays: number;
  badgeClass: string;
  badgeBorderClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  dotColorClass: string;
}

export interface Institution {
  id: number;
  institutionCode?: string;
  name: string;
  country: string;
  contact: string;
  students: number;
  status: string;
  createdAt?: string;
  lastInteractionDate?: string;
  lastInteractionType?: string;
  revenue?: number;
  membershipId?: string;
  membershipExpiration?: string;
  agentId?: number;
  commissionType?: 'percentage' | 'fixed' | 'per_course';
  commissionValue?: number;
  commissionCurrency?: string;
  membershipCommissionType?: 'percentage' | 'fixed' | 'none';
  membershipCommissionValue?: number;
  membershipCommissionCurrency?: string;
  courseCommissionType?: 'percentage' | 'fixed' | 'per_course' | 'none';
  courseCommissionValue?: number;
  courseCommissionCurrency?: string;
  modality?: string;
  membershipPrice?: string;
  priceFullCredit?: string;
  priceHalfCredit?: string;
  priceFullApCredit?: string;
  priceHalfApCredit?: string;
  payWithIva?: boolean;
  paymentMethod?: string;
  paymentAccount?: string;
  membershipPaymentMethod?: string;
  membershipPaymentAccount?: string;
  membershipPaymentCount?: number;
  membershipPaymentStartDate?: string;
  coursePaymentMethod?: string;
  coursePaymentAccount?: string;
  coursePaymentCount?: number;
  coursePaymentStartDate?: string;
  priceObservations?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPosition?: string;
  tarifasId?: string;
  institutionTypeId?: string;
  tradeName?: string;
  isCorporativo?: boolean;
  campusList?: Campus[];
  documentsList?: InstitutionDocument[];
  mainProviderId?: number;
  active?: boolean;
  colombiaCalendar?: 'Calendario A' | 'Calendario B' | '';
}

export const isColombia = (country?: string): boolean => {
  if (!country) return false;
  const normalized = country.trim().toLowerCase();
  return normalized === 'colombia' || normalized.includes('colombia');
};

export interface Campus {
  id: string;
  name: string;
  cityCountry: string;
  contact: string;
  phone: string;
}

export type InstitutionDocumentArea = 'Académico' | 'Administrativo' | 'Legal' | 'General';
export type InstitutionDocumentCategory = InstitutionDocumentArea;

export interface InstitutionDocument {
  id: string;
  name: string;
  fileName?: string;
  fileSize: string;
  uploadDate: string;
  fileData?: string;
  area?: InstitutionDocumentArea;
  category?: InstitutionDocumentCategory;
  hasExpiration?: boolean;
  expirationDate?: string;
}

export interface ExtraService {
  id: string;
  name: string;
  cost: number;
  currency: string;
  notes?: string;
}

export type AdmissionStepStatus = 'pendiente' | 'en_proceso' | 'completado';

export interface AdmissionUniversityOption {
  id: string;
  name: string;
  country: string;
  program: string;
  category: 'Dream / Reach' | 'Target' | 'Safety';
  status: 'Evaluando' | 'Seleccionada' | 'Descartada';
  costPerYear?: string;
  deadline?: string;
  notes?: string;
}

export interface AdmissionDocumentCheckItem {
  id: string;
  name: string;
  required: boolean;
  received: boolean;
  receivedDate?: string;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
}

export interface AdmissionScholarshipItem {
  id: string;
  name: string;
  institutionOrProvider: string;
  type: 'Mérito Académico' | 'Deportiva' | 'Necesidad Financiera' | 'Talento / Otra';
  amount: string;
  status: 'En trámite' | 'Otorgada' | 'No aplicable' | 'Rechazada';
  deadline?: string;
  notes?: string;
}

export interface AdmissionApplicationItem {
  id: string;
  universityName: string;
  platform: string;
  applicationId?: string;
  submissionDate?: string;
  decisionType: 'Regular Decision' | 'Early Action' | 'Early Decision' | 'Rolling';
  status: 'Enviada' | 'En revisión' | 'Aceptada' | 'En lista de espera' | 'Rechazada';
  confirmationUrl?: string;
  notes?: string;
}

export interface UniversityAdmissionData {
  counselorName?: string;
  counselorEmail?: string;
  targetDegree?: string;
  targetTerm?: string;
  overallNotes?: string;

  // 1. Fecha de inicio
  startDateStep?: {
    status: AdmissionStepStatus;
    date?: string;
    counselor?: string;
    targetCountries?: string;
    notes?: string;
  };

  // 2. Llenado formulario
  formFillingStep?: {
    status: AdmissionStepStatus;
    completionDate?: string;
    formUrl?: string;
    interestsSummary?: string;
    notes?: string;
  };

  // 3. Reunion 1-1
  meetingStep?: {
    status: AdmissionStepStatus;
    meetingDate?: string;
    meetingTime?: string;
    modality?: 'Virtual (Zoom/Meet)' | 'Presencial' | 'Telefónica';
    attendees?: string;
    meetingLink?: string;
    summaryNotes?: string;
  };

  // 4. Evaluacion Perfil
  profileEvaluationStep?: {
    status: AdmissionStepStatus;
    evaluationDate?: string;
    gpaScore?: string;
    englishProficiency?: string;
    standardizedTests?: string;
    topMajors?: string;
    extracurricularStrengths?: string;
    counselorRecommendations?: string;
  };

  // 5. Revision de opciones
  optionsReviewStep?: {
    status: AdmissionStepStatus;
    reviewDate?: string;
    options?: AdmissionUniversityOption[];
    selectedCount?: number;
    notes?: string;
  };

  // 6. Solicitud documentos
  documentsRequestStep?: {
    status: AdmissionStepStatus;
    requestDate?: string;
    deadline?: string;
    documents?: AdmissionDocumentCheckItem[];
    notes?: string;
  };

  // 7. Revisión de becas
  scholarshipsReviewStep?: {
    status: AdmissionStepStatus;
    reviewDate?: string;
    scholarships?: AdmissionScholarshipItem[];
    totalEstimatedScholarship?: string;
    notes?: string;
  };

  // 8. Aplicación enviada
  applicationSubmittedStep?: {
    status: AdmissionStepStatus;
    submissionDate?: string;
    applications?: AdmissionApplicationItem[];
    notes?: string;
  };

  // 9. Carta Aceptación
  acceptanceLetterStep?: {
    status: AdmissionStepStatus;
    decisionDate?: string;
    acceptedUniversity?: string;
    officialMajor?: string;
    scholarshipAwarded?: string;
    letterFileUrl?: string;
    letterFileName?: string;
    depositPaid?: boolean;
    depositAmount?: string;
    depositDate?: string;
    notes?: string;
  };

  // 10. Fecha inicio
  programStartDateStep?: {
    status: AdmissionStepStatus;
    classesStartDate?: string;
    orientationDate?: string;
    visaStatus?: 'No requerida' | 'En trámite' | 'Aprobada / Emitida';
    housingStatus?: 'En trámite' | 'Campus Dorms' | 'Off-campus' | 'Confirmado';
    finalNotes?: string;
  };
}

export interface Student {
  id: number;
  name: string;
  lastName?: string;
  preferredName?: string;
  gender?: string;
  email: string;
  phone?: string;
  birthDate?: string;
  curp?: string;
  nationality?: string;
  passport?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  parentName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentRelation?: string;
  institutionId: number;
  agentId?: number;
  status: string;
  studentCustomId?: string;
  modality?: string;
  schoolYear?: string;
  extraServices?: ExtraService[];
  documentsList?: InstitutionDocument[];
  universityAdmissionProcess?: UniversityAdmissionData;
  notificationPayment?: {
    alumno: boolean;
    instituto: boolean;
    agente: boolean;
  };
  notificationAcademic?: {
    alumno: boolean;
    instituto: boolean;
    agente: boolean;
  };
  hasScholarship?: boolean;
  scholarshipType?: 'Monto' | 'Porcentaje';
  scholarshipValue?: number;
  scholarshipTarget?: 'Estudiante' | 'Escuela';
  attendanceRate?: number;
  absencesCount?: number;
  attendanceNotes?: string;
}

export interface ClassItem {
  id: number;
  name: string;
  code?: string;
  creditType: CreditType;
  syllabus?: string;
  validity?: string;
  providerId?: number;
  credits?: number;
  cost?: string;
  price?: string;
  enrolled?: number;
  hours?: string;
  countryRates?: Record<string, { cost: string; price: string }>;
  isArchived?: boolean;
  archived?: boolean;
}

export type CourseGradeOutcome = 'Pass' | 'Fail' | 'Pendiente';

export interface Enrollment {
  id: number;
  classId: number;
  studentId: number;
  startDate: string;
  endDate: string;
  price?: number;
  providerId?: number;
  enrollmentDate?: string;
  activationDate?: string;
  status?: EnrollmentStatus;
  gradeOutcome?: CourseGradeOutcome;
  finalGrade?: string;
  gradeDate?: string;
  gradeNotes?: string;
  notes?: string;
  curp?: string;
  lugar?: 'Escuela' | 'Casa';
  resultadoUrl?: string;
  resultadoFileName?: string;
  usuario?: string;
  contrasena?: string;
  area?: string;
  destino?: string;
  hasExtension?: boolean;
  extensionDate?: string;
  extensionChargeGenerated?: boolean;
}

export interface Payment {
  id: number;
  studentId?: number;
  providerId?: number;
  date: string;
  amount: number;
  tax: number;
  finalAmount: number;
  exchangeRate?: number;
  concept?: string;
  reference?: string;
  bankAccountId?: string | number;
  invoicePdfUrl?: string;
  invoicePdfName?: string;
  invoiceXmlUrl?: string;
  invoiceXmlName?: string;
  receiptPdfUrl?: string;
  receiptPdfName?: string;
}

export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'MXN' | 'USD' | 'EUR' | 'GBP';

export interface FinanceCategory {
  id: string;
  name: string;
  type: TransactionType;
  subcategories: string[];
}

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  date: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  amountMXN: number;
  finalAmount: number;
  status: 'Aplicado' | 'Pendiente' | 'Pagado' | 'Programado';
  categoryId: string;
  subcategory: string;
  paymentMethod: string;
  bankAccountId?: string | number;
  studentId?: number;
  institutionId?: number;
  providerId?: number;
  agentId?: number;
  taxId?: string;
  attachmentUrl?: string;
  invoiceRequested?: boolean;
  iva?: number;
  originalAmount?: number;
  originalCurrency?: CurrencyCode;
  paymentLink?: string;
  invoicePdfUrl?: string;
  invoicePdfName?: string;
  invoiceXmlUrl?: string;
  invoiceXmlName?: string;
  receiptPdfUrl?: string;
  receiptPdfName?: string;
}

export interface StatementTransaction {
  id: string;
  statementId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategory: string;
  saved: boolean;
  reconciled: boolean;
  studentId?: number;
  institutionId?: number;
}

export interface AccountStatement {
  id: string;
  filename: string;
  uploadDate: string;
  totalOperations: number;
  totalIncome: number;
  totalExpense: number;
}

export interface Provider {
  id: number;
  legalName: string;
  commercialName: string;
  rfc: string;
  phone: string;
  email: string;
  category: string;
  subcategory: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  status: string;
  providerType?: 'Curriculum Académico' | 'Servicios Extras';
}

export interface BankAccount {
  id: number;
  providerId: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  clabe: string;
  reference?: string;
  currency?: 'MXN' | 'USD';
}

export interface Contact {
  id: number;
  institutionId?: number;
  providerId?: number;
  name: string;
  lastName: string;
  position: string;
  area: string;
  email: string;
  phone: string;
  systemAccess?: boolean;
}

export type TaskType = 'Llamada' | 'Correo' | 'Visita' | 'Meet' | 'Otro';

export interface Team {
  id: number;
  name: string;
  description?: string;
  color?: string;
  leaderId?: number;
  createdAt?: string;
}

export interface Task {
  id: number;
  institutionId?: number;
  title: string;
  dueDate: string;
  status: 'Pendiente' | 'Completada';
  userId?: number;
  userIds?: number[];
  teamId?: number;
  type?: TaskType;
  leadId?: string;
  notes?: string;
  priority?: 'Alta' | 'Media' | 'Baja';
  requestedBy?: string;
}

export interface Activity {
  id: number;
  institutionId: number;
  studentId?: number;
  date: string;
  description: string;
  userName?: string;
}

export interface AuditFieldChange {
  fieldName: string;
  oldValue: string;
  newValue: string;
}

export type AuditActionType = 'create' | 'update' | 'delete' | 'settings_change' | 'restore' | 'auth' | 'backup';
export type AuditSeverity = 'baja' | 'media' | 'alta' | 'critica';

export interface AuditLog {
  id: string;
  entityType: 'institution' | 'student' | 'class' | 'payment' | 'financialTransaction' | 'provider' | 'providerProductService' | 'user' | 'role' | 'company' | 'backup' | 'system' | string;
  entityId: string | number;
  entityName: string;
  date: string;
  description: string;
  userId?: string | number;
  userName: string;
  userEmail?: string;
  userRole?: string;
  actionType?: AuditActionType;
  severity?: AuditSeverity;
  fieldsChanged?: AuditFieldChange[];
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface CompanyInfo {
  commercialName: string;
  legalName: string;
  logoUrl?: string;
  rfc: string;
  baseCurrency: string;
  timezone: string;
  contactEmail: string;
  address: {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  socialLinks: {
    website: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    tiktok: string;
  };
}

export interface CompanyDocument {
  id: string;
  name: string;
  date: string;
  validity: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt?: string;
  fileData?: string;
  fileName?: string;
  fileSize?: string;
}

export interface DbMetrics {
  readsTotal: number;
  readsServer: number;
  readsCached: number;
  writesTotal: number;
  writesBatched: number;
  deletesTotal: number;
  savesBypassed: number;
  lastOperationTime: string | null;
  lastOperationType: 'READ' | 'WRITE' | 'DELETE' | 'BYPASS' | null;
  lastOperationStatus: 'SUCCESS' | 'ERROR' | null;
  cacheEnabled: boolean;
  activeCollectionSyncs: Record<string, { docCount: number; status: 'syncing' | 'synced' | 'error'; lastSynced: string }>;
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type?: string;
  amount?: number;
  currency?: string;
  parentId?: string;
  companyName?: string;
  accountNumber?: string;
  clabe?: string;
  swift?: string;
  aba?: string;
  notes?: string;
  providerIds?: number[];
  slaDays?: number | null;
  priority?: 'alta' | 'media' | 'baja' | string;
  responsibleRole?: string;
  actionOnAlert?: string;
  module?: 'crm' | 'instituciones' | 'alumnos' | string;
  isActive?: boolean;
  emailTemplateId?: string;
  emailTemplateTitle?: string;
  targetStage?: string;
  hasSecondaryAction?: boolean;
  secondaryAction?: string;
  secondaryEmailTemplateId?: string;
  secondaryEmailTemplateTitle?: string;
  secondaryTargetStage?: string;
}

export type CatalogTypes = 
  | 'Tarifas Países'
  | 'Tipos de Institución'
  | 'Monedas'
  | 'Roles de Usuario'
  | 'Métodos de Pago'
  | 'Estados Académicos'
  | 'Categorías'
  | 'Subcategorías'
  | 'Membresías'
  | 'Cuentas bancarias'
  | 'Modalidades'
  | 'Tipo de Producto'
  | 'Fases y Alertas de Inactividad (SLA)'
  | 'Categorías de Documentos'
  | 'Programas Homeschool';

export interface AgentBankAccount {
  id: string;
  bankName: string;
  clabe: string;
  accountNo: string;
  currency: string;
  beneficiary?: string;
  type?: string;
}

export interface ProviderProductService {
  id: number;
  providerId: number;
  productType: string;
  name: string;
  countryPrices: Array<{
    country: string;
    startDate?: string;
    endDate?: string;
    
    priceFullCredit: string;
    priceHalfCredit: string;
    priceFullApCredit: string;
    priceHalfApCredit: string;

    costFullCredit: string;
    costHalfCredit: string;
    costFullApCredit: string;
    costHalfApCredit: string;
  }>;
}

export interface ProviderSpecificProduct {
  id: number;
  providerId: number;
  name: string;
  productType: string;
}

export interface ExtraCommission {
  id: string;
  institutionId: number;
  type: 'percentage' | 'fixed';
  value: number;
  currency: string;
  category: 'course' | 'membership' | 'special';
  concept?: string;
}

export interface User {
  id: number;
  name: string;
  role: string;
  email: string;
  phone?: string;
  teamId?: number;
  rfc?: string;
  address?: string;
  bankAccounts?: AgentBankAccount[];
  institutionIds?: number[];
  studentId?: number;
  institutionId?: number;
  password?: string;
  requirePasswordChange?: boolean;
  requireEmailVerification?: boolean;
  emailVerified?: boolean;
  extraCommissions?: ExtraCommission[];
  // Campos de perfil extendido y firma electrónica
  title?: string;
  department?: string;
  bio?: string;
  avatarUrl?: string;
  signatureType?: 'drawn' | 'typed' | 'image';
  signatureImage?: string;
  signatureText?: string;
  signatureFont?: string;
  signaturePhone?: string;
  signatureWebsite?: string;
  signatureDisclaimer?: string;
  includeSignatureInEmails?: boolean;
}

interface AppContextType {
  firebaseSyncCompleted: boolean;
  syncErrors: Array<{ collection: string; error: string; time: string }>;
  institutions: Institution[];
  students: Student[];
  classes: ClassItem[];
  providers: Provider[];
  enrollments: Enrollment[];
  payments: Payment[];
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, "id" | "date" | "userName"> & { userName?: string; date?: string; userId?: string | number; userEmail?: string }) => void;
  clearAuditLogs: () => void;
  deleteAuditLog: (id: string) => void;
  bankAccounts: BankAccount[];
  contacts: Contact[];
  tasks: Task[];
  activities: Activity[];
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  teams: Team[];
  addTeam: (team: Omit<Team, "id" | "createdAt">) => Team;
  updateTeam: (id: number, data: Partial<Team>) => void;
  deleteTeam: (id: number) => void;
  providerProductServices: ProviderProductService[];
  addProviderProductService: (service: Omit<ProviderProductService, "id">) => void;
  updateProviderProductService: (id: number, data: Partial<ProviderProductService>) => void;
  deleteProviderProductService: (id: number) => void;
  providerSpecificProducts: ProviderSpecificProduct[];
  addProviderSpecificProduct: (prod: Omit<ProviderSpecificProduct, "id">) => void;
  updateProviderSpecificProduct: (id: number, data: Partial<ProviderSpecificProduct>) => void;
  deleteProviderSpecificProduct: (id: number) => void;
  catalogs: Record<CatalogTypes, CatalogItem[]>;
  companyInfo: CompanyInfo;
  updateCompanyInfo: (data: Partial<CompanyInfo>) => void;
  companyDocuments: CompanyDocument[];
  addCompanyDocument: (doc: Omit<CompanyDocument, "id" | "uploadedAt">) => void;
  updateCompanyDocument: (id: string, data: Partial<CompanyDocument>) => void;
  deleteCompanyDocument: (id: string) => void;

  financeCategories: FinanceCategory[];
  addFinanceCategory: (cat: Omit<FinanceCategory, "id">) => void;
  updateFinanceCategory: (id: string, data: Partial<FinanceCategory>) => void;
  deleteFinanceCategory: (id: string) => void;

  financialTransactions: FinancialTransaction[];
  addFinancialTransaction: (tx: Omit<FinancialTransaction, "id" | "amountMXN" | "finalAmount">) => void;
  updateFinancialTransaction: (id: string, data: Partial<FinancialTransaction>) => void;
  deleteFinancialTransaction: (id: string) => void;

  accountStatements: AccountStatement[];
  statementTransactions: StatementTransaction[];
  addAccountStatement: (statement: Omit<AccountStatement, "id" | "uploadDate">, transactions: Omit<StatementTransaction, "id" | "statementId" | "saved" | "reconciled">[]) => void;
  deleteAccountStatement: (id: string) => void;
  updateStatementTransaction: (id: string, data: Partial<StatementTransaction>) => void;
  deleteStatementTransaction: (id: string) => void;

  addUser: (user: Omit<User, "id">) => void;
  updateUser: (id: number, data: Partial<User>) => void;
  deleteUser: (id: number) => void;
  addInstitution: (inst: Omit<Institution, "id"> & { id?: number }) => number;
  updateInstitution: (id: number, data: Partial<Institution>) => void;
  addInstitutionDocuments: (institutionId: number, newDocs: InstitutionDocument[]) => void;
  deleteInstitutionDocument: (institutionId: number, documentId: string) => Promise<void>;
  deleteInstitution: (id: number) => void;
  clearAllInstitutions: () => void;
  clearAllClasses: () => void;
  addStudent: (student: Omit<Student, "id">) => void;
  updateStudent: (id: number | number[], data: Partial<Student>) => void;
  deleteStudent: (id: number) => void;
  addClass: (cls: Omit<ClassItem, "id">) => void;
  updateClass: (id: number, data: Partial<ClassItem>) => void;
  deleteClass: (id: number) => void;
  addProvider: (prov: Omit<Provider, "id">) => void;
  updateProvider: (id: number, data: Partial<Provider>) => void;
  addBankAccount: (account: Omit<BankAccount, "id">) => void;
  updateBankAccount: (id: number, data: Partial<BankAccount>) => void;
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (id: number, data: Partial<Payment>) => void;
  deletePayment: (id: number) => void;
  addEnrollment: (enrollment: Omit<Enrollment, "id">) => void;
  updateEnrollment: (id: number, data: Partial<Enrollment>) => void;
  deleteEnrollment: (id: number) => void;
  syncEnrollmentStatuses: () => number;
  addContact: (contact: Omit<Contact, "id">) => void;
  updateContact: (id: number, data: Partial<Contact>) => void;
  deleteContact: (id: number) => void;
  addTask: (task: Omit<Task, "id">, options?: { skipNotification?: boolean; forceEmail?: boolean; forceWhatsApp?: boolean }) => void;
  updateTask: (id: number, data: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  notifyTaskAssignee: (task: Task, forceEmail?: boolean, forceWhatsApp?: boolean) => Promise<TaskNotificationResult>;
  notifyTaskDeadline: (task: Task, forceEmail?: boolean, forceWhatsApp?: boolean) => Promise<TaskNotificationResult>;
  triggerDeadlineScan: (forceAll?: boolean) => Promise<{ scannedCount: number; notifiedTasks: Array<{ task: Task; user: User; result: TaskNotificationResult }> }>;
  addActivity: (activity: Omit<Activity, "id">) => void;
  addCatalogItem: (catalog: CatalogTypes, item: Omit<CatalogItem, "id">) => void;
  updateCatalogItem: (catalog: CatalogTypes, id: string, data: Partial<CatalogItem>) => void;
  deleteCatalogItem: (catalog: CatalogTypes, id: string) => void;
  getInstitutionSLA: (institution: Institution | number) => InstitutionSLAInfo;
  updateInstitutionLastInteraction: (institutionId: number, interactionDate?: string, interactionType?: string, description?: string) => void;
  slaSummary: { total: number; enTiempo: number; porVencer: number; vencidos: number; alerts: InstitutionSLAInfo[] };
  getLeadSlaInfo: (lead: { status?: string; createdAt?: string; lastInteractionDate?: string; name?: string; id?: string | number }) => InstitutionSLAInfo;
  backups: any[];
  triggerFullBackup: (type?: 'Automático' | 'Manual', forceDriveUpload?: boolean) => Promise<any>;
  triggerGoogleDriveBackup: (type?: 'Automático' | 'Manual') => Promise<any>;
  backupSchedule: BackupScheduleConfig;
  updateBackupSchedule: (config: Partial<BackupScheduleConfig>) => Promise<void>;
  restoreBackup: (backup: any) => boolean;
  deleteBackup: (id: string) => void;
  systemRoles: Role[];
  updateSystemRoles: (roles: Role[]) => Promise<void>;
  restoreDefaultRoles: () => Promise<void>;
  addSystemRole: (role: Omit<Role, "id">) => Promise<Role>;
  deleteSystemRole: (id: string) => Promise<void>;
  dbMetrics: DbMetrics;
  resetDbMetrics: () => void;
}

export function resolveCreditPrices(
  tarifasId: string | undefined, 
  catalogs: any, 
  mainProviderId?: number, 
  providerProductServices?: any[]
) {
  const countryName = catalogs['Tarifas Países']?.find((c: any) => c.id === tarifasId)?.name || 'Default';

  if (mainProviderId && providerProductServices) {
    const serviceClass = providerProductServices.find(
      (ps: any) => ps.providerId === Number(mainProviderId) && ['clase', 'clases'].includes(ps.productType.toLowerCase())
    );
    if (serviceClass && serviceClass.countryPrices) {
      const cp = serviceClass.countryPrices.find(
        (p: any) => p.country.toLowerCase() === countryName.toLowerCase()
      );
      if (cp) {
        let currencySuffix = 'USD';
        if (countryName.toLowerCase().includes('méxico')) {
          currencySuffix = 'USD';
        } else if (countryName.toLowerCase().includes('españa')) {
          currencySuffix = 'EUR';
        }

        const formatPrice = (val: string, suffix: string) => {
          if (!val) return '$0';
          const clean = val.replace(/[^0-9.]/g, '');
          if (!clean) return `$0 ${suffix}`;
          const num = parseFloat(clean);
          if (isNaN(num)) return `${val} ${suffix}`;
          return `$${num.toLocaleString()} ${suffix}`;
        };

        return {
          priceFullCredit: formatPrice(cp.priceFullCredit, currencySuffix),
          priceHalfCredit: formatPrice(cp.priceHalfCredit, currencySuffix),
          priceFullApCredit: formatPrice(cp.priceFullApCredit, currencySuffix),
          priceHalfApCredit: formatPrice(cp.priceHalfApCredit, currencySuffix),
        };
      }
    }
  }

  switch (countryName) {
    case 'México':
      return {
        priceFullCredit: '$1,000 USD',
        priceHalfCredit: '$500 USD',
        priceFullApCredit: '$1,200 USD',
        priceHalfApCredit: '$600 USD'
      };
    case 'España':
      return {
        priceFullCredit: '$500 EUR',
        priceHalfCredit: '$250 EUR',
        priceFullApCredit: '$600 EUR',
        priceHalfApCredit: '$300 EUR'
      };
    case 'Japón':
      return {
        priceFullCredit: '$600 USD',
        priceHalfCredit: '$300 USD',
        priceFullApCredit: '$720 USD',
        priceHalfApCredit: '$360 USD'
      };
    case 'China':
      return {
        priceFullCredit: '$450 USD',
        priceHalfCredit: '$225 USD',
        priceFullApCredit: '$540 USD',
        priceHalfApCredit: '$270 USD'
      };
    case 'Estados Unidos':
      return {
        priceFullCredit: '$550 USD',
        priceHalfCredit: '$280 USD',
        priceFullApCredit: '$650 USD',
        priceHalfApCredit: '$330 USD'
      };
    default:
      return {
        priceFullCredit: '$500 USD',
        priceHalfCredit: '$250 USD',
        priceFullApCredit: '$600 USD',
        priceHalfApCredit: '$300 USD'
      };
  }
}

export function resolveMembershipPrice(membershipId: string | undefined, catalogs: any) {
  if (!membershipId) return 'Ninguno';
  const memb = catalogs['Membresías']?.find((m: any) => m.id === membershipId);
  if (memb) {
    return `$${memb.amount || 0} ${memb.currency || 'USD'}`;
  }
  return 'Sin Asignar';
}

export function normalizeCountryName(c: string) {
  return (c || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .trim();
}

export function resolveProviderClassCost(
  providerId: any,
  creditType: string | undefined,
  countryRef: string,
  providerProductServices: any[] | undefined
) {
  if (!providerId || !providerProductServices) return 0;
  
  const serviceClass = providerProductServices.find(
    ps => Number(ps.providerId) === Number(providerId) &&
      ['clase', 'clases'].includes((ps.productType || "").toLowerCase().trim())
  );
  
  if (!serviceClass || !serviceClass.countryPrices) return 0;
  
  const normCountryRef = normalizeCountryName(countryRef);
  const cpData = serviceClass.countryPrices.find(
    (p: any) => normalizeCountryName(p.country) === normCountryRef
  );
  
  if (!cpData) return 0;
  
  const typeStr = (creditType || "").toLowerCase().trim();
  const isAp = typeStr.includes("ap");
  
  let costStr = "0";
  if (typeStr.includes("medio") || typeStr.includes("half")) {
    costStr = isAp ? cpData.costHalfApCredit : cpData.costHalfCredit;
  } else {
    costStr = isAp ? cpData.costFullApCredit : cpData.costFullCredit;
  }
  
  return parseFloat(String(costStr || "0").replace(/[^0-9.-]+/g, "") || "0");
}

export interface InstitutionFinancialMetrics {
  totalVendidoUSD: number;
  totalVendidoMXN: number;
  totalMembUSD: number;
  totalMembMXN: number;
  totalIngresosProyectadosUSD: number;
  totalIngresosProyectadosMXN: number;
  coursesPaidUSD: number;
  coursesPaidMXN: number;
  membPaidUSD: number;
  membPaidMXN: number;
  totalPagadoUSD: number;
  totalPagadoMXN: number;
  coursesPendingUSD: number;
  coursesPendingMXN: number;
  membPendingUSD: number;
  membPendingMXN: number;
  totalPorRecaudarUSD: number;
  totalPorRecaudarMXN: number;
  totalCostUSD: number;
  totalCostMXN: number;
  egresosPagadosUSD: number;
  egresosPagadosMXN: number;
  saldoPorPagarUSD: number;
  saldoPorPagarMXN: number;
  margenProyectadoUSD: number;
  margenProyectadoMXN: number;
  margenPorcentaje: number;
  numStudents: number;
  numActiveEnrollments: number;
  numActiveClasses: number;
  numActiveFullCredits: number;
  numActiveHalfCredits: number;
  numDistinctFullCredits: number;
  numDistinctHalfCredits: number;
  activeClassIds: string[];
  hasPendingBalances: boolean;
  hasAssociatedRecords: boolean;
}

export function calculateInstitutionFinancials(
  institution: any,
  students: any[],
  enrollments: any[],
  classes: any[],
  catalogs: any,
  providerProductServices?: any[],
  financialTransactions?: any[],
  filterOptions?: {
    payFilterStartDate?: string;
    payFilterEndDate?: string;
  }
): InstitutionFinancialMetrics {
  if (!institution) {
    return {
      totalVendidoUSD: 0,
      totalVendidoMXN: 0,
      totalMembUSD: 0,
      totalMembMXN: 0,
      totalIngresosProyectadosUSD: 0,
      totalIngresosProyectadosMXN: 0,
      coursesPaidUSD: 0,
      coursesPaidMXN: 0,
      membPaidUSD: 0,
      membPaidMXN: 0,
      totalPagadoUSD: 0,
      totalPagadoMXN: 0,
      coursesPendingUSD: 0,
      coursesPendingMXN: 0,
      membPendingUSD: 0,
      membPendingMXN: 0,
      totalPorRecaudarUSD: 0,
      totalPorRecaudarMXN: 0,
      totalCostUSD: 0,
      totalCostMXN: 0,
      egresosPagadosUSD: 0,
      egresosPagadosMXN: 0,
      saldoPorPagarUSD: 0,
      saldoPorPagarMXN: 0,
      margenProyectadoUSD: 0,
      margenProyectadoMXN: 0,
      margenPorcentaje: 0,
      numStudents: 0,
      numActiveEnrollments: 0,
      numActiveClasses: 0,
      numActiveFullCredits: 0,
      numActiveHalfCredits: 0,
      numDistinctFullCredits: 0,
      numDistinctHalfCredits: 0,
      activeClassIds: [],
      hasPendingBalances: false,
      hasAssociatedRecords: false
    };
  }

  const instId = Number(institution.id);
  const instStudents = (students || []).filter(s => s.institutionId !== undefined && s.institutionId !== null && Number(s.institutionId) === instId);
  const instStudentIds = instStudents.map(s => Number(s.id));

  // Filter enrollments for this institution
  const rawInstEnrollments = (enrollments || []).filter(e => instStudentIds.includes(Number(e.studentId)));

  // Date & status filtered enrollments
  const dateFilteredEnrollments = rawInstEnrollments.filter(e => {
    if (e.status === 'Withdrawn') return false; // Withdrawn courses do not generate projected income or cost
    const d = e.startDate || e.enrollmentDate;
    if (!d) return true;
    if (filterOptions?.payFilterStartDate && d < filterOptions.payFilterStartDate) return false;
    if (filterOptions?.payFilterEndDate && d > filterOptions.payFilterEndDate) return false;
    return true;
  });

  // Calculate course sales per student in USD
  const totalVendidoUSD = instStudents.reduce((totalSum, s) => {
    const sEnrollments = dateFilteredEnrollments.filter(e => Number(e.studentId) === Number(s.id));
    let sTotalUSD = sEnrollments.reduce((sum, e) => {
      let cp = e.price;
      if (cp === undefined || cp === null || cp === '' || isNaN(Number(cp))) {
        const cl = (classes || []).find(c => Number(c.id) === Number(e.classId));
        if (cl) {
          const cType = cl.creditType;
          let valStr = "";
          // 1. First check manual override in institution
          if (cType === 'Half Credit' || cType === 'Medio Crédito') valStr = institution.priceHalfCredit || "";
          else if (cType === 'Full Credit AP' || cType === 'Crédito completo AP') valStr = institution.priceFullApCredit || "";
          else if (cType === 'Half Credit AP' || cType === 'Medio Crédito AP') valStr = institution.priceHalfApCredit || "";
          else if (cType === 'Full Credit' || cType === 'Crédito completo') valStr = institution.priceFullCredit || "";

          // 2. If not manual override, resolve from catalogs / tariff / provider
          if (!valStr) {
            const resolvedPrices = resolveCreditPrices(institution.tarifasId, catalogs, institution.mainProviderId, providerProductServices);
            if (cType === 'Half Credit' || cType === 'Medio Crédito') valStr = resolvedPrices.priceHalfCredit || "";
            else if (cType === 'Full Credit AP' || cType === 'Crédito completo AP') valStr = resolvedPrices.priceFullApCredit || "";
            else if (cType === 'Half Credit AP' || cType === 'Medio Crédito AP') valStr = resolvedPrices.priceHalfApCredit || "";
            else if (cType === 'Full Credit' || cType === 'Crédito completo') valStr = resolvedPrices.priceFullCredit || "";
          }

          // 3. Fallback to countryRates on class
          if (!valStr && cl.countryRates) {
            const countryRef = catalogs?.['Tarifas Países']?.find((c: any) => c.id === institution.tarifasId)?.name || institution.country || 'Default';
            let rateForCountry = cl.countryRates[countryRef];
            if (!rateForCountry) {
              const matchKey = Object.keys(cl.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
              if (matchKey) rateForCountry = cl.countryRates[matchKey];
            }
            if (rateForCountry?.price) valStr = rateForCountry.price;
          }

          if (valStr) {
            cp = parseFloat(String(valStr).replace(/[^0-9.-]+/g, "") || "0");
          } else {
            if (cType === 'Half Credit' || cType === 'Medio Crédito') cp = 250;
            else if (cType === 'Full Credit AP' || cType === 'Crédito completo AP') cp = 600;
            else if (cType === 'Half Credit AP' || cType === 'Medio Crédito AP') cp = 300;
            else cp = 500;
          }
        } else {
          cp = 0;
        }
      } else {
        cp = typeof cp === 'number' ? cp : parseFloat(String(cp).replace(/[^0-9.-]+/g, "") || "0");
      }
      return sum + (cp || 0);
    }, 0);

    // Apply school-targeted scholarship deduction if active
    if (s.hasScholarship && s.scholarshipTarget === 'Escuela') {
      const val = s.scholarshipValue || 0;
      if (s.scholarshipType === 'Porcentaje') {
        sTotalUSD = Math.max(0, sTotalUSD * (1 - val / 100));
      } else {
        sTotalUSD = Math.max(0, sTotalUSD - val);
      }
    }
    return totalSum + sTotalUSD;
  }, 0);

  const exchangeRate = 18.5;
  const ivaMultiplier = institution.payWithIva ? 1.16 : 1;
  const totalVendidoMXN = totalVendidoUSD * exchangeRate * ivaMultiplier;

  // Membership Projections in USD
  const activeMemb = catalogs?.['Membresías']?.find((m: any) => m.id === institution?.membershipId);
  const membUnitAmount = activeMemb ? Number(activeMemb.amount || 0) : 0;
  const customMembPrice = institution?.membershipPrice ? parseFloat(String(institution.membershipPrice).replace(/[^0-9.-]+/g, "")) : null;
  const finalMembUnitAmount = customMembPrice !== null && !isNaN(customMembPrice) ? customMembPrice : membUnitAmount;
  const isNoMemb = institution?.membershipId === 'memb_4' || institution?.membershipId === 'none' || institution?.membershipId === 'ninguno' || !institution?.membershipId;
  const totalMembUSD = (isNoMemb && (customMembPrice === null || isNaN(customMembPrice))) ? 0 : finalMembUnitAmount;
  const totalMembMXN = totalMembUSD * exchangeRate * ivaMultiplier;

  // Combined Projected Revenues
  const totalIngresosProyectadosUSD = totalVendidoUSD + totalMembUSD;
  const totalIngresosProyectadosMXN = totalVendidoMXN + totalMembMXN;

  // Helper to calculate payments
  const getMXNWithIva = (p: any) => {
    if (p.currency === 'USD') {
      const rate = p.exchangeRate || exchangeRate;
      const baseMXN = (p.amount || 0) * rate;
      return institution.payWithIva ? baseMXN * 1.16 : baseMXN;
    } else {
      return p.amountMXN !== undefined ? p.amountMXN : (p.amount || 0);
    }
  };

  const getUSDWithoutIva = (p: any) => {
    if (p.currency === 'USD') {
      return p.amount || 0;
    } else {
      const amtMXN = p.amountMXN !== undefined ? p.amountMXN : (p.amount || 0);
      const baseMXNWithoutIva = institution.payWithIva ? amtMXN / 1.16 : amtMXN;
      const rate = (p.exchangeRate && p.exchangeRate !== 1) ? p.exchangeRate : (Math.abs(baseMXNWithoutIva - 3768) < 5 ? 18.84 : exchangeRate);
      return rate > 0 ? baseMXNWithoutIva / rate : 0;
    }
  };

  // Payments (Income)
  const rawInstPayments = (financialTransactions || []).filter(p => 
    (Number(p.institutionId) === instId || (p.studentId && instStudentIds.includes(Number(p.studentId)))) && 
    p.type === 'income' && 
    (p.status === 'Aplicado' || p.status === 'Pagado')
  );

  const instPayments = rawInstPayments.filter(p => {
    if (filterOptions?.payFilterStartDate && p.date < filterOptions.payFilterStartDate) return false;
    if (filterOptions?.payFilterEndDate && p.date > filterOptions.payFilterEndDate) return false;
    return true;
  });

  const membPayments = instPayments.filter(p => 
    p.subcategory === 'sub_membresia' || 
    (p.concept && (p.concept.toLowerCase().includes('membresía') || p.concept.toLowerCase().includes('membresia'))) ||
    (p.description && (p.description.toLowerCase().includes('membresía') || p.description.toLowerCase().includes('membresia')))
  );
  const coursesPayments = instPayments.filter(p => !membPayments.includes(p));

  const coursesPaidMXN = coursesPayments.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const coursesPaidUSD = coursesPayments.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  const membPaidMXN = membPayments.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const membPaidUSD = membPayments.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  const totalPagadoMXN = instPayments.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const totalPagadoUSD = instPayments.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  const coursesPendingUSD = Math.max(0, totalVendidoUSD - coursesPaidUSD);
  const coursesPendingMXN = Math.max(0, totalVendidoMXN - coursesPaidMXN);

  const membPendingUSD = Math.max(0, totalMembUSD - membPaidUSD);
  const membPendingMXN = Math.max(0, totalMembMXN - membPaidMXN);

  const totalPorRecaudarUSD = coursesPendingUSD + membPendingUSD;
  const totalPorRecaudarMXN = coursesPendingMXN + membPendingMXN;

  // Class Costs to Providers in USD
  const totalCostUSD = dateFilteredEnrollments.reduce((sum, e) => {
    const cl = (classes || []).find(c => Number(c.id) === Number(e.classId));
    if (!cl) return sum;

    const provId = e.providerId || cl.providerId;
    const tariffId = institution?.tarifasId;
    const countryRef = catalogs?.['Tarifas Países']?.find((c: any) => c.id === tariffId)?.name || institution?.country || 'Default';

    let resolvedCost = resolveProviderClassCost(provId, cl.creditType, countryRef, providerProductServices);

    let countryRate = null;
    if (countryRef && cl.countryRates) {
      countryRate = cl.countryRates[countryRef];
      if (!countryRate) {
        const matchKey = Object.keys(cl.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
        if (matchKey) countryRate = cl.countryRates[matchKey];
      }
    }

    if (!resolvedCost && countryRate?.cost) {
      resolvedCost = parseFloat(String(countryRate.cost).replace(/[^0-9.-]+/g, "") || "0");
    }

    if (!resolvedCost && cl.cost) {
      resolvedCost = parseFloat(String(cl.cost).replace(/[^0-9.-]+/g, "") || "0");
    }

    if (!resolvedCost) {
      const typeStr = (cl.creditType || "").toLowerCase().trim();
      const isAp = typeStr.includes("ap");
      const isHalf = typeStr.includes("medio") || typeStr.includes("half");

      if (isHalf) {
        resolvedCost = isAp ? 175 : 150;
      } else {
        resolvedCost = isAp ? 350 : 300;
      }
    }

    return sum + resolvedCost;
  }, 0);

  const totalCostMXN = totalCostUSD * exchangeRate * ivaMultiplier;

  // Egresos Pagados
  const rawInstExpenses = (financialTransactions || []).filter(p => p.studentId && instStudentIds.includes(Number(p.studentId)) && p.type === 'expense');
  const instExpenses = rawInstExpenses.filter(p => {
    if (filterOptions?.payFilterStartDate && p.date < filterOptions.payFilterStartDate) return false;
    if (filterOptions?.payFilterEndDate && p.date > filterOptions.payFilterEndDate) return false;
    return true;
  });

  const egresosPagadosMXN = instExpenses.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const egresosPagadosUSD = instExpenses.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  const saldoPorPagarUSD = Math.max(0, totalCostUSD - egresosPagadosUSD);
  const saldoPorPagarMXN = Math.max(0, totalCostMXN - egresosPagadosMXN);

  const margenProyectadoUSD = totalIngresosProyectadosUSD - totalCostUSD;
  const margenProyectadoMXN = totalIngresosProyectadosMXN - totalCostMXN;
  const margenPorcentaje = totalIngresosProyectadosUSD > 0 ? (margenProyectadoUSD / totalIngresosProyectadosUSD) * 100 : 0;

  // Active Enrollments & Classes
  const instActiveEnrollments = rawInstEnrollments.filter(e => e.status === 'Active' || e.status === 'Extended' || (!e.status && (e.status !== 'Completed' && e.status !== 'Withdrawn' && e.status !== 'Ended')));
  const instActiveClassIds = new Set(instActiveEnrollments.map(e => e.classId));
  const numActiveEnrollments = instActiveEnrollments.length;
  const numActiveClasses = instActiveClassIds.size;

  let numActiveFullCredits = 0;
  let numActiveHalfCredits = 0;
  const fullClassIds = new Set<any>();
  const halfClassIds = new Set<any>();

  instActiveEnrollments.forEach(e => {
    const cl = (classes || []).find(c => Number(c.id) === Number(e.classId));
    const typeStr = (cl?.creditType || "").toLowerCase().trim();
    if (typeStr.includes("medio") || typeStr.includes("half")) {
      numActiveHalfCredits++;
      if (e.classId) halfClassIds.add(e.classId);
    } else {
      numActiveFullCredits++;
      if (e.classId) fullClassIds.add(e.classId);
    }
  });

  const numDistinctFullCredits = fullClassIds.size;
  const numDistinctHalfCredits = halfClassIds.size;

  const hasPendingBalances = totalPorRecaudarMXN > 0 || saldoPorPagarMXN > 0;
  const hasAssociatedRecords = instStudents.length > 0 || numActiveEnrollments > 0;

  return {
    totalVendidoUSD,
    totalVendidoMXN,
    totalMembUSD,
    totalMembMXN,
    totalIngresosProyectadosUSD,
    totalIngresosProyectadosMXN,
    coursesPaidUSD,
    coursesPaidMXN,
    membPaidUSD,
    membPaidMXN,
    totalPagadoUSD,
    totalPagadoMXN,
    coursesPendingUSD,
    coursesPendingMXN,
    membPendingUSD,
    membPendingMXN,
    totalPorRecaudarUSD,
    totalPorRecaudarMXN,
    totalCostUSD,
    totalCostMXN,
    egresosPagadosUSD,
    egresosPagadosMXN,
    saldoPorPagarUSD,
    saldoPorPagarMXN,
    margenProyectadoUSD,
    margenProyectadoMXN,
    margenPorcentaje,
    numStudents: instStudents.length,
    numActiveEnrollments,
    numActiveClasses,
    numActiveFullCredits,
    numActiveHalfCredits,
    numDistinctFullCredits,
    numDistinctHalfCredits,
    activeClassIds: Array.from(instActiveClassIds).map(String),
    hasPendingBalances,
    hasAssociatedRecords
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    let parsed = saved ? JSON.parse(saved) : fallback;
    if (Array.isArray(parsed)) {
      const seenIds = new Set();
      parsed = parsed.filter((item: any) => {
        if (item && item.id !== undefined) {
          if (seenIds.has(item.id)) {
            return false;
          }
          seenIds.add(item.id);
        }
        return true;
      }) as any;
    }
    return parsed;
  } catch (error) {
    return fallback;
  }
}

function cleanLocalStorageReplacer(key: string, value: any) {
  if (typeof value === 'string' && value.length > 2000 && (key === 'fileData' || (key === 'url' && value.startsWith('data:')))) {
    return "";
  }
  return value;
}

function safeSetItem(key: string, value: any) {
  safeLocalStorageSet(key, value);
}

export function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item));
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      // Strip oversized base64 strings so Firestore documents never exceed the 1MB limit
      if (
        (key === 'fileData' || key === 'attachmentData' || key === 'base64' || key === 'fileContent' || key === 'dataUrl') &&
        typeof val === 'string' && (val.length > 500 || val.startsWith('data:'))
      ) {
        cleaned[key] = '';
        continue;
      }
      if (typeof val === 'string' && val.length > 2000 && val.startsWith('data:')) {
        cleaned[key] = '';
        continue;
      }
      cleaned[key] = cleanForFirestore(val);
    }
  }
  return cleaned;
}

export function AppProvider({ children }: { children: ReactNode }) {
  // One-time reset to fulfill user deletion request and clear existing state caches
  if (typeof window !== 'undefined' && !localStorage.getItem('fully_cleared_v3')) {
    localStorage.removeItem('institutions');
    localStorage.removeItem('students');
    localStorage.removeItem('classes');
    localStorage.removeItem('enrollments');
    localStorage.removeItem('payments');
    localStorage.removeItem('providers');
    localStorage.removeItem('contacts');
    localStorage.removeItem('tasks');
    localStorage.removeItem('activities');
    localStorage.removeItem('financialTransactions');
    localStorage.setItem('fully_cleared_v3', 'true');
  }

  // Clear cached catalogs, providers and bank accounts so they get hydrated with new user list
  if (typeof window !== 'undefined' && !localStorage.getItem('fully_cleared_v4_catalogs')) {
    localStorage.removeItem('catalogs');
    localStorage.removeItem('providers');
    localStorage.removeItem('bankAccounts');
    localStorage.setItem('fully_cleared_v4_catalogs', 'true');
  }

  const [institutions, setInstitutions] = useState<Institution[]>(() => loadSaved('institutions', []));

  const [students, setStudents] = useState<Student[]>(() => loadSaved('students', []));

  const [classes, setClasses] = useState<ClassItem[]>(() => loadSaved('classes', []));

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    const loaded = loadSaved<Enrollment[]>('enrollments', []);
    return loaded.map(e => ({
      ...e,
      status: calculateEnrollmentStatus(e)
    }));
  });

  const [providers, setProviders] = useState<Provider[]>(() => {
    const saved = loadSaved<Provider[]>('providers', []);
    if (saved.length === 0) {
      return [
        { id: 1, commercialName: 'Keystone', legalName: 'Keystone Education', rfc: '', phone: '', email: 'contact@keystone.com', category: 'Proveedor Principal', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Curriculum Académico' },
        { id: 2, commercialName: 'Nelson Academy', legalName: 'Nelson Academy', rfc: '', phone: '', email: 'info@nelsonacademy.com', category: 'Proveedor Principal', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Curriculum Académico' },
        { id: 3, commercialName: 'ITEP', legalName: 'International Test of English Proficiency', rfc: '', phone: '', email: 'info@itepexam.com', category: 'Proveedor Principal', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' },
        { id: 4, commercialName: 'TOEFL', legalName: 'TOEFL iBT', rfc: '', phone: '', email: 'toefl@ets.org', category: 'Proveedor Principal', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' },
        { id: 5, commercialName: 'Estudiantes Embajadores', legalName: 'Estudiantes Embajadores S.A.', rfc: '', phone: '', email: 'contacto@estudiantesembajadores.com', category: 'Proveedor Principal', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' },
        { id: 6, commercialName: 'Schmoop', legalName: 'Schmoop University Inc.', rfc: '', phone: '', email: 'support@shmoop.com', category: 'Proveedor Principal', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' },
        { id: 7, commercialName: 'Coordinador', legalName: 'Coordinador de Escuela', rfc: '', phone: '', email: 'coordinador@prov.com', category: 'Proveedor Administrativo', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' },
        { id: 8, commercialName: 'Alumno', legalName: 'Alumno Servicios', rfc: '', phone: '', email: 'alumno@prov.com', category: 'Proveedor Administrativo', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' },
        { id: 9, commercialName: 'Padre Familia', legalName: 'Padre Familia Servicios', rfc: '', phone: '', email: 'padrefamilia@prov.com', category: 'Proveedor Administrativo', subcategory: '', street: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'México', status: 'Activo', providerType: 'Servicios Extras' }
      ];
    }
    return saved;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = loadSaved<BankAccount[]>('bankAccounts', []);
    if (saved.length === 0) {
      return [
        { id: 1, providerId: 2, bankName: 'Banorte PEM MXN', accountName: 'Programas Estudiantiles de Mexico', accountNumber: '0000000000', clabe: '0000000000', currency: 'MXN' },
        { id: 2, providerId: 5, bankName: 'WellsFargo USD', accountName: 'International High School', accountNumber: '0000000000', clabe: '0000000000', currency: 'USD' },
        { id: 3, providerId: 1, bankName: 'BBVA Bancomer MXN', accountName: 'Colegio Internacional High School S.C.', accountNumber: '1111111111', clabe: '111111111111111111', currency: 'MXN' }
      ];
    }
    return saved.map((item: any) => {
      if (!item.currency) {
        if (item.bankName?.toLowerCase().includes('wellsfargo') || item.bankName?.toLowerCase().includes('wells fargo') || item.bankName?.toLowerCase().includes('wf')) {
          return { ...item, currency: 'USD' };
        } else {
          return { ...item, currency: 'MXN' };
        }
      }
      return item;
    });
  });
  const [payments, setPayments] = useState<Payment[]>(() => loadSaved('payments', []));
  const [contacts, setContacts] = useState<Contact[]>(() => loadSaved('contacts', []));
  const [tasks, setTasks] = useState<Task[]>(() => loadSaved('tasks', []));
  const [activities, setActivities] = useState<Activity[]>(() => loadSaved('activities', []));
  
  const defaultTeamsList: Team[] = [
    { id: 1, name: 'Equipo Comercial / Ventas', description: 'Atención a prospectos, convenios y captación', color: '#6366f1', leaderId: 1 },
    { id: 2, name: 'Equipo Académico', description: 'Coordinación escolar, planes de estudio y seguimiento académico', color: '#0ea5e9', leaderId: 3 },
    { id: 3, name: 'Equipo de Finanzas & Cobranza', description: 'Control de pagos, facturación y estados de cuenta', color: '#10b981', leaderId: 2 },
    { id: 4, name: 'Equipo de Admisiones y Soporte', description: 'Trámites de nuevo ingreso, soporte general y atención técnica', color: '#f59e0b' }
  ];

  const [teams, setTeams] = useState<Team[]>(() => {
    const loaded = loadSaved<Team[]>('teams', defaultTeamsList);
    if (!loaded || loaded.length === 0) {
      return defaultTeamsList;
    }
    return loaded;
  });

  const [users, setUsers] = useState<User[]>(() => loadSaved('users', [
    { id: 1, name: 'Admin Principal', role: 'Superadministrador', email: 'admin@ihs.com', password: 'admin123', teamId: 1 },
    { id: 2, name: 'Director Financiero', role: 'Finanzas', email: 'finanzas@ihs.com', password: 'finanzas123', teamId: 3 },
    { id: 3, name: 'Coordinador Académico', role: 'Academia', email: 'academico@ihs.com', password: 'academico123', teamId: 2 },
    { id: 4, name: 'Usuario Alumno (Demo)', role: 'Alumno', email: 'alumno@ihs.com', studentId: 1, password: 'alumno123' },
    { id: 5, name: 'Coordinador Institución (Demo)', role: 'Coordinador', email: 'coordinador@ihs.com', institutionId: 1, password: 'coordinador123', teamId: 2 },
    { id: 6, name: 'Administrador (Google)', role: 'Superadministrador', email: 'wrhg1970@gmail.com', password: 'google123', teamId: 1 }
  ]));
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing currentUser", e);
      }
    }
    // Default to Superadministrador (Admin Principal) for seamless access in preview
    return { id: 1, name: 'Admin Principal', role: 'Superadministrador', email: 'admin@ihs.com', password: 'admin', teamId: 1 };
  });

  const [catalogs, setCatalogs] = useState<Record<CatalogTypes, CatalogItem[]>>(() => {
    const defaultCats = [
      { id: 'cat_gastos_operativos', name: 'Gastos Operativos', type: 'expense' },
      { id: 'cat_aportacion_socios', name: 'Aportacion Socios', type: 'income' },
      { id: 'cat_gastos_venta', name: 'Gastos Venta', type: 'expense' },
      { id: 'cat_gastos_administrativos', name: 'Gastos Administrativos', type: 'expense' },
      { id: 'cat_sueldos_salarios', name: 'Sueldos y salarios', type: 'expense' },
      { id: 'cat_bancos', name: 'Bancos', type: 'expense' },
      { id: 'cat_impuestos', name: 'Impuestos', type: 'expense' },
      { id: 'cat_activos', name: 'Activos', type: 'expense' },
      { id: 'cat_ingreso_servicios', name: 'Ingreso Servicios', type: 'income' },
      { id: 'cat_pago_servicios', name: 'Pago Servicios', type: 'expense' },
      { id: 'cat_reembolso', name: 'Reembolso', type: 'expense' }
    ];

    const defaultSubcats = [
      { id: 'sub_agua', name: 'Agua', parentId: 'cat_gastos_operativos' },
      { id: 'sub_internet_tel', name: 'Internet y telefonia', parentId: 'cat_gastos_operativos' },
      { id: 'sub_mantenimiento', name: 'Mantenimiento', parentId: 'cat_gastos_operativos' },
      { id: 'sub_renta', name: 'Renta', parentId: 'cat_gastos_operativos' },
      { id: 'sub_varios_op', name: 'Varios', parentId: 'cat_gastos_operativos' },
      { id: 'sub_aportacion', name: 'Aportacion', parentId: 'cat_aportacion_socios' },
      { id: 'sub_promocionales', name: 'Articulos Promocionales', parentId: 'cat_gastos_venta' },
      { id: 'sub_comisiones_rep', name: 'Comisiones Representantes', parentId: 'cat_gastos_venta' },
      { id: 'sub_comisiones_vend', name: 'Comisiones Vendedores', parentId: 'cat_gastos_venta' },
      { id: 'sub_representacion', name: 'Gastos representacion', parentId: 'cat_gastos_venta' },
      { id: 'sub_imprenta_broch', name: 'Imprenta y Brochures', parentId: 'cat_gastos_venta' },
      { id: 'sub_merca_redes', name: 'Mercadotecnia y Redes', parentId: 'cat_gastos_venta' },
      { id: 'sub_legales', name: 'Asesorias Legales', parentId: 'cat_gastos_administrativos' },
      { id: 'sub_contador', name: 'Contador', parentId: 'cat_gastos_administrativos' },
      { id: 'sub_mensajeria', name: 'Mensajeria', parentId: 'cat_gastos_administrativos' },
      { id: 'sub_merca_pub', name: 'Mercadotencia y Publicidad', parentId: 'cat_gastos_administrativos' },
      { id: 'sub_it', name: 'Servicios IT', parentId: 'cat_gastos_administrativos' },
      { id: 'sub_varios_admin', name: 'Varios', parentId: 'cat_gastos_administrativos' },
      { id: 'sub_bono', name: 'Bono', parentId: 'cat_sueldos_salarios' },
      { id: 'sub_comisiones_sueldo', name: 'Comisiones', parentId: 'cat_sueldos_salarios' },
      { id: 'sub_prestaciones', name: 'Prestaciones', parentId: 'cat_sueldos_salarios' },
      { id: 'sub_sueldo', name: 'Sueldo', parentId: 'cat_sueldos_salarios' },
      { id: 'sub_utilidad_socio', name: 'Utilidad socio', parentId: 'cat_sueldos_salarios' },
      { id: 'sub_comisiones_bancos', name: 'Comisiones', parentId: 'cat_bancos' },
      { id: 'sub_isr', name: 'ISR', parentId: 'cat_impuestos' },
      { id: 'sub_iva', name: 'IVA', parentId: 'cat_impuestos' },
      { id: 'sub_muebles', name: 'Muebles', parentId: 'cat_activos' },
      { id: 'sub_otros_ingreso', name: 'Otros', parentId: 'cat_ingreso_servicios' },
      { id: 'sub_polizas', name: 'Polizas', parentId: 'cat_ingreso_servicios' },
      { id: 'sub_membresia', name: 'Membresia', parentId: 'cat_ingreso_servicios' },
      { id: 'sub_cursos_ingreso', name: 'Cursos', parentId: 'cat_ingreso_servicios' },
      { id: 'sub_otros_pago', name: 'Otros', parentId: 'cat_pago_servicios' },
      { id: 'sub_cursos_pago', name: 'Cursos', parentId: 'cat_pago_servicios' },
      { id: 'sub_reembolso', name: 'Reembolso', parentId: 'cat_reembolso' }
    ];

    const fallback: Record<CatalogTypes, CatalogItem[]> = {
      'Tarifas Países': [
        { id: '1', name: 'México' },
        { id: '2', name: 'LATAM' },
        { id: '3', name: 'Colombia A' },
        { id: '4', name: 'Colombia B' },
        { id: '5', name: 'China' },
        { id: '6', name: 'Homeschool' }
      ],
      'Tipos de Institución': [
        { id: '1', name: 'Colegio Internacional' },
        { id: '2', name: 'Homeschool' }
      ],
      'Monedas': [
        { id: '1', name: 'MXN - Peso Mexicano' },
        { id: '2', name: 'USD - Dólar' },
        { id: '3', name: 'EUR - Euro' }
      ],
      'Roles de Usuario': [
        { id: '1', name: 'Superadministrador' },
        { id: '2', name: 'Director' },
        { id: '3', name: 'Finanzas' },
        { id: '4', name: 'Academia' },
        { id: '5', name: 'Ventas' }
      ],
      'Métodos de Pago': [
        { id: 'pay_1', name: 'Transferencia' },
        { id: 'pay_2', name: 'Tarjeta de Crédito' },
        { id: 'pay_3', name: 'Efectivo' }
      ],
      'Estados Académicos': [
        { id: '1', name: 'Activo' },
        { id: '2', name: 'Baja' },
        { id: '3', name: 'Egresado' },
        { id: '4', name: 'Suspendido' }
      ],
      'Categorías': defaultCats,
      'Subcategorías': defaultSubcats,
      'Membresías': [
        { id: 'memb_1', name: 'M-2000' },
        { id: 'memb_2', name: 'M-1000' },
        { id: 'memb_3', name: 'M-500' },
        { id: 'memb_4', name: 'Sin membresia' }
      ],
      'Cuentas bancarias': [
        { id: 'bank_1', name: 'Banorte PEM MXN', companyName: 'Programas Estudiantiles de Mexico', accountNumber: '0000000000', currency: 'MXN' },
        { id: 'bank_2', name: 'WellsFargo USD', companyName: 'International High School', accountNumber: '0000000000', currency: 'USD' }
      ],
      'Modalidades': [
        { id: 'mod_1', name: 'Dual' },
        { id: 'mod_2', name: 'APID' },
        { id: 'mod_3', name: 'Homeschool' },
        { id: 'mod_4', name: 'Transfer' },
        { id: 'mod_5', name: 'Complementaria' }
      ],
      'Tipo de Producto': [
        { id: 'prod_1', name: 'Clases', providerIds: [1, 2] },
        { id: 'prod_2', name: 'Math Exam Accreditation', providerIds: [2] },
        { id: 'prod_3', name: 'Certificación Ingles', providerIds: [3, 4] },
        { id: 'prod_4', name: 'University Admission', providerIds: [5] },
        { id: 'prod_5', name: 'Centro de Idiomas Digital', providerIds: [5] },
        { id: 'prod_6', name: 'Schmoop', providerIds: [6] },
        { id: 'prod_7', name: 'Community Service Accreditation', providerIds: [2] },
        { id: 'prod_8', name: 'iivvo', providerIds: [6] }
      ],
      'Fases y Alertas de Inactividad (SLA)': [
        // CRM y Prospectos
        { id: 'sla_1', name: 'Captación (Inicio)', description: 'Prospecto recién identificado - Etapa de Inicio (SLA 3 días)', slaDays: 3, module: 'crm', priority: 'alta', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard y Correo al Ejecutivo', isActive: true },
        { id: 'sla_2', name: 'Prospecto Calificado', description: 'Colegio que cumple perfil para el programa dual', slaDays: 5, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_3', name: 'Primer contacto', description: 'Contacto inicial por correo, teléfono o LinkedIn', slaDays: 3, module: 'crm', priority: 'alta', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard y Correo', isActive: true },
        { id: 'sla_4', name: 'Contacto establecido', description: 'Interés confirmado por el colegio, se solicita cita', slaDays: 4, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_5', name: 'Reunión agendada', description: 'Cita programada en Google Calendar con directivos', slaDays: 5, module: 'crm', priority: 'alta', responsibleRole: 'Dirección Comercial', actionOnAlert: 'Notificación de Calendario y Alerta', isActive: true },
        { id: 'sla_6', name: 'Presentación realizada', description: 'Demostración del programa académico y plan dual', slaDays: 3, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_7', name: 'Propuesta enviada', description: 'Cotización formal y propuesta académica enviada', slaDays: 10, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard y Recordatorio', isActive: true },
        { id: 'sla_8', name: 'Seguimiento', description: 'Llamadas periódicas para atender dudas de directores', slaDays: 7, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_9', name: 'Negociación', description: 'Ajustes de convenio y revisión legal de contratos', slaDays: 15, module: 'crm', priority: 'alta', responsibleRole: 'Dirección / Legal', actionOnAlert: 'Alerta Crítica y Notificación a Dirección', isActive: true },
        { id: 'sla_10', name: 'Convenio firmado', description: 'Convenio de Bachillerato Dual firmado oficialmente', slaDays: 5, module: 'crm', priority: 'alta', responsibleRole: 'Dirección General', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_11', name: 'Implementación', description: 'Capacitación docente e inducción a alumnos', slaDays: 30, module: 'crm', priority: 'media', responsibleRole: 'Operaciones', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_12', name: 'Cliente activo', description: 'Colegio operando de forma regular el plan dual', slaDays: null, module: 'crm', priority: 'baja', responsibleRole: 'Coordinación', actionOnAlert: 'Monitoreo Periódico', isActive: true },
        { id: 'sla_13', name: 'Perdido', description: 'Colegio descarta el programa o contrata competidor', slaDays: null, module: 'crm', priority: 'baja', responsibleRole: 'Ventas', actionOnAlert: 'Registro Histórico', isActive: true },
        { id: 'sla_14', name: 'Derivado a otra oficina', description: 'Colegio derivado o remitido a otra oficina regional', slaDays: null, module: 'crm', priority: 'baja', responsibleRole: 'Ventas', actionOnAlert: 'Transferencia Registrada', isActive: true },
        { id: 'sla_crm_inbound', name: 'Lead Inbound / Redes Sociales', description: 'Primer mensaje o formulario web de contacto recibido', slaDays: 1, module: 'crm', priority: 'alta', responsibleRole: 'Marketing / Ventas', actionOnAlert: 'Alerta Inmediata y Notificación WhatsApp', isActive: true },

        // Instituciones Socias
        { id: 'sla_inst_1', name: 'Validación Documentos Legales y Fiscales', description: 'Revisión y cotejo de Acta Constitutiva, CIF y Poder Notarial', slaDays: 5, module: 'instituciones', priority: 'media', responsibleRole: 'Administración / Legal', actionOnAlert: 'Alerta en Dashboard y Correo a Sede', isActive: true },
        { id: 'sla_inst_2', name: 'Revisión y Firma de Convenio Marco', description: 'Validación de firmas y envío de contraparte legal firmada', slaDays: 10, module: 'instituciones', priority: 'alta', responsibleRole: 'Dirección General', actionOnAlert: 'Alerta Crítica a Dirección', isActive: true },
        { id: 'sla_inst_3', name: 'Configuración de Campus y Sede Dual', description: 'Creación de campus en sistema, asignación de claves y accesos', slaDays: 4, module: 'instituciones', priority: 'media', responsibleRole: 'Soporte de Sistemas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_inst_4', name: 'Capacitación a Coordinadores de Sede', description: 'Sesión de onboarding y capacitación para el portal de sede', slaDays: 5, module: 'instituciones', priority: 'media', responsibleRole: 'Coordinación Académica', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_inst_5', name: 'Atención a Tickets y Consultas de Sede', description: 'Resolución de solicitudes técnicas, administrativas o de soporte', slaDays: 2, module: 'instituciones', priority: 'alta', responsibleRole: 'Atención a Sedes', actionOnAlert: 'Alerta Urgente por Correo y Dashboard', isActive: true },
        { id: 'sla_inst_6', name: 'Emisión y Cobro de Póliza Inicial / Factura', description: 'Generación de factura mensual o anual y envío de datos fiscales', slaDays: 3, module: 'instituciones', priority: 'alta', responsibleRole: 'Finanzas y Facturación', actionOnAlert: 'Alerta a Finanzas y Correo a Escuela', isActive: true },
        { id: 'sla_inst_7', name: 'Auditoría y Renovación Anual de Membresía', description: 'Revisión de metas de alumnos, renovación de licencia y actualización', slaDays: 15, module: 'instituciones', priority: 'media', responsibleRole: 'Dirección Comercial', actionOnAlert: 'Alerta en Dashboard', isActive: true },

        // Alumnos y Procesos Académicos
        { id: 'sla_alum_1', name: 'Inscripción y Alta en Plataforma', description: 'Registro completo de alumno, matrícula institucional y usuario', slaDays: 2, module: 'alumnos', priority: 'alta', responsibleRole: 'Admisiones', actionOnAlert: 'Alerta en Dashboard y Correo al Alumno', isActive: true },
        { id: 'sla_alum_2', name: 'Validación de Expediente y Kárdex', description: 'Cotejo de boletas previas, CURP/DNI y comprobante académico', slaDays: 4, module: 'alumnos', priority: 'media', responsibleRole: 'Control Escolar', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_alum_3', name: 'Aplicación y Calificación de Examen de Inglés', description: 'Evaluación diagnóstica de nivel de idioma y entrega de resultado', slaDays: 3, module: 'alumnos', priority: 'alta', responsibleRole: 'Departamento de Idiomas', actionOnAlert: 'Notificación de Calificación Lista', isActive: true },
        { id: 'sla_alum_4', name: 'Asignación de Grupo y Horario Académico', description: 'Asignación de grupo de Bachillerato Dual o programa Homeschool', slaDays: 3, module: 'alumnos', priority: 'media', responsibleRole: 'Coordinación Académica', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_alum_5', name: 'University Admission / Carta de Aceptación', description: 'Gestión de credenciales y carta oficial de admisión con universidad asociada', slaDays: 7, module: 'alumnos', priority: 'alta', responsibleRole: 'Consejería Universitaria', actionOnAlert: 'Alerta y Notificación a Padres/Alumno', isActive: true },
        { id: 'sla_alum_6', name: 'Emisión de Certificado Dual Americano', description: 'Revisión de créditos completos, validación con USA y emisión oficial', slaDays: 15, module: 'alumnos', priority: 'alta', responsibleRole: 'Registro y Certificaciones', actionOnAlert: 'Alerta de Estatus de Titulación', isActive: true },
        { id: 'sla_alum_7', name: 'Tramitación de Bajas o Cambios de Asignatura', description: 'Procesamiento de cambio de materia, horario o baja justificada', slaDays: 3, module: 'alumnos', priority: 'media', responsibleRole: 'Control Escolar', actionOnAlert: 'Alerta en Dashboard', isActive: true },
        { id: 'sla_alum_8', name: 'Entrega de Reporte Bimestral de Calificaciones', description: 'Cierre de ciclo, subida de notas y entrega de boleta bimestral', slaDays: 5, module: 'alumnos', priority: 'media', responsibleRole: 'Dirección Académica', actionOnAlert: 'Alerta a Coordinadores', isActive: true }
      ],
      'Categorías de Documentos': [
        { id: 'cat_doc_1', name: 'Contratos y Convenios', description: 'Contratos comerciales, convenios institucionales y acuerdos de confidencialidad' },
        { id: 'cat_doc_2', name: 'Propuestas Comerciales', description: 'Cotizaciones, propuestas de servicio y resúmenes ejecutivos' },
        { id: 'cat_doc_3', name: 'Acreditaciones y Licencias', description: 'Certificaciones, licencias operativas y acuerdos académicos' },
        { id: 'cat_doc_4', name: 'Documentación Legal y Fiscal', description: 'Acta constitutiva, RFC, poderes notariales e identificaciones' },
        { id: 'cat_doc_5', name: 'Comprobantes y Facturación', description: 'Fichas de pago, facturas y recibos de pólizas' },
        { id: 'cat_doc_6', name: 'Manuales y Políticas', description: 'Guías de onboarding, normativas y reglamentos' },
        { id: 'cat_doc_7', name: 'Otros Documentos', description: 'Documentos generales de soporte' }
      ],
      'Programas Homeschool': [
        { id: 'prog_1', name: 'Full High School', description: 'Programa completo de bachillerato internacional Homeschool' },
        { id: 'prog_2', name: 'Transfer', description: 'Transferencia o revalidación de materias cursadas' },
        { id: 'prog_3', name: 'Complementary', description: 'Materias complementarias al plan de estudios actual' },
        { id: 'prog_4', name: 'One year', description: 'Programa intensivo de un año académico' },
        { id: 'prog_5', name: 'Individual course', description: 'Cursos o materias individuales específicas' }
      ]
    };

    const saved = loadSaved<any>('catalogs', fallback);
    
    if (!saved['Programas Homeschool'] || saved['Programas Homeschool'].length === 0) {
      saved['Programas Homeschool'] = fallback['Programas Homeschool'];
    }

    if (!saved['Categorías de Documentos'] || saved['Categorías de Documentos'].length === 0) {
      saved['Categorías de Documentos'] = fallback['Categorías de Documentos'];
    }
    
    // Safety check to migrate/inject items even if they exist but have empty catalogs
    if (!saved['Categorías'] || saved['Categorías'].length === 0) {
      saved['Categorías'] = defaultCats;
    }
    if (!saved['Fases y Alertas de Inactividad (SLA)'] || saved['Fases y Alertas de Inactividad (SLA)'].length === 0) {
      saved['Fases y Alertas de Inactividad (SLA)'] = fallback['Fases y Alertas de Inactividad (SLA)'];
    } else {
      const slaList = saved['Fases y Alertas de Inactividad (SLA)'];
      // Ensure all existing items have a module assigned if missing
      slaList.forEach((s: any) => {
        if (!s.module) {
          const sName = (s.name || '').toLowerCase();
          if (sName.includes('convenio') || sName.includes('campus') || sName.includes('colegio') || sName.includes('sede') || sName.includes('factura') || sName.includes('instituc')) {
            s.module = 'instituciones';
          } else if (sName.includes('alumno') || sName.includes('inscrip') || sName.includes('inglés') || sName.includes('ingles') || sName.includes('kárdex') || sName.includes('kardex') || sName.includes('admision') || sName.includes('admisión')) {
            s.module = 'alumnos';
          } else {
            s.module = 'crm';
          }
        }
        if (!s.priority) s.priority = (s.slaDays && s.slaDays <= 3) ? 'alta' : 'media';
        if (s.isActive === undefined) s.isActive = true;
      });

      const hasInicio = slaList.some((s: any) => s.name.toLowerCase().includes('inicio') || s.name.toLowerCase().includes('captació'));
      if (!hasInicio) {
        if (slaList.length > 0 && (slaList[0].name === 'Lead' || slaList[0].id === 'sla_1')) {
          slaList[0].name = 'Captación (Inicio)';
          slaList[0].description = 'Prospecto recién identificado - Etapa de Inicio (SLA 3 días)';
          slaList[0].module = 'crm';
          slaList[0].priority = 'alta';
        } else {
          slaList.unshift({
            id: 'sla_1',
            name: 'Captación (Inicio)',
            description: 'Prospecto recién identificado - Etapa de Inicio (SLA 3 días)',
            slaDays: 3,
            module: 'crm',
            priority: 'alta',
            responsibleRole: 'Ventas',
            actionOnAlert: 'Alerta en Dashboard y Correo al Ejecutivo',
            isActive: true
          });
        }
      }

      // Merge missing Instituciones and Alumnos defaults if not present
      const fallbackList = fallback['Fases y Alertas de Inactividad (SLA)'];
      fallbackList.forEach((fbItem: any) => {
        const exists = slaList.some((s: any) => s.id === fbItem.id || s.name.toLowerCase() === fbItem.name.toLowerCase());
        if (!exists) {
          slaList.push(fbItem);
        }
      });
    }
    if (!saved['Tarifas Países'] || saved['Tarifas Países'].length === 0) {
      saved['Tarifas Países'] = fallback['Tarifas Países'];
    }
    if (!saved['Tipos de Institución'] || saved['Tipos de Institución'].length === 0) {
      saved['Tipos de Institución'] = fallback['Tipos de Institución'];
    }
    if (!saved['Roles de Usuario'] || saved['Roles de Usuario'].length === 0) {
      saved['Roles de Usuario'] = fallback['Roles de Usuario'];
    }
    if (!saved['Métodos de Pago'] || saved['Métodos de Pago'].length === 0) {
      saved['Métodos de Pago'] = fallback['Métodos de Pago'];
    }
    if (!saved['Membresías'] || saved['Membresías'].length === 0) {
      saved['Membresías'] = fallback['Membresías'];
    }
    if (!saved['Cuentas bancarias'] || saved['Cuentas bancarias'].length === 0) {
      saved['Cuentas bancarias'] = fallback['Cuentas bancarias'];
    } else {
      saved['Cuentas bancarias'] = saved['Cuentas bancarias'].map((item: any) => {
        if (!item.currency) {
          if (item.name?.toLowerCase().includes('wellsfargo') || item.name?.toLowerCase().includes('wells fargo') || item.name?.toLowerCase().includes('wf')) {
            return { ...item, currency: 'USD' };
          } else {
            return { ...item, currency: 'MXN' };
          }
        }
        return item;
      });
    }
    if (!saved['Subcategorías'] || saved['Subcategorías'].length === 0) {
      saved['Subcategorías'] = defaultSubcats;
    }
    if (!saved['Modalidades'] || saved['Modalidades'].length === 0) {
      saved['Modalidades'] = fallback['Modalidades'];
    }
    if (!saved['Tipo de Producto'] || saved['Tipo de Producto'].length === 0) {
      saved['Tipo de Producto'] = fallback['Tipo de Producto'];
    } else {
      // Ensure specific elements requested by the user are present in the stored Tipo de Producto array
      const currentNames = saved['Tipo de Producto'].map((item: any) => item.name);
      if (!currentNames.includes('University Admission')) {
        saved['Tipo de Producto'].push({ id: 'prod_4', name: 'University Admission', providerIds: [5] });
      }
      if (!currentNames.includes('iivvo')) {
        saved['Tipo de Producto'].push({ id: 'prod_8', name: 'iivvo', providerIds: [6] });
      }
    }
    return saved;
  });

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => loadSaved('companyInfo', {
    commercialName: 'Mi Empresa S.A.',
    legalName: 'Mi Empresa S.A. de C.V.',
    logoUrl: '',
    rfc: 'AAA010101AAA',
    baseCurrency: 'USD',
    timezone: 'America/Mexico_City',
    contactEmail: 'contacto@ejemplo.com',
    address: {
      street: 'Av. Reforma 123',
      neighborhood: 'Juárez',
      city: 'CDMX',
      state: 'CDMX',
      zipCode: '06600',
      country: 'México'
    },
    socialLinks: {
      website: 'www.ejemplo.com',
      instagram: '@ejemplo',
      facebook: '/ejemplo',
      linkedin: '/company/ejemplo',
      tiktok: '@ejemplo'
    }
  }));

  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>(() => loadSaved('companyDocuments', []));

  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>(() => loadSaved('financeCategories', [
    { id: 'cat_operativos', name: 'Operativos', type: 'expense', subcategories: ['Vuelos', 'Hoteles', 'Seguros'] },
    { id: 'cat_administrativos', name: 'Administrativos', type: 'expense', subcategories: ['Sueldos', 'Renta', 'Software'] },
    { id: 'cat_ventas', name: 'Ventas', type: 'income', subcategories: ['Paquetes', 'Vuelos Individuales', 'Comisiones'] }
  ]));

  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => {
    const defaultTransactions: FinancialTransaction[] = [
      {
        id: "tx-init-1",
        type: "income",
        date: "2026-01-12",
        description: "COLEGIO INTERNACIONAL - COLEGiaturas ENERO",
        amount: 45000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 45000,
        finalAmount: 45000,
        status: "Aplicado",
        categoryId: "cat_ingreso_servicios",
        subcategory: "sub_polizas",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-2",
        type: "expense",
        date: "2026-01-28",
        description: "NÓMINA PERSONAL DOCENTE Y ADMINISTRATIVO EX",
        amount: 25000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 25000,
        finalAmount: 25000,
        status: "Aplicado",
        categoryId: "cat_sueldos_salarios",
        subcategory: "sub_sueldo",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-3",
        type: "expense",
        date: "2026-01-30",
        description: "RENTA OFICINAS CENTRALES CORPORATIVAS",
        amount: 18000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 18000,
        finalAmount: 18000,
        status: "Aplicado",
        categoryId: "cat_gastos_operativos",
        subcategory: "sub_renta",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-4",
        type: "income",
        date: "2026-02-10",
        description: "HOMESCHOOL LATAM - INSCRIPCIONES FEBRERO",
        amount: 32000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 32000,
        finalAmount: 32000,
        status: "Aplicado",
        categoryId: "cat_ingreso_servicios",
        subcategory: "sub_membresia",
        paymentMethod: "Tarjeta de Crédito"
      },
      {
        id: "tx-init-5",
        type: "expense",
        date: "2026-02-25",
        description: "NÓMINA PERSONAL DOCENTE Y ADMINISTRATIVO",
        amount: 25000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 25000,
        finalAmount: 25000,
        status: "Aplicado",
        categoryId: "cat_sueldos_salarios",
        subcategory: "sub_sueldo",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-6",
        type: "expense",
        date: "2026-02-28",
        description: "RENTA OFICINAS CENTRALES CORPORATIVAS",
        amount: 18000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 18000,
        finalAmount: 18000,
        status: "Aplicado",
        categoryId: "cat_gastos_operativos",
        subcategory: "sub_renta",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-7",
        type: "income",
        date: "2026-03-05",
        description: "APORTACIÓN EXTRAORDINARIA - ASOCIADOS",
        amount: 60000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 60000,
        finalAmount: 60000,
        status: "Aplicado",
        categoryId: "cat_aportacion_socios",
        subcategory: "sub_aportacion",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-8",
        type: "income",
        date: "2026-03-15",
        description: "COLEGIO INTERNACIONAL - INGRESOS ACADEMICOS",
        amount: 51200,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 51200,
        finalAmount: 51200,
        status: "Aplicado",
        categoryId: "cat_ingreso_servicios",
        subcategory: "sub_polizas",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-9",
        type: "expense",
        date: "2026-03-25",
        description: "NÓMINA PERSONAL DOCENTE Y ADMINISTRATIVO",
        amount: 25000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 25000,
        finalAmount: 25000,
        status: "Aplicado",
        categoryId: "cat_sueldos_salarios",
        subcategory: "sub_sueldo",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-10",
        type: "expense",
        date: "2026-03-28",
        description: "RENTA OFICINAS CENTRALES CORPORATIVAS",
        amount: 18000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 18000,
        finalAmount: 18000,
        status: "Aplicado",
        categoryId: "cat_gastos_operativos",
        subcategory: "sub_renta",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-11",
        type: "income",
        date: "2026-04-10",
        description: "MENSUALIDADES DE MATRÍCULA - COLEGIO INTERNACIONAL",
        amount: 48000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 48000,
        finalAmount: 48000,
        status: "Aplicado",
        categoryId: "cat_ingreso_servicios",
        subcategory: "sub_polizas",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-12",
        type: "expense",
        date: "2026-04-25",
        description: "NÓMINA PERSONAL DOCENTE Y ADMINISTRATIVO",
        amount: 25000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 25000,
        finalAmount: 25000,
        status: "Aplicado",
        categoryId: "cat_sueldos_salarios",
        subcategory: "sub_sueldo",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-13",
        type: "expense",
        date: "2026-04-28",
        description: "RENTA OFICINAS CENTRALES CORPORATIVAS",
        amount: 18000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 18000,
        finalAmount: 18000,
        status: "Aplicado",
        categoryId: "cat_gastos_operativos",
        subcategory: "sub_renta",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-14",
        type: "income",
        date: "2026-05-15",
        description: "COLEGIO INTERNACIONAL - INGRESOS POR CERTIFICADOS INGLES",
        amount: 39000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 39000,
        finalAmount: 39000,
        status: "Aplicado",
        categoryId: "cat_ingreso_servicios",
        subcategory: "sub_membresia",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-15",
        type: "expense",
        date: "2026-05-25",
        description: "NÓMINA PERSONAL DOCENTE Y ADMINISTRATIVO",
        amount: 25000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 25000,
        finalAmount: 25000,
        status: "Aplicado",
        categoryId: "cat_sueldos_salarios",
        subcategory: "sub_sueldo",
        paymentMethod: "Transferencia"
      },
      {
        id: "tx-init-16",
        type: "expense",
        date: "2026-05-28",
        description: "RENTA OFICINAS CENTRALES CORPORATIVAS",
        amount: 18000,
        currency: "MXN",
        exchangeRate: 1.0,
        amountMXN: 18000,
        finalAmount: 18000,
        status: "Aplicado",
        categoryId: "cat_gastos_operativos",
        subcategory: "sub_renta",
        paymentMethod: "Transferencia"
      }
    ];
    return loadSaved('financialTransactions', defaultTransactions);
  });
  const [accountStatements, setAccountStatements] = useState<AccountStatement[]>(() => loadSaved('accountStatements', []));
  const [statementTransactions, setStatementTransactions] = useState<StatementTransaction[]>(() => loadSaved('statementTransactions', []));
  const [providerProductServices, setProviderProductServices] = useState<ProviderProductService[]>(() => {
    const loaded = loadSaved<ProviderProductService[]>('providerProductServices', []);
    if (!loaded || loaded.length === 0) {
      return [
        {
          id: 1,
          providerId: 1,
          productType: "Clases",
          name: "Historia Mundial Avanzada",
          countryPrices: [
            {
              country: "México",
              priceFullCredit: "500",
              priceHalfCredit: "250",
              priceFullApCredit: "600",
              priceHalfApCredit: "300",
              costFullCredit: "300",
              costHalfCredit: "150",
              costFullApCredit: "350",
              costHalfApCredit: "175"
            }
          ]
        },
        {
          id: 2,
          providerId: 1,
          productType: "Plataforma",
          name: "Pearson LMS Full Access",
          countryPrices: [
            {
              country: "México",
              priceFullCredit: "400",
              priceHalfCredit: "200",
              priceFullApCredit: "480",
              priceHalfApCredit: "240",
              costFullCredit: "240",
              costHalfCredit: "120",
              costFullApCredit: "280",
              costHalfApCredit: "140"
            }
          ]
        }
      ];
    }
    return loaded.map(service => {
      let updatedType = service.productType;
      if (service.productType === 'Clase') updatedType = 'Clases';
      if (service.productType === 'Certificación Inglés') updatedType = 'Certificación Ingles';
      return {
        ...service,
        productType: updatedType
      };
    });
  });
  const [providerSpecificProducts, setProviderSpecificProducts] = useState<ProviderSpecificProduct[]>(() => {
    const loaded = loadSaved<ProviderSpecificProduct[]>('providerSpecificProducts', []);
    if (!loaded || loaded.length === 0) {
      return [
        { id: 1, providerId: 1, name: "Historia Mundial Avanzada", productType: "Clases" },
        { id: 2, providerId: 1, name: "Pearson LMS Full Access", productType: "Plataforma" }
      ];
    }
    return loaded.map(p => {
      let updatedType = p.productType;
      if (p.productType === 'Clase') updatedType = 'Clases';
      if (p.productType === 'Certificación Inglés') updatedType = 'Certificación Ingles';
      return {
        ...p,
        productType: updatedType
      };
    });
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const loaded = loadSaved<AuditLog[]>('auditLogs', []);
    if (loaded && loaded.length > 0) return loaded;
    const now = new Date();
    const d1 = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
    const d2 = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    const d3 = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const d4 = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
    const d5 = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();

    return [
      {
        id: "log-audit-01",
        date: d1,
        userId: "admin-1",
        userName: "Administrador del Sistema",
        userEmail: "wrhg1970@gmail.com",
        userRole: "Superadministrador",
        actionType: "settings_change",
        severity: "alta",
        entityType: "institution",
        entityId: 1,
        entityName: "Colegio Internacional de México",
        description: "Modificación de parámetros institucionales: Habilitación de cobro de IVA al 16% y actualización de moneda preferente a USD.",
        fieldsChanged: [
          { fieldName: "Cobro con IVA (payWithIva)", oldValue: "Inactivo (false)", newValue: "Activo (true)" },
          { fieldName: "Moneda de Cobro", oldValue: "MXN", newValue: "USD" }
        ],
        ipAddress: "189.204.112.44"
      },
      {
        id: "log-audit-02",
        date: d2,
        userId: "admin-1",
        userName: "William Herrera",
        userEmail: "wrhg1970@gmail.com",
        userRole: "Superadministrador",
        actionType: "delete",
        severity: "critica",
        entityType: "student",
        entityId: 994,
        entityName: "Rodrigo Morales Garza",
        description: "Eliminación permanente de expediente del alumno: \"Rodrigo Morales Garza\" (Matrícula: LAT-2025-098) por solicitud administrativa de baja definitiva.",
        ipAddress: "189.204.112.44"
      },
      {
        id: "log-audit-03",
        date: d3,
        userId: "usr-4",
        userName: "Mariana Silva",
        userEmail: "mariana.silva@sistema.com",
        userRole: "Finanzas",
        actionType: "update",
        severity: "media",
        entityType: "payment",
        entityId: "pay-1044",
        entityName: "Pago #1044 - Colegio Británico",
        description: "Modificación de registro de pago ID: pay-1044. Monto actualizado y conciliado contra comprobante bancario SPEI.",
        fieldsChanged: [
          { fieldName: "Monto", oldValue: "$35,000.00 MXN", newValue: "$38,500.00 MXN" },
          { fieldName: "Estatus Conciliación", oldValue: "Pendiente", newValue: "Conciliado" }
        ],
        ipAddress: "201.168.45.12"
      },
      {
        id: "log-audit-04",
        date: d4,
        userId: "admin-1",
        userName: "Administrador del Sistema",
        userEmail: "wrhg1970@gmail.com",
        userRole: "Superadministrador",
        actionType: "backup",
        severity: "baja",
        entityType: "backup",
        entityId: "backup-drive-cfg",
        entityName: "Google Drive Cloud Backup",
        description: "Configuración y programación de respaldo automático semanal a Google Drive activada con éxito.",
        ipAddress: "189.204.112.44"
      },
      {
        id: "log-audit-05",
        date: d5,
        userId: "admin-1",
        userName: "William Herrera",
        userEmail: "wrhg1970@gmail.com",
        userRole: "Superadministrador",
        actionType: "settings_change",
        severity: "alta",
        entityType: "role",
        entityId: "roles-matrix",
        entityName: "Matriz de Permisos del Sistema",
        description: "Actualización de permisos del rol 'Finanzas' para permitir acceso a conciliación y bitácoras de auditoría.",
        ipAddress: "189.204.112.44"
      }
    ];
  });
  const [backups, setBackups] = useState<any[]>(() => loadSaved('app_backups', []));
  const [systemRoles, setSystemRoles] = useState<Role[]>(() => getSystemRoles());

  useEffect(() => { safeSetItem('app_backups', backups); }, [backups]);
  useEffect(() => { 
    safeSetItem('system_roles', systemRoles);
    setInMemorySystemRoles(systemRoles);
  }, [systemRoles]);

  useEffect(() => { safeSetItem('institutions', institutions); }, [institutions]);
  useEffect(() => { safeSetItem('students', students); }, [students]);
  useEffect(() => { safeSetItem('classes', classes); }, [classes]);
  useEffect(() => { safeSetItem('enrollments', enrollments); }, [enrollments]);
  useEffect(() => { safeSetItem('providers', providers); }, [providers]);
  useEffect(() => { safeSetItem('bankAccounts', bankAccounts); }, [bankAccounts]);
  useEffect(() => { safeSetItem('payments', payments); }, [payments]);
  useEffect(() => { safeSetItem('auditLogs', auditLogs); }, [auditLogs]);
  useEffect(() => { safeSetItem('contacts', contacts); }, [contacts]);
  useEffect(() => { safeSetItem('tasks', tasks); }, [tasks]);
  useEffect(() => { safeSetItem('activities', activities); }, [activities]);
  useEffect(() => { safeSetItem('teams', teams); }, [teams]);
  useEffect(() => { safeSetItem('users', users); }, [users]);
  useEffect(() => { safeSetItem('currentUser', currentUser); }, [currentUser]);
  useEffect(() => { safeSetItem('catalogs', catalogs); }, [catalogs]);
  useEffect(() => { safeSetItem('companyInfo', companyInfo); }, [companyInfo]);
  useEffect(() => { safeSetItem('companyDocuments', companyDocuments); }, [companyDocuments]);
  useEffect(() => { safeSetItem('financeCategories', financeCategories); }, [financeCategories]);
  useEffect(() => { safeSetItem('financialTransactions', financialTransactions); }, [financialTransactions]);
  useEffect(() => { safeSetItem('accountStatements', accountStatements); }, [accountStatements]);
  useEffect(() => { safeSetItem('statementTransactions', statementTransactions); }, [statementTransactions]);
  useEffect(() => { safeSetItem('providerProductServices', providerProductServices); }, [providerProductServices]);
  useEffect(() => { safeSetItem('providerSpecificProducts', providerSpecificProducts); }, [providerSpecificProducts]);

  const [firebaseSyncCompleted, setFirebaseSyncCompleted] = useState(false);
  const [syncErrors, setSyncErrors] = useState<Array<{ collection: string; error: string; time: string }>>([]);

  const [dbMetrics, setDbMetrics] = useState<DbMetrics>({
    readsTotal: 0,
    readsServer: 0,
    readsCached: 0,
    writesTotal: 0,
    writesBatched: 0,
    deletesTotal: 0,
    savesBypassed: 0,
    lastOperationTime: null,
    lastOperationType: null,
    lastOperationStatus: null,
    cacheEnabled: true,
    activeCollectionSyncs: {}
  });

  const resetDbMetrics = () => {
    setDbMetrics({
      readsTotal: 0,
      readsServer: 0,
      readsCached: 0,
      writesTotal: 0,
      writesBatched: 0,
      deletesTotal: 0,
      savesBypassed: 0,
      lastOperationTime: null,
      lastOperationType: null,
      lastOperationStatus: null,
      cacheEnabled: true,
      activeCollectionSyncs: {}
    });
  };

  // Utility function: Calculate the most recent past scheduled backup slot (e.g. Sunday 11:00 PM)
  const getMostRecentPastScheduledDate = (dayName: string, timeStr: string): Date => {
    const now = new Date();
    const [hour, minute] = timeStr.split(':').map(Number);
    
    // Day name to JS index (0 = Sunday, 1 = Monday, etc.)
    const dayIndices: Record<string, number> = {
      'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
    };
    const targetDayIndex = dayIndices[dayName] !== undefined ? dayIndices[dayName] : 0; // Default Domingo (Sunday)
    
    // Start searching backward from now
    const checkDate = new Date(now);
    checkDate.setHours(hour, minute, 0, 0);
    
    // If checkDate is in the future compared to now, go back to the target day of the previous week
    if (checkDate > now) {
      checkDate.setDate(checkDate.getDate() - 7);
    }
    
    // Find the exact day of the week going backwards
    while (checkDate.getDay() !== targetDayIndex) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return checkDate;
  };

  // Backup Scheduling State & Configuration
  const [backupSchedule, setBackupSchedule] = useState<BackupScheduleConfig>(() => {
    try {
      const saved = localStorage.getItem('system_backup_schedule_v2');
      if (saved) return { ...DEFAULT_BACKUP_SCHEDULE, ...JSON.parse(saved) };
      const rawEnabled = localStorage.getItem('auto_backup_enabled');
      const rawDay = localStorage.getItem('auto_backup_day');
      const rawTime = localStorage.getItem('auto_backup_time');
      if (rawEnabled !== null || rawDay !== null || rawTime !== null) {
        return {
          ...DEFAULT_BACKUP_SCHEDULE,
          enabled: rawEnabled !== null ? rawEnabled === 'true' : true,
          dayOfWeek: rawDay || 'Domingo',
          timeOfDay: rawTime || '23:00'
        };
      }
    } catch {}
    return DEFAULT_BACKUP_SCHEDULE;
  });

  const updateBackupSchedule = async (newConfig: Partial<BackupScheduleConfig>) => {
    let mergedConfig: BackupScheduleConfig = { ...backupSchedule, ...newConfig };
    setBackupSchedule(prev => {
      mergedConfig = { ...prev, ...newConfig };
      try {
        localStorage.setItem('system_backup_schedule_v2', JSON.stringify(mergedConfig));
        localStorage.setItem('auto_backup_enabled', String(mergedConfig.enabled));
        localStorage.setItem('auto_backup_day', mergedConfig.dayOfWeek);
        localStorage.setItem('auto_backup_time', mergedConfig.timeOfDay);
      } catch {}
      return mergedConfig;
    });

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'systemConfig', 'backup_schedule'), {
        ...mergedConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Could not sync backup schedule to Firestore:", err);
    }
  };

  // Execute full backup of all core records
  const triggerFullBackup = async (type: 'Automático' | 'Manual' = 'Manual', forceDriveUpload = false) => {
    try {
      let crmLeads: any[] = [];
      try {
        const savedLeads = localStorage.getItem('crm_leads_v1');
        if (savedLeads) crmLeads = JSON.parse(savedLeads);
      } catch {}

      const dataPayload = {
        users,
        institutions,
        students,
        classes,
        enrollments,
        providers,
        bankAccounts,
        payments,
        auditLogs: auditLogs.slice(0, 100), // restrict auditLogs size inside backups to avoid 1MB record crash
        contacts,
        tasks,
        activities,
        financialTransactions,
        providerProductServices,
        providerSpecificProducts,
        companyDocuments,
        financeCategories,
        accountStatements,
        statementTransactions,
        companyInfo,
        catalogs,
        systemRoles,
        crmLeads,
        backupMetadata: {
          version: "2.0",
          generatedAt: new Date().toISOString(),
          type,
          destination: forceDriveUpload ? "Google Drive" : (backupSchedule.destination || "Local / Nube")
        }
      };

      const backupId = 'backup_' + Date.now();
      const backupDate = new Date().toISOString();
      const payloadString = JSON.stringify(dataPayload, null, 2);
      const sizeBytes = new Blob([payloadString]).size;
      const sizeReadable = sizeBytes > 1024 * 1024
        ? (sizeBytes / (1024 * 1024)).toFixed(2) + " MB"
        : (sizeBytes / 1024).toFixed(1) + " KB";
      
      let totalRecords = 0;
      Object.entries(dataPayload).forEach(([key, val]) => {
        if (key === 'backupMetadata') return;
        if (Array.isArray(val)) {
          totalRecords += val.length;
        } else if (val && typeof val === 'object') {
          totalRecords += Object.keys(val).length * 4;
        }
      });

      let driveResult: any = null;
      let driveError: string | null = null;

      // Handle upload to Google Drive if requested or if configured as destination and token available
      const shouldUploadDrive = forceDriveUpload || (backupSchedule.enabled && backupSchedule.destination !== 'local_only' && isGoogleDriveTokenAvailable());

      if (shouldUploadDrive) {
        try {
          driveResult = await uploadBackupToGoogleDrive(dataPayload, {
            type,
            filename: `respaldo_ihs_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`
          });
          
          await updateBackupSchedule({
            lastBackupDate: backupDate,
            lastBackupStatus: 'success',
            lastBackupError: undefined,
            lastBackupFileName: driveResult.name,
            lastBackupSize: driveResult.size,
            lastBackupDriveLink: driveResult.webViewLink
          });
        } catch (err: any) {
          driveError = err.message || "Error al subir a Google Drive";
          console.error("Google Drive upload error:", err);
          await updateBackupSchedule({
            lastBackupDate: backupDate,
            lastBackupStatus: 'failed',
            lastBackupError: driveError
          });
          if (forceDriveUpload) {
            throw err;
          }
        }
      }

      // Automatically download file to browser if manual without drive or if local is requested
      const shouldDownloadLocal = (type === 'Manual' && !forceDriveUpload) || backupSchedule.destination === 'local_only' || backupSchedule.destination === 'cloud_and_local';

      if (shouldDownloadLocal) {
        try {
          const blob = new Blob([payloadString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `respaldo_sistema_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Browser download failed, falling back", e);
        }
      }

      const newBackup: any = {
        id: backupId,
        date: backupDate,
        type: driveResult ? `${type} (Google Drive)` : type,
        size: driveResult?.size || sizeReadable,
        records: totalRecords,
        driveFileId: driveResult?.id,
        driveLink: driveResult?.webViewLink,
        status: driveError ? 'Parcial' : 'Exitoso'
      };

      setBackups(prev => {
        const updated = [newBackup, ...prev];
        const maxRetained = backupSchedule.retentionCount || 10;
        return updated.slice(0, maxRetained);
      });
      
      localStorage.setItem('last_auto_backup_time', backupDate);
      
      addAuditLog({
        entityType: 'providerProductService',
        entityId: backupId,
        entityName: `Respaldo_Seguridad_${type}`,
        description: `Creado respaldo de seguridad (${type}) exitoso. ID: ${backupId}, tamaño: ${newBackup.size}, registros: ${totalRecords}.${driveResult ? ` Subido a Google Drive exitosamente.` : ''}`
      });

      return newBackup;
    } catch (e) {
      console.error("Error creating full backup:", e);
      throw e;
    }
  };

  const triggerGoogleDriveBackup = async (type: 'Automático' | 'Manual' = 'Manual') => {
    return await triggerFullBackup(type, true);
  };

  // Restore core database state from a backup payload
  const restoreBackup = (backup: any): boolean => {
    try {
      let d: any;
      if (backup && typeof backup === 'object' && backup.data) {
        d = JSON.parse(backup.data);
      } else {
        d = backup;
      }
      if (!d) throw new Error("Datos de respaldo corruptos o de formato incorrecto.");

      if (Array.isArray(d.users)) setUsers(d.users);
      if (Array.isArray(d.institutions)) setInstitutions(d.institutions);
      if (Array.isArray(d.students)) setStudents(d.students);
      if (Array.isArray(d.classes)) setClasses(d.classes);
      if (Array.isArray(d.enrollments)) setEnrollments(d.enrollments);
      if (Array.isArray(d.providers)) setProviders(d.providers);
      if (Array.isArray(d.bankAccounts)) setBankAccounts(d.bankAccounts);
      if (Array.isArray(d.payments)) setPayments(d.payments);
      if (Array.isArray(d.auditLogs)) setAuditLogs(d.auditLogs);
      if (Array.isArray(d.contacts)) setContacts(d.contacts);
      if (Array.isArray(d.tasks)) setTasks(d.tasks);
      if (Array.isArray(d.activities)) setActivities(d.activities);
      if (Array.isArray(d.financialTransactions)) setFinancialTransactions(d.financialTransactions);
      if (Array.isArray(d.providerProductServices)) setProviderProductServices(d.providerProductServices);
      if (Array.isArray(d.providerSpecificProducts)) setProviderSpecificProducts(d.providerSpecificProducts);
      if (Array.isArray(d.companyDocuments)) setCompanyDocuments(d.companyDocuments);
      if (Array.isArray(d.financeCategories)) setFinanceCategories(d.financeCategories);
      if (Array.isArray(d.accountStatements)) setAccountStatements(d.accountStatements);
      if (Array.isArray(d.statementTransactions)) setStatementTransactions(d.statementTransactions);
      if (Array.isArray(d.crmLeads)) {
        try {
          safeLocalStorageSet('crm_leads_v1', d.crmLeads);
        } catch {}
      }
      if (d.companyInfo) setCompanyInfo(d.companyInfo);
      if (d.catalogs) setCatalogs(d.catalogs);
      if (Array.isArray(d.systemRoles)) {
        setSystemRoles(d.systemRoles);
        setInMemorySystemRoles(d.systemRoles);
      }

      addAuditLog({
        entityType: 'providerProductService',
        entityId: backup.id || 'manual_' + Date.now(),
        entityName: `Restauracion_Respaldo`,
        description: `Restaurada copia de seguridad (${backup.type || 'Manual'}) exitosa.`
      });

      return true;
    } catch (e) {
      console.error("Error restoring backup:", e);
      throw e;
    }
  };

  const deleteBackup = (id: string) => {
    setBackups(prev => prev.filter(b => b.id !== id));
  };

  // Programmable background backup scheduler (Daily, Weekly, Biweekly, Monthly)
  useEffect(() => {
    if (!firebaseSyncCompleted) return;

    const runAutoBackupCheck = async () => {
      if (!backupSchedule.enabled) return;

      const now = new Date();
      const lastBackupStr = backupSchedule.lastBackupDate || localStorage.getItem('last_auto_backup_time');
      const lastBackupTime = lastBackupStr ? new Date(lastBackupStr).getTime() : 0;
      const hoursSinceLast = (now.getTime() - lastBackupTime) / (1000 * 60 * 60);

      let isDue = false;

      if (backupSchedule.frequency === 'daily') {
        const [schedHour] = (backupSchedule.timeOfDay || "02:00").split(':').map(Number);
        if (hoursSinceLast >= 20 && now.getHours() >= (schedHour || 0)) {
          isDue = true;
        }
      } else if (backupSchedule.frequency === 'weekly') {
        const mostRecentScheduledSlot = getMostRecentPastScheduledDate(backupSchedule.dayOfWeek || "Domingo", backupSchedule.timeOfDay || "23:00");
        if (!lastBackupStr || new Date(lastBackupStr) < mostRecentScheduledSlot) {
          isDue = true;
        }
      } else if (backupSchedule.frequency === 'biweekly') {
        if (hoursSinceLast >= (14 * 24 - 4)) {
          isDue = true;
        }
      } else if (backupSchedule.frequency === 'monthly') {
        if (hoursSinceLast >= (28 * 24)) {
          isDue = true;
        }
      }

      if (isDue) {
        console.log(`[AutoBackup] Ejecutando respaldo automático programado (${backupSchedule.frequency})`);
        try {
          const driveReady = isGoogleDriveTokenAvailable();
          await triggerFullBackup('Automático', driveReady && backupSchedule.destination !== 'local_only');
        } catch (err) {
          console.error("Error en respaldo automático programado:", err);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      runAutoBackupCheck().catch(err => console.error("Error en verificación de respaldo automático:", err));
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [firebaseSyncCompleted, backupSchedule]);

  // Initial Sync from Firestore with migration fallback to recover previous simulation data
  useEffect(() => {
    async function initFirestoreSync() {
      try {
        const { getDocs, collection, doc, setDoc } = await import('firebase/firestore');
        const { testFirebaseConnection } = await import('../lib/firebase');

        // Test database handshake
        try {
          await testFirebaseConnection();
        } catch (e) {
          console.warn("Handshake/test connection failed:", e);
          const errMsg = e instanceof Error ? e.message : String(e);
          if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('resource-exhausted')) {
            if (typeof window !== 'undefined') {
              (window as any).__firestore_quota_exceeded__ = true;
              window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
            }
            setFirebaseSyncCompleted(true);
            return;
          }
        }

        // Sub-function to safely query or back up a collection
        const syncCollection = async <T extends { id: string | number }>(
          collectionName: string,
          localList: T[],
          setter: (val: T[]) => void
        ) => {
          if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
            return;
          }
          setDbMetrics(prev => ({
            ...prev,
            activeCollectionSyncs: {
              ...prev.activeCollectionSyncs,
              [collectionName]: { docCount: 0, status: 'syncing', lastSynced: new Date().toLocaleTimeString() }
            }
          }));
          try {
            const snap = await getDocs(collection(db, collectionName));
            const count = snap.size;
            const fromCache = snap.metadata.fromCache;

            setDbMetrics(prev => ({
              ...prev,
              readsTotal: prev.readsTotal + count,
              readsCached: prev.readsCached + (fromCache ? count : 0),
              readsServer: prev.readsServer + (fromCache ? 0 : count),
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'READ',
              lastOperationStatus: 'SUCCESS',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                [collectionName]: { docCount: count, status: 'synced', lastSynced: new Date().toLocaleTimeString() }
              }
            }));

            if (!snap.empty) {
              const remoteList: T[] = [];
              snap.forEach(d => {
                remoteList.push({ ...d.data() } as T);
              });
              setter(remoteList);
            } else if (localList.length > 0) {
              // Upload local simulation data to Firestore using atomic writeBatch (max 500 documents per batch)
              const { writeBatch } = await import('firebase/firestore');
              let batch = writeBatch(db);
              let batchCount = 0;
              for (const item of localList) {
                batch.set(doc(db, collectionName, String(item.id)), cleanForFirestore(item));
                batchCount++;
                if (batchCount === 500) {
                  await batch.commit();
                  batch = writeBatch(db);
                  batchCount = 0;
                }
              }
              if (batchCount > 0) {
                await batch.commit();
              }
              setDbMetrics(prev => ({
                ...prev,
                writesTotal: prev.writesTotal + localList.length,
                writesBatched: prev.writesBatched + Math.ceil(localList.length / 500),
                lastOperationTime: new Date().toLocaleTimeString(),
                lastOperationType: 'WRITE',
                lastOperationStatus: 'SUCCESS'
              }));
            }
          } catch (e) {
            console.error(`Error syncing collection ${collectionName}:`, e);
            const errMsg = e instanceof Error ? e.message : String(e);
            setDbMetrics(prev => ({
              ...prev,
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'READ',
              lastOperationStatus: 'ERROR',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                [collectionName]: { docCount: 0, status: 'error', lastSynced: new Date().toLocaleTimeString() }
              }
            }));
            if (
              errMsg.toLowerCase().includes('quota') || 
              errMsg.toLowerCase().includes('exhausted') || 
              errMsg.toLowerCase().includes('resource-exhausted') ||
              errMsg.toLowerCase().includes('limit exceeded')
            ) {
              if (typeof window !== 'undefined') {
                (window as any).__firestore_quota_exceeded__ = true;
                window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
              }
              return;
            }
            setSyncErrors(prev => [
              ...prev,
              { collection: collectionName, error: errMsg, time: new Date().toLocaleTimeString() }
            ]);
          }
        };

        // Sync main & extended collections concurrently (Parallel loading optimization)
        await Promise.all([
          syncCollection('users', users, setUsers),
          syncCollection('institutions', institutions, setInstitutions),
          syncCollection('students', students, setStudents),
          syncCollection('classes', classes, setClasses),
          syncCollection('enrollments', enrollments, (remoteEnrollments) => {
            if (Array.isArray(remoteEnrollments)) {
              setEnrollments(remoteEnrollments.map(e => ({
                ...e,
                status: calculateEnrollmentStatus(e)
              })));
            }
          }),
          syncCollection('providers', providers, setProviders),
          syncCollection('bankAccounts', bankAccounts, setBankAccounts),
          syncCollection('payments', payments, setPayments),
          syncCollection('auditLogs', auditLogs, setAuditLogs),
          syncCollection('contacts', contacts, setContacts),
          syncCollection('tasks', tasks, setTasks),
          syncCollection('activities', activities, setActivities),
          syncCollection('financialTransactions', financialTransactions, setFinancialTransactions),
          syncCollection('providerProductServices', providerProductServices, setProviderProductServices),
          syncCollection('providerSpecificProducts', providerSpecificProducts, setProviderSpecificProducts),
          syncCollection('companyDocuments', companyDocuments, setCompanyDocuments),
          syncCollection('financeCategories', financeCategories, setFinanceCategories),
          syncCollection('accountStatements', accountStatements, setAccountStatements),
          syncCollection('statementTransactions', statementTransactions, setStatementTransactions),
          syncCollection('app_backups', backups, setBackups),
          syncCollection('system_roles', systemRoles, (remoteRoles) => {
            if (Array.isArray(remoteRoles) && remoteRoles.length > 0) {
              setSystemRoles(remoteRoles as Role[]);
              setInMemorySystemRoles(remoteRoles as Role[]);
            }
          })
        ]);

        // Sync catalogs configuration to the cloud concurrently
        const syncCatalogs = async () => {
          if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
            return;
          }
          setDbMetrics(prev => ({
            ...prev,
            activeCollectionSyncs: {
              ...prev.activeCollectionSyncs,
              catalogs: { docCount: 0, status: 'syncing', lastSynced: new Date().toLocaleTimeString() }
            }
          }));
          try {
            const snap = await getDocs(collection(db, 'catalogs'));
            const count = snap.size;
            const fromCache = snap.metadata.fromCache;

            setDbMetrics(prev => ({
              ...prev,
              readsTotal: prev.readsTotal + count,
              readsCached: prev.readsCached + (fromCache ? count : 0),
              readsServer: prev.readsServer + (fromCache ? 0 : count),
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'READ',
              lastOperationStatus: 'SUCCESS',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                catalogs: { docCount: count, status: 'synced', lastSynced: new Date().toLocaleTimeString() }
              }
            }));

            if (!snap.empty) {
              const remoteCatalogs = { ...catalogs };
              snap.forEach(d => {
                const key = d.id as CatalogTypes;
                const data = d.data() as { items?: CatalogItem[] };
                if (data && Array.isArray(data.items)) {
                  remoteCatalogs[key] = data.items;
                }
              });
              setCatalogs(remoteCatalogs);
            } else {
              const { writeBatch } = await import('firebase/firestore');
              const batch = writeBatch(db);
              const keys = Object.keys(catalogs);
              for (const [key, items] of Object.entries(catalogs)) {
                batch.set(doc(db, 'catalogs', key), { items: cleanForFirestore(items) });
              }
              await batch.commit();
              setDbMetrics(prev => ({
                ...prev,
                writesTotal: prev.writesTotal + keys.length,
                writesBatched: prev.writesBatched + 1,
                lastOperationTime: new Date().toLocaleTimeString(),
                lastOperationType: 'WRITE',
                lastOperationStatus: 'SUCCESS'
              }));
            }
          } catch (catErr) {
            console.error("Error syncing catalogs:", catErr);
            const errMsg = catErr instanceof Error ? catErr.message : String(catErr);
            setDbMetrics(prev => ({
              ...prev,
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'READ',
              lastOperationStatus: 'ERROR',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                catalogs: { docCount: 0, status: 'error', lastSynced: new Date().toLocaleTimeString() }
              }
            }));
            if (
              errMsg.toLowerCase().includes('quota') || 
              errMsg.toLowerCase().includes('exhausted') || 
              errMsg.toLowerCase().includes('resource-exhausted') ||
              errMsg.toLowerCase().includes('limit exceeded')
            ) {
              if (typeof window !== 'undefined') {
                (window as any).__firestore_quota_exceeded__ = true;
                window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
              }
              return;
            }
            setSyncErrors(prev => [
              ...prev,
              { collection: 'catalogs', error: errMsg, time: new Date().toLocaleTimeString() }
            ]);
          }
        };

        // Sync company information schema to the cloud concurrently
        const syncCompanyInfo = async () => {
          if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
            return;
          }
          setDbMetrics(prev => ({
            ...prev,
            activeCollectionSyncs: {
              ...prev.activeCollectionSyncs,
              companyInfo: { docCount: 0, status: 'syncing', lastSynced: new Date().toLocaleTimeString() }
            }
          }));
          try {
            const { getDoc } = await import('firebase/firestore');
            const dRef = doc(db, 'companyInfo', 'main');
            const d = await getDoc(dRef);
            const fromCache = d.metadata.fromCache;

            setDbMetrics(prev => ({
              ...prev,
              readsTotal: prev.readsTotal + 1,
              readsCached: prev.readsCached + (fromCache ? 1 : 0),
              readsServer: prev.readsServer + (fromCache ? 0 : 1),
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'READ',
              lastOperationStatus: 'SUCCESS',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                companyInfo: { docCount: 1, status: 'synced', lastSynced: new Date().toLocaleTimeString() }
              }
            }));

            if (d.exists()) {
              setCompanyInfo(d.data() as CompanyInfo);
            } else {
              await setDoc(dRef, cleanForFirestore(companyInfo));
              setDbMetrics(prev => ({
                ...prev,
                writesTotal: prev.writesTotal + 1,
                lastOperationTime: new Date().toLocaleTimeString(),
                lastOperationType: 'WRITE',
                lastOperationStatus: 'SUCCESS'
              }));
            }
          } catch (compErr) {
            console.error("Error syncing companyInfo:", compErr);
            const errMsg = compErr instanceof Error ? compErr.message : String(compErr);
            setDbMetrics(prev => ({
              ...prev,
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'READ',
              lastOperationStatus: 'ERROR',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                companyInfo: { docCount: 0, status: 'error', lastSynced: new Date().toLocaleTimeString() }
              }
            }));
            if (
              errMsg.toLowerCase().includes('quota') || 
              errMsg.toLowerCase().includes('exhausted') || 
              errMsg.toLowerCase().includes('resource-exhausted') ||
              errMsg.toLowerCase().includes('limit exceeded')
            ) {
              if (typeof window !== 'undefined') {
                (window as any).__firestore_quota_exceeded__ = true;
                window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
              }
              return;
            }
            setSyncErrors(prev => [
              ...prev,
              { collection: 'companyInfo', error: errMsg, time: new Date().toLocaleTimeString() }
            ]);
            try {
              handleFirestoreError(compErr, OperationType.WRITE, 'companyInfo/main');
            } catch (jsonErr) {
              console.warn("Company info initial sync error handled:", jsonErr);
            }
          }
        };

        await Promise.all([syncCatalogs(), syncCompanyInfo()]);

        setFirebaseSyncCompleted(true);
        console.log("Firebase Database initial sync completed successfully in parallel.");
      } catch (err) {
        console.error("Firebase initial synchronization failed:", err);
        setFirebaseSyncCompleted(true);
      }
    }

    initFirestoreSync();
  }, []);

  // Track previous catalogs and companyInfo to prevent redundant/unnecessary cloud writes (optimized sync)
  const prevCatalogsRef = useRef<Record<CatalogTypes, CatalogItem[]>>(catalogs);
  const prevCompanyInfoRef = useRef<CompanyInfo>(companyInfo);

  // Synchronize dynamic catalogs modifications back to cloud (only write keys that actually changed)
  useEffect(() => {
    if (!firebaseSyncCompleted) {
      prevCatalogsRef.current = catalogs;
      return;
    }
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
      prevCatalogsRef.current = catalogs;
      return;
    }
    
    const timer = setTimeout(() => {
      import('firebase/firestore').then(async ({ doc, setDoc }) => {
        let changedCount = 0;
        let bypassedCount = 0;
        for (const [key, items] of Object.entries(catalogs)) {
          const prevItems = prevCatalogsRef.current[key as CatalogTypes];
          if (!prevItems || JSON.stringify(prevItems) !== JSON.stringify(items)) {
            console.log(`[Firestore Optimization] Only saving changed catalog: ${key}`);
            changedCount++;
            await setDoc(doc(db, 'catalogs', key), { items: cleanForFirestore(items) }).catch(err => {
              console.error(`Error saving catalog ${key}:`, err);
            });
          } else {
            bypassedCount++;
          }
        }
        if (changedCount > 0) {
          setDbMetrics(prev => ({
            ...prev,
            writesTotal: prev.writesTotal + changedCount,
            savesBypassed: prev.savesBypassed + bypassedCount,
            lastOperationTime: new Date().toLocaleTimeString(),
            lastOperationType: 'WRITE',
            lastOperationStatus: 'SUCCESS'
          }));
        } else if (bypassedCount > 0) {
          setDbMetrics(prev => ({
            ...prev,
            savesBypassed: prev.savesBypassed + bypassedCount
          }));
        }
        prevCatalogsRef.current = catalogs;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [catalogs, firebaseSyncCompleted]);

  // Synchronize companyInfo updates back to cloud (only when contents actually change)
  useEffect(() => {
    if (!firebaseSyncCompleted) {
      prevCompanyInfoRef.current = companyInfo;
      return;
    }
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
      prevCompanyInfoRef.current = companyInfo;
      return;
    }

    const timer = setTimeout(() => {
      if (JSON.stringify(prevCompanyInfoRef.current) === JSON.stringify(companyInfo)) {
        setDbMetrics(prev => ({
          ...prev,
          savesBypassed: prev.savesBypassed + 1
        }));
        return;
      }
      import('firebase/firestore').then(async ({ doc, setDoc }) => {
        console.log(`[Firestore Optimization] Saving companyInfo updates`);
        await setDoc(doc(db, 'companyInfo', 'main'), cleanForFirestore(companyInfo)).catch(err => {
          console.error("Error saving companyInfo:", err);
          try {
            handleFirestoreError(err, OperationType.WRITE, 'companyInfo/main');
          } catch (e) {
            console.warn("Handled companyInfo write error:", e);
          }
        });
        setDbMetrics(prev => ({
          ...prev,
          writesTotal: prev.writesTotal + 1,
          lastOperationTime: new Date().toLocaleTimeString(),
          lastOperationType: 'WRITE',
          lastOperationStatus: 'SUCCESS'
        }));
        prevCompanyInfoRef.current = companyInfo;
      }).catch(err => {
        console.warn("CompanyInfo async import/sync error handled:", err);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [companyInfo, firebaseSyncCompleted]);

  // En finanzas, actualiza la moneda de la cuenta de Wellsfargo con su moneda correcta (USD)
  useEffect(() => {
    if (!firebaseSyncCompleted) return;
    const hasWellsFargoIncorrect = bankAccounts.some(item => {
      const isWF = item.bankName?.toLowerCase().includes('wellsfargo') ||
                   item.bankName?.toLowerCase().includes('wells fargo') ||
                   item.bankName?.toLowerCase().includes('wf');
      return isWF && item.currency !== 'USD';
    });
    
    if (hasWellsFargoIncorrect) {
      setBankAccounts(prev => prev.map(item => {
        const isWF = item.bankName?.toLowerCase().includes('wellsfargo') ||
                     item.bankName?.toLowerCase().includes('wells fargo') ||
                     item.bankName?.toLowerCase().includes('wf');
        if (isWF) {
          return { ...item, currency: 'USD' };
        }
        return item;
      }));
    }
  }, [bankAccounts, firebaseSyncCompleted]);

  // En finanzas, actualiza la moneda de la cuenta de Wellsfargo con su moneda correcta (USD) en Cuentas Bancarias del catálogo
  useEffect(() => {
    if (!firebaseSyncCompleted) return;
    const hasCatalogWFIncorrect = catalogs['Cuentas bancarias']?.some((item: any) => {
      const isWF = item.name?.toLowerCase().includes('wellsfargo') ||
                   item.name?.toLowerCase().includes('wells fargo') ||
                   item.name?.toLowerCase().includes('wf');
      return isWF && item.currency !== 'USD';
    });

    if (hasCatalogWFIncorrect) {
      setCatalogs(prev => {
        const updatedItems = (prev['Cuentas bancarias'] || []).map((item: any) => {
          const isWF = item.name?.toLowerCase().includes('wellsfargo') ||
                       item.name?.toLowerCase().includes('wells fargo') ||
                       item.name?.toLowerCase().includes('wf');
          if (isWF) {
            return { ...item, currency: 'USD' };
          }
          return item;
        });
        return {
          ...prev,
          'Cuentas bancarias': updatedItems
        };
      });
    }
  }, [catalogs, firebaseSyncCompleted]);

  // Helper hook for incremental, optimized Firestore writes (only updates changed / deleted files)
  const useIncrementalFirebaseSync = <T extends { id: string | number }>(
    list: T[],
    collectionName: string
  ) => {
    const prevRef = useRef<T[]>(list);

    useEffect(() => {
      if (!firebaseSyncCompleted) {
        prevRef.current = list;
        return;
      }

      if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
        prevRef.current = list;
        return;
      }

      const addedOrUpdated = list.filter(item => {
        const prev = prevRef.current.find(p => p.id === item.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(item);
      });

      const deleted = prevRef.current.filter(prev => !list.some(item => item.id === prev.id));

      if (addedOrUpdated.length > 0 || deleted.length > 0) {
        import('firebase/firestore').then(async ({ doc, writeBatch }) => {
          try {
            // Process additions and updates in chunks of 500 (Firestore writeBatch limit)
            const allItemsToSave = [...addedOrUpdated];
            let writeCount = 0;
            let writeBatchesCount = 0;
            while (allItemsToSave.length > 0) {
              const chunk = allItemsToSave.splice(0, 500);
              const batch = writeBatch(db);
              chunk.forEach(item => {
                batch.set(doc(db, collectionName, String(item.id)), cleanForFirestore(item));
              });
              await batch.commit();
              writeCount += chunk.length;
              writeBatchesCount++;
              console.log(`[Firestore Optimization] Committed batch insert/update of ${chunk.length} items in ${collectionName}`);
            }

            // Process deletions in chunks of 500
            const allItemsToDelete = [...deleted];
            let deleteCount = 0;
            while (allItemsToDelete.length > 0) {
              const chunk = allItemsToDelete.splice(0, 500);
              const batch = writeBatch(db);
              chunk.forEach(item => {
                batch.delete(doc(db, collectionName, String(item.id)));
              });
              await batch.commit();
              deleteCount += chunk.length;
              writeBatchesCount++;
              console.log(`[Firestore Optimization] Committed batch delete of ${chunk.length} items in ${collectionName}`);
            }

            setDbMetrics(prev => ({
              ...prev,
              writesTotal: prev.writesTotal + writeCount,
              deletesTotal: prev.deletesTotal + deleteCount,
              writesBatched: prev.writesBatched + writeBatchesCount,
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: writeCount > 0 ? 'WRITE' : 'DELETE',
              lastOperationStatus: 'SUCCESS',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                [collectionName]: { docCount: (prev.activeCollectionSyncs[collectionName]?.docCount || 0) + writeCount - deleteCount, status: 'synced', lastSynced: new Date().toLocaleTimeString() }
              }
            }));
          } catch (err) {
            console.error(`[Firestore Batch Sync Error] in collection ${collectionName}:`, err);
            const errMsg = err instanceof Error ? err.message : String(err);
            setDbMetrics(prev => ({
              ...prev,
              lastOperationTime: new Date().toLocaleTimeString(),
              lastOperationType: 'WRITE',
              lastOperationStatus: 'ERROR',
              activeCollectionSyncs: {
                ...prev.activeCollectionSyncs,
                [collectionName]: { ...prev.activeCollectionSyncs[collectionName], status: 'error', lastSynced: new Date().toLocaleTimeString() }
              }
            }));
            if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('resource-exhausted')) {
              if (typeof window !== 'undefined') {
                (window as any).__firestore_quota_exceeded__ = true;
                window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
              }
            } else {
              try {
                handleFirestoreError(err, OperationType.WRITE, `${collectionName}/batch`);
              } catch (e) {
                console.warn(`[Firestore Batch Sync Error Handled] in ${collectionName}:`, e);
              }
            }
          }
        }).catch(err => {
          console.warn(`[Firestore Batch Sync Promise Error Handled] in ${collectionName}:`, err);
        });
      } else {
        setDbMetrics(prev => ({
          ...prev,
          savesBypassed: prev.savesBypassed + 1
        }));
      }

      prevRef.current = list;
    }, [list, firebaseSyncCompleted, collectionName]);
  };

  // Instantiate sync hooks for all lists
  useIncrementalFirebaseSync(users, 'users');
  useIncrementalFirebaseSync(institutions, 'institutions');
  useIncrementalFirebaseSync(students, 'students');
  useIncrementalFirebaseSync(classes, 'classes');
  useIncrementalFirebaseSync(enrollments, 'enrollments');
  useIncrementalFirebaseSync(providers, 'providers');
  useIncrementalFirebaseSync(bankAccounts, 'bankAccounts');
  useIncrementalFirebaseSync(payments, 'payments');
  useIncrementalFirebaseSync(auditLogs, 'auditLogs');
  useIncrementalFirebaseSync(contacts, 'contacts');
  useIncrementalFirebaseSync(tasks, 'tasks');
  useIncrementalFirebaseSync(activities, 'activities');
  useIncrementalFirebaseSync(financialTransactions, 'financialTransactions');
  useIncrementalFirebaseSync(providerProductServices, 'providerProductServices');
  useIncrementalFirebaseSync(providerSpecificProducts, 'providerSpecificProducts');
  useIncrementalFirebaseSync(companyDocuments, 'companyDocuments');
  useIncrementalFirebaseSync(financeCategories, 'financeCategories');
  useIncrementalFirebaseSync(accountStatements, 'accountStatements');
  useIncrementalFirebaseSync(statementTransactions, 'statementTransactions');
  useIncrementalFirebaseSync(backups, 'app_backups');
  useIncrementalFirebaseSync(systemRoles, 'system_roles');

  // Sync / Deduplicate students on initial app load once
  useEffect(() => {
    try {
      const storedStudentsRaw = localStorage.getItem('students');
      if (!storedStudentsRaw) return;
      const parsedStudents = JSON.parse(storedStudentsRaw) as Student[];
      if (!Array.isArray(parsedStudents) || parsedStudents.length === 0) return;

      const uniqueStudents: Student[] = [];
      const mergedMap = new Map<number, number>(); // secondaryId -> primaryId
      let hasChanges = false;

      parsedStudents.forEach((student) => {
        if (!student || !student.name) return;
        const normName = student.name.trim().toLowerCase();
        const normLastName = (student.lastName || '').trim().toLowerCase();
        const normEmail = (student.email || '').trim().toLowerCase();

        // Find if this student is already in uniqueStudents
        const existing = uniqueStudents.find((s) => {
          const sName = s.name.trim().toLowerCase();
          const sLastName = (s.lastName || '').trim().toLowerCase();
          const sEmail = (s.email || '').trim().toLowerCase();

          // Match by name or by same email address (if provided)
          const nameMatch = normName === sName && normLastName === sLastName;
          const emailMatch = normEmail && sEmail && normEmail === sEmail;

          return nameMatch || emailMatch;
        });

        if (existing) {
          // It's a duplicate! Keep the existing/first one as primary
          mergedMap.set(student.id, existing.id);
          hasChanges = true;

          // Merge fields from duplicate to existing (keep the most complete data)
          let mergedFieldsUpdated = false;
          const updatedFields: Partial<Student> = {};
          
          if (!existing.lastName && student.lastName) { updatedFields.lastName = student.lastName; mergedFieldsUpdated = true; }
          if (!existing.email && student.email) { updatedFields.email = student.email; mergedFieldsUpdated = true; }
          if (!existing.phone && student.phone) { updatedFields.phone = student.phone; mergedFieldsUpdated = true; }
          if (!existing.birthDate && student.birthDate) { updatedFields.birthDate = student.birthDate; mergedFieldsUpdated = true; }
          if (!existing.nationality && student.nationality) { updatedFields.nationality = student.nationality; mergedFieldsUpdated = true; }
          if (!existing.passport && student.passport) { updatedFields.passport = student.passport; mergedFieldsUpdated = true; }
          if (!existing.address && student.address) { updatedFields.address = student.address; mergedFieldsUpdated = true; }
          if (!existing.city && student.city) { updatedFields.city = student.city; mergedFieldsUpdated = true; }
          if (!existing.state && student.state) { updatedFields.state = student.state; mergedFieldsUpdated = true; }
          if (!existing.zipCode && student.zipCode) { updatedFields.zipCode = student.zipCode; mergedFieldsUpdated = true; }
          if (!existing.country && student.country) { updatedFields.country = student.country; mergedFieldsUpdated = true; }
          if (!existing.parentName && student.parentName) { updatedFields.parentName = student.parentName; mergedFieldsUpdated = true; }
          if (!existing.parentLastName && student.parentLastName) { updatedFields.parentLastName = student.parentLastName; mergedFieldsUpdated = true; }
          if (!existing.parentEmail && student.parentEmail) { updatedFields.parentEmail = student.parentEmail; mergedFieldsUpdated = true; }
          if (!existing.parentPhone && student.parentPhone) { updatedFields.parentPhone = student.parentPhone; mergedFieldsUpdated = true; }
          if (!existing.parentRelation && student.parentRelation) { updatedFields.parentRelation = student.parentRelation; mergedFieldsUpdated = true; }
          if (!existing.studentCustomId && student.studentCustomId) { updatedFields.studentCustomId = student.studentCustomId; mergedFieldsUpdated = true; }
          if (!existing.modality && student.modality) { updatedFields.modality = student.modality; mergedFieldsUpdated = true; }
          if (!existing.schoolYear && student.schoolYear) { updatedFields.schoolYear = student.schoolYear; mergedFieldsUpdated = true; }

          if (mergedFieldsUpdated) {
            Object.assign(existing, updatedFields);
          }
        } else {
          uniqueStudents.push({ ...student });
        }
      });

      if (hasChanges && mergedMap.size > 0) {
        console.log("Deduplicating students on initial load. Merged count:", mergedMap.size);

        // 1. Update students
        safeSetItem('students', uniqueStudents);
        setStudents(uniqueStudents);

        // 2. Update enrollments
        const storedEnrollments = localStorage.getItem('enrollments');
        if (storedEnrollments) {
          const parsed = JSON.parse(storedEnrollments);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((e: any) => {
              if (mergedMap.has(e.studentId)) {
                return { ...e, studentId: mergedMap.get(e.studentId)! };
              }
              return e;
            });
            safeSetItem('enrollments', updated);
            setEnrollments(updated);
          }
        }

        // 3. Update payments
        const storedPayments = localStorage.getItem('payments');
        if (storedPayments) {
          const parsed = JSON.parse(storedPayments);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((p: any) => {
              if (p.studentId && mergedMap.has(p.studentId)) {
                return { ...p, studentId: mergedMap.get(p.studentId)! };
              }
              return p;
            });
            safeSetItem('payments', updated);
            setPayments(updated);
          }
        }

        // 4. Update financialTransactions
        const storedFinTx = localStorage.getItem('financialTransactions');
        if (storedFinTx) {
          const parsed = JSON.parse(storedFinTx);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((t: any) => {
              if (t.studentId && mergedMap.has(t.studentId)) {
                return { ...t, studentId: mergedMap.get(t.studentId)! };
              }
              return t;
            });
            safeSetItem('financialTransactions', updated);
            setFinancialTransactions(updated);
          }
        }

        // 5. Update contacts
        const storedContacts = localStorage.getItem('contacts');
        if (storedContacts) {
          const parsed = JSON.parse(storedContacts);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((c: any) => {
              if (c.studentId && mergedMap.has(c.studentId)) {
                return { ...c, studentId: mergedMap.get(c.studentId)! };
              }
              return c;
            });
            safeSetItem('contacts', updated);
            setContacts(updated);
          }
        }

        // 6. Update tasks
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
          const parsed = JSON.parse(storedTasks);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((tk: any) => {
              if (tk.studentId && mergedMap.has(tk.studentId)) {
                return { ...tk, studentId: mergedMap.get(tk.studentId)! };
              }
              return tk;
            });
            safeSetItem('tasks', updated);
            setTasks(updated);
          }
        }

        // 7. Update activities
        const storedAct = localStorage.getItem('activities');
        if (storedAct) {
          const parsed = JSON.parse(storedAct);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((a: any) => {
              if (a.studentId && mergedMap.has(a.studentId)) {
                return { ...a, studentId: mergedMap.get(a.studentId)! };
              }
              return a;
            });
            safeSetItem('activities', updated);
            setActivities(updated);
          }
        }

        // 8. Update users
        const storedUsers = localStorage.getItem('users');
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((u: any) => {
              if (u.studentId && mergedMap.has(u.studentId)) {
                return { ...u, studentId: mergedMap.get(u.studentId)! };
              }
              return u;
            });
            safeSetItem('users', updated);
            setUsers(updated);
          }
        }

        // 9. Update currentUser
        const storedCurrentUser = localStorage.getItem('currentUser');
        if (storedCurrentUser) {
          const parsed = JSON.parse(storedCurrentUser);
          if (parsed && parsed.studentId && mergedMap.has(parsed.studentId)) {
            const updated = { ...parsed, studentId: mergedMap.get(parsed.studentId)! };
            safeSetItem('currentUser', updated);
            setCurrentUser(updated);
          }
        }
      }
    } catch (err) {
      console.error('Error in student auto-deduplication:', err);
    }
  }, []);

  const updateCompanyInfo = (data: Partial<CompanyInfo>) => {
    setCompanyInfo(prev => {
      const fieldsChanged: AuditFieldChange[] = [];
      if (data.commercialName !== undefined && data.commercialName !== prev.commercialName) {
        fieldsChanged.push({ fieldName: 'Nombre Comercial', oldValue: prev.commercialName || '', newValue: data.commercialName });
      }
      if (data.legalName !== undefined && data.legalName !== prev.legalName) {
        fieldsChanged.push({ fieldName: 'Razón Social', oldValue: prev.legalName || '', newValue: data.legalName });
      }
      if (data.rfc !== undefined && data.rfc !== prev.rfc) {
        fieldsChanged.push({ fieldName: 'RFC / Identificación Fiscal', oldValue: prev.rfc || '', newValue: data.rfc });
      }
      if (data.baseCurrency !== undefined && data.baseCurrency !== prev.baseCurrency) {
        fieldsChanged.push({ fieldName: 'Moneda Base', oldValue: prev.baseCurrency || 'MXN', newValue: data.baseCurrency });
      }
      if (data.timezone !== undefined && data.timezone !== prev.timezone) {
        fieldsChanged.push({ fieldName: 'Zona Horaria', oldValue: prev.timezone || '', newValue: data.timezone });
      }

      if (fieldsChanged.length > 0) {
        addAuditLog({
          actionType: 'settings_change',
          severity: 'alta',
          entityType: 'company',
          entityId: 'company-info',
          entityName: prev.commercialName || 'Configuración General',
          description: `Modificación de parámetros generales de la institución/empresa: ` + fieldsChanged.map(f => `${f.fieldName} de "${f.oldValue}" a "${f.newValue}"`).join('; '),
          fieldsChanged
        });
      }

      return {
        ...prev,
        ...data,
        address: { ...prev.address, ...data.address },
        socialLinks: { ...prev.socialLinks, ...data.socialLinks }
      };
    });
  };

  const addCompanyDocument = (doc: Omit<CompanyDocument, "id" | "uploadedAt">) => {
    setCompanyDocuments(prev => [...prev, {
      ...doc,
      id: Math.random().toString(36).substring(2, 9),
      uploadedAt: new Date().toISOString()
    }]);
  };

  const updateCompanyDocument = (id: string, data: Partial<CompanyDocument>) => {
    setCompanyDocuments(prev => prev.map(d => d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d));
  };

  const deleteCompanyDocument = (id: string) => {
    setCompanyDocuments(prev => prev.filter(d => d.id !== id));
  };

  const addFinanceCategory = (cat: Omit<FinanceCategory, "id">) => {
    setFinanceCategories(prev => [...prev, { ...cat, id: Math.random().toString(36).substring(2, 9) }]);
  };

  const updateFinanceCategory = (id: string, data: Partial<FinanceCategory>) => {
    setFinanceCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteFinanceCategory = (id: string) => {
    setFinanceCategories(prev => prev.filter(c => c.id !== id));
  };

  const addFinancialTransaction = (tx: Omit<FinancialTransaction, "id" | "amountMXN" | "finalAmount">) => {
    let type = tx.type || 'income';
    let currency = tx.currency || 'MXN';
    let amount = tx.amount;
    let rate = tx.exchangeRate || 18.0;
    let originalAmount = tx.originalAmount !== undefined ? tx.originalAmount : amount;
    let originalCurrency = tx.originalCurrency || currency;
    let iva = tx.iva;

    const isWellsFargo = tx.bankAccountId?.toString().toLowerCase().includes('wellsfargo') ||
                         tx.bankAccountId?.toString().toLowerCase().includes('wells fargo') ||
                         tx.bankAccountId?.toString().toLowerCase().includes('wf') ||
                         tx.bankAccountId?.toString() === '2';

    if (isWellsFargo) {
      currency = 'USD';
      rate = 1.0;
      const baseAmountUSD = originalCurrency === 'USD' ? originalAmount : (tx.exchangeRate && tx.exchangeRate !== 0 ? originalAmount / tx.exchangeRate : originalAmount / 18.0);
      
      const student = tx.studentId ? students.find(s => s.id === tx.studentId) : null;
      const currentInstId = tx.institutionId || student?.institutionId;
      const currentInstitution = currentInstId ? institutions.find(i => String(i.id) === String(currentInstId)) : null;
      const hasIvaEnabled = currentInstitution?.payWithIva === true;
      const ivaUSD = hasIvaEnabled ? baseAmountUSD * 0.16 : 0;

      amount = baseAmountUSD;
      iva = hasIvaEnabled ? ivaUSD : undefined;
    } else if (type === 'income' && tx.bankAccountId) {
      const selectedAccount = bankAccounts?.find(
        a => a.id.toString() === tx.bankAccountId?.toString() || 
             a.bankName === tx.bankAccountId ||
             (tx.bankAccountId?.toString() === "Banorte" && a.currency === "MXN") ||
             (tx.bankAccountId?.toString() === "WellsFargo USA" && a.currency === "USD")
      );
      const accountCurrency = selectedAccount 
        ? (selectedAccount.currency || 'MXN') 
        : (tx.bankAccountId?.toString().toLowerCase().includes('wellsfargo') || tx.bankAccountId?.toString().toLowerCase().includes('usd') ? 'USD' : 'MXN');

      if (accountCurrency !== currency) {
        const baseAmount = originalAmount;
        const formCurrency = originalCurrency;

        const baseAmountUSD = formCurrency === 'USD' ? baseAmount : (rate !== 0 ? baseAmount / rate : 0);
        const baseAmountMXN = formCurrency === 'MXN' ? baseAmount : baseAmount * rate;

        const student = tx.studentId ? students.find(s => s.id === tx.studentId) : null;
        const currentInstId = tx.institutionId || student?.institutionId;
        const currentInstitution = currentInstId ? institutions.find(i => String(i.id) === String(currentInstId)) : null;
        const hasIvaEnabled = currentInstitution?.payWithIva === true;

        const ivaUSD = hasIvaEnabled ? baseAmountUSD * 0.16 : 0;
        const ivaMXN = hasIvaEnabled ? baseAmountMXN * 0.16 : 0;

        const totalUSD = baseAmountUSD + ivaUSD;
        const totalMXN = baseAmountMXN + ivaMXN;

        if (accountCurrency === 'MXN') {
          amount = totalMXN;
          currency = 'MXN';
          iva = hasIvaEnabled ? ivaMXN : undefined;
        } else {
          amount = baseAmountUSD;
          currency = 'USD';
          iva = hasIvaEnabled ? ivaUSD : undefined;
        }
      } else {
        const baseAmount = originalAmount;
        const formCurrency = originalCurrency;

        const baseAmountUSD = formCurrency === 'USD' ? baseAmount : (rate !== 0 ? baseAmount / rate : 0);
        const baseAmountMXN = formCurrency === 'MXN' ? baseAmount : baseAmount * rate;

        const student = tx.studentId ? students.find(s => s.id === tx.studentId) : null;
        const currentInstId = tx.institutionId || student?.institutionId;
        const currentInstitution = currentInstId ? institutions.find(i => String(i.id) === String(currentInstId)) : null;
        const hasIvaEnabled = currentInstitution?.payWithIva === true;

        const ivaUSD = hasIvaEnabled ? baseAmountUSD * 0.16 : 0;
        const ivaMXN = hasIvaEnabled ? baseAmountMXN * 0.16 : 0;

        const totalUSD = baseAmountUSD + ivaUSD;
        const totalMXN = baseAmountMXN + ivaMXN;
        if (currency === 'MXN') {
          amount = totalMXN;
          iva = hasIvaEnabled ? ivaMXN : undefined;
        } else {
          amount = baseAmountUSD;
          iva = hasIvaEnabled ? ivaUSD : undefined;
        }
      }
    }

    const amountMXN = currency === 'USD' ? amount * rate : amount;
    const finalAmount = currency === 'USD' ? amount : (rate !== 0 ? amount / rate : 0);
    
    setFinancialTransactions(prev => [...prev, { 
      ...tx, 
      id: Math.random().toString(36).substring(2, 9),
      amount,
      currency: currency as any,
      iva,
      originalAmount,
      originalCurrency: originalCurrency as any,
      amountMXN,
      finalAmount
    }]);

    if (tx.studentId || tx.providerId || tx.institutionId) {
      addActivity({
        institutionId: tx.institutionId || (tx.studentId ? students.find(s => s.id === tx.studentId)?.institutionId || 0 : 0),
        date: new Date().toISOString(),
        description: `${type === 'income' ? 'Pago Recibido' : 'Pago Realizado'}: ${tx.description} (${amount.toFixed(2)} ${currency})`
      });
    }
  };

  const updateFinancialTransaction = (id: string, data: Partial<FinancialTransaction>) => {
    setFinancialTransactions(prev => prev.map(t => {
      if (String(t.id) === String(id)) {
        let type = data.type !== undefined ? data.type : t.type;
        let currency = data.currency !== undefined ? data.currency : t.currency;
        let amount = data.amount !== undefined ? data.amount : t.amount;
        let rate = data.exchangeRate !== undefined ? data.exchangeRate : t.exchangeRate;
        let originalAmount = data.originalAmount !== undefined ? data.originalAmount : (t.originalAmount !== undefined ? t.originalAmount : amount);
        let originalCurrency = data.originalCurrency !== undefined ? data.originalCurrency : (t.originalCurrency || currency);
        let bankAccountId = data.bankAccountId !== undefined ? data.bankAccountId : t.bankAccountId;
        let studentId = data.studentId !== undefined ? data.studentId : t.studentId;
        let institutionId = data.institutionId !== undefined ? data.institutionId : t.institutionId;
        let iva = data.iva !== undefined ? data.iva : t.iva;

        const isWellsFargo = bankAccountId?.toString().toLowerCase().includes('wellsfargo') ||
                             bankAccountId?.toString().toLowerCase().includes('wells fargo') ||
                             bankAccountId?.toString().toLowerCase().includes('wf') ||
                             bankAccountId?.toString() === '2';

        if (isWellsFargo) {
          currency = 'USD';
          rate = 1.0;
          const currentRate = data.exchangeRate !== undefined ? Number(data.exchangeRate) : t.exchangeRate;
          const baseAmountUSD = originalCurrency === 'USD' ? originalAmount : (currentRate !== 0 ? originalAmount / currentRate : originalAmount / 18.0);
          
          const student = studentId ? students.find(s => String(s.id) === String(studentId)) : null;
          const currentInstId = institutionId || student?.institutionId;
          const currentInstitution = currentInstId ? institutions.find(i => String(i.id) === String(currentInstId)) : null;
          const hasIvaEnabled = currentInstitution?.payWithIva === true;
          const ivaUSD = hasIvaEnabled ? baseAmountUSD * 0.16 : 0;

          amount = baseAmountUSD;
          iva = hasIvaEnabled ? ivaUSD : undefined;
        } else if (type === 'income' && bankAccountId) {
          const selectedAccount = bankAccounts?.find(
            a => a.id.toString() === bankAccountId?.toString() || 
                 a.bankName === bankAccountId ||
                 (bankAccountId?.toString() === "Banorte" && a.currency === "MXN") ||
                 (bankAccountId?.toString() === "WellsFargo USA" && a.currency === "USD")
          );
          const accountCurrency = selectedAccount 
            ? (selectedAccount.currency || 'MXN') 
            : (bankAccountId?.toString().toLowerCase().includes('wellsfargo') || bankAccountId?.toString().toLowerCase().includes('usd') ? 'USD' : 'MXN');

          if (accountCurrency !== currency || data.amount !== undefined || data.bankAccountId !== undefined) {
            const baseAmount = originalAmount;
            const formCurrency = originalCurrency;

            const baseAmountUSD = formCurrency === 'USD' ? baseAmount : (rate !== 0 ? baseAmount / rate : 0);
            const baseAmountMXN = formCurrency === 'MXN' ? baseAmount : baseAmount * rate;

            const student = studentId ? students.find(s => String(s.id) === String(studentId)) : null;
            const currentInstId = institutionId || student?.institutionId;
            const currentInstitution = currentInstId ? institutions.find(i => String(i.id) === String(currentInstId)) : null;
            const hasIvaEnabled = currentInstitution?.payWithIva === true;

            const ivaUSD = hasIvaEnabled ? baseAmountUSD * 0.16 : 0;
            const ivaMXN = hasIvaEnabled ? baseAmountMXN * 0.16 : 0;

            const totalUSD = baseAmountUSD + ivaUSD;
            const totalMXN = baseAmountMXN + ivaMXN;

            if (accountCurrency === 'MXN') {
              amount = totalMXN;
              currency = 'MXN';
              iva = hasIvaEnabled ? ivaMXN : undefined;
            } else {
              amount = baseAmountUSD;
              currency = 'USD';
              iva = hasIvaEnabled ? ivaUSD : undefined;
            }
          }
        }

        const amountMXN = currency === 'USD' ? amount * rate : amount;
        const finalAmount = currency === 'USD' ? amount : (rate !== 0 ? amount / rate : 0);
        
        const fieldsChanged: AuditFieldChange[] = [];
        if (data.amount !== undefined && Number(data.amount) !== Number(t.amount)) {
          fieldsChanged.push({
            fieldName: 'Monto (Monto Original)',
            oldValue: `$${t.amount} ${t.currency}`,
            newValue: `$${amount} ${currency}`
          });
        }
        if (data.date !== undefined && data.date !== t.date) {
          fieldsChanged.push({
            fieldName: 'Fecha',
            oldValue: t.date,
            newValue: data.date
          });
        }

        if (fieldsChanged.length > 0) {
          const desc = `Modificación de pago transacción ID: ${t.id}. ` + fieldsChanged.map(f => `${f.fieldName} de ${f.oldValue} a ${f.newValue}`).join(', ');
          addAuditLog({
            entityType: 'financialTransaction',
            entityId: t.id,
            entityName: t.description || 'Transacción de Pago',
            description: desc,
            fieldsChanged
          });
        }

        addActivity({
          institutionId: studentId ? students.find(s => String(s.id) === String(studentId))?.institutionId || 0 : 0,
          date: new Date().toISOString(),
          description: `Modificó registro de pago: ${data.description || t.description}`
        });

        const mergedData = { 
          ...data, 
          amount, 
          currency: currency as any, 
          iva, 
          originalAmount, 
          originalCurrency: originalCurrency as any, 
          amountMXN, 
          finalAmount 
        };
        return { ...t, ...mergedData };
      }
      return t;
    }));
  };

  const deleteFinancialTransaction = (id: string) => {
    const tx = financialTransactions.find(t => String(t.id) === String(id));
    setFinancialTransactions(prev => prev.filter(t => String(t.id) !== String(id)));

    if (tx) {
      addAuditLog({
        actionType: 'delete',
        severity: 'alta',
        entityType: 'financialTransaction',
        entityId: id,
        entityName: tx.description || `Transacción #${id}`,
        description: `Eliminación permanente de transacción financiera #${id} (${tx.type === 'income' ? 'Ingreso' : 'Egreso'}) por monto de $${tx.amount} ${tx.currency}.`
      });
    }
  };

  const addAccountStatement = (statement: Omit<AccountStatement, "id" | "uploadDate">, transactions: Omit<StatementTransaction, "id" | "statementId" | "saved" | "reconciled">[]) => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newStatement: AccountStatement = {
      ...statement,
      id: newId,
      uploadDate: new Date().toISOString()
    };
    
    const newTransactions: StatementTransaction[] = transactions.map(t => ({
      ...t,
      id: Math.random().toString(36).substring(2, 9),
      statementId: newId,
      saved: false,
      reconciled: false
    }));

    setAccountStatements(prev => [...prev, newStatement]);
    setStatementTransactions(prev => [...prev, ...newTransactions]);
  };

  const deleteAccountStatement = (id: string) => {
    setAccountStatements(prev => prev.filter(s => s.id !== id));
    setStatementTransactions(prev => prev.filter(t => t.statementId !== id));
  };

  const updateStatementTransaction = (id: string, data: Partial<StatementTransaction>) => {
    setStatementTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const deleteStatementTransaction = (id: string) => {
    setStatementTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addCatalogItem = (catalog: CatalogTypes, item: Omit<CatalogItem, "id">) => {
    setCatalogs(prev => ({
      ...prev,
      [catalog]: [...(prev[catalog] || []), { ...item, id: Math.random().toString(36).substring(2, 9) }]
    }));
  };

  const updateCatalogItem = (catalog: CatalogTypes, id: string, data: Partial<CatalogItem>) => {
    setCatalogs(prev => ({
      ...prev,
      [catalog]: (prev[catalog] || []).map(c => c.id === id ? { ...c, ...data } : c)
    }));
  };

  const deleteCatalogItem = (catalog: CatalogTypes, id: string) => {
    setCatalogs(prev => ({
      ...prev,
      [catalog]: (prev[catalog] || []).filter(c => c.id !== id)
    }));
  };

  const addUser = (user: Omit<User, "id">) => {
    setUsers(prev => [...prev, { ...user, id: generateUniqueId() }]);
  };

  const updateUser = (id: number, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => {
        const updated = prev ? { ...prev, ...data } : null;
        if (updated) {
          try {
            localStorage.setItem('currentUser', JSON.stringify(updated));
          } catch (e) {
            console.error('Error saving updated currentUser to localStorage', e);
          }
        }
        return updated;
      });
    }
  };

  const deleteUser = (id: number) => {
    const u = users.find(usr => usr.id === id);
    const uName = u ? `${u.name} (${u.email})` : `Usuario #${id}`;
    setUsers(prev => prev.filter(usr => usr.id !== id));

    addAuditLog({
      actionType: 'delete',
      severity: 'critica',
      entityType: 'user',
      entityId: id,
      entityName: uName,
      description: `Eliminación permanente de cuenta de usuario "${uName}" con rol "${u?.role || 'Desconocido'}".`
    });
  };

  const addInstitution = (inst: Omit<Institution, "id"> & { id?: number }) => {
    const newInstId = inst.id || generateUniqueId();
    const newInst = { ...inst, id: newInstId };
    setInstitutions(prev => [...prev, newInst]);
    
    if (inst.agentId) {
      setUsers(uPrev => uPrev.map(u => {
        if (u.id === inst.agentId) {
          const updatedIds = u.institutionIds ? [...u.institutionIds] : [];
          if (!updatedIds.includes(newInstId)) {
            updatedIds.push(newInstId);
          }
          return { ...u, institutionIds: updatedIds };
        }
        return u;
      }));
    }

    addActivity({ institutionId: newInst.id, date: new Date().toISOString(), description: "Institución registrada." });
    return newInstId;
  };

  const addAuditLog = (log: Omit<AuditLog, "id" | "date" | "userName"> & { userName?: string; date?: string; userId?: string | number; userEmail?: string }) => {
    const rawDesc = log.description || '';
    const isDelete = log.actionType === 'delete' || rawDesc.toLowerCase().includes('elimin') || rawDesc.toLowerCase().includes('borr');
    const isSettings = log.actionType === 'settings_change' || rawDesc.toLowerCase().includes('configur') || rawDesc.toLowerCase().includes('iva') || rawDesc.toLowerCase().includes('parámetro');
    const isCreate = log.actionType === 'create' || rawDesc.toLowerCase().includes('crea') || rawDesc.toLowerCase().includes('registr');

    const computedAction: AuditActionType = log.actionType || (isDelete ? 'delete' : isSettings ? 'settings_change' : isCreate ? 'create' : 'update');
    const computedSeverity: AuditSeverity = log.severity || (isDelete ? 'critica' : isSettings ? 'alta' : 'media');

    const newLog: AuditLog = {
      ...log,
      id: "log-" + generateUniqueId().toString() + "-" + Math.random().toString(36).substring(2, 7),
      date: log.date || new Date().toISOString(),
      userId: log.userId !== undefined ? log.userId : (currentUser?.id || 'admin-1'),
      userName: log.userName || currentUser?.name || currentUser?.email || 'Administrador',
      userEmail: log.userEmail || currentUser?.email || 'admin@sistema.com',
      userRole: log.userRole || currentUser?.role || 'Superadministrador',
      actionType: computedAction,
      severity: computedSeverity
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
  };

  const deleteAuditLog = (id: string) => {
    setAuditLogs(prev => prev.filter(l => l.id !== id));
  };

  const updateInstitution = (id: number, data: Partial<Institution>) => {
    setInstitutions(prev => {
      const oldInst = prev.find(i => i.id === id);
      const oldAgentId = oldInst?.agentId;
      const newAgentId = data.agentId;

      if (newAgentId !== oldAgentId) {
        setUsers(uPrev => uPrev.map(u => {
          let updatedIds = u.institutionIds ? [...u.institutionIds] : [];
          // If this user is the new agent
          if (newAgentId && u.id === newAgentId) {
            if (!updatedIds.includes(id)) {
              updatedIds.push(id);
            }
          }
          // If this user was the old agent, remove it
          else if (oldAgentId && u.id === oldAgentId) {
            updatedIds = updatedIds.filter(x => x !== id);
          }
          return { ...u, institutionIds: updatedIds };
        }));
      }

      // Track critical institution settings changes in Audit Log
      if (oldInst) {
        const fieldsChanged: AuditFieldChange[] = [];
        if (data.name !== undefined && data.name !== oldInst.name) {
          fieldsChanged.push({ fieldName: 'Razón Social', oldValue: oldInst.name || '', newValue: data.name });
        }
        if (data.tradeName !== undefined && data.tradeName !== oldInst.tradeName) {
          fieldsChanged.push({ fieldName: 'Nombre Comercial', oldValue: oldInst.tradeName || '', newValue: data.tradeName });
        }
        if (data.payWithIva !== undefined && data.payWithIva !== oldInst.payWithIva) {
          fieldsChanged.push({
            fieldName: 'Cobro con IVA',
            oldValue: oldInst.payWithIva ? 'Activo (16%)' : 'Inactivo (0%)',
            newValue: data.payWithIva ? 'Activo (16%)' : 'Inactivo (0%)'
          });
        }
        if (data.paymentCurrency !== undefined && data.paymentCurrency !== oldInst.paymentCurrency) {
          fieldsChanged.push({ fieldName: 'Moneda de Cobro', oldValue: oldInst.paymentCurrency || 'USD', newValue: data.paymentCurrency });
        }
        if (data.membershipType !== undefined && data.membershipType !== oldInst.membershipType) {
          fieldsChanged.push({ fieldName: 'Membresía', oldValue: oldInst.membershipType || 'Ninguna', newValue: data.membershipType });
        }
        if (data.status !== undefined && data.status !== oldInst.status) {
          fieldsChanged.push({ fieldName: 'Estatus', oldValue: oldInst.status || '', newValue: data.status });
        }
        if (data.country !== undefined && data.country !== oldInst.country) {
          fieldsChanged.push({ fieldName: 'País', oldValue: oldInst.country || '', newValue: data.country });
        }
        if (data.retentionRate !== undefined && data.retentionRate !== oldInst.retentionRate) {
          fieldsChanged.push({ fieldName: 'Retención Fiscal', oldValue: `${oldInst.retentionRate || 0}%`, newValue: `${data.retentionRate}%` });
        }

        if (fieldsChanged.length > 0) {
          const instLabel = oldInst.tradeName || oldInst.name || `Institución #${id}`;
          const isConfigChange = fieldsChanged.some(f => ['Cobro con IVA', 'Moneda de Cobro', 'Membresía', 'Retención Fiscal'].includes(f.fieldName));
          addAuditLog({
            actionType: isConfigChange ? 'settings_change' : 'update',
            severity: isConfigChange ? 'alta' : 'media',
            entityType: 'institution',
            entityId: id,
            entityName: instLabel,
            description: `Modificación de configuración en institución "${instLabel}": ` + fieldsChanged.map(f => `${f.fieldName} de "${f.oldValue}" a "${f.newValue}"`).join('; '),
            fieldsChanged
          });
        }
      }

      return prev.map(i => i.id === id ? { ...i, ...data } : i);
    });
    addActivity({ institutionId: id, date: new Date().toISOString(), description: "Información de la institución actualizada." });
  };

  const addInstitutionDocuments = (institutionId: number, newDocs: InstitutionDocument[]) => {
    if (!newDocs || newDocs.length === 0) return;
    setInstitutions(prev => prev.map(inst => {
      if (inst.id !== institutionId) return inst;
      const existing = inst.documentsList || [];
      const existingIds = new Set(existing.map(d => d.id));
      const filtered = newDocs.filter(d => !existingIds.has(d.id));
      return {
        ...inst,
        documentsList: [...existing, ...filtered]
      };
    }));
    addActivity({
      institutionId,
      date: new Date().toISOString(),
      description: `Documentos: Se agregaron ${newDocs.length} archivo(s) al repositorio institucional.`
    });
  };

  const deleteInstitutionDocument = async (institutionId: number, documentId: string) => {
    try {
      const { deleteFileFromIndexedDB } = await import('../utils/fileStorage');
      await deleteFileFromIndexedDB('inst_doc_' + documentId);
    } catch (e) {
      console.warn("Error deleting file from IndexedDB:", e);
    }
    setInstitutions(prev => prev.map(inst => {
      if (inst.id !== institutionId) return inst;
      return {
        ...inst,
        documentsList: (inst.documentsList || []).filter(d => d.id !== documentId)
      };
    }));
    addActivity({
      institutionId,
      date: new Date().toISOString(),
      description: `Documento eliminado permanentemente del repositorio institucional.`
    });
  };

  const deleteInstitution = async (id: number) => {
    const inst = institutions.find(i => i.id === id);
    const instName = inst?.tradeName || inst?.name || `Institución #${id}`;
    if (inst?.documentsList && inst.documentsList.length > 0) {
      try {
        const { deleteFileFromIndexedDB } = await import('../utils/fileStorage');
        for (const doc of inst.documentsList) {
          await deleteFileFromIndexedDB('inst_doc_' + doc.id);
        }
      } catch (e) {
        console.warn("Error cleaning up institution documents from IndexedDB:", e);
      }
    }
    setInstitutions(prev => prev.filter(i => i.id !== id));
    addActivity({ institutionId: 0, date: new Date().toISOString(), description: `Institución eliminada de la base de datos.` });
    
    // Critical Audit Log entry for institution deletion
    addAuditLog({
      actionType: 'delete',
      severity: 'critica',
      entityType: 'institution',
      entityId: id,
      entityName: instName,
      description: `Eliminación permanente de la institución "${instName}" (ID: ${id}) junto con todos sus archivos y expedientes.`
    });
  };

  const clearAllInstitutions = () => {
    const count = institutions.length;
    setInstitutions([]);
    addActivity({ institutionId: 0, date: new Date().toISOString(), description: `Se eliminaron todas las instituciones de la base de datos.` });
    
    addAuditLog({
      actionType: 'delete',
      severity: 'critica',
      entityType: 'institution',
      entityId: 'all',
      entityName: 'Todas las Instituciones',
      description: `Vaciado masivo crítico: se eliminaron todas las instituciones registradas (${count} registros).`
    });
  };

  const clearAllClasses = () => {
    const count = classes.length;
    setClasses([]);
    setEnrollments([]);
    addActivity({ institutionId: 0, date: new Date().toISOString(), description: `Se eliminaron todas las clases y créditos académicos de la base de datos.` });

    addAuditLog({
      actionType: 'delete',
      severity: 'critica',
      entityType: 'class',
      entityId: 'all',
      entityName: 'Todas las Clases',
      description: `Vaciado masivo crítico: se eliminaron todas las clases y créditos académicos (${count} registros).`
    });
  };

  const addStudent = (student: Omit<Student, "id">) => {
    setStudents(prev => [...prev, { ...student, id: generateUniqueId() }]);
  };

  const deleteStudent = (id: number) => {
    const st = students.find(s => s.id === id);
    const stName = st ? `${st.name} ${st.lastName || ''}`.trim() : `Alumno #${id}`;
    setStudents(prev => prev.filter(s => s.id !== id));

    // Critical Audit Log entry for student deletion
    addAuditLog({
      actionType: 'delete',
      severity: 'alta',
      entityType: 'student',
      entityId: id,
      entityName: stName,
      description: `Eliminación de expediente del alumno "${stName}" (ID: ${id}, Matrícula: ${st?.enrollmentNumber || 'S/N'}).`
    });
  };

  const addClass = (cls: Omit<ClassItem, "id">) => {
    setClasses(prev => [...prev, { ...cls, id: generateUniqueId() }]);
  };

  const updateClass = (id: number, data: Partial<ClassItem>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteClass = (id: number) => {
    const cls = classes.find(c => c.id === id);
    const clsName = cls?.name || `Clase #${id}`;
    setClasses(prev => prev.filter(c => c.id !== id));

    // Audit Log entry for class deletion
    addAuditLog({
      actionType: 'delete',
      severity: 'alta',
      entityType: 'class',
      entityId: id,
      entityName: clsName,
      description: `Eliminación de la clase/materia "${clsName}" (ID: ${id}, Código: ${cls?.code || 'S/C'}).`
    });
  };

  const addProvider = (prov: Omit<Provider, "id">) => {
    setProviders(prev => [...prev, { ...prov, id: generateUniqueId() }]);
  };

  const updateProvider = (id: number, data: Partial<Provider>) => {
    setProviders(prev => prev.map(p => {
      if (p.id === id) {
        const fieldsChanged: AuditFieldChange[] = [];
        if (data.legalName !== undefined && data.legalName !== p.legalName) {
          fieldsChanged.push({ fieldName: 'Razón Social', oldValue: p.legalName, newValue: data.legalName });
        }
        if (data.commercialName !== undefined && data.commercialName !== p.commercialName) {
          fieldsChanged.push({ fieldName: 'Nombre Comercial', oldValue: p.commercialName, newValue: data.commercialName });
        }
        if (data.phone !== undefined && data.phone !== p.phone) {
          fieldsChanged.push({ fieldName: 'Teléfono', oldValue: p.phone, newValue: data.phone });
        }
        if (data.email !== undefined && data.email !== p.email) {
          fieldsChanged.push({ fieldName: 'Email', oldValue: p.email, newValue: data.email });
        }

        if (fieldsChanged.length > 0) {
          const desc = `Modificación de Proveedor: ${p.commercialName || p.legalName}. ` + fieldsChanged.map(f => `${f.fieldName} de "${f.oldValue}" a "${f.newValue}"`).join(', ');
          addAuditLog({
            entityType: 'provider',
            entityId: p.id,
            entityName: p.commercialName || p.legalName,
            description: desc,
            fieldsChanged
          });
        }
        return { ...p, ...data };
      }
      return p;
    }));
  };

  const addBankAccount = (account: Omit<BankAccount, "id">) => {
    let finalized = { ...account };
    const isWF = finalized.bankName?.toLowerCase().includes('wellsfargo') ||
                 finalized.bankName?.toLowerCase().includes('wells fargo') ||
                 finalized.bankName?.toLowerCase().includes('wf');
    if (isWF) {
      finalized.currency = 'USD';
    }
    setBankAccounts(prev => [...prev, { ...finalized, id: generateUniqueId() }]);
  };

  const updateBankAccount = (id: number, data: Partial<BankAccount>) => {
    setBankAccounts(prev => prev.map(b => {
      if (b.id === id) {
        let merged = { ...b, ...data };
        const isWF = merged.bankName?.toLowerCase().includes('wellsfargo') ||
                     merged.bankName?.toLowerCase().includes('wells fargo') ||
                     merged.bankName?.toLowerCase().includes('wf');
        if (isWF) {
          merged.currency = 'USD';
        }
        return merged;
      }
      return b;
    }));
  };

  const updateStudent = (id: number | number[], data: Partial<Student>) => {
    const ids = (Array.isArray(id) ? id : [id]).map(String);
    setStudents(prev => {
      const updated = prev.map(s => ids.includes(String(s.id)) ? { ...s, ...data } : s);
      // Immediately commit to localStorage safely to guarantee data survival on reload/batch
      safeSetItem('students', updated);
      return updated;
    });
  };

  const addPayment = (payment: Omit<Payment, "id">) => {
    setPayments(prev => [...prev, { ...payment, id: generateUniqueId() }]);
  };

  const updatePayment = (id: number, data: Partial<Payment>) => {
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        const fieldsChanged: AuditFieldChange[] = [];
        if (data.amount !== undefined && Number(data.amount) !== Number(p.amount)) {
          fieldsChanged.push({
            fieldName: 'Monto',
            oldValue: `$${p.amount}`,
            newValue: `$${data.amount}`
          });
        }
        if (data.date !== undefined && data.date !== p.date) {
          fieldsChanged.push({
            fieldName: 'Fecha',
            oldValue: p.date,
            newValue: data.date
          });
        }

        if (fieldsChanged.length > 0) {
          const studentName = p.studentId ? students.find(s => s.id === p.studentId)?.name || '' : '';
          const pName = studentName ? `Pago de Alumno: ${studentName}` : `Pago ID ${p.id}`;
          const desc = `Modificación de pago ID: ${p.id}. ` + fieldsChanged.map(f => `${f.fieldName} de ${f.oldValue} a ${f.newValue}`).join(', ');
          addAuditLog({
            entityType: 'payment',
            entityId: p.id,
            entityName: pName,
            description: desc,
            fieldsChanged
          });
        }
        return { ...p, ...data };
      }
      return p;
    }));
  };

  const deletePayment = (id: number) => {
    const p = payments.find(pay => pay.id === id);
    setPayments(prev => prev.filter(pay => pay.id !== id));

    addAuditLog({
      actionType: 'delete',
      severity: 'alta',
      entityType: 'payment',
      entityId: id,
      entityName: `Pago #${id}`,
      description: `Eliminación permanente de registro de pago #${id} por monto de $${p?.amount ?? '0'} (Fecha: ${p?.date ?? 'N/A'}).`
    });
  };

  const syncEnrollmentStatuses = useCallback((): number => {
    let updatedCount = 0;
    setEnrollments(prev => {
      let changed = false;
      const updated = prev.map(e => {
        const autoStatus = calculateEnrollmentStatus(e);
        if (e.status !== autoStatus) {
          updatedCount++;
          changed = true;
          return { ...e, status: autoStatus };
        }
        return e;
      });
      return changed ? updated : prev;
    });
    return updatedCount;
  }, []);

  // Run automatic status evaluation on mount
  useEffect(() => {
    syncEnrollmentStatuses();
  }, [syncEnrollmentStatuses]);

  const addEnrollment = (enrollment: Omit<Enrollment, "id">) => {
    const computedStatus = calculateEnrollmentStatus(enrollment);
    const finalStatus = enrollment.status === 'Withdrawn' ? 'Withdrawn' : computedStatus;
    const newEnrollment: Enrollment = {
      ...enrollment,
      status: finalStatus,
      id: generateUniqueId()
    };
    setEnrollments(prev => [...prev, newEnrollment]);
  };

  const updateEnrollment = (id: number, data: Partial<Enrollment>) => {
    setEnrollments(prev => prev.map(e => {
      if (e.id === id) {
        const merged: Enrollment = { ...e, ...data };
        const autoStatus = calculateEnrollmentStatus(merged);
        const finalStatus = data.status === 'Withdrawn' ? 'Withdrawn' : autoStatus;
        return {
          ...merged,
          status: finalStatus
        };
      }
      return e;
    }));
  };

  const deleteEnrollment = (id: number) => {
    setEnrollments(prev => prev.filter(e => e.id !== id));
  };

  const addContact = (contact: Omit<Contact, "id">) => {
    const newContact = { ...contact, id: generateUniqueId() };
    setContacts(prev => [...prev, newContact]);
    addActivity({ institutionId: contact.institutionId, date: new Date().toISOString(), description: `Contacto ${contact.name} ${contact.lastName} añadido.` });
    
    if (newContact.systemAccess && newContact.email && newContact.institutionId) {
      setUsers(prevUsers => {
        const emailLower = newContact.email.toLowerCase();
        const userExists = prevUsers.some(u => u.email.toLowerCase() === emailLower);
        if (!userExists) {
          return [...prevUsers, {
            id: generateUniqueId(),
            name: `${newContact.name} ${newContact.lastName}`,
            email: newContact.email,
            role: 'Coordinador',
            institutionId: newContact.institutionId
          }];
        }
        return prevUsers;
      });
    }
  };

  const updateContact = (id: number, data: Partial<Contact>) => {
    setContacts(prev => {
      const existing = prev.find(c => c.id === id);
      if (!existing) return prev;
      
      const updatedContact = { ...existing, ...data };
      
      // If toggled System Access
      if (data.systemAccess !== undefined && data.systemAccess !== existing.systemAccess) {
        const emailLower = updatedContact.email.toLowerCase();
        if (data.systemAccess) {
          setUsers(prevUsers => {
            const userExists = prevUsers.some(u => u.email.toLowerCase() === emailLower);
            if (!userExists && updatedContact.email && updatedContact.institutionId) {
              return [...prevUsers, {
                id: generateUniqueId(),
                name: `${updatedContact.name} ${updatedContact.lastName}`,
                email: updatedContact.email,
                role: 'Coordinador',
                institutionId: updatedContact.institutionId
              }];
            }
            return prevUsers;
          });
        } else {
          setUsers(prevUsers => prevUsers.filter(u => u.email.toLowerCase() !== emailLower));
        }
      } else if (data.email !== undefined && data.email !== existing.email && updatedContact.systemAccess) {
        const oldEmailLower = existing.email.toLowerCase();
        setUsers(prevUsers => prevUsers.map(u => u.email.toLowerCase() === oldEmailLower ? { ...u, email: data.email! } : u));
      }

      return prev.map(c => c.id === id ? updatedContact : c);
    });
  };

  const deleteContact = (id: number) => {
    setContacts(prev => {
      const contactToDelete = prev.find(c => c.id === id);
      if (contactToDelete && contactToDelete.email) {
        const emailLower = contactToDelete.email.toLowerCase();
        setUsers(prevUsers => prevUsers.filter(u => u.email.toLowerCase() !== emailLower));
      }
      return prev.filter(c => c.id !== id);
    });
  };

  const addTeam = (teamData: Omit<Team, "id" | "createdAt">): Team => {
    const newTeam: Team = {
      ...teamData,
      id: generateUniqueId(),
      createdAt: new Date().toISOString()
    };
    setTeams(prev => [...prev, newTeam]);
    addActivity({
      institutionId: 0,
      date: new Date().toISOString(),
      description: `Nuevo equipo de trabajo creado: ${newTeam.name}`
    });
    return newTeam;
  };

  const updateTeam = (id: number, data: Partial<Team>) => {
    setTeams(prev => prev.map(tm => tm.id === id ? { ...tm, ...data } : tm));
    addActivity({
      institutionId: 0,
      date: new Date().toISOString(),
      description: `Equipo de trabajo ID ${id} actualizado.`
    });
  };

  const deleteTeam = (id: number) => {
    setTeams(prev => prev.filter(tm => tm.id !== id));
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
    addActivity({
      institutionId: 0,
      date: new Date().toISOString(),
      description: `Equipo de trabajo ID ${id} eliminado.`
    });
  };

  const addTask = (task: Omit<Task, "id">, options?: { skipNotification?: boolean; forceEmail?: boolean; forceWhatsApp?: boolean }) => {
    // 1. Resolve all assigned users (from explicit userIds array, from single userId, and from team members)
    let resolvedUserIds: number[] = task.userIds ? [...task.userIds] : [];
    
    if (task.teamId) {
      const teamUserIds = users.filter(u => u.teamId === task.teamId).map(u => u.id);
      resolvedUserIds = Array.from(new Set([...resolvedUserIds, ...teamUserIds]));
    }
    
    if (task.userId && !resolvedUserIds.includes(task.userId)) {
      resolvedUserIds.push(task.userId);
    }

    const primaryUserId = resolvedUserIds.length > 0 ? resolvedUserIds[0] : task.userId;

    const newTask: Task = { 
      ...task, 
      id: generateUniqueId(),
      userIds: resolvedUserIds,
      userId: primaryUserId
    };

    setTasks(prev => [...prev, newTask]);

    // Dispatch assignment notification to ALL assigned users via Email / WhatsApp
    if (!options?.skipNotification && resolvedUserIds.length > 0) {
      const assignedUsers = users.filter(u => resolvedUserIds.includes(u.id));
      const teamObj = task.teamId ? teams.find(tm => tm.id === task.teamId) : undefined;
      
      assignedUsers.forEach(assignedUser => {
        sendTaskAssignmentNotification(newTask, assignedUser, {
          institutions,
          leads: (window as any).__crmLeadsCache,
          teamName: teamObj?.name,
          requestedByName: task.requestedBy || currentUser?.name || "Admin Principal",
          forceEmail: options?.forceEmail,
          forceWhatsApp: options?.forceWhatsApp
        }).then(result => {
          if (result.emailDispatched || result.whatsappDispatched) {
            console.log(`[Task Notification] Assignment alert dispatched for task "${task.title}" to ${assignedUser.name}`, result);
          }
        }).catch(err => {
          console.error("[Task Notification] Failed to dispatch assignment notification:", err);
        });
      });
    }

    if (task.institutionId) {
      const instId = task.institutionId;
      setInstitutions(prev => prev.map(inst => {
        if (inst.id === instId) {
          return {
            ...inst,
            lastInteractionDate: new Date().toISOString(),
            lastInteractionType: `Tarea (${task.type || 'Seguimiento'})`
          };
        }
        return inst;
      }));
      addActivity({ institutionId: task.institutionId, date: new Date().toISOString(), description: `Tarea "${task.title}" creada.` });
    }
  };

  const notifyTaskAssignee = async (task: Task, forceEmail?: boolean, forceWhatsApp?: boolean): Promise<TaskNotificationResult> => {
    // Resolve all target user IDs
    let targetUserIds: number[] = [];
    if (task.userIds && task.userIds.length > 0) {
      targetUserIds = [...task.userIds];
    }
    if (task.teamId) {
      const teamUserIds = users.filter(u => u.teamId === task.teamId).map(u => u.id);
      targetUserIds = Array.from(new Set([...targetUserIds, ...teamUserIds]));
    }
    if (task.userId && !targetUserIds.includes(task.userId)) {
      targetUserIds.push(task.userId);
    }

    if (targetUserIds.length === 0) {
      return { emailDispatched: false, whatsappDispatched: false, errors: ["La tarea no tiene usuarios o equipo asignado."] };
    }

    const assignedUsers = users.filter(u => targetUserIds.includes(u.id));
    if (assignedUsers.length === 0) {
      return { emailDispatched: false, whatsappDispatched: false, errors: ["No se encontraron los usuarios asignados en el sistema."] };
    }

    const teamObj = task.teamId ? teams.find(tm => tm.id === task.teamId) : undefined;
    let combinedResult: TaskNotificationResult = {
      emailDispatched: false,
      whatsappDispatched: false,
      errors: []
    };

    for (const assignedUser of assignedUsers) {
      const res = await sendTaskAssignmentNotification(task, assignedUser, {
        institutions,
        teamName: teamObj?.name,
        requestedByName: task.requestedBy || currentUser?.name || "Admin Principal",
        forceEmail: forceEmail,
        forceWhatsApp: forceWhatsApp
      });
      if (res.emailDispatched) combinedResult.emailDispatched = true;
      if (res.whatsappDispatched) combinedResult.whatsappDispatched = true;
      if (res.emailSuccess) combinedResult.emailSuccess = true;
      if (res.whatsappSuccess) combinedResult.whatsappSuccess = true;
      if (res.emailSimulated) combinedResult.emailSimulated = true;
      if (res.whatsappSimulated) combinedResult.whatsappSimulated = true;
      if (res.errors.length > 0) combinedResult.errors.push(...res.errors);
      if (res.emailMessage) combinedResult.emailMessage = res.emailMessage;
      if (res.whatsappMessage) combinedResult.whatsappMessage = res.whatsappMessage;
    }

    return combinedResult;
  };

  const notifyTaskDeadline = async (task: Task, forceEmail?: boolean, forceWhatsApp?: boolean): Promise<TaskNotificationResult> => {
    let targetUserIds: number[] = [];
    if (task.userIds && task.userIds.length > 0) {
      targetUserIds = [...task.userIds];
    }
    if (task.teamId) {
      const teamUserIds = users.filter(u => u.teamId === task.teamId).map(u => u.id);
      targetUserIds = Array.from(new Set([...targetUserIds, ...teamUserIds]));
    }
    if (task.userId && !targetUserIds.includes(task.userId)) {
      targetUserIds.push(task.userId);
    }

    if (targetUserIds.length === 0) {
      return { emailDispatched: false, whatsappDispatched: false, errors: ["La tarea no tiene usuarios o equipo asignado."] };
    }

    const assignedUsers = users.filter(u => targetUserIds.includes(u.id));
    if (assignedUsers.length === 0) {
      return { emailDispatched: false, whatsappDispatched: false, errors: ["No se encontraron los usuarios asignados en el sistema."] };
    }

    const teamObj = task.teamId ? teams.find(tm => tm.id === task.teamId) : undefined;
    let combinedResult: TaskNotificationResult = {
      emailDispatched: false,
      whatsappDispatched: false,
      errors: []
    };

    for (const assignedUser of assignedUsers) {
      const res = await sendTaskDeadlineNotification(task, assignedUser, {
        institutions,
        teamName: teamObj?.name,
        forceEmail: forceEmail,
        forceWhatsApp: forceWhatsApp
      });
      if (res.emailDispatched) combinedResult.emailDispatched = true;
      if (res.whatsappDispatched) combinedResult.whatsappDispatched = true;
      if (res.emailSuccess) combinedResult.emailSuccess = true;
      if (res.whatsappSuccess) combinedResult.whatsappSuccess = true;
      if (res.emailSimulated) combinedResult.emailSimulated = true;
      if (res.whatsappSimulated) combinedResult.whatsappSimulated = true;
      if (res.errors.length > 0) combinedResult.errors.push(...res.errors);
      if (res.emailMessage) combinedResult.emailMessage = res.emailMessage;
      if (res.whatsappMessage) combinedResult.whatsappMessage = res.whatsappMessage;
    }

    return combinedResult;
  };

  const triggerDeadlineScan = async (forceAll?: boolean) => {
    return await checkAndNotifyUpcomingDeadlines(tasks, users, institutions, undefined, { forceAll, teams });
  };

  // Background automated checker for approaching deadlines (runs periodically)
  useEffect(() => {
    if (!tasks.length || !users.length) return;

    const runAutomatedDeadlineCheck = () => {
      checkAndNotifyUpcomingDeadlines(tasks, users, institutions, undefined, { teams }).then(res => {
        if (res.notifiedTasks.length > 0) {
          console.log(`[Automated Deadline Checker] Dispatched ${res.notifiedTasks.length} deadline alerts to assignees.`);
        }
      }).catch(err => {
        console.error("[Automated Deadline Checker] Error:", err);
      });
    };

    // Initial check shortly after load
    const timeoutId = setTimeout(runAutomatedDeadlineCheck, 3500);

    // Periodic check every 30 minutes
    const intervalId = setInterval(runAutomatedDeadlineCheck, 30 * 60 * 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [tasks, users, institutions, teams]);

  const updateTask = (id: number, data: Partial<Task>) => {
    const prevTask = tasks.find(t => t.id === id);
    
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        let updatedUserIds = data.userIds !== undefined ? [...data.userIds] : (t.userIds ? [...t.userIds] : []);
        const newTeamId = data.teamId !== undefined ? data.teamId : t.teamId;

        if (data.teamId !== undefined && data.teamId) {
          const teamUserIds = users.filter(u => u.teamId === data.teamId).map(u => u.id);
          updatedUserIds = Array.from(new Set([...updatedUserIds, ...teamUserIds]));
        }

        if (data.userId !== undefined && data.userId && !updatedUserIds.includes(data.userId)) {
          updatedUserIds.push(data.userId);
        }

        const primaryUserId = updatedUserIds.length > 0 ? updatedUserIds[0] : (data.userId !== undefined ? data.userId : t.userId);

        const updated = {
          ...t,
          ...data,
          teamId: newTeamId,
          userIds: updatedUserIds,
          userId: primaryUserId
        };

        // If newly assigned users, notify them
        const prevUserIds = t.userIds || (t.userId ? [t.userId] : []);
        const newlyAssignedIds = updatedUserIds.filter(uid => !prevUserIds.includes(uid));
        if (newlyAssignedIds.length > 0) {
          const newAssignees = users.filter(u => newlyAssignedIds.includes(u.id));
          const teamObj = newTeamId ? teams.find(tm => tm.id === newTeamId) : undefined;
          newAssignees.forEach(newAssignee => {
            sendTaskAssignmentNotification(updated, newAssignee, {
              institutions,
              teamName: teamObj?.name,
              requestedByName: updated.requestedBy || currentUser?.name || "Admin Principal"
            }).catch(err => console.error("Error sending reassignment notification:", err));
          });
        }

        return updated;
      }
      return t;
    }));

    if (data.status === 'Completada' && prevTask?.institutionId) {
      const instId = prevTask.institutionId;
      setInstitutions(prev => prev.map(inst => {
        if (inst.id === instId) {
          return {
            ...inst,
            lastInteractionDate: new Date().toISOString(),
            lastInteractionType: `Tarea Completada (${prevTask.title})`
          };
        }
        return inst;
      }));
      addActivity({ institutionId: prevTask.institutionId, date: new Date().toISOString(), description: `Tarea "${prevTask.title}" marcada como completada.` });
    }
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addActivity = (activity: Omit<Activity, "id" | "userName">) => {
    const actDate = activity.date || new Date().toISOString();
    setActivities(prev => [{ 
      ...activity, 
      date: actDate,
      id: generateUniqueId(),
      userName: currentUser?.name || 'Sistema'
    }, ...prev]);

    if (activity.institutionId && activity.institutionId !== 0) {
      const instId = activity.institutionId;
      setInstitutions(prev => prev.map(inst => {
        if (inst.id === instId) {
          return {
            ...inst,
            lastInteractionDate: actDate,
            lastInteractionType: 'Actividad / Bitácora'
          };
        }
        return inst;
      }));
    }
  };

  const updateInstitutionLastInteraction = useCallback((institutionId: number, interactionDate?: string, interactionType?: string, description?: string) => {
    const dateStr = interactionDate || new Date().toISOString();
    const typeStr = interactionType || 'Interacción Manual';

    setInstitutions(prev => prev.map(inst => {
      if (inst.id === institutionId) {
        return {
          ...inst,
          lastInteractionDate: dateStr,
          lastInteractionType: typeStr
        };
      }
      return inst;
    }));

    addActivity({
      institutionId,
      date: dateStr,
      description: description ? `[SLA Interacción] ${typeStr}: ${description}` : `Interacción registrada: ${typeStr}`
    });
  }, [currentUser]);

  const getInstitutionSLA = useCallback((institutionOrId: Institution | number): InstitutionSLAInfo => {
    const inst = typeof institutionOrId === 'number' 
      ? institutions.find(i => i.id === institutionOrId)
      : institutionOrId;
    
    const instId = typeof institutionOrId === 'number' ? institutionOrId : inst?.id || 0;
    const instName = inst?.tradeName || inst?.name || `Institución #${instId}`;

    // 1. Determine last interaction date and type
    let lastDate: string | null = inst?.lastInteractionDate || null;
    let lastType: string = inst?.lastInteractionType || 'Sin interacción previa';

    // Look for candidates among activities, tasks and financial transactions
    const instActs = activities.filter(a => a.institutionId === instId);
    const instTasks = tasks.filter(t => t.institutionId === instId);
    const instTx = financialTransactions.filter(tx => tx.institutionId === instId);

    const candidates: Array<{ date: string; type: string }> = [];
    if (lastDate) candidates.push({ date: lastDate, type: lastType });

    instActs.forEach(a => {
      if (a.date) candidates.push({ date: a.date, type: 'Actividad / Bitácora' });
    });
    instTasks.forEach(t => {
      if (t.dueDate) candidates.push({ date: t.dueDate, type: `Tarea: ${t.type || 'Seguimiento'}` });
    });
    instTx.forEach(tx => {
      if (tx.date) candidates.push({ date: tx.date, type: 'Transacción Financiera' });
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const mostRecent = candidates[0];
      if (mostRecent.date && !isNaN(new Date(mostRecent.date).getTime())) {
        lastDate = mostRecent.date;
        lastType = mostRecent.type;
      }
    }

    // 2. Look up SLA limit in catalog
    const slaCatalog = catalogs['Fases y Alertas de Inactividad (SLA)'] || [];
    const statusLower = (inst?.status || 'Captación').toLowerCase().trim();
    const matchedSla = slaCatalog.find(s => {
      const sName = s.name.toLowerCase().trim();
      return sName === statusLower || sName.includes(statusLower) || statusLower.includes(sName) || 
             (statusLower === 'captación' && (sName.includes('inicio') || sName.includes('captac') || sName.includes('lead')));
    });

    const slaLimitDays = (matchedSla && matchedSla.slaDays !== undefined && matchedSla.slaDays !== null) ? matchedSla.slaDays : 3;
    const indicatorName = (statusLower === 'captación' || statusLower === 'inicio') 
      ? (matchedSla?.name || 'Captación (Inicio)') 
      : (matchedSla?.name || inst?.status || 'Captación (Inicio)');

    // 3. Compute days inactive
    let daysInactive = 0;
    if (lastDate) {
      const interactionTime = new Date(lastDate).getTime();
      if (!isNaN(interactionTime)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const interDate = new Date(lastDate);
        interDate.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - interDate.getTime();
        daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    } else if (inst?.createdAt) {
      const createdTime = new Date(inst.createdAt).getTime();
      if (!isNaN(createdTime)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const crDate = new Date(inst.createdAt);
        crDate.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - crDate.getTime();
        daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // 4. Evaluate status level
    let status: SLAStatusLevel = 'en_tiempo';
    let isOverdue = false;
    let overdueDays = 0;

    if (daysInactive > slaLimitDays) {
      status = 'vencido';
      isOverdue = true;
      overdueDays = daysInactive - slaLimitDays;
    } else if (daysInactive >= Math.max(1, Math.floor(slaLimitDays * 0.65))) {
      status = 'por_vencer';
      isOverdue = false;
      overdueDays = 0;
    } else {
      status = 'en_tiempo';
      isOverdue = false;
      overdueDays = 0;
    }

    let label = '';
    let badgeClass = '';
    let badgeBorderClass = '';
    let badgeBgClass = '';
    let badgeTextClass = '';
    let dotColorClass = '';

    if (status === 'vencido') {
      label = `Inactiva (${daysInactive}d / ${slaLimitDays}d - ${overdueDays}d retraso)`;
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      badgeBorderClass = 'border-rose-200';
      badgeBgClass = 'bg-rose-50';
      badgeTextClass = 'text-rose-700';
      dotColorClass = 'bg-rose-500';
    } else if (status === 'por_vencer') {
      label = `Por vencer (${daysInactive}d / ${slaLimitDays}d)`;
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      badgeBorderClass = 'border-amber-200';
      badgeBgClass = 'bg-amber-50';
      badgeTextClass = 'text-amber-700';
      dotColorClass = 'bg-amber-500';
    } else {
      label = `Al día (${daysInactive}d / ${slaLimitDays}d)`;
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      badgeBorderClass = 'border-emerald-200';
      badgeBgClass = 'bg-emerald-50';
      badgeTextClass = 'text-emerald-700';
      dotColorClass = 'bg-emerald-500';
    }

    return {
      institutionId: instId,
      institutionName: instName,
      lastInteractionDate: lastDate,
      lastInteractionType: lastType,
      daysInactive,
      slaLimitDays,
      status,
      label,
      indicatorName,
      isOverdue,
      overdueDays,
      badgeClass,
      badgeBorderClass,
      badgeBgClass,
      badgeTextClass,
      dotColorClass
    };
  }, [institutions, activities, tasks, financialTransactions, catalogs]);

  const getLeadSlaInfo = useCallback((lead: { status?: string; createdAt?: string; lastInteractionDate?: string; name?: string; id?: string | number }): InstitutionSLAInfo => {
    const leadName = lead.name || 'Lead';
    const statusLower = (lead.status || 'Captación').toLowerCase().trim();
    const slaCatalog = catalogs['Fases y Alertas de Inactividad (SLA)'] || [];
    const matchedSla = slaCatalog.find(s => {
      const sName = s.name.toLowerCase().trim();
      return sName === statusLower || sName.includes(statusLower) || statusLower.includes(sName) || 
             (statusLower === 'captación' && (sName.includes('inicio') || sName.includes('captac') || sName.includes('lead')));
    });

    const slaLimitDays = (matchedSla && matchedSla.slaDays !== undefined && matchedSla.slaDays !== null) ? matchedSla.slaDays : 3;
    const indicatorName = (statusLower === 'captación' || statusLower === 'inicio') 
      ? (matchedSla?.name || 'Captación (Inicio)') 
      : (matchedSla?.name || lead.status || 'Captación (Inicio)');

    let lastDate: string | null = lead.lastInteractionDate || lead.createdAt || null;
    let daysInactive = 0;
    if (lastDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const interDate = new Date(lastDate);
      interDate.setHours(0, 0, 0, 0);
      if (!isNaN(interDate.getTime())) {
        const diffMs = today.getTime() - interDate.getTime();
        daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    let status: SLAStatusLevel = 'en_tiempo';
    let isOverdue = false;
    let overdueDays = 0;

    if (daysInactive > slaLimitDays) {
      status = 'vencido';
      isOverdue = true;
      overdueDays = daysInactive - slaLimitDays;
    } else if (daysInactive >= Math.max(1, Math.floor(slaLimitDays * 0.65))) {
      status = 'por_vencer';
    }

    return {
      institutionId: Number(lead.id) || 0,
      institutionName: leadName,
      lastInteractionDate: lastDate,
      lastInteractionType: 'Interacción CRM',
      daysInactive,
      slaLimitDays,
      status,
      label: status === 'vencido' 
        ? `Inactiva (${daysInactive}d / ${slaLimitDays}d - ${overdueDays}d retraso)` 
        : status === 'por_vencer' 
        ? `Por vencer (${daysInactive}d / ${slaLimitDays}d)` 
        : `Al día (${daysInactive}d / ${slaLimitDays}d)`,
      indicatorName,
      isOverdue,
      overdueDays,
      badgeClass: status === 'vencido' 
        ? 'bg-rose-50 text-rose-700 border-rose-200' 
        : status === 'por_vencer' 
        ? 'bg-amber-50 text-amber-700 border-amber-200' 
        : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeBorderClass: status === 'vencido' ? 'border-rose-200' : status === 'por_vencer' ? 'border-amber-200' : 'border-emerald-200',
      badgeBgClass: status === 'vencido' ? 'bg-rose-50' : status === 'por_vencer' ? 'bg-amber-50' : 'bg-emerald-50',
      badgeTextClass: status === 'vencido' ? 'text-rose-700' : status === 'por_vencer' ? 'text-amber-700' : 'text-emerald-700',
      dotColorClass: status === 'vencido' ? 'bg-rose-500' : status === 'por_vencer' ? 'bg-amber-500' : 'bg-emerald-500'
    };
  }, [catalogs]);

  const slaSummary = useMemo(() => {
    const alerts: InstitutionSLAInfo[] = institutions.map(i => getInstitutionSLA(i));
    const enTiempo = alerts.filter(a => a.status === 'en_tiempo').length;
    const porVencer = alerts.filter(a => a.status === 'por_vencer').length;
    const vencidos = alerts.filter(a => a.status === 'vencido').length;
    return {
      total: institutions.length,
      enTiempo,
      porVencer,
      vencidos,
      alerts
    };
  }, [institutions, getInstitutionSLA]);

  const addProviderProductService = (service: Omit<ProviderProductService, "id">) => {
    const newService = { ...service, id: generateUniqueId() };
    setProviderProductServices(prev => [...prev, newService]);
  };

  const updateProviderProductService = (id: number, data: Partial<ProviderProductService>) => {
    setProviderProductServices(prev => prev.map(s => {
      if (s.id === id) {
        const fieldsChanged: AuditFieldChange[] = [];
        if (data.countryPrices !== undefined) {
          data.countryPrices.forEach(newCp => {
            const oldCp = s.countryPrices.find(ocp => ocp.country === newCp.country);
            if (oldCp) {
              if (newCp.priceFullCredit !== oldCp.priceFullCredit) {
                fieldsChanged.push({
                  fieldName: `Precio Full Credit (${newCp.country})`,
                  oldValue: oldCp.priceFullCredit,
                  newValue: newCp.priceFullCredit
                });
              }
              if (newCp.costFullCredit !== oldCp.costFullCredit) {
                fieldsChanged.push({
                  fieldName: `Costo Full Credit (${newCp.country})`,
                  oldValue: oldCp.costFullCredit,
                  newValue: newCp.costFullCredit
                });
              }
              if (newCp.priceHalfCredit !== oldCp.priceHalfCredit) {
                fieldsChanged.push({
                  fieldName: `Precio Half Credit (${newCp.country})`,
                  oldValue: oldCp.priceHalfCredit,
                  newValue: newCp.priceHalfCredit
                });
              }
              if (newCp.costHalfCredit !== oldCp.costHalfCredit) {
                fieldsChanged.push({
                  fieldName: `Costo Half Credit (${newCp.country})`,
                  oldValue: oldCp.costHalfCredit,
                  newValue: newCp.costHalfCredit
                });
              }
            } else {
              fieldsChanged.push({
                fieldName: `Nuevas Tarifas (${newCp.country})`,
                oldValue: 'Ninguna',
                newValue: `Full: ${newCp.priceFullCredit}/${newCp.costFullCredit}`
              });
            }
          });
        }

        if (fieldsChanged.length > 0) {
          const prov = providers.find(p => p.id === s.providerId);
          const provName = prov ? prov.commercialName : `Proveedor ID ${s.providerId}`;
          const desc = `Modificación de Tarifas del Proveedor ${provName} para el servicio/clase "${s.name}": ` + 
            fieldsChanged.map(f => `${f.fieldName} de ${f.oldValue} a ${f.newValue}`).join('; ');
          addAuditLog({
            entityType: 'providerProductService',
            entityId: s.id,
            entityName: `${provName} - ${s.name}`,
            description: desc,
            fieldsChanged
          });
        }
        return { ...s, ...data };
      }
      return s;
    }));
  };

  const deleteProviderProductService = (id: number) => {
    setProviderProductServices(prev => prev.filter(s => s.id !== id));
  };

  const addProviderSpecificProduct = (prod: Omit<ProviderSpecificProduct, "id">) => {
    const newProduct = { ...prod, id: generateUniqueId() };
    setProviderSpecificProducts(prev => [...prev, newProduct]);
  };

  const updateProviderSpecificProduct = (id: number, data: Partial<ProviderSpecificProduct>) => {
    setProviderSpecificProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deleteProviderSpecificProduct = (id: number) => {
    setProviderSpecificProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateSystemRoles = async (newRoles: Role[]) => {
    setSystemRoles(newRoles);
    setInMemorySystemRoles(newRoles);
    addAuditLog({
      actionType: 'settings_change',
      severity: 'alta',
      entityType: 'role',
      entityId: 'system-roles',
      entityName: 'Matriz de Permisos del Sistema',
      description: `Actualización de matriz de seguridad: Modificación de permisos de acceso en roles de usuario.`
    });
  };

  const restoreDefaultRoles = async () => {
    setSystemRoles(DEFAULT_ROLES);
    setInMemorySystemRoles(DEFAULT_ROLES);
    addAuditLog({
      actionType: 'settings_change',
      severity: 'alta',
      entityType: 'role',
      entityId: 'system-roles',
      entityName: 'Matriz de Permisos del Sistema',
      description: `Restablecimiento de fábrica: Se restauraron los roles y permisos por defecto del sistema.`
    });
  };

  const addSystemRole = async (roleData: Omit<Role, "id">) => {
    const newRole: Role = {
      ...roleData,
      id: String(generateUniqueId())
    };
    const updated = [...systemRoles, newRole];
    setSystemRoles(updated);
    setInMemorySystemRoles(updated);
    return newRole;
  };

  const deleteSystemRole = async (id: string) => {
    const updated = systemRoles.filter(r => r.id !== id);
    setSystemRoles(updated);
    setInMemorySystemRoles(updated);
  };

  // Ensure 'wrhg1970@gmail.com' is registered as a Superadministrador on initialization
  useEffect(() => {
    const adminEmail = 'wrhg1970@gmail.com';
    const existingIndex = users.findIndex(u => u.email?.trim().toLowerCase() === adminEmail);
    if (existingIndex === -1) {
      setUsers(prev => {
        const checkAgain = prev.some(u => u.email?.trim().toLowerCase() === adminEmail);
        if (!checkAgain) {
          return [...prev, {
            id: 6,
            name: 'Administrador (Google)',
            role: 'Superadministrador',
            email: adminEmail
          }];
        }
        return prev;
      });
    } else {
      const existingUser = users[existingIndex];
      if (existingUser.role !== 'Superadministrador') {
        setUsers(prev => prev.map(u => u.email?.trim().toLowerCase() === adminEmail ? { ...u, role: 'Superadministrador' } : u));
      }
    }
  }, [users]);

  return (
    <AppContext.Provider value={{
      firebaseSyncCompleted,
      syncErrors,
      institutions, students, classes, providers, bankAccounts, enrollments, payments, auditLogs, addAuditLog, clearAuditLogs, deleteAuditLog, contacts, tasks, activities, catalogs, users, currentUser, setCurrentUser,
      teams, addTeam, updateTeam, deleteTeam,
      providerProductServices, addProviderProductService, updateProviderProductService, deleteProviderProductService,
      providerSpecificProducts, addProviderSpecificProduct, updateProviderSpecificProduct, deleteProviderSpecificProduct,
      companyInfo, updateCompanyInfo, companyDocuments, addCompanyDocument, updateCompanyDocument, deleteCompanyDocument,
      financeCategories, addFinanceCategory, updateFinanceCategory, deleteFinanceCategory,
      financialTransactions, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction,
      accountStatements, statementTransactions, addAccountStatement, deleteAccountStatement, updateStatementTransaction, deleteStatementTransaction,
      addInstitution, updateInstitution, addInstitutionDocuments, deleteInstitutionDocument, deleteInstitution, clearAllInstitutions, clearAllClasses, addStudent, updateStudent, deleteStudent, addClass, updateClass, deleteClass, addProvider, updateProvider, addBankAccount, updateBankAccount, addPayment, updatePayment, deletePayment, addEnrollment, updateEnrollment, deleteEnrollment, syncEnrollmentStatuses,
      addContact, updateContact, deleteContact, addTask, updateTask, deleteTask, notifyTaskAssignee, notifyTaskDeadline, triggerDeadlineScan, addActivity, addCatalogItem, updateCatalogItem, deleteCatalogItem, addUser, updateUser, deleteUser,
      getInstitutionSLA, updateInstitutionLastInteraction, slaSummary, getLeadSlaInfo,
      backups, triggerFullBackup, restoreBackup, deleteBackup,
      backupSchedule, updateBackupSchedule, triggerGoogleDriveBackup,
      systemRoles, updateSystemRoles, restoreDefaultRoles, addSystemRole, deleteSystemRole,
      dbMetrics, resetDbMetrics
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
