"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import OrdersHeader from "@/components/orders/OrdersHeader";
import OrdersKPI from "@/components/orders/OrdersKPI";
import OrdersTable from "@/components/orders/OrdersTable";
import OrdersListModal from "@/components/orders/OrdersListModal";
import AssignOrderDriverModal from "@/components/orders/AssignOrderDriverModal";
import { fetchWithAuth } from "@/lib/api";

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState("total");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToAssignDriver, setOrderToAssignDriver] = useState(null);
  const [modalMode, setModalMode] = useState("list"); // "list" | "direct_detail"
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Listen for viewOrder in URL to open modal automatically (e.g. from global search)
  useEffect(() => {
    const viewOrderId = searchParams.get('viewOrder');
    if (viewOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === viewOrderId);
      if (order) {
        setSelectedOrder(order);
        setModalMode("direct_detail");
        setIsModalOpen(true);
        // Clean up URL so the same order can be triggered again later
        router.replace('/orders', undefined, { shallow: true });
      }
    }
  }, [searchParams, router, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/admin/orders');
      if (response.success && response.data) {
        // Map backend orders to UI structure with decoupled order & delivery statuses
        const mappedOrders = response.data.map(o => {
          const dateObj = new Date(o.createdAt);
          const items = o.items || [];
          const firstItemName = items.length > 0 ? items[0].name : "Unknown Item";
          
          const deliveryPartnerName = o.deliveryPartner?.displayName || o.deliveryPartner?.name || "Unassigned";
          const orderType = o.orderType || "NORMAL";
          const orderStatus = o.orderStatus || (o.status === "Pending" ? "PLACED" : o.status === "Delivered" ? "COMPLETED" : "PROCESSING");
          const deliveryStatus = o.deliveryStatus || (o.status === "Delivered" ? "DELIVERED" : o.status === "Pending" ? "SEARCHING_DELIVERY_PARTNER" : "OUT_FOR_DELIVERY");

          return {
            id: o.orderNumber || o._id,
            orderType,
            orderStatus,
            deliveryStatus,
            customer: { 
              name: o.user?.displayName || o.deliveryAddressSnapshot?.recipientName || "Guest", 
              phone: o.user?.phone || o.deliveryAddressSnapshot?.phone || "-", 
              seed: o.user?.displayName || "Guest" 
            },
            product: { 
              name: firstItemName, 
              more: items.length > 1 ? `+${items.length - 1} more items` : null 
            },
            itemCount: `${items.length} items`,
            status: orderStatus === "COMPLETED" || o.status === "Delivered" ? "Completed" : orderStatus === "CANCELLED" || o.status === "Cancelled" ? "Cancelled" : orderStatus === "PLACED" || o.status === "Pending" ? "Pending" : "Processing",
            payment: { 
              status: o.paymentStatus === "Completed" ? "Paid" : o.paymentStatus, 
              method: o.paymentMethod || "UPI", 
              isPaid: o.paymentStatus === "Completed" 
            },
            delivery: { 
              status: deliveryStatus.replace(/_/g, ' '), 
              rider: deliveryPartnerName, 
              iconColor: deliveryStatus === "DELIVERED" ? "green" : (deliveryStatus === "NOT_ASSIGNED" || deliveryStatus === "SEARCHING_DELIVERY_PARTNER") ? "orange" : "blue" 
            },
            amount: `₹${(o.totalPaise / 100).toFixed(2)}`,
            date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            raw: o
          };
        });
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleAcceptAndDispatch = async (orderId) => {
    try {
      const res = await fetchWithAuth(`/admin/orders/${orderId}/accept-and-dispatch`, {
        method: 'PATCH'
      });
      if (res.success && res.data) {
        setOrders(prev => prev.map(o => {
          if (o.raw?._id === orderId || o.id === orderId || o.raw?.orderNumber === orderId) {
            return {
              ...o,
              status: "Processing",
              delivery: {
                ...o.delivery,
                status: "Broadcasting to Riders",
                iconColor: "blue"
              },
              raw: { ...o.raw, status: "confirmed" }
            };
          }
          return o;
        }));

        if (selectedOrder && (selectedOrder.raw?._id === orderId || selectedOrder.id === orderId)) {
          setSelectedOrder(prev => ({
            ...prev,
            status: "Processing",
            delivery: {
              ...prev.delivery,
              status: "Broadcasting to Riders",
              iconColor: "blue"
            },
            raw: { ...prev.raw, status: "confirmed" }
          }));
        }

        alert("Order accepted successfully! Broadcast sent to all delivery partners as popup alert.");
      } else {
        alert(res.message || "Failed to dispatch order.");
      }
    } catch (err) {
      console.error("Error dispatching order:", err);
      alert("Failed to accept and dispatch order.");
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      <OrdersHeader />
      <OrdersKPI 
        activeFilter={activeFilter} 
        setActiveFilter={setActiveFilter} 
        setIsModalOpen={setIsModalOpen} 
        setModalMode={setModalMode}
        ordersData={orders}
      />
      <OrdersTable 
        ordersData={orders}
        loading={loading} 
        setSelectedOrder={setSelectedOrder}
        setIsModalOpen={setIsModalOpen}
        setModalMode={setModalMode}
        onAcceptAndDispatch={handleAcceptAndDispatch}
        onAssignDriverClick={(order) => setOrderToAssignDriver(order)}
      />
      
      <OrdersListModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }} 
        filterType={activeFilter} 
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        modalMode={modalMode}
        ordersData={orders}
        onAcceptAndDispatch={handleAcceptAndDispatch}
      />

      <AssignOrderDriverModal
        isOpen={!!orderToAssignDriver}
        order={orderToAssignDriver}
        onClose={() => setOrderToAssignDriver(null)}
        onAssigned={() => {
          loadOrders();
        }}
      />
    </div>
  );
}
