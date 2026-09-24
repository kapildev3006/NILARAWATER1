"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PlansKPIs from "@/components/plans/PlansKPIs";
import PlansGrid from "@/components/plans/PlansGrid";
import PlanFormModal from "@/components/plans/PlanFormModal";
import PlanListModal from "@/components/plans/PlanListModal";
import { fetchWithAuth } from "@/lib/api";

export default function PlansPage() {
  const [modalFilter, setModalFilter] = useState(null);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("list");
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [storeSettings, setStoreSettings] = useState(null);
  const [localItems, setLocalItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsRes, productsRes] = await Promise.all([
          fetchWithAuth('/settings'),
          fetchWithAuth('/products')
        ]);
        
        if (settingsRes.success && settingsRes.data) {
          setStoreSettings(settingsRes.data);
          const plansWithIds = (settingsRes.data.subscriptionPlans || []).map((p, idx) => ({ ...p, id: idx.toString() }));
          setLocalItems(plansWithIds);
        }

        if (productsRes.success && productsRes.data) {
          // Filter to water category products
          const waterProducts = productsRes.data.filter(p => p.category?.slug === 'water' || p.categorySlug === 'water');
          setProducts(waterProducts);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, []);

  const saveSettingsToBackend = async (newPlans) => {
    try {
      const updatedSettings = { ...storeSettings, subscriptionPlans: newPlans };
      const data = await fetchWithAuth('/settings', {
        method: 'PUT',
        body: JSON.stringify(updatedSettings)
      });
      if (data.success) {
        setStoreSettings(data.data);
        const plansWithIds = (data.data.subscriptionPlans || []).map((p, idx) => ({ ...p, id: idx.toString() }));
        setLocalItems(plansWithIds);
      }
    } catch (err) {
      console.error('Error saving plans:', err);
      alert('Failed to save plans');
    }
  };
  
  const handleAddPlan = () => {
    setItemToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item) => {
    setItemToEdit(item);
    setIsFormOpen(true);
    setIsListModalOpen(false);
  };

  const handleDeleteClick = (itemId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    const newPlans = localItems.filter(i => i.id !== itemId).map(p => {
      const { id, ...rest } = p;
      return rest;
    });
    saveSettingsToBackend(newPlans);
  };

  const handleToggleStatus = (item) => {
    const newPlans = localItems.map(i => {
      if (i.id === item.id) {
        return { ...i, isActive: !i.isActive };
      }
      return i;
    }).map(p => {
      const { id, ...rest } = p;
      return rest;
    });
    saveSettingsToBackend(newPlans);
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setModalMode("detail");
    setIsListModalOpen(true);
  };

  const handleSaveItem = (savedItem) => {
    let newPlans = [...localItems];
    if (savedItem.id) {
      newPlans = newPlans.map(i => i.id === savedItem.id ? savedItem : i);
    } else {
      newPlans.push(savedItem);
    }
    
    // strip out local 'id' before saving
    newPlans = newPlans.map(p => {
      const { id, ...rest } = p;
      return rest;
    });

    saveSettingsToBackend(newPlans);
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Subscription Plans</h1>
          <p className="text-sm font-medium text-slate-500">Create and manage pricing plans for your customers</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddPlan}
            className="flex items-center px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Plan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <PlansKPIs 
        modalFilter={modalFilter}
        setModalFilter={setModalFilter}
        setIsListModalOpen={setIsListModalOpen}
        setModalMode={setModalMode}
      />

      {/* Grid of Plans */}
      <PlansGrid 
        localItems={localItems}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onToggleStatus={handleToggleStatus}
        onCardClick={handleCardClick}
        filterType={null} 
      />

      {/* Form Modal */}
      <PlanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        itemToEdit={itemToEdit}
        onSave={handleSaveItem}
        availableProducts={products}
      />

      {/* List / Detail Modal */}
      <PlanListModal
        isOpen={isListModalOpen}
        onClose={() => { setIsListModalOpen(false); setSelectedItem(null); setModalFilter(null); }}
        filterType={modalFilter}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        modalMode={modalMode}
        setModalMode={setModalMode}
        onEditClick={handleEditClick}
        onDeleteClick={(id) => {
          handleDeleteClick(id);
          setIsListModalOpen(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
