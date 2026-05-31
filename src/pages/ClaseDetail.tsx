import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Calendar, Edit2, Download, GraduationCap, Users, Globe, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

export function ClaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { classes, students, institutions, enrollments, updateClass, deleteClass, providers, providerProductServices } = useAppContext();
  
  const [activeTab, setActiveTab] = useState("Información General");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const curso = classes.find(c => c.id === Number(id));
  
  const [formData, setFormData] = useState({
    name: curso?.name || '',
    code: curso?.code || '',
    creditType: curso?.creditType || 'Crédito completo' as 'Crédito completo' | 'Medio Crédito' | 'Crédito completo AP' | 'Medio Crédito AP',
    syllabus: curso?.syllabus || '',
    validity: curso?.validity || '',
    providerId: curso?.providerId || '',
  });

  const [countryRates, setCountryRates] = useState<Array<{ country: string; price: string; cost: string }>>([]);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryPrice, setNewCountryPrice] = useState('');
  const [newCountryCost, setNewCountryCost] = useState('');

  if (!curso) {
    return <div className="p-8 text-center text-slate-500">Clase no encontrada</div>;
  }

  const courseEnrollments = enrollments.filter(e => Number(e.classId) === Number(curso.id));

  const getStudentInfo = (studentId: number) => {
    const s = students.find(s => s.id === studentId);
    if (!s) return null;
    const inst = institutions.find(i => i.id === s.institutionId);
    return { ...s, instName: inst?.name || "Desconocida" };
  };

  const handleOpenEditModal = () => {
    setFormData({
      name: curso.name || '',
      code: curso.code || '',
      creditType: curso.creditType || 'Crédito completo',
      syllabus: curso.syllabus || '',
      validity: curso.validity || '',
      providerId: curso.providerId || '',
    });
    
    // Map existing countryRates Record to Array format
    const mappedRates: Array<{ country: string; price: string; cost: string }> = [];
    if (curso.countryRates) {
      Object.entries(curso.countryRates).forEach(([country, info]) => {
        const infoCast = info as { price: string; cost: string };
        mappedRates.push({
          country,
          price: infoCast.price || '0',
          cost: infoCast.cost || '0'
        });
      });
    }
    setCountryRates(mappedRates);
    setNewCountryName('');
    setNewCountryPrice('');
    setNewCountryCost('');
    setIsEditModalOpen(true);
  };

  const loadRatesFromProvider = () => {
    if (!formData.providerId) return;
    const selectedProvId = Number(formData.providerId);
    const serviceClass = providerProductServices?.find(
      ps => ps.providerId === selectedProvId && ['clase', 'clases'].includes(ps.productType.toLowerCase())
    );
    if (serviceClass && serviceClass.countryPrices) {
      const mappedRates = serviceClass.countryPrices.map(cp => {
        let price = '0';
        let cost = '0';
        if (formData.creditType === 'Crédito completo') {
          price = cp.priceFullCredit;
          cost = cp.costFullCredit;
        } else if (formData.creditType === 'Medio Crédito') {
          price = cp.priceHalfCredit;
          cost = cp.costHalfCredit;
        } else if (formData.creditType === 'Crédito completo AP') {
          price = cp.priceFullApCredit;
          cost = cp.costFullApCredit;
        } else if (formData.creditType === 'Medio Crédito AP') {
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
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ratesMap: Record<string, { price: string; cost: string }> = {};
    countryRates.forEach(cr => {
      if (cr.country.trim()) {
        ratesMap[cr.country.trim()] = {
          price: cr.price,
          cost: cr.cost
        };
      }
    });

    updateClass(curso.id, { 
      ...formData, 
      providerId: formData.providerId ? Number(formData.providerId) : undefined,
      countryRates: ratesMap
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-0 flex flex-col flex-1">
      {/* Top Identity Banner */}
      <div className="bg-slate-900 border-b border-slate-800 -mx-6 -mt-6 px-8 py-8 mb-8 rounded-b-3xl shadow-sm shrink-0">
        
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/clases')}
            className="text-slate-400 hover:text-white flex items-center text-xs font-bold uppercase tracking-wider transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Clases
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenEditModal}
              className="flex items-center text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-slate-700 transition"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Editar
            </button>
            <button
              onClick={() => {
                const count = courseEnrollments.length;
                const confirmMsg = count > 0 
                  ? `Atención: Esta clase tiene ${count} alumno(s) inscrito(s). ¿Estás seguro de que deseas eliminar la clase "${curso.name}" permanentemente?` 
                  : `¿Estás seguro de que deseas eliminar permanentemente la clase "${curso.name}"?`;
                if (window.confirm(confirmMsg)) {
                  deleteClass(curso.id);
                  navigate('/clases');
                }
              }}
              className="flex items-center text-xs font-bold bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/60 px-3 py-1.5 rounded-full uppercase tracking-wider transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Eliminar
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-inner shrink-0">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-indigo-400 font-bold text-xs tracking-widest uppercase">{curso.code || "SIN CLAVE"}</span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{curso.name}</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px] flex-1">
        
        {/* Main Tabs */}
        <div className="flex border-b border-slate-100 px-6 shrink-0 overflow-x-auto hide-scrollbar">
          {["Información General", "Alumnos Inscritos"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center px-6 py-4 text-xs font-bold tracking-widest uppercase transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Context Content */}
        <div className="p-8 flex-1 bg-slate-50/50 flex flex-col">
          
          {activeTab === "Información General" && (
            <div className="animate-in fade-in duration-300 max-w-4xl space-y-8">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center">
                    <GraduationCap className="w-3.5 h-3.5 mr-1" /> Tipo de Crédito
                  </p>
                  <p className="text-base font-bold text-slate-900">{curso.creditType || "Crédito completo"}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1" /> Alumnos Inscritos (Suma Real)
                  </p>
                  <p className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-150">{courseEnrollments.length} Inscritos</p>
                </div>
              </div>

              {/* Proveedor Vinculado */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">Proveedor de Contenido Académico</h3>
                {(() => {
                  const p = providers.find(prov => prov.id === curso.providerId);
                  if (p) {
                    return (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{p.commercialName || p.legalName}</p>
                          <p className="text-xs text-slate-500 font-mono">{p.email || 'Sin correo directo'}</p>
                        </div>
                      </div>
                    );
                  }
                  return <p className="text-xs text-slate-400 italic">No se ha asignado un proveedor específico para esta clase.</p>;
                })()}
              </div>

              {/* Detalles Adicionales */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Detalles Adicionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Vigencia
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{curso.validity || "No especificada"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                      <BookOpen className="w-3.5 h-3.5 mr-1" /> Syllabus
                    </p>
                    {curso.syllabus ? (
                      <a href={curso.syllabus} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center">
                        <Download className="w-3.5 h-3.5 mr-1" /> Ver Documento
                      </a>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No disponible</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Alumnos Inscritos" && (
             <div className="animate-in fade-in flex-1 flex flex-col min-h-0">
               {courseEnrollments.length > 0 ? (
                 <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col bg-white">
                    <div className="overflow-auto flex-1">
                      <table className="w-full text-left bg-white">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 shadow-sm">
                          <tr>
                            <th className="px-6 py-3 border-b border-slate-200">Alumno</th>
                            <th className="px-6 py-3 border-b border-slate-200">Institución</th>
                            <th className="px-6 py-3 border-b border-slate-200">Fecha Inicio</th>
                            <th className="px-6 py-3 border-b border-slate-200">Fecha Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {courseEnrollments.map((env) => {
                            const sti = getStudentInfo(env.studentId);
                            if (!sti) return null;
                            return (
                              <tr key={env.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3">
                                  <p className="font-semibold text-slate-900 text-xs">{sti.name} {sti.lastName}</p>
                                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">STU-108{sti.id.toString().padStart(2, '0')}</p>
                                </td>
                                <td className="px-6 py-3 text-xs text-slate-600">{sti.instName}</td>
                                <td className="px-6 py-3 text-xs text-slate-600 font-mono">{env.startDate}</td>
                                <td className="px-6 py-3 text-xs text-slate-600 font-mono">{env.endDate}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                 </div>
               ) : (
                 <div className="py-20 text-center flex flex-col items-center justify-center">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <GraduationCap className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-slate-600 font-medium mb-1">Sin alumnos inscritos</p>
                   <p className="text-xs text-slate-400">No hay estudiantes tomando esta clase actualmente.</p>
                 </div>
               )}
             </div>
          )}
          
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Clase">
        <form onSubmit={handleEditSubmit} className="space-y-4">
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
                <option value="Crédito completo">Crédito completo</option>
                <option value="Medio Crédito">Medio Crédito</option>
                <option value="Crédito completo AP">Crédito completo AP</option>
                <option value="Medio Crédito AP">Medio Crédito AP</option>
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
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
