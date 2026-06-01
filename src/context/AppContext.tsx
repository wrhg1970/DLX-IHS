import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface Institution {
  id: number;
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
}

interface AppContextType {
  institutions: Institution[];
  students: Student[];
  classes: ClassItem[];
  providers: Provider[];
  enrollments: Enrollment[];
  payments: Payment[];
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
          currencySuffix = 'MXN';
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
        priceFullCredit: '$1,000 MXN',
        priceHalfCredit: '$500 MXN',
        priceFullApCredit: '$1,200 MXN',
        priceHalfApCredit: '$600 MXN'
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

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[Storage Quota Limit] No se pudo guardar el campo "${key}" en localStorage:`, error);
  }
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

  const [institutions, setInstitutions] = useState<Institution[]>(() => loadSaved('institutions', []));

  const [students, setStudents] = useState<Student[]>(() => loadSaved('students', []));

  const [classes, setClasses] = useState<ClassItem[]>(() => loadSaved('classes', []));

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => loadSaved('enrollments', []));

  const [providers, setProviders] = useState<Provider[]>(() => loadSaved('providers', []));

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => loadSaved('bankAccounts', []));
  const [payments, setPayments] = useState<Payment[]>(() => loadSaved('payments', []));
  const [contacts, setContacts] = useState<Contact[]>(() => loadSaved('contacts', []));
  const [tasks, setTasks] = useState<Task[]>(() => loadSaved('tasks', []));
  const [activities, setActivities] = useState<Activity[]>(() => loadSaved('activities', []));
  
  const [users, setUsers] = useState<User[]>(() => loadSaved('users', [
    { id: 1, name: 'Admin Principal', role: 'Superadministrador', email: 'admin@ihs.com' },
    { id: 2, name: 'Director Financiero', role: 'Finanzas', email: 'finanzas@ihs.com' },
    { id: 3, name: 'Coordinador Académico', role: 'Academia', email: 'academico@ihs.com' },
    { id: 4, name: 'Usuario Alumno (Demo)', role: 'Alumno', email: 'alumno@ihs.com', studentId: 1 },
    { id: 5, name: 'Coordinador Institución (Demo)', role: 'Coordinador', email: 'coordinador@ihs.com', institutionId: 1 },
    { id: 6, name: 'Administrador (Google)', role: 'Superadministrador', email: 'wrhg1970@gmail.com' }
  ]));
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) return JSON.parse(saved);
    return { id: 1, name: 'Admin Principal', role: 'Superadministrador', email: 'admin@ihs.com' }; // Default logged in
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
        { id: '2', name: 'Estados Unidos de America' },
        { id: '3', name: 'Canadá' },
        { id: '4', name: 'España' },
        { id: '5', name: 'Reino Unido' },
        { id: '6', name: 'Australia' }
      ],
      'Tipos de Institución': [
        { id: '1', name: 'Colegio Internacional' },
        { id: '2', name: 'Universidad' },
        { id: '3', name: 'Academia de Idiomas' },
        { id: '4', name: 'Corporativo' }
      ],
      'Monedas': [
        { id: '1', name: 'MXN - Peso Mexicano' },
        { id: '2', name: 'USD - Dólar' },
        { id: '3', name: 'EUR - Euro' }
      ],
      'Roles de Usuario': [
        { id: '1', name: 'Superadministrador' },
        { id: '2', name: 'Finanzas' },
        { id: '3', name: 'Academia' },
        { id: '4', name: 'Ventas' }
      ],
      'Métodos de Pago': [
        { id: '1', name: 'Transferencia Bancaria' },
        { id: '2', name: 'Tarjeta de Crédito' },
        { id: '3', name: 'Efectivo' }
      ],
      'Estados Académicos': [
        { id: '1', name: 'Activo' },
        { id: '2', name: 'Baja' },
        { id: '3', name: 'Egresado' },
        { id: '4', name: 'Suspendido' }
      ],
      'Categorías': defaultCats,
      'Subcategorías': defaultSubcats,
      'Membresías': [],
      'Cuentas bancarias': [],
      'Modalidades': [
        { id: '1', name: 'Presencial' },
        { id: '2', name: 'Online / Semipresencial' },
        { id: '3', name: 'Híbrida' },
        { id: '4', name: 'Intercambio' }
      ],
      'Tipo de Producto': [
        { id: '1', name: 'Syllabus Académico' },
        { id: '2', name: 'Curso de Idiomas' },
        { id: '3', name: 'Certificación AP' },
        { id: '4', name: 'Consultoría / Tutoría' },
        { id: '5', name: 'Seguros Médicos' },
        { id: '6', name: 'Excursión / Programa' }
      ]
    };

    const saved = loadSaved<any>('catalogs', fallback);
    
    // Migrate saved 'Países y Regiones' to 'Tarifas Países' if present
    if (saved['Países y Regiones'] && (!saved['Tarifas Países'] || saved['Tarifas Países'].length === 0)) {
      saved['Tarifas Países'] = saved['Países y Regiones'];
      delete saved['Países y Regiones'];
    }

    // Safety check to migrate/inject items even if they exist but have empty catalogs
    if (!saved['Categorías'] || saved['Categorías'].length === 0) {
      saved['Categorías'] = defaultCats;
    }
    if (!saved['Tarifas Países'] || saved['Tarifas Países'].length === 0 || saved['Tarifas Países'].some((item: any) => item.name === 'China' || item.name === 'Estados Unidos' || item.name === 'Japón')) {
      saved['Tarifas Países'] = fallback['Tarifas Países'];
    }
    if (!saved['Subcategorías'] || saved['Subcategorías'].length === 0) {
      saved['Subcategorías'] = defaultSubcats;
    }
    if (!saved['Cuentas bancarias']) {
      saved['Cuentas bancarias'] = [];
    }
    if (!saved['Modalidades'] || saved['Modalidades'].length === 0) {
      saved['Modalidades'] = fallback['Modalidades'];
    }
    if (!saved['Tipo de Producto'] || saved['Tipo de Producto'].length === 0) {
      saved['Tipo de Producto'] = fallback['Tipo de Producto'];
    }
    return saved;
  });

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => loadSaved('companyInfo', {
    commercialName: 'Mi Empresa S.A.',
    legalName: 'Mi Empresa S.A. de C.V.',
    rfc: 'AAA010101AAA',
    baseCurrency: 'MXN',
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

  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => loadSaved('financialTransactions', []));
  const [accountStatements, setAccountStatements] = useState<AccountStatement[]>(() => loadSaved('accountStatements', []));
  const [statementTransactions, setStatementTransactions] = useState<StatementTransaction[]>(() => loadSaved('statementTransactions', []));
  const [providerProductServices, setProviderProductServices] = useState<ProviderProductService[]>(() => loadSaved('providerProductServices', [
    {
      id: 1,
      providerId: 1,
      productType: "Clase",
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
  ]));
  const [providerSpecificProducts, setProviderSpecificProducts] = useState<ProviderSpecificProduct[]>(() => loadSaved('providerSpecificProducts', [
    { id: 1, providerId: 1, name: "Historia Mundial Avanzada", productType: "Clase" },
    { id: 2, providerId: 1, name: "Pearson LMS Full Access", productType: "Plataforma" }
  ]));

  useEffect(() => { safeSetItem('institutions', JSON.stringify(institutions)); }, [institutions]);
  useEffect(() => { safeSetItem('students', JSON.stringify(students)); }, [students]);
  useEffect(() => { safeSetItem('classes', JSON.stringify(classes)); }, [classes]);
  useEffect(() => { safeSetItem('enrollments', JSON.stringify(enrollments)); }, [enrollments]);
  useEffect(() => { safeSetItem('providers', JSON.stringify(providers)); }, [providers]);
  useEffect(() => { safeSetItem('bankAccounts', JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { safeSetItem('payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { safeSetItem('contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { safeSetItem('tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { safeSetItem('activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { safeSetItem('users', JSON.stringify(users)); }, [users]);
  useEffect(() => { safeSetItem('currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { safeSetItem('catalogs', JSON.stringify(catalogs)); }, [catalogs]);
  useEffect(() => { safeSetItem('companyInfo', JSON.stringify(companyInfo)); }, [companyInfo]);
  useEffect(() => { safeSetItem('companyDocuments', JSON.stringify(companyDocuments)); }, [companyDocuments]);
  useEffect(() => { safeSetItem('financeCategories', JSON.stringify(financeCategories)); }, [financeCategories]);
  useEffect(() => { safeSetItem('financialTransactions', JSON.stringify(financialTransactions)); }, [financialTransactions]);
  useEffect(() => { safeSetItem('accountStatements', JSON.stringify(accountStatements)); }, [accountStatements]);
  useEffect(() => { safeSetItem('statementTransactions', JSON.stringify(statementTransactions)); }, [statementTransactions]);
  useEffect(() => { safeSetItem('providerProductServices', JSON.stringify(providerProductServices)); }, [providerProductServices]);
  useEffect(() => { safeSetItem('providerSpecificProducts', JSON.stringify(providerSpecificProducts)); }, [providerSpecificProducts]);

  const [firebaseSyncCompleted, setFirebaseSyncCompleted] = useState(false);

  // Initial Sync from Firestore with migration fallback to recover previous simulation data
  useEffect(() => {
    async function initFirestoreSync() {
      try {
        const { getDocs, collection, doc, setDoc } = await import('firebase/firestore');
        const { testFirebaseConnection } = await import('../lib/firebase');

        // Test database handshake
        await testFirebaseConnection();

        // Sub-function to safely query or back up a collection
        const syncCollection = async <T extends { id: string | number }>(
          collectionName: string,
          localList: T[],
          setter: (val: T[]) => void
        ) => {
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
                await setDoc(doc(db, collectionName, String(item.id)), item);
              }
            }
          } catch (e) {
            console.error(`Error syncing collection ${collectionName}:`, e);
          }
        };

        // Sync main collections
        await syncCollection('users', users, setUsers);
        await syncCollection('institutions', institutions, setInstitutions);
        await syncCollection('students', students, setStudents);
        await syncCollection('classes', classes, setClasses);
        await syncCollection('enrollments', enrollments, setEnrollments);
        await syncCollection('providers', providers, setProviders);
        await syncCollection('bankAccounts', bankAccounts, setBankAccounts);
        await syncCollection('payments', payments, setPayments);
        await syncCollection('contacts', contacts, setContacts);
        await syncCollection('tasks', tasks, setTasks);
        await syncCollection('activities', activities, setActivities);
        await syncCollection('financialTransactions', financialTransactions, setFinancialTransactions);

        setFirebaseSyncCompleted(true);
        console.log("Firebase Database initial sync completed successfully.");
      } catch (err) {
        console.error("Firebase initial synchronization failed:", err);
        setFirebaseSyncCompleted(true);
      }
    }

    initFirestoreSync();
  }, []);

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

      const addedOrUpdated = list.filter(item => {
        const prev = prevRef.current.find(p => p.id === item.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(item);
      });

      const deleted = prevRef.current.filter(prev => !list.some(item => item.id === prev.id));

      if (addedOrUpdated.length > 0 || deleted.length > 0) {
        import('firebase/firestore').then(async ({ doc, setDoc, deleteDoc }) => {
          addedOrUpdated.forEach(item => {
            setDoc(doc(db, collectionName, String(item.id)), item).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
            });
          });

          deleted.forEach(item => {
            deleteDoc(doc(db, collectionName, String(item.id))).catch(err => {
              handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${item.id}`);
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
  useIncrementalFirebaseSync(contacts, 'contacts');
  useIncrementalFirebaseSync(tasks, 'tasks');
  useIncrementalFirebaseSync(activities, 'activities');
  useIncrementalFirebaseSync(financialTransactions, 'financialTransactions');

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
        localStorage.setItem('students', JSON.stringify(uniqueStudents));
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
            localStorage.setItem('enrollments', JSON.stringify(updated));
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
            localStorage.setItem('payments', JSON.stringify(updated));
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
            localStorage.setItem('financialTransactions', JSON.stringify(updated));
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
            localStorage.setItem('contacts', JSON.stringify(updated));
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
            localStorage.setItem('tasks', JSON.stringify(updated));
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
            localStorage.setItem('activities', JSON.stringify(updated));
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
            localStorage.setItem('users', JSON.stringify(updated));
            setUsers(updated);
          }
        }

        // 9. Update currentUser
        const storedCurrentUser = localStorage.getItem('currentUser');
        if (storedCurrentUser) {
          const parsed = JSON.parse(storedCurrentUser);
          if (parsed && parsed.studentId && mergedMap.has(parsed.studentId)) {
            const updated = { ...parsed, studentId: mergedMap.get(parsed.studentId)! };
            localStorage.setItem('currentUser', JSON.stringify(updated));
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
    const amount = tx.amount;
    const rate = tx.exchangeRate;
    const amountMXN = tx.currency === 'USD' ? amount * rate : amount;
    const finalAmount = tx.currency === 'USD' ? amount : (rate !== 0 ? amount / rate : 0);
    
    setFinancialTransactions(prev => [...prev, { 
      ...tx, 
      id: Math.random().toString(36).substring(2, 9),
      amountMXN,
      finalAmount
    }]);

    if (tx.studentId || tx.providerId || tx.institutionId) {
      addActivity({
        institutionId: tx.institutionId || (tx.studentId ? students.find(s => s.id === tx.studentId)?.institutionId || 0 : 0),
        date: new Date().toISOString(),
        description: `${tx.type === 'income' ? 'Pago Recibido' : 'Pago Realizado'}: ${tx.description} (${amount} ${tx.currency})`
      });
    }
  };

  const updateFinancialTransaction = (id: string, data: Partial<FinancialTransaction>) => {
    setFinancialTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const amount = data.amount !== undefined ? data.amount : t.amount;
        const currency = data.currency !== undefined ? data.currency : t.currency;
        const rate = data.exchangeRate !== undefined ? data.exchangeRate : t.exchangeRate;
        
        const amountMXN = currency === 'USD' ? amount * rate : amount;
        const finalAmount = currency === 'USD' ? amount : (rate !== 0 ? amount / rate : 0);
        
        addActivity({
          institutionId: t.studentId ? students.find(s => s.id === t.studentId)?.institutionId || 0 : 0,
          date: new Date().toISOString(),
          description: `Modificó registro de pago: ${data.description || t.description}`
        });

        return { ...t, ...data, amountMXN, finalAmount };
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
    setUsers(prev => [...prev, { ...user, id: Date.now() }]);
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
    const newInstId = inst.id || Date.now() + Math.floor(Math.random() * 100000);
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
    setStudents(prev => [...prev, { ...student, id: Date.now() + Math.floor(Math.random() * 100000) }]);
  };

  const deleteStudent = (id: number) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const addClass = (cls: Omit<ClassItem, "id">) => {
    setClasses(prev => [...prev, { ...cls, id: Date.now() + Math.floor(Math.random() * 100000) }]);
  };

  const updateClass = (id: number, data: Partial<ClassItem>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteClass = (id: number) => {
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  const addProvider = (prov: Omit<Provider, "id">) => {
    setProviders(prev => [...prev, { ...prov, id: Date.now() + Math.floor(Math.random() * 100000) }]);
  };

  const updateProvider = (id: number, data: Partial<Provider>) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const addBankAccount = (account: Omit<BankAccount, "id">) => {
    setBankAccounts(prev => [...prev, { ...account, id: Date.now() + Math.floor(Math.random() * 100000) }]);
  };

  const updateBankAccount = (id: number, data: Partial<BankAccount>) => {
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };

  const updateStudent = (id: number | number[], data: Partial<Student>) => {
    const ids = (Array.isArray(id) ? id : [id]).map(String);
    setStudents(prev => {
      const updated = prev.map(s => ids.includes(String(s.id)) ? { ...s, ...data } : s);
      // Immediately commit to localStorage to guarantee data survival on reload/batch
      try {
        localStorage.setItem('students', JSON.stringify(updated));
      } catch (err) {
        console.error("Error writing students to localStorage in updateStudent:", err);
      }
      return updated;
    });
  };

  const addPayment = (payment: Omit<Payment, "id">) => {
    setPayments(prev => [...prev, { ...payment, id: Date.now() + Math.floor(Math.random() * 100000) }]);
  };

  const updatePayment = (id: number, data: Partial<Payment>) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deletePayment = (id: number) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const addEnrollment = (enrollment: Omit<Enrollment, "id">) => {
    setEnrollments(prev => [...prev, { ...enrollment, id: Date.now() + Math.floor(Math.random() * 100000) }]);
  };

  const updateEnrollment = (id: number, data: Partial<Enrollment>) => {
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteEnrollment = (id: number) => {
    setEnrollments(prev => prev.filter(e => e.id !== id));
  };

  const addContact = (contact: Omit<Contact, "id">) => {
    const newContact = { ...contact, id: Date.now() + Math.floor(Math.random() * 100000) };
    setContacts(prev => [...prev, newContact]);
    addActivity({ institutionId: contact.institutionId, date: new Date().toISOString(), description: `Contacto ${contact.name} ${contact.lastName} añadido.` });
    
    if (newContact.systemAccess && newContact.email && newContact.institutionId) {
      setUsers(prevUsers => {
        const emailLower = newContact.email.toLowerCase();
        const userExists = prevUsers.some(u => u.email.toLowerCase() === emailLower);
        if (!userExists) {
          return [...prevUsers, {
            id: Date.now() + Math.floor(Math.random() * 1000),
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
                id: Date.now() + Math.floor(Math.random() * 1000),
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
    const newTask = { ...task, id: Date.now() + Math.floor(Math.random() * 100000) };
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
      id: Date.now() + Math.floor(Math.random() * 100000),
      userName: currentUser?.name || 'Sistema'
    }, ...prev]);
  };

  const addProviderProductService = (service: Omit<ProviderProductService, "id">) => {
    const newService = { ...service, id: Date.now() + Math.floor(Math.random() * 1000) };
    setProviderProductServices(prev => [...prev, newService]);
  };

  const updateProviderProductService = (id: number, data: Partial<ProviderProductService>) => {
    setProviderProductServices(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteProviderProductService = (id: number) => {
    setProviderProductServices(prev => prev.filter(s => s.id !== id));
  };

  const addProviderSpecificProduct = (prod: Omit<ProviderSpecificProduct, "id">) => {
    const newProduct = { ...prod, id: Date.now() + Math.floor(Math.random() * 1000) };
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
      institutions, students, classes, providers, bankAccounts, enrollments, payments, contacts, tasks, activities, catalogs, users, currentUser, setCurrentUser,
      providerProductServices, addProviderProductService, updateProviderProductService, deleteProviderProductService,
      providerSpecificProducts, addProviderSpecificProduct, updateProviderSpecificProduct, deleteProviderSpecificProduct,
      companyInfo, updateCompanyInfo, companyDocuments, addCompanyDocument, updateCompanyDocument, deleteCompanyDocument,
      financeCategories, addFinanceCategory, updateFinanceCategory, deleteFinanceCategory,
      financialTransactions, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction,
      accountStatements, statementTransactions, addAccountStatement, deleteAccountStatement, updateStatementTransaction, deleteStatementTransaction,
      addInstitution, updateInstitution, deleteInstitution, clearAllInstitutions, clearAllClasses, addStudent, updateStudent, deleteStudent, addClass, updateClass, deleteClass, addProvider, updateProvider, addBankAccount, updateBankAccount, addPayment, updatePayment, deletePayment, addEnrollment, updateEnrollment, deleteEnrollment,
      addContact, updateContact, deleteContact, addTask, updateTask, deleteTask, addActivity, addCatalogItem, updateCatalogItem, deleteCatalogItem, addUser, updateUser, deleteUser
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
