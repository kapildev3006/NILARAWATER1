"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import SubscriptionsKPIs from "@/components/subscriptions/SubscriptionsKPIs";
import SubscriptionsTable from "@/components/subscriptions/SubscriptionsTable";
import SubscriptionListModal from "@/components/subscriptions/SubscriptionListModal";
import SubscriptionFormModal from "@/components/subscriptions/SubscriptionFormModal";
import AssignDriverModal from "@/components/subscriptions/AssignDriverModal";
import DeliveryRoutesTable from "@/components/subscriptions/DeliveryRoutesTable";
import AssignRouteDriverModal from "@/components/subscriptions/AssignRouteDriverModal";
import RouteDetailModal from "@/components/subscriptions/RouteDetailModal";
import { Layers, MapPin, Repeat } from "lucide-react";

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState("subscriptions"); // "subscriptions" | "delivery_routes"
  const [modalFilter, setModalFilter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("detail");
  const [selectedItem, setSelectedItem] = useState(null);

  const [localItems, setLocalItems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [itemToAssignDriver, setItemToAssignDriver] = useState(null);

  // Delivery Routes state
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeToAssignDriver, setRouteToAssignDriver] = useState(null);

  const mapSubscription = (sub) => {
    const partner = sub.deliveryPartner;
    const driverName = (typeof partner === 'object' && partner !== null) 
      ? (partner.displayName || partner.name || "Unassigned") 
      : "Unassigned";
    const driverPhone = (typeof partner === 'object' && partner !== null) ? (partner.phone || "") : "";
    const driverId = (typeof partner === 'object' && partner !== null) ? partner._id : (partner || null);

    return {
      ...sub,
      id: sub._id,
      customerName: sub.user?.displayName || "Unknown",
      phone: sub.user?.phone || "N/A",
      driverName,
      driverPhone,
      driverId,
      statusColor: sub.status === "Active" ? "teal" : sub.status === "Suspended" ? "orange" : sub.status === "Cancelled" ? "red" : "slate",
      nextDelivery: new Date(sub.nextDeliveryDate || sub.startDate).toLocaleDateString(),
      skippedDeliveries: sub.skippedDeliveries || []
    };
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/subscriptions');
      if (res.success && res.data) {
        const mappedData = res.data.map(mapSubscription);
        setLocalItems(mappedData);
      }
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const res = await fetchWithAuth('/admin/delivery-routes');
      if (res.success && res.data) {
        setRoutes(res.data);
      }
    } catch (err) {
      console.error('Error loading delivery routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    loadRoutes();
  }, []);

  useEffect(() => {
    if (activeTab === "delivery_routes") {
      loadRoutes();
    }
  }, [activeTab]);

  const handleExport = () => alert("Export clicked");

  const handleEditClick = (item) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  };

  const handleToggleSuspend = async (item) => {
    const newStatus = item.status === "Suspended" ? "Active" : "Suspended";
    try {
      const res = await fetchWithAuth(`/subscriptions/${item._id || item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success && res.data) {
        const mappedSub = mapSubscription(res.data);
        setLocalItems(prev => prev.map(i => (i._id === item._id || i.id === item.id) ? mappedSub : i));
        if (selectedItem && (selectedItem._id === item._id || selectedItem.id === item.id)) {
          setSelectedItem(mappedSub);
        }
      }
    } catch (err) {
      console.error('Error toggling subscription status:', err);
      alert('Failed to update status');
    }
  };

  const handleDeleteClick = async (itemId) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      const res = await fetchWithAuth(`/subscriptions/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      if (res.success && res.data) {
        const mappedSub = mapSubscription(res.data);
        setLocalItems(prev => prev.map(i => (i._id === itemId || i.id === itemId) ? mappedSub : i));
        if (selectedItem && (selectedItem._id === itemId || selectedItem.id === itemId)) {
          setSelectedItem(mappedSub);
        }
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert('Failed to cancel subscription');
    }
  };

  const handleSaveItem = (savedItem) => {
    setLocalItems(prev => {
      const exists = prev.find(i => i.id === savedItem.id);
      if (exists) {
        return prev.map(i => i.id === savedItem.id ? savedItem : i);
      }
      return [savedItem, ...prev];
    });
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setModalMode("detail");
    setIsModalOpen(true);
  };

  const handleAssignDriverClick = (item) => {
    setItemToAssignDriver(item);
    setIsAssignDriverOpen(true);
  };

  const handleDriverAssigned = (updatedSub) => {
    const mapped = mapSubscription(updatedSub);
    setLocalItems(prev => prev.map(i => (i._id === mapped.id || i.id === mapped.id) ? mapped : i));
    if (selectedItem && (selectedItem._id === mapped.id || selectedItem.id === mapped.id)) {
      setSelectedItem(mapped);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">
            {activeTab === "subscriptions" ? "Subscriptions" : "Delivery Routes & Batches"}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {activeTab === "subscriptions" 
              ? "Manage recurring water orders and subscriber customer profiles"
              : "Group scheduled deliveries into area batches and assign single delivery partners for multi-stop delivery"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60 shadow-inner">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "subscriptions"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("delivery_routes")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "delivery_routes"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Batch Routes ({routes.length})
          </button>
        </div>
      </div>

      {activeTab === "subscriptions" ? (
        <>
          {/* KPI Cards */}
          <SubscriptionsKPIs 
            modalFilter={modalFilter}
            setModalFilter={setModalFilter}
            setIsModalOpen={setIsModalOpen}
            setModalMode={setModalMode}
          />

          {/* Table */}
          <SubscriptionsTable 
            localItems={localItems}
            onRowClick={handleRowClick} 
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            onToggleSuspend={handleToggleSuspend}
            onAssignDriverClick={handleAssignDriverClick}
          />
        </>
      ) : (
        <DeliveryRoutesTable
          routes={routes}
          loading={loadingRoutes}
          onRefresh={loadRoutes}
          onSelectRoute={(route) => setSelectedRoute(route)}
          onAssignDriverClick={(route) => setRouteToAssignDriver(route)}
        />
      )}

      {/* List / Detail Modal */}
      <SubscriptionListModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedItem(null); setModalFilter(null); }}
        filterType={modalFilter}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        modalMode={modalMode}
        setModalMode={setModalMode}
        onEditClick={handleEditClick}
        onAssignDriverClick={handleAssignDriverClick}
      />

      {/* Form Modal */}
      <SubscriptionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        itemToEdit={itemToEdit}
        onSave={handleSaveItem}
      />

      {/* Assign Driver Modal */}
      <AssignDriverModal
        isOpen={isAssignDriverOpen}
        onClose={() => { setIsAssignDriverOpen(false); setItemToAssignDriver(null); }}
        subscription={itemToAssignDriver}
        onAssigned={handleDriverAssigned}
      />

      {/* Assign Route Driver Modal */}
      <AssignRouteDriverModal
        isOpen={!!routeToAssignDriver}
        route={routeToAssignDriver}
        onClose={() => setRouteToAssignDriver(null)}
        onAssigned={() => {
          loadRoutes();
        }}
      />

      {/* Route Detail Modal */}
      <RouteDetailModal
        isOpen={!!selectedRoute}
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        onAssignDriverClick={(route) => setRouteToAssignDriver(route)}
      />
    </div>
  );
}
