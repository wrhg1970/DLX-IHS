import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

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

export interface Institution {
  id: number;
  institutionCode?: string;
  name: string;
  country: string;
  contact: string;
  students: number;
  status: string;
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
}

export interface Campus {
  id: string;
  name: string;
  cityCountry: string;
  contact: string;
  phone: string;
}

export interface InstitutionDocument {
  id: string;
  name: string;
  fileSize: string;
  uploadDate: string;
}

export interface ExtraService {
  id: string;
  name: string;
  cost: number;
  currency: string;
  notes?: string;
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
}

export interface ClassItem {
  id: number;
  name: string;
  code?: string;
  creditType: 'Crédito completo' | 'Medio Crédito' | 'Crédito completo AP' | 'Medio Crédito AP';
  syllabus?: string;
  validity?: string;
  providerId?: number;
  credits?: number;
  cost?: string;
  price?: string;
  enrolled?: number;
  hours?: string;
  countryRates?: Record<string, { cost: string; price: string }>;
}

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
  status?: 'Active' | 'Completed' | 'On hold' | 'Withdrawn';
  notes?: string;
  curp?: string;
  lugar?: 'Escuela' | 'Casa';
  resultadoUrl?: string;
  resultadoFileName?: string;
  usuario?: string;
  contrasena?: string;
  area?: string;
  destino?: string;
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

export interface Task {
  id: number;
  institutionId?: number;
  title: string;
  dueDate: string;
  status: 'Pendiente' | 'Completada';
  userId?: number;
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

export interface AuditLog {
  id: string;
  entityType: 'payment' | 'financialTransaction' | 'provider' | 'providerProductService';
  entityId: string | number;
  entityName: string;
  date: string;
  description: string;
  userName: string;
  fieldsChanged?: AuditFieldChange[];
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
  | 'Tipo de Producto';

export interface AgentBankAccount {
  id: string;
  bankName: string;
  clabe: string;
  accountNo: string;
  currency: string;
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
}

export interface User {
  id: number;
  name: string;
  role: string;
  email: string;
  phone?: string;
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
}

interface AppContextType {
  syncErrors: Array<{ collection: string; error: string; time: string }>;
  institutions: Institution[];
  students: Student[];
  classes: ClassItem[];
  providers: Provider[];
  enrollments: Enrollment[];
  payments: Payment[];
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, "id" | "date" | "userName">) => void;
  bankAccounts: BankAccount[];
  contacts: Contact[];
  tasks: Task[];
  activities: Activity[];
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
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
  addContact: (contact: Omit<Contact, "id">) => void;
  updateContact: (id: number, data: Partial<Contact>) => void;
  deleteContact: (id: number) => void;
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: number, data: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  addActivity: (activity: Omit<Activity, "id">) => void;
  addCatalogItem: (catalog: CatalogTypes, item: Omit<CatalogItem, "id">) => void;
  updateCatalogItem: (catalog: CatalogTypes, id: string, data: Partial<CatalogItem>) => void;
  deleteCatalogItem: (catalog: CatalogTypes, id: string) => void;
  backups: any[];
  triggerFullBackup: (type: 'Automático' | 'Manual') => Promise<any>;
  restoreBackup: (backup: any) => boolean;
  deleteBackup: (id: string) => void;
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
  try {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value, cleanLocalStorageReplacer);
    localStorage.setItem(key, stringified);
  } catch (error) {
    console.warn(`[Storage Quota Limit] No se pudo guardar el campo "${key}" en localStorage:`, error);
  }
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

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => loadSaved('enrollments', []));

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
  
  const [users, setUsers] = useState<User[]>(() => loadSaved('users', [
    { id: 1, name: 'Admin Principal', role: 'Superadministrador', email: 'admin@ihs.com', password: 'admin123' },
    { id: 2, name: 'Director Financiero', role: 'Finanzas', email: 'finanzas@ihs.com', password: 'finanzas123' },
    { id: 3, name: 'Coordinador Académico', role: 'Academia', email: 'academico@ihs.com', password: 'academico123' },
    { id: 4, name: 'Usuario Alumno (Demo)', role: 'Alumno', email: 'alumno@ihs.com', studentId: 1, password: 'alumno123' },
    { id: 5, name: 'Coordinador Institución (Demo)', role: 'Coordinador', email: 'coordinador@ihs.com', institutionId: 1, password: 'coordinador123' },
    { id: 6, name: 'Administrador (Google)', role: 'Superadministrador', email: 'wrhg1970@gmail.com', password: 'google123' }
  ]));
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) return JSON.parse(saved);
    return null; // Start at the improved login screen for a professional experience
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
      ]
    };

    const saved = loadSaved<any>('catalogs', fallback);
    
    // Safety check to migrate/inject items even if they exist but have empty catalogs
    if (!saved['Categorías'] || saved['Categorías'].length === 0) {
      saved['Categorías'] = defaultCats;
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadSaved('auditLogs', []));
  const [backups, setBackups] = useState<any[]>(() => loadSaved('app_backups', []));

  useEffect(() => { safeSetItem('app_backups', backups); }, [backups]);

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

  // Execute full backup of all core records
  const triggerFullBackup = async (type: 'Automático' | 'Manual') => {
    try {
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
        catalogs
      };

      const backupId = 'backup_' + Date.now();
      const backupDate = new Date().toISOString();
      const payloadString = JSON.stringify(dataPayload);
      const sizeBytes = new Blob([payloadString]).size;
      const sizeReadable = (sizeBytes / 1024).toFixed(1) + " KB";
      
      let totalRecords = 0;
      Object.values(dataPayload).forEach(arr => {
        if (Array.isArray(arr)) {
          totalRecords += arr.length;
        } else if (arr && typeof arr === 'object') {
          totalRecords += Object.keys(arr).length * 4; // approximate catalogs weight
        }
      });

      // Automatically download the file to the browser
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

      const newBackup = {
        id: backupId,
        date: backupDate,
        type,
        size: sizeReadable,
        records: totalRecords
      };

      setBackups(prev => [newBackup, ...prev]);
      
      if (type === 'Automático') {
        localStorage.setItem('last_auto_backup_time', backupDate);
      }
      
      addAuditLog({
        entityType: 'providerProductService',
        entityId: backupId,
        entityName: `Respaldo_Seguridad_${type}`,
        description: `Creado respaldo de seguridad (${type}) exitoso. ID: ${backupId}, tamaño: ${sizeReadable}, registros: ${totalRecords}`
      });

      return newBackup;
    } catch (e) {
      console.error("Error creating full backup:", e);
      throw e;
    }
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
      if (d.companyInfo) setCompanyInfo(d.companyInfo);
      if (d.catalogs) setCatalogs(d.catalogs);

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

  // Checks for automatic weekly backup (Sunday 11:00 PM is selected by default) on system startup
  useEffect(() => {
    if (!firebaseSyncCompleted) return;

    const runAutoBackupCheck = async () => {
      const rawEnabled = localStorage.getItem('auto_backup_enabled');
      const isEnabled = rawEnabled === null ? true : rawEnabled === 'true';
      if (!isEnabled) return;

      const scheduleDayIndex = localStorage.getItem('auto_backup_day') || "Domingo";
      const scheduleTimeStr = localStorage.getItem('auto_backup_time') || "23:00";

      const mostRecentScheduledSlot = getMostRecentPastScheduledDate(scheduleDayIndex, scheduleTimeStr);
      const lastBackupStr = localStorage.getItem('last_auto_backup_time');
      
      const shouldBackup = !lastBackupStr || new Date(lastBackupStr) < mostRecentScheduledSlot;

      if (shouldBackup) {
        console.log(`[AutoBackup] Running weekly automatic backup for scheduled slot: ${mostRecentScheduledSlot.toISOString()}`);
        await triggerFullBackup('Automático');
      }
    };

    const timeoutId = setTimeout(() => {
      runAutoBackupCheck().catch(err => console.error("Error in automatic backup check:", err));
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [firebaseSyncCompleted, backups]);

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
          try {
            const snap = await getDocs(collection(db, collectionName));
            if (!snap.empty) {
              const remoteList: T[] = [];
              snap.forEach(d => {
                remoteList.push({ ...d.data() } as T);
              });
              setter(remoteList);
            } else if (localList.length > 0) {
              // Upload local simulation data to Firestore to recover it beautifully
              for (const item of localList) {
                await setDoc(doc(db, collectionName, String(item.id)), cleanForFirestore(item));
              }
            }
          } catch (e) {
            console.error(`Error syncing collection ${collectionName}:`, e);
            const errMsg = e instanceof Error ? e.message : String(e);
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
          syncCollection('enrollments', enrollments, setEnrollments),
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
          syncCollection('app_backups', backups, setBackups)
        ]);

        // Sync catalogs configuration to the cloud concurrently
        const syncCatalogs = async () => {
          if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
            return;
          }
          try {
            const snap = await getDocs(collection(db, 'catalogs'));
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
              for (const [key, items] of Object.entries(catalogs)) {
                await setDoc(doc(db, 'catalogs', key), { items: cleanForFirestore(items) });
              }
            }
          } catch (catErr) {
            console.error("Error syncing catalogs:", catErr);
            const errMsg = catErr instanceof Error ? catErr.message : String(catErr);
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
          try {
            const { getDoc } = await import('firebase/firestore');
            const dRef = doc(db, 'companyInfo', 'main');
            const d = await getDoc(dRef);
            if (d.exists()) {
              setCompanyInfo(d.data() as CompanyInfo);
            } else {
              await setDoc(dRef, cleanForFirestore(companyInfo));
            }
          } catch (compErr) {
            console.error("Error syncing companyInfo:", compErr);
            const errMsg = compErr instanceof Error ? compErr.message : String(compErr);
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
              throw jsonErr;
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

  // Synchronize dynamic catalogs modifications back to cloud
  useEffect(() => {
    if (!firebaseSyncCompleted) return;
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) return;
    
    const timer = setTimeout(() => {
      import('firebase/firestore').then(async ({ doc, setDoc }) => {
        for (const [key, items] of Object.entries(catalogs)) {
          await setDoc(doc(db, 'catalogs', key), { items: cleanForFirestore(items) }).catch(err => {
            console.error(`Error saving catalog ${key}:`, err);
          });
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [catalogs, firebaseSyncCompleted]);

  // Synchronize companyInfo updates back to cloud
  useEffect(() => {
    if (!firebaseSyncCompleted) return;
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) return;

    const timer = setTimeout(() => {
      import('firebase/firestore').then(async ({ doc, setDoc }) => {
        await setDoc(doc(db, 'companyInfo', 'main'), cleanForFirestore(companyInfo)).catch(err => {
          console.error("Error saving companyInfo:", err);
          handleFirestoreError(err, OperationType.WRITE, 'companyInfo/main');
        });
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
        import('firebase/firestore').then(async ({ doc, setDoc, deleteDoc }) => {
          addedOrUpdated.forEach(item => {
            setDoc(doc(db, collectionName, String(item.id)), cleanForFirestore(item)).catch(err => {
              const errMsg = err instanceof Error ? err.message : String(err);
              if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('resource-exhausted')) {
                if (typeof window !== 'undefined') {
                  (window as any).__firestore_quota_exceeded__ = true;
                  window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
                }
              } else {
                handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
              }
            });
          });

          deleted.forEach(item => {
            deleteDoc(doc(db, collectionName, String(item.id))).catch(err => {
              const errMsg = err instanceof Error ? err.message : String(err);
              if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('resource-exhausted')) {
                if (typeof window !== 'undefined') {
                  (window as any).__firestore_quota_exceeded__ = true;
                  window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
                }
              } else {
                handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${item.id}`);
              }
            });
          });
        });
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
    setCompanyInfo(prev => ({
      ...prev,
      ...data,
      address: { ...prev.address, ...data.address },
      socialLinks: { ...prev.socialLinks, ...data.socialLinks }
    }));
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
      const currentInstitution = currentInstId ? institutions.find(i => i.id === Number(currentInstId)) : null;
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
        const currentInstitution = currentInstId ? institutions.find(i => i.id === Number(currentInstId)) : null;
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
        const currentInstitution = currentInstId ? institutions.find(i => i.id === Number(currentInstId)) : null;
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
      if (t.id === id) {
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
          
          const student = studentId ? students.find(s => s.id === studentId) : null;
          const currentInstId = institutionId || student?.institutionId;
          const currentInstitution = currentInstId ? institutions.find(i => i.id === Number(currentInstId)) : null;
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

            const student = studentId ? students.find(s => s.id === studentId) : null;
            const currentInstId = institutionId || student?.institutionId;
            const currentInstitution = currentInstId ? institutions.find(i => i.id === Number(currentInstId)) : null;
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
          institutionId: studentId ? students.find(s => s.id === studentId)?.institutionId || 0 : 0,
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
    setFinancialTransactions(prev => prev.filter(t => t.id !== id));
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
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const deleteUser = (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
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

      return prev.map(i => i.id === id ? { ...i, ...data } : i);
    });
    addActivity({ institutionId: id, date: new Date().toISOString(), description: "Información de la institución actualizada." });
  };

  const deleteInstitution = (id: number) => {
    setInstitutions(prev => prev.filter(i => i.id !== id));
    addActivity({ institutionId: 0, date: new Date().toISOString(), description: `Institución eliminada de la base de datos.` });
  };

  const clearAllInstitutions = () => {
    setInstitutions([]);
    addActivity({ institutionId: 0, date: new Date().toISOString(), description: `Se eliminaron todas las instituciones de la base de datos.` });
  };

  const clearAllClasses = () => {
    setClasses([]);
    setEnrollments([]);
    addActivity({ institutionId: 0, date: new Date().toISOString(), description: `Se eliminaron todas las clases y créditos académicos de la base de datos.` });
  };

  const addStudent = (student: Omit<Student, "id">) => {
    setStudents(prev => [...prev, { ...student, id: generateUniqueId() }]);
  };

  const deleteStudent = (id: number) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const addClass = (cls: Omit<ClassItem, "id">) => {
    setClasses(prev => [...prev, { ...cls, id: generateUniqueId() }]);
  };

  const updateClass = (id: number, data: Partial<ClassItem>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteClass = (id: number) => {
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  const addAuditLog = (log: Omit<AuditLog, "id" | "date" | "userName">) => {
    const newLog: AuditLog = {
      ...log,
      id: "log-" + generateUniqueId().toString() + "-" + Math.random().toString(36).substring(2, 5),
      date: new Date().toISOString(),
      userName: currentUser?.name || currentUser?.email || 'Sistema'
    };
    setAuditLogs(prev => [newLog, ...prev]);
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
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const addEnrollment = (enrollment: Omit<Enrollment, "id">) => {
    setEnrollments(prev => [...prev, { ...enrollment, id: generateUniqueId() }]);
  };

  const updateEnrollment = (id: number, data: Partial<Enrollment>) => {
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
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

  const addTask = (task: Omit<Task, "id">) => {
    const newTask = { ...task, id: generateUniqueId() };
    setTasks(prev => [...prev, newTask]);
    if (task.institutionId) {
      addActivity({ institutionId: task.institutionId, date: new Date().toISOString(), description: `Tarea "${task.title}" creada.` });
    }
  };

  const updateTask = (id: number, data: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    const task = tasks.find(t => t.id === id); // This might be stale initially but it's okay for now
    if (data.status === 'Completada' && task?.institutionId) {
      addActivity({ institutionId: task.institutionId, date: new Date().toISOString(), description: `Tarea "${task.title}" marcada como completada.` });
    }
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addActivity = (activity: Omit<Activity, "id" | "userName">) => {
    setActivities(prev => [{ 
      ...activity, 
      id: generateUniqueId(),
      userName: currentUser?.name || 'Sistema'
    }, ...prev]);
  };

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
                  fieldName: `Precio Crédito Completo (${newCp.country})`,
                  oldValue: oldCp.priceFullCredit,
                  newValue: newCp.priceFullCredit
                });
              }
              if (newCp.costFullCredit !== oldCp.costFullCredit) {
                fieldsChanged.push({
                  fieldName: `Costo Crédito Completo (${newCp.country})`,
                  oldValue: oldCp.costFullCredit,
                  newValue: newCp.costFullCredit
                });
              }
              if (newCp.priceHalfCredit !== oldCp.priceHalfCredit) {
                fieldsChanged.push({
                  fieldName: `Precio Medio Crédito (${newCp.country})`,
                  oldValue: oldCp.priceHalfCredit,
                  newValue: newCp.priceHalfCredit
                });
              }
              if (newCp.costHalfCredit !== oldCp.costHalfCredit) {
                fieldsChanged.push({
                  fieldName: `Costo Medio Crédito (${newCp.country})`,
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
      syncErrors,
      institutions, students, classes, providers, bankAccounts, enrollments, payments, auditLogs, addAuditLog, contacts, tasks, activities, catalogs, users, currentUser, setCurrentUser,
      providerProductServices, addProviderProductService, updateProviderProductService, deleteProviderProductService,
      providerSpecificProducts, addProviderSpecificProduct, updateProviderSpecificProduct, deleteProviderSpecificProduct,
      companyInfo, updateCompanyInfo, companyDocuments, addCompanyDocument, updateCompanyDocument, deleteCompanyDocument,
      financeCategories, addFinanceCategory, updateFinanceCategory, deleteFinanceCategory,
      financialTransactions, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction,
      accountStatements, statementTransactions, addAccountStatement, deleteAccountStatement, updateStatementTransaction, deleteStatementTransaction,
      addInstitution, updateInstitution, deleteInstitution, clearAllInstitutions, clearAllClasses, addStudent, updateStudent, deleteStudent, addClass, updateClass, deleteClass, addProvider, updateProvider, addBankAccount, updateBankAccount, addPayment, updatePayment, deletePayment, addEnrollment, updateEnrollment, deleteEnrollment,
      addContact, updateContact, deleteContact, addTask, updateTask, deleteTask, addActivity, addCatalogItem, updateCatalogItem, deleteCatalogItem, addUser, updateUser, deleteUser,
      backups, triggerFullBackup, restoreBackup, deleteBackup
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
