import React, { useState } from "react";
import { List, Plus, Edit2, Trash2, X } from "lucide-react";
import { useAppContext, CatalogTypes, CatalogItem } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

export function Catalogos() {
  const { catalogs, addCatalogItem, updateCatalogItem, deleteCatalogItem, providers } = useAppContext();
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogTypes | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ catalog: CatalogTypes; item: CatalogItem } | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("anual");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formCurrency, setFormCurrency] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formProviderIds, setFormProviderIds] = useState<number[]>([]);

  // Bank accounts specific states
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formClabe, setFormClabe] = useState("");
  const [formSwift, setFormSwift] = useState("");
  const [formAba, setFormAba] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const catalogKeys: CatalogTypes[] = [
    'Tarifas Países', 
    'Tipos de Institución', 
    'Monedas', 
    'Roles de Usuario', 
    'Métodos de Pago', 
    'Estados Académicos',
    'Categorías',
    'Subcategorías',
    'Membresías',
    'Cuentas bancarias',
    'Modalidades',
    'Tipo de Producto'
  ];

  const handleOpenModal = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormDescription(item.description || "");
      setFormType(item.type || (selectedCatalog === 'Categorías' ? 'income' : 'anual'));
      setFormAmount(item.amount ?? "");
      setFormCurrency(item.currency || "");
      setFormParentId(item.parentId || "");
      setFormCompanyName(item.companyName || "");
      setFormAccountNumber(item.accountNumber || "");
      setFormClabe(item.clabe || "");
      setFormSwift(item.swift || "");
      setFormAba(item.aba || "");
      setFormNotes(item.notes || "");
      setFormProviderIds(item.providerIds || []);
    } else {
      setEditingItem(null);
      setFormName("");
      setFormDescription("");
      setFormType(selectedCatalog === 'Categorías' ? 'income' : 'anual');
      setFormAmount("");
      setFormCurrency("");
      setFormParentId("");
      setFormCompanyName("");
      setFormAccountNumber("");
      setFormClabe("");
      setFormSwift("");
      setFormAba("");
      setFormNotes("");
      setFormProviderIds([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormName("");
    setFormDescription("");
    setFormType("anual");
    setFormAmount("");
    setFormCurrency("");
    setFormParentId("");
    setFormCompanyName("");
    setFormAccountNumber("");
    setFormClabe("");
    setFormSwift("");
    setFormAba("");
    setFormNotes("");
    setFormProviderIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalog) return;

    const data: Partial<CatalogItem> = {
      name: formName,
      description: formDescription,
    };
    
    if (selectedCatalog === 'Membresías') {
      data.type = formType;
      data.amount = formAmount === "" ? undefined : Number(formAmount);
      data.currency = formCurrency;
    }
    
    if (selectedCatalog === 'Subcategorías') {
      data.parentId = formParentId;
    }

    if (selectedCatalog === 'Cuentas bancarias') {
      data.companyName = formCompanyName;
      data.accountNumber = formAccountNumber;
      data.clabe = formClabe;
      data.swift = formSwift;
      data.aba = formAba;
      data.notes = formNotes;
    }

    if (selectedCatalog === 'Tipo de Producto') {
      data.providerIds = formProviderIds;
    }

    if (editingItem) {
      updateCatalogItem(selectedCatalog, editingItem.id, data);
    } else {
      addCatalogItem(selectedCatalog, data as Omit<CatalogItem, "id">);
    }
    handleCloseModal();
  };

  const handleDelete = (item: CatalogItem) => {
    if (!selectedCatalog) return;
    setDeleteConfirmItem({
      catalog: selectedCatalog,
      item
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
      
      {!selectedCatalog ? (
        <div className="space-y-4 flex-1 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {catalogKeys.map((item, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedCatalog(item)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer group flex flex-col items-center text-center space-y-3"
              >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <List className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm tracking-wide block">{item}</span>
                  <p className="text-xs text-slate-500 mt-1">{catalogs[item]?.length || 0} elementos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-full">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
            <div>
              <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
                 <button onClick={() => setSelectedCatalog(null)} className="hover:text-indigo-600 transition-colors">Catálogos</button>
                 <span>/</span>
                 <span className="font-medium text-slate-700">{selectedCatalog}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800">{selectedCatalog}</h3>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Añadir Nuevo
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {catalogs[selectedCatalog]?.map((item) => (
                 <div key={item.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group flex flex-col relative bg-white">
                    <div className="absolute top-3 right-3 flex space-x-1 opacity-100 sm:opacity-75 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                         className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                         title="Eliminar"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 pr-16 text-base">{item.name}</h4>
                    {selectedCatalog === 'Membresías' && (
                      <div className="mt-3 flex flex-col space-y-1">
                        <div className="flex items-center text-xs">
                          <span className="font-bold text-slate-500 w-16">Tipo:</span>
                          <span className="text-slate-700 capitalize">{item.type}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="font-bold text-slate-500 w-16">Precio:</span>
                          <span className="text-slate-700">{item.amount ? `${item.amount} ${item.currency}` : 'N/A'}</span>
                        </div>
                      </div>
                    )}
                    {selectedCatalog === 'Subcategorías' && (
                      <div className="mt-3 flex flex-col space-y-1">
                        <div className="flex items-center text-xs">
                          <span className="font-bold text-slate-500 w-16">Categoría:</span>
                          <span className="text-slate-700">
                            {catalogs['Categorías']?.find(c => c.id === item.parentId)?.name || 'Sin categoría'}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedCatalog === 'Cuentas bancarias' && (
                      <div className="mt-3 flex flex-col space-y-1.5 border-t border-slate-100 pt-3">
                        {item.companyName && (
                          <div className="flex items-start text-xs">
                            <span className="font-bold text-slate-400 w-20 shrink-0">Empresa:</span>
                            <span className="text-slate-700 font-bold">{item.companyName}</span>
                          </div>
                        )}
                        {item.accountNumber && (
                          <div className="flex items-start text-xs">
                            <span className="font-bold text-slate-400 w-20 shrink-0">Cuenta:</span>
                            <span className="text-slate-700 font-mono font-medium">{item.accountNumber}</span>
                          </div>
                        )}
                        {item.clabe && (
                          <div className="flex items-start text-xs">
                            <span className="font-bold text-slate-400 w-20 shrink-0">CLABE:</span>
                            <span className="text-slate-700 font-mono font-medium">{item.clabe}</span>
                          </div>
                        )}
                        {item.swift && (
                          <div className="flex items-start text-xs">
                            <span className="font-bold text-slate-400 w-20 shrink-0">SWIFT:</span>
                            <span className="text-slate-700 font-mono font-medium">{item.swift}</span>
                          </div>
                        )}
                        {item.aba && (
                          <div className="flex items-start text-xs">
                            <span className="font-bold text-slate-400 w-20 shrink-0">ABA:</span>
                            <span className="text-slate-700 font-mono font-medium">{item.aba}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="flex flex-col text-xs mt-1.5 bg-slate-50 p-2 rounded">
                            <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider mb-0.5">Notas:</span>
                            <span className="text-slate-600 font-medium leading-normal">{item.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedCatalog === 'Tipo de Producto' && (
                      <div className="mt-3 flex flex-col space-y-1">
                        <div className="text-xs">
                          <span className="font-bold text-slate-500 block mb-1">Proveedores donde se vende:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {!item.providerIds || item.providerIds.length === 0 ? (
                              <span className="text-rose-500 italic bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[10px]">
                                Ninguno (No se mostrará)
                              </span>
                            ) : (
                              item.providerIds.map(pid => {
                                const prov = providers?.find(p => p.id === pid);
                                return (
                                  <span key={pid} className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md px-1.5 py-0.5 text-[10px] uppercase font-bold">
                                    {prov ? prov.commercialName : `ID: ${pid}`}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {item.description && selectedCatalog !== 'Cuentas bancarias' && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                    )}
                 </div>
               ))}

               {(!catalogs[selectedCatalog] || catalogs[selectedCatalog].length === 0) && (
                 <div className="col-span-full py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                   <List className="w-10 h-10 text-slate-300 mb-3" />
                   <p className="text-slate-500 font-medium">No hay elementos en este catálogo.</p>
                   <button 
                     onClick={() => handleOpenModal()}
                     className="mt-4 text-indigo-600 font-bold text-sm tracking-wide hover:underline"
                   >
                     Añadir el primer elemento
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && selectedCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                {editingItem ? 'Editar' : 'Nuevo'} {selectedCatalog.slice(0, -1)} {/* Just a rough singular trick */}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {selectedCatalog === 'Cuentas bancarias' ? 'Nombre Cuenta' : 'Nombre'} <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder={`Ej. ${selectedCatalog === 'Cuentas bancarias' ? 'Nombre de la Cuenta (BBVA, Santander, etc.)' : selectedCatalog === 'Monedas' ? 'MXN - Peso' : 'Valor'}`}
                  />
                </div>
                
                {selectedCatalog === 'Cuentas bancarias' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre Empresa <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={formCompanyName}
                        onChange={(e) => setFormCompanyName(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Nombre de la Empresa o Razón Social"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cuenta <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={formAccountNumber}
                        onChange={(e) => setFormAccountNumber(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Número de Cuenta Bancaria"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">CLABE</label>
                      <input 
                        type="text" 
                        value={formClabe}
                        onChange={(e) => setFormClabe(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Clabe Interbancaria (18 dígitos)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">SWIFT</label>
                        <input 
                          type="text" 
                          value={formSwift}
                          onChange={(e) => setFormSwift(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                          placeholder="Código SWIFT/BIC"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">ABA</label>
                        <input 
                          type="text" 
                          value={formAba}
                          onChange={(e) => setFormAba(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                          placeholder="Número de Ruta ABA"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Notas</label>
                      <textarea 
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm resize-none"
                        placeholder="Notas adicionales..."
                      />
                    </div>
                  </>
                )}
                
                {selectedCatalog === 'Categorías' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tipo <span className="text-rose-500">*</span></label>
                    <select 
                      required
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                    >
                      <option value="income">Ingreso</option>
                      <option value="expense">Egreso</option>
                    </select>
                  </div>
                )}
                
                {selectedCatalog === 'Membresías' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tipo <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                      >
                        <option value="anual">Anual</option>
                        <option value="semestral">Semestral</option>
                        <option value="mensual">Mensual</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cantidad <span className="text-rose-500">*</span></label>
                        <input 
                          type="number" 
                          required
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : "")}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                          placeholder="Ej. 1000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Moneda <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          value={formCurrency}
                          onChange={(e) => setFormCurrency(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm uppercase"
                          placeholder="Ej. USD o MXN"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedCatalog === 'Subcategorías' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Categoría <span className="text-rose-500">*</span></label>
                    <select 
                      required
                      value={formParentId}
                      onChange={(e) => setFormParentId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                    >
                      <option value="">Seleccionar Categoría</option>
                      {catalogs['Categorías']?.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCatalog === 'Tipo de Producto' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Proveedores Autorizados para Venta <span className="text-rose-550 text-rose-500">*</span>
                    </label>
                    <div className="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50">
                      {providers && providers.length > 0 ? (
                        providers.map((p) => {
                          const isChecked = formProviderIds.includes(p.id);
                          return (
                            <label 
                              key={p.id} 
                              className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer text-xs font-semibold text-slate-700 select-none"
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormProviderIds([...formProviderIds, p.id]);
                                  } else {
                                    setFormProviderIds(formProviderIds.filter(id => id !== p.id));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                              />
                              <span>{p.commercialName}</span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic p-2 text-center">No hay proveedores registrados en el sistema</p>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 italic leading-relaxed">
                      Selecciona los proveedores que ofrecen este tipo de producto. Solo se visualizará en las fichas de los proveedores seleccionados.
                    </p>
                  </div>
                )}

                {selectedCatalog !== 'Cuentas bancarias' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Descripción (Opcional)</label>
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm resize-none"
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
                >
                  {editingItem ? 'Guardar Cambios' : 'Añadir al Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmItem && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmItem(null)}
          title="Confirmar Eliminación"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {deleteConfirmItem.catalog === 'Tarifas Países' ? (
                <span>
                  🚨 <strong>ATENCIÓN Crítica:</strong> ¿Estás totalmente seguro de que deseas eliminar la tarifa país <strong className="font-bold text-slate-850">"{deleteConfirmItem.item.name}"</strong>?
                  <br /><br />
                  Eliminar este registro podría <strong>romper o alterar el cálculo automático de tarifas y precios</strong> de las instituciones que están asociadas a este país en el sistema.
                </span>
              ) : (
                <span>
                  ¿Estás seguro de que deseas eliminar el elemento <strong className="font-bold text-slate-855">"{deleteConfirmItem.item.name}"</strong> del catálogo de <strong>{deleteConfirmItem.catalog}</strong>? Esta acción es irreversible.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 font-sans animate-in">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCatalogItem(deleteConfirmItem.catalog, deleteConfirmItem.item.id);
                  setDeleteConfirmItem(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors uppercase tracking-wider"
              >
                Eliminar Elemento
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
