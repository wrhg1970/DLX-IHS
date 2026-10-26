import { BookOpen, Users, Globe, DollarSign, Plus, Trash2, LayoutGrid, List, CheckSquare, Search, Filter, Calendar, X, ArrowUpDown, ArrowUp, ArrowDown, Archive, ArchiveRestore, Check } from "lucide-react";
import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { useNavigate } from "react-router-dom";
import { hasPermission } from "../utils/permissionCheck";
import { formatCreditType, CreditType } from "../utils/creditType";

export function Clases() {
  const { classes, addClass, updateClass, deleteClass, clearAllClasses, providers, enrollments, providerProductServices, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{ id: number; name: string; numEnrolled: number } | null>(null);
  const [classToArchive, setClassToArchive] = useState<{ id: number; name: string; isArchived: boolean; numEnrolled: number } | null>(null);
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState<'archive' | 'unarchive' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [confirmClearText, setConfirmClearText] = useState("");
  
  // View mode state (default to list mode as requested)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Filters state
  const [filterArchiveStatus, setFilterArchiveStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [filterProviderId, setFilterProviderId] = useState<string>('all');
  const [filterCreditType, setFilterCreditType] = useState<string>('all');
  const [filterValidityStatus, setFilterValidityStatus] = useState<string>('all');
  const [filterValidityYear, setFilterValidityYear] = useState<string>('all');

  // Counts
  const activeClassesCount = useMemo(() => classes.filter(c => !c.isArchived).length, [classes]);
  const archivedClassesCount = useMemo(() => classes.filter(c => !!c.isArchived).length, [classes]);

  // Extracts unique years from validity field
  const uniqueValidityYears = useMemo(() => {
    const years = new Set<string>();
    classes.forEach(c => {
      if (c.validity) {
        const match = c.validity.match(/^(\d{4})/);
        if (match) {
          years.add(match[1]);
        }
      }
    });
    return Array.from(years).sort();
  }, [classes]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    creditType: 'Full Credit' as CreditType,
    syllabus: '',
    validity: '',
    providerId: '' as string | number,
  });

  const [bulkFormData, setBulkFormData] = useState({
    changeValidity: false,
    validity: '',
    changeProvider: false,
    providerId: '' as string | number,
    changeCreditType: false,
    creditType: 'Full Credit' as CreditType,
    changeArchiveStatus: false,
    isArchived: false,
  });

  const [countryRates, setCountryRates] = useState<Array<{ country: string; price: string; cost: string }>>([]);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryPrice, setNewCountryPrice] = useState('');
  const [newCountryCost, setNewCountryCost] = useState('');

  const isSuperAdmin = currentUser?.role === 'Superadministrador' || currentUser?.role === 'Admin Principal';
  const isSuperAdminOnly = currentUser?.role?.trim().toLowerCase() === 'superadministrador';

  const handleOpenNewModal = () => {
    setFormData({
      name: '',
      code: '',
      creditType: 'Full Credit',
      syllabus: '',
      validity: '',
      providerId: ''
    });
    setCountryRates([]);
    setNewCountryName('');
    setNewCountryPrice('');
    setNewCountryCost('');
    setIsModalOpen(true);
  };

  // Synchronize country pricing on Provider/Credit Type change
  React.useEffect(() => {
    if (!formData.providerId) {
      setCountryRates([]);
      return;
    }
    const selectedProvId = Number(formData.providerId);
    const serviceClass = providerProductServices?.find(
      ps => ps.providerId === selectedProvId && ['clase', 'clases'].includes(ps.productType.toLowerCase())
    );
    if (serviceClass && serviceClass.countryPrices) {
      const mappedRates = serviceClass.countryPrices.map(cp => {
        let price = '0';
        let cost = '0';
        if (formData.creditType === 'Full Credit' || formData.creditType === 'Crédito completo') {
          price = cp.priceFullCredit;
          cost = cp.costFullCredit;
        } else if (formData.creditType === 'Half Credit' || formData.creditType === 'Medio Crédito') {
          price = cp.priceHalfCredit;
          cost = cp.costHalfCredit;
        } else if (formData.creditType === 'Full Credit AP' || formData.creditType === 'Crédito completo AP') {
          price = cp.priceFullApCredit;
          cost = cp.costFullApCredit;
        } else if (formData.creditType === 'Half Credit AP' || formData.creditType === 'Medio Crédito AP') {
          price = cp.priceHalfApCredit;
          cost = cp.costHalfApCredit;
        }
        return {
          country: cp.country,
          price: price || '0',
          cost: cost || '0'
        };
      });
      setCountryRates(mappedRates);
    } else {
      setCountryRates([]);
    }
  }, [formData.providerId, formData.creditType, providerProductServices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert country rates array to record map
    const ratesMap: Record<string, { price: string; cost: string }> = {};
    countryRates.forEach(cr => {
      if (cr.country.trim()) {
        ratesMap[cr.country.trim()] = {
          price: cr.price,
          cost: cr.cost
        };
      }
    });

    addClass({ 
      ...formData, 
      providerId: formData.providerId ? Number(formData.providerId) : undefined,
      countryRates: ratesMap
    });
    
    setIsModalOpen(false);
    setFormData({
      name: '',
      code: '',
      creditType: 'Full Credit',
      syllabus: '',
      validity: '',
      providerId: ''
    });
    setCountryRates([]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const patch: Partial<any> = {};
    if (bulkFormData.changeValidity) {
      patch.validity = bulkFormData.validity;
    }
    if (bulkFormData.changeProvider) {
      patch.providerId = bulkFormData.providerId ? Number(bulkFormData.providerId) : undefined;
    }
    if (bulkFormData.changeCreditType) {
      patch.creditType = bulkFormData.creditType;
    }
    if (bulkFormData.changeArchiveStatus) {
      patch.isArchived = bulkFormData.isArchived;
    }

    selectedIds.forEach(id => {
      updateClass(id, patch);
    });

    setToastMessage(`Se actualizaron ${selectedIds.length} clases con éxito.`);
    setTimeout(() => setToastMessage(null), 4000);

    setIsBulkModalOpen(false);
    setSelectedIds([]);
    setBulkFormData({
      changeValidity: false,
      validity: '',
      changeProvider: false,
      providerId: '',
      changeCreditType: false,
      creditType: 'Full Credit',
      changeArchiveStatus: false,
      isArchived: false,
    });
  };

  const filteredClasses = classes.filter(curso => {
    // 0. Archive Status Filter
    if (filterArchiveStatus === 'active') {
      if (curso.isArchived) return false;
    } else if (filterArchiveStatus === 'archived') {
      if (!curso.isArchived) return false;
    }

    // 1. Text Search Filter
    const term = searchQuery.toLowerCase().trim();
    if (term) {
      const linkedProviderName = providers.find(p => p.id === curso.providerId)?.commercialName?.toLowerCase() || 
                                 providers.find(p => p.id === curso.providerId)?.legalName?.toLowerCase() || '';
      const matchesSearch = curso.name.toLowerCase().includes(term) ||
             (curso.code && curso.code.toLowerCase().includes(term)) ||
             (curso.syllabus && curso.syllabus.toLowerCase().includes(term)) ||
             (curso.creditType && curso.creditType.toLowerCase().includes(term)) ||
             linkedProviderName.includes(term);
      if (!matchesSearch) return false;
    }

    // 2. Provider Filter
    if (filterProviderId !== 'all') {
      if (filterProviderId === 'none') {
        if (curso.providerId !== undefined && curso.providerId !== null && curso.providerId !== '') return false;
      } else {
        if (Number(curso.providerId) !== Number(filterProviderId)) return false;
      }
    }

    // 3. Credit Type Filter
    if (filterCreditType !== 'all') {
      if (formatCreditType(curso.creditType) !== formatCreditType(filterCreditType)) return false;
    }

    // 4. Validity Status Filter
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (filterValidityStatus !== 'all') {
      if (filterValidityStatus === 'sin_vigencia') {
        if (curso.validity) return false;
      } else if (filterValidityStatus === 'con_vigencia') {
        if (!curso.validity) return false;
      } else if (filterValidityStatus === 'vigente') {
        if (!curso.validity || curso.validity < todayStr) return false;
      } else if (filterValidityStatus === 'vencido') {
        if (!curso.validity || curso.validity >= todayStr) return false;
      }
    }

    // 5. Validity Year Filter
    if (filterValidityYear !== 'all') {
      if (!curso.validity) return false;
      const match = curso.validity.match(/^(\d{4})/);
      if (!match || match[1] !== filterValidityYear) return false;
    }

    return true;
  });

  // Sorting state for classes
  const [sortField, setSortField] = useState<'name' | 'provider' | 'enrolled' | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'provider' | 'enrolled') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedClasses = React.useMemo(() => {
    if (!sortField) return filteredClasses;

    return [...filteredClasses].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', 'es');
      } else if (sortField === 'provider') {
        const provA = providers.find(p => p.id === a.providerId);
        const provB = providers.find(p => p.id === b.providerId);
        const nameA = provA ? (provA.commercialName || provA.legalName || '') : '';
        const nameB = provB ? (provB.commercialName || provB.legalName || '') : '';
        comparison = nameA.localeCompare(nameB, 'es');
      } else if (sortField === 'enrolled') {
        const enrolledA = enrollments.filter(e => Number(e.classId) === Number(a.id)).length;
        const enrolledB = enrollments.filter(e => Number(e.classId) === Number(b.id)).length;
        comparison = enrolledA - enrolledB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredClasses, sortField, sortOrder, providers, enrollments]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 shrink-0">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white p-1 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por clase, código o syllabus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Quick archive tabs */}
          <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFilterArchiveStatus('active')}
              className={`px-3 py-1 rounded-md transition-all ${filterArchiveStatus === 'active' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Activas ({activeClassesCount})
            </button>
            <button
              onClick={() => setFilterArchiveStatus('archived')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${filterArchiveStatus === 'archived' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Archive className="w-3 h-3 text-amber-600" />
              Archivadas ({archivedClassesCount})
            </button>
            <button
              onClick={() => setFilterArchiveStatus('all')}
              className={`px-3 py-1 rounded-md transition-all ${filterArchiveStatus === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Todas ({classes.length})
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista en Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {isSuperAdminOnly && (
            <button 
              onClick={() => setShowClearAllModal(true)}
              className="bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2 rounded-lg text-xs font-extrabold shadow-sm hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" /> Borrar Todo
            </button>
          )}

          {hasPermission(currentUser?.role, "Clases", "create") && (
            <button 
              onClick={handleOpenNewModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm hover:bg-indigo-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nueva Clase
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
        <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Filtros de Clases</h3>
          {(filterArchiveStatus !== 'active' || filterProviderId !== 'all' || filterCreditType !== 'all' || filterValidityStatus !== 'all' || filterValidityYear !== 'all' || searchQuery !== '' || sortField !== '') && (
            <button
              onClick={() => {
                setFilterArchiveStatus('active');
                setFilterProviderId('all');
                setFilterCreditType('all');
                setFilterValidityStatus('all');
                setFilterValidityYear('all');
                setSearchQuery('');
                setSortField('');
                setSortOrder('asc');
              }}
              className="ml-auto text-[10px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <X className="w-3 h-3" /> Limpiar Filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Filter 0: Archive Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estatus Catálogo</label>
            <select
              value={filterArchiveStatus}
              onChange={(e) => setFilterArchiveStatus(e.target.value as any)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2 bg-slate-50/50 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 outline-none"
            >
              <option value="active">Activas ({activeClassesCount})</option>
              <option value="archived">Archivadas ({archivedClassesCount})</option>
              <option value="all">Todas ({classes.length})</option>
            </select>
          </div>

          {/* Filter 1: Provider */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Proveedor Académico</label>
            <select
              value={filterProviderId}
              onChange={(e) => setFilterProviderId(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2 bg-slate-50/50 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 outline-none"
            >
              <option value="all">Cualquier Proveedor</option>
              <option value="none">Sin Proveedor asignado</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
              ))}
            </select>
          </div>

          {/* Filter 2: Credit Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Crédito</label>
            <select
              value={filterCreditType}
              onChange={(e) => setFilterCreditType(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2 bg-slate-50/50 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 outline-none"
            >
              <option value="all">Todos los Créditos</option>
              <option value="Full Credit">Full Credit</option>
              <option value="Half Credit">Half Credit</option>
              <option value="Full Credit AP">Full Credit AP</option>
              <option value="Half Credit AP">Half Credit AP</option>
            </select>
          </div>

          {/* Filter 3: Validity Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estatus de Vigencia</label>
            <select
              value={filterValidityStatus}
              onChange={(e) => {
                const val = e.target.value;
                setFilterValidityStatus(val);
                if (val === 'sin_vigencia') {
                   setFilterValidityYear('all');
                }
              }}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2 bg-slate-50/50 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 outline-none"
            >
              <option value="all">Todas las Vigencias</option>
              <option value="vigente">Vigentes (Aún no expira)</option>
              <option value="vencido">Vencidos (Ya expiró)</option>
              <option value="con_vigencia">Con vigencia asignada</option>
              <option value="sin_vigencia">Sin vigencia asignada</option>
            </select>
          </div>

          {/* Filter 4: Validity Year */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Año de Vigencia</label>
            <select
              value={filterValidityYear}
              disabled={filterValidityStatus === 'sin_vigencia'}
              onChange={(e) => setFilterValidityYear(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2 bg-slate-50/50 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Todos los Años</option>
              {uniqueValidityYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Filter 5: Ordenar por */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ordenar por</label>
            <div className="flex gap-1.5">
              <select
                value={sortField}
                onChange={(e) => {
                  const val = e.target.value as 'name' | 'provider' | 'enrolled' | '';
                  setSortField(val);
                  if (val && !sortOrder) {
                    setSortOrder('asc');
                  }
                }}
                className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2 bg-slate-50/50 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-550 text-slate-700 outline-none cursor-pointer"
              >
                <option value="">Sin orden específico</option>
                <option value="name">Nombre de la Clase</option>
                <option value="provider">Proveedor Académico</option>
                <option value="enrolled">Alumnos Inscritos</option>
              </select>
              {sortField && (
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-100 text-slate-700 transition outline-none shrink-0 flex items-center justify-center cursor-pointer"
                  title={sortOrder === 'asc' ? 'Orden Ascendente' : 'Orden Descendente'}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Banner */}
      {isSuperAdmin && selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 shrink-0 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-700">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {selectedIds.length} Clases Seleccionadas
              </p>
              <p className="text-[10px] text-slate-500">
                Puedes archivar, reactivar, o actualizar la vigencia, proveedor o tipo de crédito en un solo paso.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded uppercase tracking-wider transition"
            >
              Desmarcar todo
            </button>
            <button
              onClick={() => setBulkArchiveConfirm('archive')}
              className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-200 transition uppercase tracking-wider flex items-center gap-1"
            >
              <Archive className="w-3.5 h-3.5 text-amber-700" /> Archivar
            </button>
            <button
              onClick={() => setBulkArchiveConfirm('unarchive')}
              className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-200 transition uppercase tracking-wider flex items-center gap-1"
            >
              <ArchiveRestore className="w-3.5 h-3.5 text-emerald-700" /> Desarchivar
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 shadow transition uppercase tracking-wider"
            >
              Modificación Masiva
            </button>
          </div>
        </div>
      )}

      {/* CLASSES CONTAINER */}
      {viewMode === 'list' ? (
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
          <div className="overflow-auto flex-1 min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={sortedClasses.length > 0 && sortedClasses.every(c => selectedIds.includes(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => {
                              const unique = new Set([...prev, ...sortedClasses.map(c => c.id)]);
                              return Array.from(unique);
                            });
                          } else {
                            setSelectedIds(prev => prev.filter(id => !sortedClasses.some(c => c.id === id)));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                      />
                    </th>
                  )}
                  <th 
                    className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nombre de la Clase</span>
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3">Clave</th>
                  <th 
                    className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition"
                    onClick={() => handleSort('provider')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Proveedor Académico</span>
                      {sortField === 'provider' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3">Tipo de Crédito</th>
                  <th className="px-6 py-3">Vigencia</th>
                  <th 
                    className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition"
                    onClick={() => handleSort('enrolled')}
                  >
                    <div className="flex items-center gap-1.5 justify-center">
                      <span>Alumnos Inscritos</span>
                      {sortField === 'enrolled' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs bg-white">
                {sortedClasses.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 7} className="px-6 py-12 text-center text-slate-400 italic">
                      No se encontraron clases que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  sortedClasses.map((curso) => {
                    const linkedProvider = providers.find(p => p.id === curso.providerId);
                    const numEnrolled = enrollments.filter(e => Number(e.classId) === Number(curso.id)).length;
                    const isSelected = selectedIds.includes(curso.id);

                    return (
                      <tr 
                        key={curso.id}
                        onClick={() => navigate(`/clases/${curso.id}`)}
                        className={`hover:bg-slate-50/80 group cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/30' : ''} ${curso.isArchived ? 'bg-amber-50/20 opacity-80 hover:opacity-100' : ''}`}
                      >
                        {isSuperAdmin && (
                          <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(curso.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                            />
                          </td>
                        )}
                        <td className="px-6 py-3 font-semibold text-slate-900 border-l-[3px] border-transparent group-hover:border-indigo-500">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span>{curso.name}</span>
                              {curso.isArchived && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide">
                                  <Archive className="w-2.5 h-2.5 text-amber-700" /> Archivada
                                </span>
                              )}
                            </div>
                            {curso.syllabus && (
                              <span className="text-[10px] text-slate-400 font-normal truncate max-w-xs" title={curso.syllabus}>
                                Syllabus: {curso.syllabus}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 font-mono text-[10px]">
                          {curso.code || <span className="text-slate-300 font-sans italic">-</span>}
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-semibold text-[11px]">
                          {linkedProvider ? (
                            <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50/50 border border-purple-100 px-2 py-0.5 rounded font-bold max-w-xs" title={linkedProvider.commercialName || linkedProvider.legalName}>
                              📚 {linkedProvider.commercialName || linkedProvider.legalName}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">No asignado</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap">
                            {formatCreditType(curso.creditType)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-semibold font-sans">
                          {curso.validity || <span className="text-slate-300 italic">-</span>}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[11px]">
                            {numEnrolled} Alumnos
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/clases/${curso.id}`)}
                              className="text-indigo-600 hover:text-indigo-800 text-[10px] uppercase font-bold tracking-wider border border-indigo-100 hover:bg-indigo-50 px-2 py-1 rounded transition"
                            >
                              Detalles
                            </button>
                            {hasPermission(currentUser?.role, "Clases", "edit") && (
                              curso.isArchived ? (
                                <button
                                  onClick={() => setClassToArchive({ id: curso.id, name: curso.name, isArchived: true, numEnrolled })}
                                  className="text-emerald-700 hover:text-emerald-900 text-[10px] uppercase font-bold tracking-wider border border-emerald-200 hover:bg-emerald-50 px-2 py-1 rounded transition flex items-center gap-1"
                                  title="Reactivar / Desarchivar clase"
                                >
                                  <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600" /> Desarchivar
                                </button>
                              ) : (
                                <button
                                  onClick={() => setClassToArchive({ id: curso.id, name: curso.name, isArchived: false, numEnrolled })}
                                  className="text-amber-700 hover:text-amber-900 text-[10px] uppercase font-bold tracking-wider border border-amber-200 hover:bg-amber-50 px-2 py-1 rounded transition flex items-center gap-1"
                                  title="Archivar clase"
                                >
                                  <Archive className="w-3.5 h-3.5 text-amber-600" /> Archivar
                                </button>
                              )
                            )}
                            {isSuperAdminOnly && (
                              <button
                                onClick={() => setClassToDelete({ id: curso.id, name: curso.name, numEnrolled })}
                                className="text-rose-500 hover:text-rose-700 text-[10px] uppercase font-bold tracking-wider border border-rose-100 hover:bg-rose-50 p-1 rounded transition"
                                title="Eliminar clase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID MODE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClasses.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic">
              No se encontraron clases que coincidan con la búsqueda.
            </div>
          ) : (
            sortedClasses.map((curso) => {
              const linkedProvider = providers.find(p => p.id === curso.providerId);
              const numEnrolled = enrollments.filter(e => Number(e.classId) === Number(curso.id)).length;
              const isSelected = selectedIds.includes(curso.id);

              return (
                <div 
                  key={curso.id} 
                  onClick={() => navigate(`/clases/${curso.id}`)}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative ${
                    isSelected ? 'border-indigo-400 ring-2 ring-indigo-550/20 bg-indigo-50/10' : 'border-slate-200'
                  } ${curso.isArchived ? 'bg-amber-50/10 border-amber-200 opacity-90' : ''}`}
                >
                  {isSuperAdmin && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="absolute top-3 left-3 z-10 bg-white rounded-md p-1 border border-slate-200 hover:scale-105 transition shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(curso.id)}
                        className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                      />
                    </div>
                  )}

                  <div className={`p-4 border-b border-slate-100 group-hover:bg-slate-50/80 transition-colors ${isSuperAdmin ? 'pl-11' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate" title={curso.name}>
                            {curso.name}
                          </h3>
                          {curso.isArchived && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded shrink-0">
                              <Archive className="w-2.5 h-2.5 text-amber-700" /> Archivada
                            </span>
                          )}
                        </div>
                        {curso.code && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{curso.code}</p>}
                        {linkedProvider && (
                          <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 truncate max-w-full" title={linkedProvider.commercialName || linkedProvider.legalName}>
                            📚 {linkedProvider.commercialName || linkedProvider.legalName}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest shrink-0 uppercase whitespace-nowrap">
                        {formatCreditType(curso.creditType)}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50/50 space-y-2 text-xs flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium font-sans">Inscritos:</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">{numEnrolled} Alumnos</span>
                    </div>
                    {curso.validity && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Vigencia:</span>
                        <span className="font-semibold text-slate-800">{curso.validity}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 bg-white flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {hasPermission(currentUser?.role, "Clases", "edit") && (
                        curso.isArchived ? (
                          <button
                            onClick={() => setClassToArchive({ id: curso.id, name: curso.name, isArchived: true, numEnrolled })}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 uppercase tracking-wider flex items-center gap-1 py-1"
                            title="Reactivar / Desarchivar clase"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600" /> Desarchivar
                          </button>
                        ) : (
                          <button
                            onClick={() => setClassToArchive({ id: curso.id, name: curso.name, isArchived: false, numEnrolled })}
                            className="text-[10px] font-bold text-amber-700 hover:text-amber-900 uppercase tracking-wider flex items-center gap-1 py-1"
                            title="Archivar clase"
                          >
                            <Archive className="w-3.5 h-3.5 text-amber-600" /> Archivar
                          </button>
                        )
                      )}
                      {isSuperAdminOnly && (
                        <button 
                          onClick={() => {
                            setClassToDelete({
                              id: curso.id,
                              name: curso.name,
                              numEnrolled
                            });
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider flex items-center gap-1 py-1"
                          title="Eliminar clase"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => navigate(`/clases/${curso.id}`)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider py-1"
                    >
                      {curso.syllabus ? 'Ver Syllabus' : 'Ver Detalles'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {classToArchive && (
        <Modal
          isOpen={true}
          onClose={() => setClassToArchive(null)}
          title={classToArchive.isArchived ? "Confirmar Reactivación de Clase" : "Confirmar Archivo de Clase"}
        >
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${classToArchive.isArchived ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'} space-y-2 text-xs leading-relaxed`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {classToArchive.isArchived ? (
                  <>
                    <ArchiveRestore className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>¿Reactivar la clase en el catálogo?</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>¿Archivar la clase?</span>
                  </>
                )}
              </div>
              {classToArchive.isArchived ? (
                <p>
                  Al desarchivar la clase <strong className="font-bold text-slate-900">"{classToArchive.name}"</strong>, volverá a mostrarse como activa en el catálogo general y estará disponible para nuevas asignaciones e inscripciones.
                </p>
              ) : (
                <div>
                  <p>
                    Al archivar la clase <strong className="font-bold text-slate-900">"{classToArchive.name}"</strong>, se ocultará de la lista activa y no estará disponible para nuevas inscripciones.
                  </p>
                  {classToArchive.numEnrolled > 0 && (
                    <p className="mt-2 font-semibold text-amber-950 bg-amber-100/60 p-2 rounded border border-amber-300">
                      ℹ️ Sus <strong className="font-bold">{classToArchive.numEnrolled} alumno(s) inscrito(s)</strong> y todo su historial académico y contable se mantendrán 100% seguros e intactos.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClassToArchive(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextStatus = !classToArchive.isArchived;
                  updateClass(classToArchive.id, { isArchived: nextStatus });
                  setToastMessage(
                    nextStatus 
                      ? `La clase "${classToArchive.name}" ha sido archivada correctamente.` 
                      : `La clase "${classToArchive.name}" ha sido reactivada y desarchivada con éxito.`
                  );
                  setClassToArchive(null);
                  setTimeout(() => setToastMessage(null), 4000);
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors uppercase tracking-wider shadow-sm ${
                  classToArchive.isArchived 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {classToArchive.isArchived ? 'Reactivar Clase' : 'Archivar Clase'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Archive/Unarchive Confirmation Modal */}
      {bulkArchiveConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setBulkArchiveConfirm(null)}
          title={bulkArchiveConfirm === 'archive' ? "Archivar Clases Seleccionadas" : "Desarchivar Clases Seleccionadas"}
        >
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${bulkArchiveConfirm === 'archive' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'} space-y-2 text-xs leading-relaxed`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {bulkArchiveConfirm === 'archive' ? (
                  <>
                    <Archive className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>¿Archivar {selectedIds.length} clases seleccionadas?</span>
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>¿Desarchivar {selectedIds.length} clases seleccionadas?</span>
                  </>
                )}
              </div>
              <p>
                {bulkArchiveConfirm === 'archive'
                  ? `Las ${selectedIds.length} clases seleccionadas pasarán a estatus archivado. No estarán disponibles para nuevas inscripciones, pero conservarán todos sus alumnos e historial intactos.`
                  : `Las ${selectedIds.length} clases seleccionadas volverán a estar activas en el catálogo general.`}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkArchiveConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const isArchiving = bulkArchiveConfirm === 'archive';
                  selectedIds.forEach(id => {
                    updateClass(id, { isArchived: isArchiving });
                  });
                  setToastMessage(
                    isArchiving
                      ? `Se han archivado ${selectedIds.length} clases con éxito.`
                      : `Se han desarchivado ${selectedIds.length} clases con éxito.`
                  );
                  setSelectedIds([]);
                  setBulkArchiveConfirm(null);
                  setTimeout(() => setToastMessage(null), 4000);
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors uppercase tracking-wider shadow-sm ${
                  bulkArchiveConfirm === 'archive'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {bulkArchiveConfirm === 'archive' ? 'Sí, Archivar Seleccionadas' : 'Sí, Reactivar Seleccionadas'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {classToDelete && (
        <Modal 
          isOpen={true} 
          onClose={() => setClassToDelete(null)} 
          title="Confirmar Eliminación de Clase"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {classToDelete.numEnrolled > 0 ? (
                <span>
                  ⚠️ <strong>Atención:</strong> Esta clase tiene <strong className="font-bold text-rose-600">{classToDelete.numEnrolled} alumno(s) inscrito(s)</strong>.
                  ¿Estás seguro de que deseas eliminar la clase <strong className="font-bold text-slate-850">"{classToDelete.name}"</strong> permanentemente? Esta acción es irreversible.
                </span>
              ) : (
                <span>
                  ¿Estás seguro de que deseas eliminar permanentemente la clase <strong className="font-bold text-slate-850">"{classToDelete.name}"</strong>? Esta acción es irreversible.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteClass(classToDelete.id);
                  setClassToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors uppercase tracking-wider"
              >
                Eliminar Clase
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setShowClearAllModal(false);
            setConfirmClearText("");
          }} 
          title="⚠️ ATENCIÓN: BORRAR TODAS LAS CLASES Y CRÉDITOS"
        >
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 text-xs leading-relaxed space-y-2">
              <p className="font-extrabold text-sm flex items-center gap-1.5 uppercase text-rose-700">
                🚨 Acción Crítica y Destructiva 🚨
              </p>
              <p>
                Estás a punto de eliminar <strong>TODAS las clases</strong> del catálogo y <strong>TODOS sus correspondientes créditos académicos, tarifas e inscripciones asociadas</strong> del sistema.
              </p>
              <p className="font-semibold">
                Esta acción NO se puede deshacer y afectará la información de los alumnos inscritos.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 uppercase tracking-widest text-[9px] font-mono">Resumen de registros a vaciar:</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[10.5px]">
                <li>Clases registradas: <strong className="text-slate-950 font-bold">{classes.length}</strong></li>
                <li>Inscripciones de Alumnos: <strong className="text-slate-950 font-bold">{enrollments.length}</strong></li>
              </ul>
            </div>

            <p className="text-xs text-slate-500 italic">
              Por favor, escribe <strong className="font-bold text-rose-600 select-none font-mono">"ELIMINAR TODO"</strong> a continuación para confirmar que realmente deseas proceder con el borrado completo.
            </p>

            <input
              type="text"
              placeholder="Escribe ELIMINAR TODO para confirmar"
              value={confirmClearText}
              onChange={(e) => setConfirmClearText(e.target.value)}
              className="w-full border border-rose-300 rounded p-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none text-rose-900 font-bold font-mono placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowClearAllModal(false);
                  setConfirmClearText("");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmClearText !== "ELIMINAR TODO"}
                onClick={() => {
                  clearAllClasses();
                  setShowClearAllModal(false);
                  setConfirmClearText("");
                  alert("Se han eliminado todas las clases, créditos académicos e inscripciones de manera exitosa.");
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg disabled:hover:shadow-none font-sans"
              >
                Sí, Borrar Todo Permanentemente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Class Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Clase">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Clase</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Proveedor de Contenido Académico</label>
              <select
                required
                value={formData.providerId}
                onChange={e => setFormData({...formData, providerId: e.target.value})}
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
              >
                <option value="">Seleccionar Proveedor...</option>
                {providers.filter(p => !p.providerType || p.providerType === "Curriculum Académico").map(p => (
                  <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Clave</label>
              <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Crédito</label>
              <select
                required
                value={formData.creditType}
                onChange={e => setFormData({...formData, creditType: e.target.value as any})}
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-850"
              >
                <option value="Full Credit">Full Credit</option>
                <option value="Half Credit">Half Credit</option>
                <option value="Full Credit AP">Full Credit AP</option>
                <option value="Half Credit AP">Half Credit AP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Vigencia</label>
              <input type="date" value={formData.validity} onChange={e => setFormData({...formData, validity: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Syllabus (Enlace o Ref)</label>
              <input type="text" value={formData.syllabus} onChange={e => setFormData({...formData, syllabus: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm">Guardar Clase</button>
          </div>
        </form>
      </Modal>

      {/* Bulk Modification Modal */}
      {isBulkModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsBulkModalOpen(false)} 
          title="Modificación Masiva de Clases"
        >
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 border-b border-slate-100 pb-2">
              Selecciona cuáles propiedades deseas actualizar para las <strong className="font-extrabold text-slate-700">{selectedIds.length}</strong> clases seleccionadas. Las dejas desmarcadas si no quieres modificarlas.
            </p>

            <div className="space-y-4">
              {/* 1. Vigencia */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkFormData.changeValidity}
                    onChange={(e) => setBulkFormData({...bulkFormData, changeValidity: e.target.checked})}
                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Actualizar Vigencia</span>
                </label>
                {bulkFormData.changeValidity && (
                  <div className="pt-1.5 pl-6">
                    <input
                      type="date"
                      value={bulkFormData.validity}
                      onChange={(e) => setBulkFormData({...bulkFormData, validity: e.target.value})}
                      className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 2. Proveedor */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkFormData.changeProvider}
                    onChange={(e) => setBulkFormData({...bulkFormData, changeProvider: e.target.checked})}
                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Actualizar Proveedor Académico</span>
                </label>
                {bulkFormData.changeProvider && (
                  <div className="pt-1.5 pl-6">
                    <select
                      value={bulkFormData.providerId}
                      onChange={(e) => setBulkFormData({...bulkFormData, providerId: e.target.value})}
                      className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-850"
                    >
                      <option value="">Ninguno / Quitar Proveedor</option>
                      {providers.filter(p => !p.providerType || p.providerType === "Curriculum Académico").map(p => (
                        <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Tipo de Crédito */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkFormData.changeCreditType}
                    onChange={(e) => setBulkFormData({...bulkFormData, changeCreditType: e.target.checked})}
                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Actualizar Tipo de Crédito</span>
                </label>
                {bulkFormData.changeCreditType && (
                  <div className="pt-1.5 pl-6">
                    <select
                      value={bulkFormData.creditType}
                      onChange={(e) => setBulkFormData({...bulkFormData, creditType: e.target.value as any})}
                      className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-850"
                    >
                      <option value="Full Credit">Full Credit</option>
                      <option value="Half Credit">Half Credit</option>
                      <option value="Full Credit AP">Full Credit AP</option>
                      <option value="Half Credit AP">Half Credit AP</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 4. Estatus de Archivo */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkFormData.changeArchiveStatus}
                    onChange={(e) => setBulkFormData({...bulkFormData, changeArchiveStatus: e.target.checked})}
                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Actualizar Estatus de Catálogo</span>
                </label>
                {bulkFormData.changeArchiveStatus && (
                  <div className="pt-1.5 pl-6">
                    <select
                      value={bulkFormData.isArchived ? "true" : "false"}
                      onChange={(e) => setBulkFormData({...bulkFormData, isArchived: e.target.value === "true"})}
                      className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-850"
                    >
                      <option value="false">Activa (Disponible en catálogo)</option>
                      <option value="true">Archivada (Oculta del catálogo activo)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsBulkModalOpen(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={!bulkFormData.changeValidity && !bulkFormData.changeProvider && !bulkFormData.changeCreditType && !bulkFormData.changeArchiveStatus}
                className="px-4 py-2 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm"
              >
                Aplicar a {selectedIds.length} Clases
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
