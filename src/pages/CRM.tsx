import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  DollarSign, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Circle,
  Video,
  AlertCircle, 
  Calendar, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Briefcase, 
  FileText,
  FileSpreadsheet,
  HelpCircle,
  X,
  UserCheck,
  Activity as ActivityIcon,
  MousePointerClick,
  Settings,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Database
} from "lucide-react";
import { useAppContext, TaskType } from "../context/AppContext";
import { db } from "../lib/firebase";
import { Modal } from "../components/ui/Modal";
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  Cell, 
  Tooltip, 
  LabelList,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";

// Type definition for Lead
export interface CRMContactPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface CRMLead {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  source: string; // e.g. "Recomendación", "Feria Educativa", "Campaña Digital", "Llamada Fría", "LinkedIn"
  status: string;
  type: 'Institución Potencial' | 'Persona Potencial';
  value: number; // Est. value in USD
  assignedTo?: string; // Agent name/ID
  notes: string;
  createdAt: string;
  contacts?: CRMContactPerson[];
}

// Initial default seed leads
const SEED_LEADS: CRMLead[] = [
  {
    id: "lead-1",
    name: "Colegio Hamilton-Bilingual School",
    contactName: "Directora Sylvia Estrada",
    email: "sylvia.estrada@hamilton.edu.mx",
    phone: "+52 55 4567 8901",
    country: "México",
    source: "Feria Educativa",
    status: "Propuesta",
    type: "Institución Potencial",
    value: 4500,
    assignedTo: "Sofía Martínez",
    notes: "Interesados en incorporar programa piloto de 30 alumnos para cursos de invierno.",
    createdAt: "2026-05-10"
  },
  {
    id: "lead-2",
    name: "Instituto Oxford de Monterrey",
    contactName: "Ing. Roberto Cavazos",
    email: "rcavazos@oxfordmty.edu",
    phone: "+52 81 2345 6789",
    country: "México",
    source: "Recomendación",
    status: "Negociación",
    type: "Institución Potencial",
    value: 12500,
    assignedTo: "Carlos Ruiz",
    notes: "Revisando costos de envío de material complementario y membresías anuales con 10% de descuento por volumen.",
    createdAt: "2026-05-12"
  },
  {
    id: "lead-3",
    name: "Lycee Franco-Mexicain (Potential)",
    contactName: "Madame Sophie Dubois",
    email: "s.dubois@lfm.edu.mx",
    phone: "+52 55 1122 3344",
    country: "México",
    source: "LinkedIn",
    status: "Nuevo",
    type: "Institución Potencial",
    value: 8000,
    assignedTo: "Sofía Martínez",
    notes: "Contacto inicial mediante LinkedIn Sales Navigator. Mostró interés en validación académica doble norteamericana.",
    createdAt: "2026-05-24"
  },
  {
    id: "lead-4",
    name: "Colegio Vista Hermosa",
    contactName: "Lic. Andrea Lomelí",
    email: "andrea.lomeli@vistahermosa.edu.mx",
    phone: "+52 55 9876 5432",
    country: "México",
    source: "Campaña Digital",
    status: "Ganado",
    type: "Institución Potencial",
    value: 15000,
    assignedTo: "Sofía Martínez",
    notes: "¡Contrato de membresía institucional anual firmado hoy! Pendiente asignación de agente de onboarding.",
    createdAt: "2026-05-05"
  },
  {
    id: "lead-5",
    name: "Familia Gaxiola Ruiz",
    contactName: "Sra. Patricia Ruiz",
    email: "patty.ruiz@gmail.com",
    phone: "+52 66 7712 3456",
    country: "México",
    source: "Campaña Digital",
    status: "Contactado",
    type: "Persona Potencial",
    value: 1200,
    assignedTo: "Admin Global",
    notes: "Madre de familia buscando créditos de convalidación para su hijo deportista de alto rendimiento.",
    createdAt: "2026-05-22"
  },
  {
    id: "lead-6",
    name: "Colegio Americano de Guadalajara (Potential)",
    contactName: "Director Thomas Vance",
    email: "t.vance@asg.edu.mx",
    phone: "+52 33 4455 6677",
    country: "México",
    source: "Llamada Fría",
    status: "Perdido",
    type: "Institución Potencial",
    value: 6500,
    assignedTo: "Carlos Ruiz",
    notes: "Decidieron continuar con su proveedor actual de soporte de bachillerato internacional.",
    createdAt: "2026-04-10"
  }
];

const getDaysDifference = (dateString: string) => {
  if (!dateString) return 999;
  const dateVal = new Date(dateString);
  if (isNaN(dateVal.getTime())) return 999;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dateVal.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - dateVal.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const isLeadInactive = (lead: CRMLead, leadTasks: { dueDate: string }[]) => {
  const createdDaysAgo = getDaysDifference(lead.createdAt);
  if (createdDaysAgo <= 7) return false;
  
  const hasRecentOrFutureTask = leadTasks.some(task => {
    const taskDaysAgo = getDaysDifference(task.dueDate);
    return taskDaysAgo <= 7;
  });
  
  return !hasRecentOrFutureTask;
};

export function CRM() {
  const { tasks, addTask, updateTask, users } = useAppContext();
  
  // States of Leads
  const [leads, setLeads] = useState<CRMLead[]>(() => {
    const saved = localStorage.getItem("crm_leads_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing CRM leads from localStorage", e);
      }
    }
    return SEED_LEADS;
  });

  const [activeTab, setActiveTab] = useState<"Kanban" | "Tabla" | "Analytics" | "Importar">("Kanban");

  // Pipeline Stages state for custom stages support
  const [pipelineStages, setPipelineStages] = useState<string[]>(() => {
    const saved = localStorage.getItem("crm_stages_v2");
    return saved ? JSON.parse(saved) : ["Nuevo", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"];
  });

  const [newStageName, setNewStageName] = useState("");

  const handleAddStage = () => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (pipelineStages.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      alert("Esta etapa ya existe.");
      return;
    }
    const updated = [...pipelineStages];
    // We want to insert custom stages before "Ganado" and "Perdido"
    const insertIndex = updated.indexOf("Ganado");
    if (insertIndex !== -1) {
      updated.splice(insertIndex, 0, trimmed);
    } else {
      updated.push(trimmed);
    }
    setPipelineStages(updated);
    setNewStageName("");
    localStorage.setItem("crm_stages_v2", JSON.stringify(updated));
  };

  const handleRemoveStage = (stage: string) => {
    const defaultCore = ["Nuevo", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"];
    if (defaultCore.includes(stage)) {
      alert("No se puede eliminar una etapa esencial predeterminada del sistema.");
      return;
    }
    if (window.confirm(`¿Estás seguro de que deseas eliminar la etapa personalizada "${stage}"? Todos los prospectos de este estado volverán automáticamente a la etapa "Nuevo".`)) {
      const updated = pipelineStages.filter(s => s !== stage);
      setPipelineStages(updated);
      localStorage.setItem("crm_stages_v2", JSON.stringify(updated));
      
      // Move any leads of this state back to "Nuevo"
      setLeads(prev => prev.map(l => l.status === stage ? { ...l, status: "Nuevo" } : l));
    }
  };
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sourceFilter, setSourceFilter] = useState("Todos");

  // Lead modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  
  // Lead Form state
  const [leadForm, setLeadForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "México",
    source: "Recomendación",
    status: "Nuevo",
    type: "Institución Potencial" as CRMLead["type"],
    value: 3000,
    notes: "",
    assignedTo: "Admin Global",
    contacts: [] as CRMContactPerson[]
  });

  // Action/Activity modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    leadId: "",
    title: "",
    type: "Llamada" as TaskType,
    dueDate: new Date().toISOString().split("T")[0],
    syncAgenda: true
  });

  // Config Modal State for stages reordering
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  // State for confirm deletion of lead
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);
  const [isConfirmWipeModalOpen, setIsConfirmWipeModalOpen] = useState(false);

  // Tab control inside Edit Lead Modal
  const [leadModalTab, setLeadModalTab] = useState<"info" | "actividades">("info");

  // Form states for adding new activity / logging contact inside detail modal
  const [logTitle, setLogTitle] = useState("");
  const [logType, setLogType] = useState<TaskType>("Llamada");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logNotes, setLogNotes] = useState("");
  const [activityFilter, setActivityFilter] = useState<"Todas" | "Pendiente" | "Completada">("Todas");

  // States for bulk selection/updates
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkUpdateForm, setBulkUpdateForm] = useState({
    assignedTo: "",
    status: "",
    source: "",
    city: "",
    state: "",
    country: ""
  });
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [showBulkSuccessBanner, setShowBulkSuccessBanner] = useState(false);
  const [bulkAppliedSummary, setBulkAppliedSummary] = useState<{
    count: number;
    fields: { field: string; value: string }[];
    leadNames: string[];
  } | null>(null);

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLeads = () => {
    const filteredIds = filteredLeads.map(l => l.id);
    const allSelectedInFiltered = filteredLeads.length > 0 && filteredIds.every(id => selectedLeadIds.includes(id));
    if (allSelectedInFiltered) {
      setSelectedLeadIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => {
        const otherSelected = prev.filter(id => !filteredIds.includes(id));
        return [...otherSelected, ...filteredIds];
      });
    }
  };

  const initiateBulkUpdateConfirm = () => {
    if (selectedLeadIds.length === 0) return;
    
    const { assignedTo, status, source, city, state, country } = bulkUpdateForm;
    if (!assignedTo && !status && !source && !city && !state && !country) {
      alert("Por favor selecciona al menos un campo para actualizar de forma masiva.");
      return;
    }

    const fieldsToChange: { field: string; value: string }[] = [];
    if (assignedTo) fieldsToChange.push({ field: "Agente Responsable", value: assignedTo });
    if (status) fieldsToChange.push({ field: "Estatus de Pipeline", value: status });
    if (source) fieldsToChange.push({ field: "Origen", value: source });
    if (city.trim()) fieldsToChange.push({ field: "Ciudad", value: city.trim() });
    if (state.trim()) fieldsToChange.push({ field: "Estado", value: state.trim() });
    if (country.trim()) fieldsToChange.push({ field: "País", value: country.trim() });

    const selectedLeadsList = leads.filter(l => selectedLeadIds.includes(l.id));
    const leadNames = selectedLeadsList.map(l => l.name);

    setBulkAppliedSummary({
      count: selectedLeadIds.length,
      fields: fieldsToChange,
      leadNames
    });

    setShowBulkConfirmModal(true);
    setShowBulkSuccessBanner(false);
  };

  const executeBulkUpdate = () => {
    if (!bulkAppliedSummary) return;

    const { assignedTo, status, source, city, state, country } = bulkUpdateForm;

    setLeads(prev =>
      prev.map(lead => {
        if (selectedLeadIds.includes(lead.id)) {
          const updated = { ...lead };
          if (assignedTo) updated.assignedTo = assignedTo;
          if (status) updated.status = status;
          if (source) updated.source = source;
          if (city !== undefined && city.trim() !== "") updated.city = city.trim();
          if (state !== undefined && state.trim() !== "") updated.state = state.trim();
          if (country !== undefined && country.trim() !== "") updated.country = country.trim();
          return updated;
        }
        return lead;
      })
    );

    // Save summary logic flag state
    setShowBulkConfirmModal(false);
    setShowBulkSuccessBanner(true);

    // Keep the core summary details but clear form & selection
    setSelectedLeadIds([]);
    setBulkUpdateForm({
      assignedTo: "",
      status: "",
      source: "",
      city: "",
      state: "",
      country: ""
    });
  };

  // Reset selection when tab or filters change
  useEffect(() => {
    setSelectedLeadIds([]);
  }, [activeTab, searchTerm, typeFilter, statusFilter, sourceFilter]);

  const handleLogContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !logTitle.trim() || !logDate) return;

    // 1. Create completed task in central Agenda context
    addTask({
      title: `CRM Contacto: ${logTitle} - ${editingLead.name} (${editingLead.contactName})`,
      dueDate: logDate,
      status: "Completada", // Directly completed
      type: logType,
      leadId: editingLead.id,
      notes: logNotes,
      userId: users[0]?.id
    });

    // 2. Format history entry to prepend to Lead Notes
    const timestamp = new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const activityEntry = `[${logType} - ${logDate} (${timestamp})]: ${logTitle}. Notas: ${logNotes}`;
    const updatedNotes = `${activityEntry}\n${editingLead.notes}`;

    // Update leads lists in state
    const updatedLeads = leads.map(l => l.id === editingLead.id ? { ...l, notes: updatedNotes } : l);
    setLeads(updatedLeads);
    localStorage.setItem("crm_leads_v1", JSON.stringify(updatedLeads));
    
    // Maintain the open editingLead reference so the UI renders it instantly
    setEditingLead(prev => prev ? { ...prev, notes: updatedNotes } : null);

    // Reset log contact form states
    setLogTitle("");
    setLogNotes("");
    alert(`¡Contacto registrado exitosamente y sincronizado en la Agenda central!`);
  };

  const handleMoveStageUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pipelineStages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setPipelineStages(updated);
    localStorage.setItem("crm_stages_v2", JSON.stringify(updated));
  };

  const handleMoveStageDown = (index: number) => {
    if (index === pipelineStages.length - 1) return;
    const updated = [...pipelineStages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setPipelineStages(updated);
    localStorage.setItem("crm_stages_v2", JSON.stringify(updated));
  };

  const handleStageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStageIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleStageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleStageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedStageIndex === null) return;
    const updated = [...pipelineStages];
    const draggedItem = updated[draggedStageIndex];
    updated.splice(draggedStageIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    setPipelineStages(updated);
    localStorage.setItem("crm_stages_v2", JSON.stringify(updated));
    setDraggedStageIndex(null);
  };

  // Import State representation
  const [importReport, setImportReport] = useState<{
    total: number;
    success: number;
    errors: { rowNum: number; msg: string; data: string }[];
  } | null>(null);

  // Save leads helper
  useEffect(() => {
    localStorage.setItem("crm_leads_v1", JSON.stringify(leads));
  }, [leads]);

  const [crmFirebaseSyncCompleted, setCrmFirebaseSyncCompleted] = useState(false);
  const prevLeadsRef = React.useRef<CRMLead[]>(leads);

  // Pull CRM leads from Firestore or push existing local leads if Firestore is empty
  useEffect(() => {
    async function initCRMSync() {
      try {
        const { getDocs, collection, doc, setDoc } = await import('firebase/firestore');
        
        const snap = await getDocs(collection(db, "crmLeads"));
        if (!snap.empty) {
          const remoteLeads: CRMLead[] = [];
          snap.forEach(d => {
            remoteLeads.push(d.data() as CRMLead);
          });
          setLeads(remoteLeads);
        } else if (leads.length > 0) {
          for (const item of leads) {
            await setDoc(doc(db, "crmLeads", String(item.id)), item);
          }
        }
        setCrmFirebaseSyncCompleted(true);
      } catch (err) {
        console.error("Error setting up CRM leads initial sync:", err);
        setCrmFirebaseSyncCompleted(true);
      }
    }
    initCRMSync();
  }, []);

  // Incremental CRM leads sync to Firestore (only updates modified or deleted items)
  useEffect(() => {
    if (!crmFirebaseSyncCompleted) {
      prevLeadsRef.current = leads;
      return;
    }

    const addedOrUpdated = leads.filter(item => {
      const prev = prevLeadsRef.current.find(p => p.id === item.id);
      return !prev || JSON.stringify(prev) !== JSON.stringify(item);
    });

    const deleted = prevLeadsRef.current.filter(prev => !leads.some(item => item.id === prev.id));

    if (addedOrUpdated.length > 0 || deleted.length > 0) {
      import('firebase/firestore').then(async ({ doc, setDoc, deleteDoc }) => {
        addedOrUpdated.forEach(item => {
          setDoc(doc(db, "crmLeads", String(item.id)), item).catch(err => {
            console.error(`Error saving crmLeads/${item.id} to Firestore`, err);
          });
        });

        deleted.forEach(item => {
          deleteDoc(doc(db, "crmLeads", String(item.id))).catch(err => {
            console.error(`Error deleting crmLeads/${item.id} from Firestore`, err);
          });
        });
      });
    }

    prevLeadsRef.current = leads;
  }, [leads, crmFirebaseSyncCompleted]);

  // Calculations for dashboard
  const totalValue = leads
    .filter(l => l.status !== "Perdido")
    .reduce((sum, lead) => sum + lead.value, 0);

  const wonValue = leads
    .filter(l => l.status === "Ganado")
    .reduce((sum, lead) => sum + lead.value, 0);

  const activeLeadsCount = leads.filter(l => l.status !== "Ganado" && l.status !== "Perdido").length;
  const wonLeadsCount = leads.filter(l => l.status === "Ganado").length;

  // Agent performance calculation (managed leads, success rate, and total value of won proposals)
  const agentPerformance = React.useMemo(() => {
    // Get unique list of agents
    const uniqueAgents = Array.from(new Set(leads.map(l => l.assignedTo || "Sin asignar").filter(Boolean)));
    if (uniqueAgents.length === 0) {
      uniqueAgents.push("Admin Global");
    }
    return uniqueAgents.map(agent => {
      const agentLeads = leads.filter(l => (l.assignedTo || "Sin asignar") === agent);
      const totalLeads = agentLeads.length;
      const wonLeads = agentLeads.filter(l => l.status === "Ganado");
      const wonCount = wonLeads.length;
      const totalWonValue = wonLeads.reduce((sum, l) => sum + l.value, 0);
      const successRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
      return {
        agent,
        totalLeads,
        wonCount,
        successRate,
        totalWonValue
      };
    }).sort((a, b) => b.totalWonValue - a.totalWonValue);
  }, [leads]);

  // Funnel and Conversion analytics calculations
  const funnelData = React.useMemo(() => {
    return pipelineStages.map((stage, idx) => {
      // B2B Funnel convention: a lead in stage X is counted as having passed through all previous stages
      const cumulativeCount = leads.filter(l => {
        const stageIdx = pipelineStages.indexOf(l.status);
        return stageIdx >= idx;
      }).length;

      return {
        name: stage,
        value: cumulativeCount,
        currentCount: leads.filter(l => l.status === stage).length
      };
    });
  }, [leads, pipelineStages]);

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setLeadModalTab("info");
    setLeadForm({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      country: "México",
      source: "Recomendación",
      status: "Nuevo",
      type: "Institución Potencial",
      value: 3000,
      notes: "",
      assignedTo: users[0]?.name || "Admin Global",
      contacts: []
    });
    setIsLeadModalOpen(true);
  };

  const handleOpenEditLead = (lead: CRMLead) => {
    setEditingLead(lead);
    setLeadModalTab("info"); // Default to main details tab
    setLeadForm({
      name: lead.name,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      website: lead.website || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      country: lead.country,
      source: lead.source,
      status: lead.status,
      type: lead.type,
      value: lead.value,
      notes: lead.notes,
      assignedTo: lead.assignedTo || "Admin Global",
      contacts: lead.contacts || []
    });
    setIsLeadModalOpen(true);
  };

  const handleSaveLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      // Edit
      setLeads(prev => prev.map(l => l.id === editingLead.id ? {
        ...l,
        name: leadForm.name,
        contactName: leadForm.contactName,
        email: leadForm.email,
        phone: leadForm.phone,
        website: leadForm.website,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        country: leadForm.country,
        source: leadForm.source,
        status: leadForm.status,
        type: leadForm.type,
        value: Number(leadForm.value),
        notes: leadForm.notes,
        assignedTo: leadForm.assignedTo,
        contacts: leadForm.contacts
      } : l));
    } else {
      // New
      const newLead: CRMLead = {
        id: `lead-${Date.now()}`,
        name: leadForm.name,
        contactName: leadForm.contactName,
        email: leadForm.email,
        phone: leadForm.phone,
        website: leadForm.website,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        country: leadForm.country,
        source: leadForm.source,
        status: leadForm.status,
        type: leadForm.type,
        value: Number(leadForm.value),
        notes: leadForm.notes,
        assignedTo: leadForm.assignedTo,
        createdAt: new Date().toISOString().split("T")[0],
        contacts: leadForm.contacts
      };
      setLeads(prev => [newLead, ...prev]);
    }
    setIsLeadModalOpen(false);
  };

  const handleDeleteLead = (id: string) => {
    setLeadToDeleteId(id);
  };

  const confirmDeleteLead = () => {
    if (leadToDeleteId) {
      setLeads(prev => prev.filter(l => l.id !== leadToDeleteId));
      setLeadToDeleteId(null);
    }
  };

  const handleWipeAllLeads = () => {
    setLeads([]);
    localStorage.setItem("crm_leads_v1", JSON.stringify([]));
    setIsConfirmWipeModalOpen(false);
  };

  const handleRestoreDemoLeads = () => {
    if (window.confirm("¿Deseas restaurar la información de demostración original en el CRM?")) {
      setLeads(SEED_LEADS);
      localStorage.setItem("crm_leads_v1", JSON.stringify(SEED_LEADS));
    }
  };

  // Status order flow for Kanban board columns
  const DEFAULT_STATUS_COLUMNS = ["Nuevo", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"];

  const handleMoveStatus = (leadId: string, nextStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus } : l));
  };

  // Program Activity (linking with general Agenda)
  const handleOpenNewActivity = (leadId: string) => {
    setActivityForm({
      leadId: leadId,
      title: "",
      type: "Llamada",
      dueDate: new Date().toISOString().split("T")[0],
      syncAgenda: true
    });
    setIsActivityModalOpen(true);
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetLead = leads.find(l => l.id === activityForm.leadId);
    if (!targetLead) return;

    if (activityForm.syncAgenda) {
      // Push to central context Agenda state!
      addTask({
        title: `CRM: ${activityForm.title} - ${targetLead.name} (${targetLead.contactName})`,
        dueDate: activityForm.dueDate,
        status: 'Pendiente',
        type: activityForm.type,
        userId: users[0]?.id, // Fallback to first user
        leadId: activityForm.leadId,
        notes: ""
      });
    }

    // Add note to lead history notes
    const updateNotes = ` [Tarea programada para ${activityForm.dueDate}: "${activityForm.title}" de tipo ${activityForm.type}] - ${targetLead.notes}`;
    setLeads(prev => prev.map(l => l.id === targetLead.id ? { ...l, notes: updateNotes } : l));

    setIsActivityModalOpen(false);
    alert(`Actividad programada y vinculada exitosamente con la Agenda para el día ${activityForm.dueDate}`);
  };

  // Download fully customized CSV Template for CRM
  const downloadCrmTemplate = () => {
    const csvContent = "\ufeffTipo(Institucion Potencial o Persona Potencial),Nombre,Contacto,Email,Telefono,Website,Direccion,Ciudad,Estado,Pais,Origen,Status,Valor Estimado(Numero),Agente,Notas\n" +
      "Institución Potencial,Colegio Británico de Puebla,Lic. Regina Mendoza,r.mendoza@britanico.edu.mx,+52 22 2345 6789,https://britanicopuebla.edu.mx,Av. 15 de Mayo 1234,Puebla,Puebla,México,Campaña Digital,Nuevo,5000,Admin Global,Interesados de realizar prueba piloto de créditos AP.\n" +
      "Persona Potencial,Enrique San Román,Enrique San Román,enrique.sr@outlook.com,+52 55 5678 1234,https://enriquesr.me,Calle Reforma 45,Ciudad de México,CDMX,México,LinkedIn,Contactado,1100,Daniel Altamirano,Hijo requiere convalidación internacional de materias de preparatoria.\n" +
      "Institución Potencial,Universidad Humanitas,Dr. Fernando Salazar,f.salazar@humanitas.edu.mx,+52 33 1111 2222,https://humanitas.edu.mx,Av. Patria 450,Guadalajara,Jalisco,México,Recomendación,Nuevo,8000,Admin Global,Discusión institucional abierta para revalidación directa de materias de inglés.";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_crm_prospectos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real, interactive CSV Uploader with progress simulator and validator
  const handleCrmTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setImportReport({
          total: 0,
          success: 0,
          errors: [{ rowNum: 1, msg: "El archivo cargado está vacío o no tiene registros de datos.", data: "" }]
        });
        return;
      }

      // Analyze the header row to determine column indexes
      const headers = lines[0]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

      const idxTipo = headers.findIndex(h => h.includes("tipo"));
      const idxNombre = headers.findIndex(h => !h.includes("tipo") && (h === "nombre" || h.includes("nombre del prospecto") || h.includes("institucion") || h.includes("institución") || h.includes("particular")));
      const idxContacto = headers.findIndex(h => h.includes("contacto")); 
      const idxEmail = headers.findIndex(h => h === "email" || h === "correo" || h.includes("correo") || h.includes("mail"));
      const idxTelefono = headers.findIndex(h => h === "telefono" || h.includes("teléfono") || h.includes("tel") || h.includes("móvil"));
      const idxWebsite = headers.findIndex(h => h.includes("website") || h.includes("web") || h.includes("url") || h.includes("sitio"));
      const idxDireccion = headers.findIndex(h => h.includes("direccion") || h.includes("dirección") || h.includes("calle"));
      const idxCiudad = headers.findIndex(h => h === "ciudad" || h.includes("ciudad"));
      const idxEstado = headers.findIndex(h => h === "estado" || (h.includes("estado") && !h.includes("status") && !h.includes("fase") && !h.includes("etapa")));
      const idxPais = headers.findIndex(h => h.includes("pais") || h.includes("país"));
      const idxOrigen = headers.findIndex(h => h.includes("origen") || h.includes("procedencia") || h.includes("source"));
      const idxStatus = headers.findIndex(h => h.includes("status") || h.includes("etapa") || h.includes("fase") || h === "estado de prospecto");
      const idxValor = headers.findIndex(h => h.includes("valor") || h.includes("estimado") || h.includes("monto"));
      const idxAgente = headers.findIndex(h => h.includes("agente") || h.includes("asignado"));
      const idxNotas = headers.findIndex(h => h.includes("notas") || h.includes("comentarios") || h.includes("observaciones"));

      let successCount = 0;
      const errors: { rowNum: number; msg: string; data: string }[] = [];
      const newLeadsFromCsv: CRMLead[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const line = lines[i];
        
        // Split by comma ignoring commas inside quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length < 3) {
          errors.push({
            rowNum,
            msg: "La fila no cuenta con el mínimo de datos (mínimo de 3 columnas de datos requeridas para nombre/contacto/tipo).",
            data: line
          });
          continue;
        }

        const getValue = (idx: number, fallback: string = ""): string => {
          if (idx !== -1 && idx < cols.length) {
            return cols[idx] !== undefined && cols[idx] !== null ? cols[idx] : fallback;
          }
          return fallback;
        };

        const typeRaw = getValue(idxTipo, "Institución Potencial");
        const name = getValue(idxNombre, "");
        const contactName = getValue(idxContacto, "");
        const email = getValue(idxEmail, "comercial@institucion.com");
        const phone = getValue(idxTelefono, "No proporcionado");
        const website = getValue(idxWebsite, "");
        const address = getValue(idxDireccion, "");
        const city = getValue(idxCiudad, "");
        const state = getValue(idxEstado, "");
        const country = getValue(idxPais, "México");
        const source = getValue(idxOrigen, "Recomendación");
        const statusRaw = getValue(idxStatus, "Nuevo");
        const valueNum = getValue(idxValor, "3000") ? (Number(getValue(idxValor, "3000")) || 3000) : 3000;
        const agent = getValue(idxAgente, users[0]?.name || "Admin Global");
        const notes = getValue(idxNotas, "Importado mediante planilla CSV.");

        // Type matching safety
        const mappedType: CRMLead["type"] = typeRaw.toLowerCase().includes("persona") || typeRaw.toLowerCase().includes("particular")
          ? "Persona Potencial" 
          : "Institución Potencial";

        // Status matching safety - allows dynamic pipeline stages now!
        const mappedStatus: CRMLead["status"] = (pipelineStages.includes(statusRaw)
          ? statusRaw
          : (pipelineStages.find(stage => stage.toLowerCase() === statusRaw.toLowerCase()) || pipelineStages[0] || "Nuevo")) as CRMLead["status"];

        if (!name) {
          errors.push({
            rowNum,
            msg: "El Nombre o Razón Social del prospecto está vacío.",
            data: line
          });
          continue;
        }

        newLeadsFromCsv.push({
          id: `lead-csv-${Date.now()}-${i}`,
          name,
          contactName: contactName || "Contacto Principal",
          email: email || "comercial@institucion.com",
          phone: phone || "No proporcionado",
          website,
          address,
          city,
          state,
          country,
          source,
          status: mappedStatus,
          type: mappedType,
          value: valueNum,
          assignedTo: agent,
          notes,
          createdAt: new Date().toISOString().split("T")[0]
        });

        successCount++;
      }

      if (newLeadsFromCsv.length > 0) {
        setLeads(prev => [...newLeadsFromCsv, ...prev]);
      }

      setImportReport({
        total: lines.length - 1,
        success: successCount,
        errors
      });
    };

    reader.readAsText(file, "UTF-8");
  };

  // Filtered leads calculation
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "Todos" || lead.type === typeFilter;
    const matchesStatus = statusFilter === "Todos" || lead.status === statusFilter;
    const matchesSource = sourceFilter === "Todos" || lead.source === sourceFilter;

    return matchesSearch && matchesType && matchesStatus && matchesSource;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6">
      
      {/* Visual Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Módulo Comercial Integrado
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-2 tracking-tight">CRM Prospectos Externos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión comercial de Colegios, Universidades y Clientes Potenciales antes del registro oficial en el sistema.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          {leads.length === 0 ? (
            <button 
              onClick={handleRestoreDemoLeads}
              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 bg-white border border-indigo-250 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
            >
              <Database className="w-4 h-4 mr-1.5" />
              Restaurar Demo
            </button>
          ) : (
            <button 
              onClick={() => setIsConfirmWipeModalOpen(true)}
              className="text-rose-650 hover:text-rose-800 hover:bg-rose-50/50 bg-white border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
              title="Borrar toda la información del CRM"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Borrar Todo
            </button>
          )}
          <button 
            onClick={() => setIsConfigModalOpen(true)}
            className="text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-150 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-1.5 text-slate-500" />
            Configurar Etapas
          </button>
          <button 
            onClick={downloadCrmTemplate}
            className="text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-150 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Descargar Plantilla
          </button>
          <button
            onClick={handleOpenNewLead}
            className="bg-indigo-600 text-white hover:bg-indigo-750 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 mr-1.5" />
            Nuevo Lead / Prospecto
          </button>
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Prospectos Activos</span>
            <Building2 className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-800 font-mono">{activeLeadsCount}</span>
            <span className="text-xs text-slate-450 font-semibold">instituciones/personas</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Leads Ganados</span>
            <Award className="w-4.5 h-4.5 text-emerald-500 animate-bounce" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{wonLeadsCount}</span>
            <span className="text-xs text-emerald-500/70 font-semibold font-mono">
              ({leads.length > 0 ? Math.round((wonLeadsCount / leads.length) * 100) : 0}% efectividad)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-indigo-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Valor Estimado Pipeline</span>
            <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-850 font-mono text-slate-800">
            ${totalValue.toLocaleString("en-US")} <span className="text-xs font-normal text-slate-400">USD</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ingreso Cerrado</span>
            <DollarSign className="w-4.5 h-4.5 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700 font-mono">
            ${wonValue.toLocaleString("en-US")} <span className="text-xs font-normal text-purple-400">USD</span>
          </p>
        </div>
      </div>

      {/* Main Tabs Selection */}
      <div className="border border-slate-200 bg-white rounded-2xl flex flex-col min-h-0 flex-1 overflow-hidden shadow-sm">
        
        {/* Navigation Bar & Filters */}
        <div className="flex flex-col border-b border-slate-150 shrink-0">
          <div className="flex border-b border-slate-100 px-6 pt-3 shrink-0 overflow-x-auto">
            {[
              { id: "Kanban", label: "Pipeline Gráfico (Kanban)" },
              { id: "Tabla", label: "Listado Detallado" },
              { id: "Analytics", label: "Métricas y Analytics" },
              { id: "Importar", label: "Importación Masiva (CSV)" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setImportReport(null);
                }}
                className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition -mb-px whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Filters - Visible on Kanban and Table */}
          {activeTab !== "Importar" && activeTab !== "Analytics" && (
            <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center text-xs">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar prospecto, contacto, notas..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-700 shadow-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
                {/* Type filter */}
                <div>
                  <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value)}
                    className="border border-slate-200 bg-white rounded-lg p-2 font-semibold text-slate-600 outline-none"
                  >
                    <option value="Todos">Todos los Tipos</option>
                    <option value="Institución Potencial">Instituciones Potenciales</option>
                    <option value="Persona Potencial font-normal">Contactos Particulares</option>
                  </select>
                </div>

                {/* Source Filter */}
                <div>
                  <select 
                    value={sourceFilter} 
                    onChange={e => setSourceFilter(e.target.value)}
                    className="border border-slate-200 bg-white rounded-lg p-2 font-semibold text-slate-600 outline-none"
                  >
                    <option value="Todos">Todos los Orígenes</option>
                    <option value="Recomendación">Recomendación</option>
                    <option value="Feria Educativa">Feria Educativa</option>
                    <option value="Campaña Digital">Campaña Digital</option>
                    <option value="Llamada Fría">Llamada Fría</option>
                    <option value="LinkedIn">LinkedIn Sales</option>
                  </select>
                </div>

                {/* Status selector (only on Table tab) */}
                {activeTab === "Tabla" && (
                  <div>
                    <select 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)}
                      className="border border-slate-200 bg-white rounded-lg p-2 font-semibold text-slate-600 outline-none"
                    >
                      <option value="Todos">Todos los Estatus</option>
                      {pipelineStages.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Tabs Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/20">

          {/* EMPTY STATE WARNING / RESTORE TRIGGER */}
          {leads.length === 0 && (
            <div className="bg-slate-50/50 border border-dashed border-slate-250 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                <Database className="w-8 h-8 text-slate-300 animate-pulse" />
              </div>
              <div className="max-w-md">
                <h4 className="text-slate-800 font-extrabold text-base tracking-tight">Base de Datos del CRM Vacía</h4>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-sans">
                  Se ha borrado toda la información de prospectos y clientes potenciales de este CRM. Puedes subir nuevos registros mediante importación de archivos CSV, capturar un prospecto individual de forma manual, o sencillamente restaurar la información de demostración para realizar pruebas de visualización del pipeline interactivo.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleRestoreDemoLeads}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Restaurar Leads Demo
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewLead}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Crear Lead Manual
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: KANBAN PIPELINE */}
          {activeTab === "Kanban" && (
            <div className="flex gap-4 pb-4 overflow-x-auto h-full items-start min-w-full">
              {pipelineStages.map((column) => {
                const leadsInCol = filteredLeads.filter(l => l.status === column);
                const sumValue = leadsInCol.reduce((s, curr) => s + curr.value, 0);

                let badgeColor = "bg-slate-100 text-slate-700";
                if (column === "Nuevo") badgeColor = "bg-sky-50 text-sky-700 border border-sky-100";
                if (column === "Contactado") badgeColor = "bg-blue-50 text-blue-700 border border-blue-100";
                if (column === "Propuesta") badgeColor = "bg-amber-50 text-amber-700 border border-amber-100";
                if (column === "Negociación") badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-100";
                if (column === "Ganado") badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                                 return (
                  <div key={column} className="w-72 shrink-0 bg-slate-50/80 border border-slate-250 p-3.5 rounded-2xl flex flex-col space-y-3 max-h-[580px]">
                    
                    {/* Column HeaderInfo */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-150">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${badgeColor}`}>
                            {column}
                          </span>
                          {/* Trash button for custom stage deletion */}
                          {column !== "Nuevo" && column !== "Contactado" && column !== "Propuesta" && column !== "Negociación" && column !== "Ganado" && column !== "Perdido" && (
                            <button
                              onClick={() => handleRemoveStage(column)}
                              title="Eliminar Etapa Personalizada"
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-0.5 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest block uppercase">
                          ${sumValue.toLocaleString("en-US")} USD
                        </p>
                      </div>
                      <span className="text-xs bg-slate-200/50 text-slate-600 font-black px-2 py-0.5 rounded-full">
                        {leadsInCol.length}
                      </span>
                    </div>

                    {/* Column Card Container list */}
                    <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1 flex-1">
                      {leadsInCol.length > 0 ? (
                        leadsInCol.map((lead) => {
                          const leadTasks = tasks.filter(t => t.leadId?.toString() === lead.id.toString());
                          const isInactive = isLeadInactive(lead, leadTasks);
                          
                          return (
                            <div 
                              key={lead.id} 
                              className={`bg-white border p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all space-y-3 group ${
                                isInactive ? "border-rose-300 border-l-4 border-l-rose-500 bg-rose-50/10" : "border-slate-200"
                              }`}
                            >
                              <div className="flex justify-between items-start flex-wrap gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                    lead.type === "Persona Potencial" ? "bg-[#f8fafc] text-slate-600 border border-slate-200" : "bg-indigo-50/60 text-indigo-700 border border-indigo-100"
                                  }`}>
                                    {lead.type === "Persona Potencial" ? "Persona" : "Institución"}
                                  </span>
                                  {isInactive && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 gap-1 animate-pulse">
                                      <AlertCircle className="w-2.5 h-2.5" /> Sin Actividad
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-black text-indigo-600 font-mono">${lead.value.toLocaleString("en-US")} USD</p>
                              </div>

                              <div>
                                <h5 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-1 group-hover:text-indigo-700 transition-colors">
                                  {lead.name}
                                </h5>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center">
                                  <Users className="w-3 h-3 mr-1 opacity-60 shrink-0" /> {lead.contactName || "Sin contacto principal"}
                                </p>
                                {lead.phone && (
                                  <p className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5">
                                    <Phone className="w-3 h-3 mr-1 opacity-60 shrink-0" /> {lead.phone}
                                  </p>
                                )}
                                {lead.website && (
                                  <p className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5 truncate">
                                    <span className="mr-1 text-xs opacity-60 shrink-0">🌐</span>
                                    <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-650 font-medium truncate">
                                      {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                                    </a>
                                  </p>
                                )}
                                {lead.contacts && lead.contacts.length > 0 && (
                                  <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[9px]">
                                    <span className="text-indigo-650 font-bold flex items-center">
                                      <Users className="w-2.5 h-2.5 mr-1 text-indigo-500 shrink-0" /> {lead.contacts.length} {lead.contacts.length === 1 ? "contacto adicional" : "contactos adicionales"}
                                    </span>
                                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold text-[8px]">
                                      + Ver
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[10px] text-slate-500">
                                <span>Asignado: <strong className="font-bold text-slate-600">{lead.assignedTo || "S/A"}</strong></span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold truncate max-w-[120px]" title={lead.state || lead.country}>
                                  {lead.city ? `${lead.city}, ` : ""}{lead.state ? `${lead.state}` : lead.country}
                                </span>
                              </div>

                            {/* Kanban Quick controls */}
                            <div className="pt-2 border-t border-dashed border-slate-150 flex justify-between items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleOpenNewActivity(lead.id)}
                                title="Programar Llamada o Recordatorio en la Agenda"
                                className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center transition"
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                Agenda
                              </button>
                              <button 
                                onClick={() => handleOpenEditLead(lead)}
                                title="Editar Prospecto"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1 rounded transition"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteLead(lead.id)}
                                title="Eliminar Prospecto"
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              
                              {/* Advance State directly button */}
                              {column !== pipelineStages[pipelineStages.length - 1] && (
                                <button 
                                  onClick={() => {
                                    const currIndex = pipelineStages.indexOf(column);
                                    if (currIndex !== -1 && currIndex < pipelineStages.length - 1) {
                                      handleMoveStatus(lead.id, pipelineStages[currIndex + 1]);
                                    }
                                  }}
                                  title="Avanzar Estatus"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded transition"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Clock className="w-5 h-5 text-slate-300 animate-spin" />
                          <p className="text-[10px] text-slate-400 italic text-center mt-2 px-4 leading-relaxed">Sin prospectos en este estado</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Special Column to add custom stages */}
              <div className="w-72 shrink-0 bg-white border border-dashed border-slate-300 hover:border-indigo-400 p-5 rounded-2xl flex flex-col space-y-4 justify-center items-center h-[280px] transition-colors leading-relaxed group shadow-sm bg-slate-50/10">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <h6 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Añadir Etapa</h6>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Crea nuevos estados de negociación en tu pipeline personalizados.</p>
                </div>
                <div className="w-full space-y-2 pt-1">
                  <input 
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Ej. Presentación Demostrada..."
                    className="w-full bg-white border border-slate-250 outline-none rounded-xl p-2 h-9 text-xs text-slate-700 hover:border-slate-300 focus:border-indigo-500 font-sans shadow-sm"
                  />
                  <button
                    onClick={handleAddStage}
                    disabled={!newStageName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-750 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold h-9 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center shadow-md shadow-indigo-600/10"
                  >
                    + Agregar Pipeline
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DETAILED LIST (TABULAR) */}
          {activeTab === "Tabla" && (
            <>
              {/* BANNER DE ÉXITO MASIVO */}
              {showBulkSuccessBanner && bulkAppliedSummary && (
                <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-350 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-500 rounded-lg text-white shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-emerald-950 font-bold text-sm">¡Cambios Masivos Aplicados Exitosamente!</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBulkSuccessBanner(false);
                            setBulkAppliedSummary(null);
                          }}
                          className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100/50 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-emerald-800 text-[11.5px] mt-1 leading-relaxed">
                        Se han actualizado correctamente los datos clave de <strong>{bulkAppliedSummary.count}</strong> instituciones/prospectos seleccionados.
                      </p>
                      
                      <div className="mt-3 bg-white/70 p-2.5 rounded-lg border border-emerald-100/50 max-w-2xl">
                        <p className="text-[9px] font-bold text-emerald-900 uppercase tracking-widest mb-1.5 font-mono">Detalle de los cambios:</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {bulkAppliedSummary.fields.map((f, i) => (
                            <div key={i} className="text-xs text-emerald-800">
                              <span className="font-semibold text-emerald-950">{f.field}:</span> {f.value}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-emerald-600 italic mt-2 border-t border-emerald-100/30 pt-1.5 font-sans">
                          Afectados: {bulkAppliedSummary.leadNames.slice(0, 5).join(", ")}
                          {bulkAppliedSummary.leadNames.length > 5 ? ` y ${bulkAppliedSummary.leadNames.length - 5} instituciones más.` : "."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL DE CONFIRMACIÓN MASIVA */}
              {showBulkConfirmModal && bulkAppliedSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between pb-3.5 border-b border-rose-100/10">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-slate-900 font-black text-sm uppercase tracking-wide">Confirmar Edición Masiva</h3>
                          <p className="text-slate-500 text-[10.5px] font-medium mt-0.5">Revisa cuidadosamente los valores antes de aplicar los cambios.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBulkConfirmModal(false)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="py-4 space-y-3.5">
                      <div className="bg-amber-50/50 border border-amber-100/60 p-3 rounded-xl text-slate-705 text-xs leading-relaxed">
                        Estás a punto de modificar un total de <strong className="text-amber-900 font-extrabold">{bulkAppliedSummary.count}</strong> registros seleccionados. Esta operación reemplazará los valores actuales.
                      </div>

                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">CAMPOS QUE SE ACTUALIZARÁN:</h5>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-[8.5px] text-slate-400 font-bold uppercase">
                              <th className="pb-1 w-[40%]">Campo de CRM</th>
                              <th className="pb-1 w-[60%]">Nuevo Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {bulkAppliedSummary.fields.map((f, i) => (
                              <tr key={i} className="py-1">
                                <td className="py-1.5 font-bold text-slate-500">{f.field}</td>
                                <td className="py-1.5 text-indigo-700 font-bold font-mono text-[11.5px]">{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                          INSTITUCIONES SELECCIONADAS ({bulkAppliedSummary.count})
                        </h5>
                        <div className="max-h-[110px] overflow-y-auto border border-slate-150 rounded-xl p-2 bg-slate-50/30 text-[10.5px] text-slate-600 space-y-1 divide-y divide-slate-100 font-mono">
                          {bulkAppliedSummary.leadNames.map((name, index) => (
                            <div key={index} className="pt-1.5 first:pt-0 pb-1.5 flex items-center justify-between">
                              <span className="font-semibold text-slate-700">
                                {index + 1}. {name}
                              </span>
                              <span className="bg-amber-50 text-amber-700 text-[7.5px] font-extrabold px-1.5 rounded uppercase shrink-0">Cambiar</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowBulkConfirmModal(false)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={executeBulkUpdate}
                        className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar y Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedLeadIds.length > 0 && (
                <div className="bg-indigo-50/80 border border-indigo-150 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 text-white font-black text-xs h-6 w-6 rounded-full flex items-center justify-center shadow-sm">
                        {selectedLeadIds.length}
                      </div>
                      <div>
                        <h4 className="text-slate-850 font-bold text-sm">Cambios Masivos Seleccionados</h4>
                        <p className="text-slate-500 text-[10px] font-medium font-sans">
                          Aplica cambios a todos los registros seleccionados en una sola acción. Deja en blanco los campos que no deseas modificar.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLeadIds([])}
                        className="px-2.5 py-1.5 text-slate-650 hover:text-slate-800 font-bold text-xs bg-white border border-slate-200 rounded-lg hover:shadow-sm transition cursor-pointer"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>

                  {/* Advanced inline Form Grid for quick entry */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-indigo-100">
                    {/* 1. Agente Responsable */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agente Responsable</label>
                      <select
                        value={bulkUpdateForm.assignedTo}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      >
                        <option value="">-- Sin cambios --</option>
                        <option value="Admin Global">Admin Global</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Estatus del Pipeline */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estatus Pipeline</label>
                      <select
                        value={bulkUpdateForm.status}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      >
                        <option value="">-- Sin cambios --</option>
                        {pipelineStages.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Origen */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Origen</label>
                      <select
                        value={bulkUpdateForm.source}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, source: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      >
                        <option value="">-- Sin cambios --</option>
                        <option value="Recomendación">Recomendación</option>
                        <option value="Feria Educativa">Feria Educativa</option>
                        <option value="Campaña Digital">Campaña Digital</option>
                        <option value="Llamada Fría">Llamada Fría</option>
                        <option value="LinkedIn">LinkedIn Sales</option>
                      </select>
                    </div>

                    {/* 4. Ciudad */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ciudad</label>
                      <input
                        type="text"
                        placeholder="Ej. Guadalajara"
                        value={bulkUpdateForm.city}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      />
                    </div>

                    {/* 5. Estado */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                      <input
                        type="text"
                        placeholder="Ej. Jalisco"
                        value={bulkUpdateForm.state}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      />
                    </div>

                    {/* 6. País */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">País</label>
                      <input
                        type="text"
                        placeholder="Ej. México"
                        value={bulkUpdateForm.country}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3.5 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={initiateBulkUpdateConfirm}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm hover:shadow-indigo-600/10 cursor-pointer"
                    >
                      Confirmar y Aplicar Cambios
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs table-fixed">
                    <thead className="bg-[#0f172a] text-slate-300 text-[9px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-2 text-center w-[5%]">
                          <input
                            type="checkbox"
                            checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))}
                            onChange={toggleSelectAllLeads}
                            className="h-3.5 w-3.5 text-indigo-100 border-slate-500 bg-slate-800 rounded cursor-pointer focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-2 py-2 w-[32%]">Prospecto / Cliente / Origen</th>
                        <th className="px-2 py-2 w-[33%]">Contacto & Responsable</th>
                        <th className="px-2 py-2 text-center w-[10%]">Estatus</th>
                        <th className="px-2 py-2 text-right w-[10%]">Valor Estimado</th>
                        <th className="px-2 py-2 text-center w-[10%]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredLeads.length > 0 ? (
                        filteredLeads.map((lead) => {
                          let badgeColor = "bg-slate-100 text-slate-600";
                          if (lead.status === "Nuevo") badgeColor = "bg-sky-50 text-sky-700 border border-sky-100";
                          if (lead.status === "Contactado") badgeColor = "bg-blue-50 text-blue-700 border border-blue-100";
                          if (lead.status === "Propuesta") badgeColor = "bg-amber-50 text-amber-700 border border-amber-100";
                          if (lead.status === "Negociación") badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-100";
                          if (lead.status === "Ganado") badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                          if (lead.status === "Perdido") badgeColor = "bg-rose-50 text-rose-700 border border-rose-100";

                          const leadTasks = tasks.filter(t => t.leadId?.toString() === lead.id.toString());
                          const isInactive = isLeadInactive(lead, leadTasks);

                          return (
                            <tr key={lead.id} className={`hover:bg-indigo-50/15 transition-all text-slate-705 ${isInactive ? 'bg-rose-50/25 border-l-2 border-l-rose-500' : ''}`}>
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedLeadIds.includes(lead.id)}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded cursor-pointer focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 py-2 leading-tight">
                              <div className="space-y-0.5 max-w-full overflow-hidden">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditLead(lead)}
                                    className="font-bold text-indigo-600 hover:text-indigo-800 text-xs flex items-center flex-wrap gap-0.5 cursor-pointer text-left focus:outline-none group/name truncate"
                                  >
                                    {lead.type === "Institución Potencial" ? (
                                      <Building2 className="w-3 h-3 text-indigo-550 shrink-0 group-hover/name:scale-110 transition-transform" />
                                    ) : (
                                      <Users className="w-3 h-3 text-slate-500 shrink-0 group-hover/name:scale-110 transition-transform" />
                                    )}
                                    <span className="underline decoration-indigo-200 group-hover/name:decoration-indigo-600 decoration-1.5 underline-offset-1 truncate">{lead.name}</span>
                                  </button>
                                  {isInactive && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[7px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-150 gap-0.5 shrink-0 animate-pulse">
                                      <AlertCircle className="w-1.5 h-1.5" /> Sin Actividad
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium font-mono truncate">
                                  {lead.type} • {lead.country}{lead.state ? `, ${lead.state}` : ""}
                                </p>
                                <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-500">
                                  {lead.website && (
                                    <a 
                                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-indigo-650 hover:underline hover:text-indigo-850 inline-flex items-center gap-0.5 font-semibold truncate"
                                    >
                                      🌐 {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                                    </a>
                                  )}
                                  {lead.website && <span className="text-slate-300">•</span>}
                                  <span className="truncate">Origen: <strong>{lead.source}</strong></span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 leading-tight">
                              <div className="space-y-0.5 max-w-full overflow-hidden">
                                <p className="font-bold text-slate-800 text-[11px] truncate">{lead.contactName}</p>
                                <p className="text-[9px] text-slate-400 font-mono truncate">{lead.email}</p>
                                <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-500">
                                  <span className="truncate">Agente: <strong className="text-slate-700">{lead.assignedTo || "Sin asignar"}</strong></span>
                                  {lead.address && <span className="text-slate-350">•</span>}
                                  {lead.address && (
                                    <span className="italic truncate" title={lead.address}>📍 {lead.address}</span>
                                  )}
                                </div>
                                {lead.contacts && lead.contacts.length > 0 && (
                                  <div className="mt-0.5 pt-0.5 border-t border-slate-100">
                                    <span className="text-[7.5px] text-indigo-600 font-bold uppercase tracking-wider block">Contactos ({lead.contacts.length}):</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {lead.contacts.slice(0, 2).map((c, idx) => (
                                        <span key={idx} className="bg-slate-50 text-slate-600 text-[7.5px] px-1 py-0.2 rounded border border-slate-100 inline-block font-sans truncate max-w-[120px]">
                                          {c.name} ({c.role})
                                        </span>
                                      ))}
                                      {lead.contacts.length > 2 && (
                                        <span className="text-slate-400 text-[7.5px] font-bold">+{lead.contacts.length - 2}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <p className="font-bold text-indigo-650 text-[10.5px] font-mono">${lead.value.toLocaleString("en-US")}</p>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1 shrink-0">
                                <button 
                                  onClick={() => handleOpenNewActivity(lead.id)}
                                  className="text-indigo-600 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 px-1 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide transition shrink-0"
                                >
                                  Agenda
                                </button>
                                <button 
                                  onClick={() => handleOpenEditLead(lead)}
                                  className="text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-0.5 rounded transition shrink-0"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="text-rose-650 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-rose-300 p-0.5 rounded transition shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-medium italic">
                          No se encontraron prospectos que coincidan con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {/* TAB 3: CSV IMPORT MASIVO */}
          {activeTab === "Importar" && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Explicación general de importación con descargador de formato */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-start space-x-3.5 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Subir Prospectos desde Archivo CSV</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Carga masivamente colegios potenciales (instituciones) y contactos privados ingresando los datos en nuestra plantilla estandarizada.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed font-sans space-y-2">
                  <p className="font-bold text-slate-700">Pasos para importar correctamente:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                    <li>Descarga la plantilla oficial utilizando el botón en la parte superior derecha.</li>
                    <li>Completa la información requerida (las columnas de "Tipo", "Nombre" y "Contacto" son esenciales).</li>
                    <li>Haz clic en el cuadro de carga a continuación o arrastra tu archivo guardado en extensión <strong className="font-bold text-indigo-600">.csv</strong>.</li>
                    <li>Visualiza el reporte de éxitos o errores en tiempo real y guárdalos directamente.</li>
                  </ol>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="bg-white border border-slate-250 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center border-dashed relative hover:border-indigo-400 hover:bg-indigo-50/5 transition group">
                <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Cargar planilla CSV de Prospectos</h4>
                <p className="text-[11px] text-slate-400 mt-1 mb-4">Soporta exclusivamente archivos codificados en .csv (Unicode, UTF-8)</p>
                
                <label className="bg-indigo-600 hover:bg-indigo-750 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition shadow-md">
                  Seleccionar Archivo
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleCrmTemplateUpload}
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Import Results Dashboard Report */}
              {importReport && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-120 uppercase">
                      Resultado de última importación
                    </span>
                    <button 
                      onClick={() => setImportReport(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 transition"
                    >
                      Cerrar Reporte
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-center">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Registros Detectados</span>
                      <span className="text-xl font-mono font-black text-slate-700 mt-1 block">{importReport.total}</span>
                    </div>
                    <div className="bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-150 text-center">
                      <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Prospectos Importados</span>
                      <span className="text-xl font-mono font-black text-emerald-700 mt-1 block">✓ {importReport.success}</span>
                    </div>
                    <div className={`p-3.5 rounded-xl border text-center ${importReport.errors.length > 0 ? "bg-rose-50/20 border-rose-200" : "bg-slate-50/50 border-slate-200"}`}>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${importReport.errors.length > 0 ? "text-rose-600" : "text-slate-400"}`}>Errores de Validación</span>
                      <span className={`text-xl font-mono font-black mt-1 block ${importReport.errors.length > 0 ? "text-rose-700" : "text-slate-500"}`}>{importReport.errors.length}</span>
                    </div>
                  </div>

                  {importReport.errors.length > 0 && (
                    <div className="border border-rose-200 bg-rose-50/5 rounded-xl overflow-hidden mt-3 max-h-56 overflow-y-auto">
                      <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 text-xs font-extrabold text-rose-800 uppercase tracking-wider">
                        Detalle de filas rechazadas
                      </div>
                      <div className="divide-y divide-rose-100 text-xs text-sans">
                        {importReport.errors.map((err, idx) => (
                          <div key={idx} className="p-3 bg-white hover:bg-rose-50/10 transition-all">
                            <div className="flex justify-between items-center mb-1">
                              <span className="bg-slate-750 text-slate-100 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                Fila #{err.rowNum}
                              </span>
                              <span className="text-rose-700 font-bold bg-rose-100/65 px-2 py-0.5 rounded text-[10px]">
                                {err.msg}
                              </span>
                            </div>
                            <p className="bg-slate-50 p-2 border border-slate-150 rounded font-mono text-[9px] text-slate-500 overflow-x-auto">
                              {err.data}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importReport.success > 0 && (
                    <div className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-150 p-4 rounded-xl text-xs text-emerald-800 leading-relaxed font-semibold">
                      🎉 ¡Registro Completado! Se han agregado {importReport.success} registros exitosamente a la base local del CRM. Puedes verlos y programarles actividades en las pestañas Kanban o Listado.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: METRICAS Y ANALYTICS */}
          {activeTab === "Analytics" && (
            <div className="space-y-6">
              
              {/* KPIs Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Tasa Global de Conversión</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">
                      {leads.length > 0 ? ((wonLeadsCount / leads.length) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-sans">de {leads.length} leads</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${leads.length > 0 ? (wonLeadsCount / leads.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Ticket Promedio Cerrado</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">
                      ${wonLeadsCount > 0 
                        ? Math.round(wonValue / wonLeadsCount).toLocaleString("en-US") 
                        : 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">USD</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Promedio por cada negociación ganada</p>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Volumen Activo Estimado</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-indigo-600 font-mono">
                      ${leads.filter(l => l.status !== "Ganado" && l.status !== "Perdido").reduce((s, c) => s + c.value, 0).toLocaleString("en-US")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">USD</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Total en etapas activas en negociación</p>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Leads de Adquisición Digital</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-purple-600 font-mono">
                      {leads.filter(l => l.source === "Campaña Digital" || l.source === "LinkedIn").length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">campañas online</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Provenientes de LinkedIn y Campaña</p>
                </div>
              </div>

              {/* Grid 1: Funnel Chart and Step Conversion table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Funnel chart widget */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center lg:col-span-2">
                  <div className="w-full flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                        Embudo de Conversión Comercial (Funnel Chart)
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Volumen acumulativo del pipeline comercial por etapa de captación.</p>
                    </div>
                  </div>

                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip 
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                          formatter={(value: any, name: any) => [`${value} Prospectos`, `Etapa: ${name}`]} 
                        />
                        <Funnel
                          dataKey="value"
                          data={funnelData}
                          isAnimationActive
                        >
                          <LabelList position="right" fill="#475569" dataKey="name" fontStyle="bold" fontSize={11} />
                          {funnelData.map((entry, index) => {
                            const colors = ['#38bdf8', '#60a5fa', '#3b82f6', '#6366f1', '#10b981', '#ef4444'];
                            const fill = colors[index % colors.length];
                            return <Cell key={`cell-${index}`} fill={fill} />;
                          })}
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Step dropoff analysis table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Retención de Tráfico
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Retención por etapas en el pipeline activo.</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {funnelData.map((stage, idx) => {
                      const initialVolume = funnelData[0]?.value || 1;
                      const conversionRateToInitial = Math.round((stage.value / initialVolume) * 100);
                      
                      return (
                        <div key={stage.name} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 truncate max-w-[150px]">{stage.name}</span>
                            <div className="flex items-center space-x-2 font-mono text-[10px]">
                              <span className="text-slate-500 font-bold">({stage.value} leads)</span>
                              <span className="text-indigo-600 font-black">{conversionRateToInitial}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${conversionRateToInitial}%`,
                                backgroundColor: idx === 0 ? '#38bdf8' : idx === 1 ? '#60a5fa' : idx === 2 ? '#3b82f6' : idx === 3 ? '#6366f1' : idx === 4 ? '#10b981' : '#f43f5e'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid 2: Agent Performance and Value breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Agent Performance Widget */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center">
                      <Award className="w-4 h-4 mr-2 text-indigo-500" />
                      Rendimiento de Gestores y Agentes Comerciales
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Métricas unificadas de conversión, volumen de propuestas y captación por gestor responsable.</p>
                  </div>

                  <div className="divide-y divide-slate-150 max-h-[400px] overflow-y-auto pr-1">
                    {agentPerformance.map((item, idx) => {
                      const initialColors = ["bg-emerald-50 text-emerald-700 border border-emerald-100", "bg-indigo-50 text-indigo-700 border border-indigo-100", "bg-purple-50 text-purple-700 border border-purple-100", "bg-amber-50 text-amber-700 border border-amber-100"];
                      const fallbackColor = "bg-slate-50 text-slate-700 border border-slate-200";
                      const colorBadge = initialColors[idx % initialColors.length] || fallbackColor;

                      return (
                        <div key={item.agent} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 uppercase border ${colorBadge}`}>
                              {item.agent.charAt(0)}
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-800 text-xs">{item.agent}</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {item.totalLeads} leads asignados • {item.wonCount} ganados
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 justify-between md:justify-end">
                            {/* Conversion Rate indicator */}
                            <div className="space-y-1 text-right">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Tasa de Éxito</span>
                              <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">
                                {item.successRate.toFixed(1)}%
                              </span>
                            </div>

                            {/* Total Won proposals values in USD */}
                            <div className="space-y-1 text-right">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Propuestas Ganadas</span>
                              <span className="text-xs font-black text-indigo-600 font-mono">
                                ${item.totalWonValue.toLocaleString("en-US")} USD
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proposals Won chart par agent value */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Ingreso Cerrado Ganado por Agente (USD)
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Visualización del valor total de propuestas convertidas exitosamente.</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentPerformance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="agent" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                          formatter={(value: any) => [`$${value.toLocaleString()} USD`, 'Valor Cerrado']}
                        />
                        <Bar dataKey="totalWonValue" radius={[4, 4, 0, 0]}>
                          {agentPerformance.map((entry, index) => {
                            const colors = ['#10b981', '#34d399', '#059669', '#6ee7b7'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT CRM LEAD */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        title={editingLead ? `${editingLead.name} - Detalles` : "Crear Nuevo Prospecto CRM"}
        size="5xl"
      >
        <div className="space-y-4 font-sans text-xs">
          {/* TAB BAR FOR EXISTING LEADS */}
          {editingLead && (
            <div className="flex border-b border-slate-200 gap-1 mb-2">
              <button
                type="button"
                onClick={() => setLeadModalTab("info")}
                className={`flex-1 pb-2.5 pt-1 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  leadModalTab === "info"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                📋 Datos Básicos
              </button>
              <button
                type="button"
                onClick={() => setLeadModalTab("actividades")}
                className={`flex-1 pb-2.5 pt-1 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  leadModalTab === "actividades"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                ⚡ Actividades y Contactos
                {(() => {
                  const leadTasksCount = tasks.filter(t => t.leadId === editingLead.id).length;
                  if (leadTasksCount > 0) {
                    return (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        {leadTasksCount}
                      </span>
                    );
                  }
                  return null;
                })()}
              </button>
            </div>
          )}

          {(!editingLead || leadModalTab === "info") ? (
            <form onSubmit={handleSaveLeadSubmit} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* COLUMNA IZQUIERDA: DATOS DE CONTACTO Y DIRECCIÓN (col-span-7) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* SECCIÓN 1: IDENTIFICACIÓN Y CONTACTO */}
                  <div className="bg-slate-50/50 hover:bg-slate-55/40 border border-slate-150 rounded-xl p-4 space-y-3.5 transition-colors">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1" /> Datos de Identificación y Contacto
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {leadForm.type === "Institución Potencial" ? "Nombre de la Institución Educativa" : "Nombre Completo del Particular"}
                      </label>
                      <input 
                        type="text"
                        required
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder={leadForm.type === "Institución Potencial" ? "Colegio Interamericano" : "Juan Alarcón Díaz"}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contacto Principal</label>
                        <input 
                          type="text"
                          required
                          value={leadForm.contactName}
                          onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="Dra. Sylvia Estrada"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Website / URL</label>
                        <input 
                          type="text"
                          value={leadForm.website}
                          onChange={(e) => setLeadForm({ ...leadForm, website: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono text-[11px]"
                          placeholder="https://institucion.edu"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                        <input 
                          type="email"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                          placeholder="contacto@institucion.edu"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono Móvil / Fijo</label>
                        <input 
                          type="text"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                          placeholder="+52 55 1234 5678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: DIRECCIÓN Y GEOGRAFÍA */}
                  <div className="bg-slate-50/50 hover:bg-slate-55/40 border border-slate-150 rounded-xl p-4 space-y-3.5 transition-colors">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center">
                      <Globe className="w-3.5 h-3.5 mr-1" /> Ubicación Geográfica
                    </h4>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calle y Número (Dirección)</label>
                      <input 
                        type="text"
                        value={leadForm.address}
                        onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder="Av. Juárez #105, Col. Centro"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Ciudad</label>
                        <input 
                          type="text"
                          value={leadForm.city}
                          onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="Puebla"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado / Prov.</label>
                        <input 
                          type="text"
                          value={leadForm.state}
                          onChange={(e) => setLeadForm({ ...leadForm, state: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="Puebla"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">País</label>
                        <input 
                          type="text"
                          value={leadForm.country}
                          onChange={(e) => setLeadForm({ ...leadForm, country: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                          placeholder="México"
                        />
                      </div>
                    </div>
                  </div>

                  {leadForm.type === "Institución Potencial" && (
                    <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-750 flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1" /> Contactos del Colegio / Institución
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setLeadForm(prev => ({
                              ...prev,
                              contacts: [
                                ...(prev.contacts || []),
                                { name: "", role: "", phone: "", email: "" }
                              ]
                            }));
                          }}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-250 hover:bg-indigo-100 text-indigo-750 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>+ Agregar Contacto</span>
                        </button>
                      </div>

                      {(!leadForm.contacts || leadForm.contacts.length === 0) ? (
                        <div className="text-center py-4 bg-white/65 border border-dashed border-slate-300 rounded-lg text-slate-400">
                          Sin contactos adicionales. Haz clic en "+ Agregar Contacto" para registrar otros enlaces clave.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {leadForm.contacts.map((contact, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 relative space-y-2.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setLeadForm(prev => ({
                                    ...prev,
                                    contacts: (prev.contacts || []).filter((_, idx) => idx !== index)
                                  }));
                                }}
                                className="absolute top-2.5 right-2.5 text-slate-350 hover:text-rose-600 transition p-1 hover:bg-rose-50 rounded-md cursor-pointer"
                                title="Eliminar contacto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <span className="text-[9px] font-black uppercase text-indigo-500 block tracking-wider">Contacto #{index + 1}</span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nombre Completo</label>
                                  <input
                                    type="text"
                                    required
                                    value={contact.name}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].name = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white text-slate-755 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: Lic. Regina Mendoza"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Puesto / Cargo</label>
                                  <input
                                    type="text"
                                    required
                                    value={contact.role}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].role = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white text-slate-755 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: Control Escolar / Directora"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Teléfono</label>
                                  <input
                                    type="text"
                                    value={contact.phone}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].phone = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white font-mono focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: +52 55 1234 5678"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</label>
                                  <input
                                    type="email"
                                    value={contact.email}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].email = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white font-mono focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: r.mendoza@britanico.edu.mx"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* COLUMNA DERECHA: PARAMETRIZACIÓN COMERCIAL (col-span-5) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* SECCIÓN 3: CONFIGURACIÓN COMERCIAL */}
                  <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 space-y-3.5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-xl pointer-events-none"></div>
                    
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-800 flex items-center relative z-10">
                      <Settings className="w-3.5 h-3.5 mr-1" /> Parámetros Negociación & CRM
                    </h4>

                    <div className="relative z-10">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Prospecto</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLeadForm({ ...leadForm, type: "Institución Potencial" })}
                          className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                            leadForm.type === "Institución Potencial"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-black"
                              : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                          }`}
                        >
                          🏫 Institución (Colegio)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeadForm({ ...leadForm, type: "Persona Potencial" })}
                          className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                            leadForm.type === "Persona Potencial"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-black"
                              : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                          }`}
                        >
                          👤 Particular / Alumno
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estatus del Pipeline</label>
                        <select 
                          value={leadForm.status}
                          onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white font-bold text-slate-705"
                        >
                          {pipelineStages.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Origen / Fuente</label>
                        <select 
                          value={leadForm.source}
                          onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white text-slate-705 font-medium"
                        >
                          <option value="Recomendación">Recomendación</option>
                          <option value="Feria Educativa">Feria Educativa</option>
                          <option value="Campaña Digital">Campaña Digital</option>
                          <option value="Llamada Fría">Llamada Fría</option>
                          <option value="LinkedIn">LinkedIn Sales Navigator</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Estimado (USD)</label>
                        <input 
                          type="number"
                          min="0"
                          value={leadForm.value}
                          onChange={(e) => setLeadForm({ ...leadForm, value: Number(e.target.value) })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white font-mono font-bold text-slate-800"
                          placeholder="4000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agente Asignado</label>
                        <select 
                          value={leadForm.assignedTo}
                          onChange={(e) => setLeadForm({ ...leadForm, assignedTo: e.target.value })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white text-slate-705 font-bold"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                          <option value="Admin Global">Admin Global</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 4: COMENTARIOS */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bitácora Inicial / Observaciones</label>
                    <textarea 
                      value={leadForm.notes}
                      onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white min-h-[95px] leading-relaxed text-slate-700"
                      placeholder="Registra acuerdos preliminares, necesidades de revalidación de materias..."
                    />
                  </div>

                </div>

              </div>

              {/* PIE DEL DIÁLOGO DE EDICIÓN */}
              <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  Guardar Prospecto
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* CONTACT LOGGING FORM */}
              <form onSubmit={handleLogContact} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-sm relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <ActivityIcon className="w-4 h-4" />
                    </span>
                    Registrar Contacto o Interacción Realizada
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    ¿Hablaste con el prospecto? Registra la interacción para actualizar el historial y reflejarlo como tarea completada en la Agenda central.
                  </p>
                </div>

                <div className="space-y-3 relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Título / Motivo del Contacto</label>
                    <input
                      type="text"
                      required
                      value={logTitle}
                      onChange={(e) => setLogTitle(e.target.value)}
                      placeholder="Ej: Llamada de presentación de programas, Reunión de seguimiento..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-150 focus:border-indigo-400 outline-none transition font-medium shadow-sm"
                    />
                  </div>

                  {/* PILL SELECTOR FOR CHANNELS */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Canal de Comunicación</label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                      {(["Llamada", "Correo", "Visita", "Meet", "Otro"] as const).map((type) => {
                        const isSelected = logType === type;
                        const config = {
                          Llamada: { icon: Phone, label: "Llamada", color: "bg-emerald-50 text-emerald-700 border-emerald-200 border-2" },
                          Correo: { icon: Mail, label: "Correo", color: "bg-blue-50 text-blue-700 border-blue-200 border-2" },
                          Visita: { icon: Globe, label: "Visita", color: "bg-amber-50 text-amber-700 border-amber-200 border-2" },
                          Meet: { icon: Video, label: "Meet", color: "bg-purple-50 text-purple-700 border-purple-200 border-2" },
                          Otro: { icon: FileText, label: "Otro", color: "bg-slate-50 text-slate-700 border-slate-200 border-2" }
                        }[type];
                        const Icon = config.icon;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setLogType(type)}
                            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-102"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                          >
                            <Icon className={`w-4 h-4 mb-1 ${isSelected ? "text-white" : "text-slate-400"}`} />
                            <span className="text-[10px] font-bold leading-none">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fecha de Interacción</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLogDate(new Date().toISOString().split("T")[0])}
                            className="text-[9px] font-extrabold text-indigo-600 hover:underline"
                          >
                            Hoy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() - 1);
                              setLogDate(d.toISOString().split("T")[0]);
                            }}
                            className="text-[9px] font-extrabold text-slate-505 hover:underline"
                          >
                            Ayer
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        required
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-150 outline-none transition shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Acuerdos / Notas Cortas</label>
                      <textarea
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        required
                        placeholder="Qué se habló, dudas planteadas..."
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-150 outline-none transition h-[42px] resize-none font-medium shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1 relative z-10">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Registrar Contacto
                  </button>
                </div>
              </form>

              {/* UNIFIED DESIGN-CENTRIC TIMELINE */}
              <div className="space-y-4">
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Historial de Tareas y Pendientes
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Actividades programadas vinculadas desde la Agenda central</p>
                    </div>

                    {/* TIMELINE FILTER PILLS */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-full">
                      {(["Todas", "Pendiente", "Completada"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActivityFilter(tab)}
                          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activityFilter === tab
                              ? "bg-white text-indigo-600 shadow-xs font-extrabold"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {tab === "Todas" ? "Todas" : tab === "Pendiente" ? "Pendientes" : "Completadas"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative pl-6 max-h-[340px] overflow-y-auto space-y-4 pr-1.5 scrollbar-thin">
                    {/* LEFT CONNECTOR LINE */}
                    <div className="absolute left-[9px] top-3.5 bottom-3 text-slate-100 w-0.5 bg-slate-200 pointer-events-none"></div>

                    {(() => {
                      const leadTasks = tasks.filter(t => t.leadId === editingLead.id);
                      const filteredTasks = leadTasks.filter(t => {
                        if (activityFilter === "Todas") return true;
                        return t.status === activityFilter;
                      });

                      if (filteredTasks.length === 0) {
                        return (
                          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                            <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-xs text-slate-600">No se encontraron actividades</p>
                            <p className="text-[10px] max-w-xs mx-auto mt-0.5">Define filtros diferentes o usa el formulario anterior para registrar contactos.</p>
                          </div>
                        );
                      }

                      return filteredTasks.sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((t) => {
                        const isDone = t.status === "Completada";
                        
                        // Icon mapping
                        const iconConfig = {
                          Llamada: { icon: Phone, color: "bg-emerald-50 text-emerald-600 border-emerald-100", accent: "border-l-emerald-500" },
                          Correo: { icon: Mail, color: "bg-blue-50 text-blue-600 border-blue-100", accent: "border-l-blue-500" },
                          Visita: { icon: Globe, color: "bg-amber-50 text-amber-600 border-amber-100", accent: "border-l-amber-500" },
                          Meet: { icon: Video, color: "bg-purple-50 text-purple-600 border-purple-100", accent: "border-l-purple-500" },
                          Otro: { icon: FileText, color: "bg-slate-50 text-slate-600 border-slate-100", accent: "border-l-slate-400" }
                        }[t.type || "Otro"];
                        const Icon = iconConfig.icon;

                        return (
                          <div 
                            key={t.id} 
                            className={`p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs relative overflow-hidden flex items-start gap-3 transition hover:shadow-sm border-l-4 ${iconConfig.accent} ${
                              isDone ? "opacity-75 bg-slate-50/50" : ""
                            }`}
                          >
                            {/* TIMELINE BULLET NODE */}
                            <div className="absolute -left-[22px] top-4.5 w-2.5 h-2.5 rounded-full ring-4 ring-white border border-slate-300 bg-indigo-500 z-10"></div>

                            {/* DYNAMIC CHECKBOX STATUS TOGGLE */}
                            <button
                              type="button"
                              onClick={() => {
                                updateTask(t.id, { status: isDone ? "Pendiente" : "Completada" });
                              }}
                              title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                              className="mt-1 shrink-0 text-slate-400 hover:text-indigo-600 transition"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500 shrink-0" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`p-1 rounded-md shrink-0 text-[10px] ${iconConfig.color}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <p className={`font-bold text-xs text-slate-800 leading-snug ${isDone ? "line-through text-slate-500" : ""}`}>
                                      {t.title}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-450 font-bold mt-1.5 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                                    Programada: {t.dueDate}
                                  </p>
                                </div>

                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0 ${
                                  isDone ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                                }`}>
                                  {t.status}
                                </span>
                              </div>

                              {t.notes && (
                                <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium italic text-[11px] text-slate-600 relative">
                                  <span className="absolute top-1.5 right-2 text-[8px] text-slate-400 uppercase tracking-widest font-extrabold not-italic">notas</span>
                                  <p className="pr-6 whitespace-pre-wrap">"{t.notes}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* DIGEST BITACORA / NOTES HISTORY FORMATTING */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Historial Narrativo / Bitácora de Observaciones
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Solo lectura
                    </span>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-2xl max-h-48 overflow-y-auto shadow-inner">
                    {editingLead.notes ? (
                      <div className="space-y-3">
                        {editingLead.notes.split("\n").filter(line => line.trim().length > 0).map((line, idx) => {
                          const isSpecialEntry = line.startsWith("[");
                          return (
                            <div 
                              key={idx} 
                              className={`text-[11px] leading-relaxed font-medium ${
                                isSpecialEntry 
                                  ? "bg-white p-2.5 rounded-xl border border-slate-100 text-slate-700 font-semibold shadow-xs" 
                                  : "text-slate-650 pl-2 border-l-2 border-slate-300"
                              }`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic text-center py-3">
                        Sin notas u observaciones guardadas aún para este prospecto.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsLeadModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
                  >
                    Cerrar Detalles
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 2: PROGRAM CRM ACTIVITY linked with central agenda */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="CRM: Programar Actividad / Seguimiento"
      >
        <form onSubmit={handleActivitySubmit} className="space-y-4 font-sans text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-250 mb-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Lead Asociado</span>
            <p className="text-xs font-black text-slate-700 mt-0.5">
              {leads.find(l => l.id === activityForm.leadId)?.name}
            </p>
            <p className="text-[10px] text-slate-550 mt-0.5">
              Contacto: {leads.find(l => l.id === activityForm.leadId)?.contactName}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título de la Actividad</label>
            <input 
              type="text"
              required
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              placeholder="Llamada de seguimiento, Presentación demostrativa, Enviar cotización..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Tarea</label>
              <select 
                value={activityForm.type}
                onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as TaskType })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
              >
                <option value="Llamada">📞 Llamada Telefónica</option>
                <option value="Correo">✉️ Correo Electrónico</option>
                <option value="Visita">📍 Visita Presencial</option>
                <option value="Meet">📹 Videollamada Google Meet</option>
                <option value="Otro">📄 Otro / Pendiente General</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Fecha de Realización</label>
              <input 
                type="date"
                required
                value={activityForm.dueDate}
                onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
              />
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl flex items-start space-x-3.5">
            <input 
              type="checkbox"
              id="syncAgenda"
              checked={activityForm.syncAgenda}
              onChange={(e) => setActivityForm({ ...activityForm, syncAgenda: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
            />
            <div className="space-y-0.5">
              <label htmlFor="syncAgenda" className="font-extrabold text-indigo-900 cursor-pointer block">
                Sincronizar con la Agenda General del Sistema
              </label>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Si está marcado, la tarea se registrará en el listado de Calendario/Agenda central y será visible en el Dashboard de Bienvenida para el agente respectivo.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-4">
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold animate-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 opacity-90 hover:opacity-100 text-white rounded-lg font-bold transition flex items-center"
            >
              Programar Actividad
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: PIPELINE STAGES REORDERING & SETTINGS */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configuración de Etapas del Pipeline"
      >
        <div className="space-y-5 font-sans text-xs">
          <div>
            <p className="text-slate-500 leading-relaxed text-xs">
              Define y ordena las etapas de negociación para todo el equipo comercial. 
              <strong> Haz clic y arrastra </strong> las etapas desde el controlador vertical <GripVertical className="inline w-3 h-3 text-slate-400" /> para cambiar el orden de prioridad visual en el Kanban, o utiliza las <strong>flechas de ordenamiento</strong>. Los cambios se guardarán automáticamente.
            </p>
          </div>

          {/* Quick Stage Creation Form */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Crear Nueva Etapa Personalizada</span>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Ej. Propuesta Enviada, Demostración..."
                className="flex-1 bg-white border border-slate-250 outline-none rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 font-sans shadow-sm"
              />
              <button
                type="button"
                onClick={handleAddStage}
                disabled={!newStageName.trim()}
                className="bg-indigo-600 hover:bg-indigo-750 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shrink-0"
              >
                + Agregar
              </button>
            </div>
          </div>

          {/* Draggable & Sortable List */}
          <div className="space-y-2">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">Orden de Prioridad General (Kanban)</span>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {pipelineStages.map((stage, index) => {
                const isCore = ["Nuevo", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"].includes(stage);
                
                return (
                  <div
                    key={stage}
                    draggable
                    onDragStart={(e) => handleStageDragStart(e, index)}
                    onDragOver={(e) => handleStageDragOver(e, index)}
                    onDrop={(e) => handleStageDrop(e, index)}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl transition shadow-sm cursor-grab active:cursor-grabbing group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="text-slate-400 cursor-grab active:cursor-grabbing p-0.5">
                        <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-700 leading-none text-xs">{stage}</span>
                        {isCore ? (
                          <span className="ml-2 inline-block bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider scale-90">Predeterminada</span>
                        ) : (
                          <span className="ml-2 inline-block bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider scale-90">Personalizada</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Arrow controls */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveStageUp(index)}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Subir prioridad"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === pipelineStages.length - 1}
                        onClick={() => handleMoveStageDown(index)}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Bajar prioridad"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove custom stage directly within config */}
                      {!isCore && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(stage)}
                          className="text-slate-400 hover:text-rose-600 px-1.5 py-1 hover:bg-rose-50 rounded transition cursor-pointer ml-1"
                          title="Eliminar Etapa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(false)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-md shadow-indigo-600/15 uppercase tracking-wider text-xs cursor-pointer"
            >
              Listo • Aplicar Cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE LEAD MODAL */}
      <Modal
        isOpen={leadToDeleteId !== null}
        onClose={() => setLeadToDeleteId(null)}
        title="Confirmación de Eliminación"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start space-x-3 bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h6 className="font-extrabold text-rose-800 uppercase tracking-wider text-[11px]">Acción Irreversible</h6>
              <p className="text-rose-700 mt-1 leading-relaxed text-xs">
                ¿Estás seguro de que deseas eliminar permanentemente al prospecto <strong className="font-bold underline">{leads.find(l => l.id === leadToDeleteId)?.name}</strong>? Todo su historial de contacto, ofertas comerciales y datos de seguimiento serán removidos del CRM de forma definitiva.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLeadToDeleteId(null)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeleteLead}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Eliminar de por vida
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM WIPE ALL CRM DATA MODAL */}
      <Modal
        isOpen={isConfirmWipeModalOpen}
        onClose={() => setIsConfirmWipeModalOpen(false)}
        title="Borrar Toda la Información del CRM"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start space-x-3 bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h6 className="font-extrabold text-rose-800 uppercase tracking-wider text-[11px]">¿Vaciar Base de Datos Comercial?</h6>
              <p className="text-rose-700 mt-1 leading-relaxed text-xs">
                Esta acción eliminará <strong className="font-extrabold underline block">TODOS los prospectos ({leads.length}), campos adicionales, correos, teléfonos, notas e historial comercial</strong> de forma definitiva de tu navegador y del almacenamiento local.
              </p>
            </div>
          </div>
          
          <p className="text-slate-500 leading-relaxed text-[11px] font-medium bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
            * Se recomienda descargar la plantilla CSV actual o exportar tus datos antes de proceder si deseas tener una copia de respaldo. Una vez borrado, no se podrá recuperar la información.
          </p>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConfirmWipeModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleWipeAllLeads}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              SÍ, VACIAR EL CRM
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
