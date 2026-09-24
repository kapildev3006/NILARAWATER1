import { useState, useEffect } from 'react';
import { X, Truck, Phone, Check, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

export default function DispatchBulkModal({ isOpen, onClose, order, onSuccess }) {
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [vehicleType, setVehicleType] = useState('LOADER');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      loadDrivers();
      setVehicleType(order.quoteDetails?.vehicleRequirement || 'LOADER');
      setVehicleNumber('');
      setSelectedDriverId(order.deliveryPartner?._id || order.deliveryPartner || '');
      setError('');
    }
  }, [isOpen, order]);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const res = await fetchWithAuth('/admin/delivery-partners');
      if (res.success && res.data) {
        setDrivers(res.data);
      }
    } catch (err) {
      console.error('Failed to load drivers for dispatch:', err);
      setError('Unable to load delivery partners.');
    } finally {
      setLoadingDrivers(false);
    }
  };

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) {
      setError('Please select a driver to dispatch this bulk order.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetchWithAuth(`/bulk-orders/${order._id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          deliveryPartnerId: selectedDriverId,
          vehicleType,
          vehicleNumber: vehicleNumber.trim()
        })
      });

      if (res.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to dispatch bulk order');
      }
    } catch (err) {
      console.error('Error dispatching bulk order:', err);
      setError('An unexpected error occurred while dispatching.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-800">Dispatch Bulk Order</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{order._id.substring(order._id.length - 8).toUpperCase()} • {order.quantity}x {order.productName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Destination & Requirement Pill */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-800 font-bold block">Delivery Destination</span>
              <span className="text-xs font-semibold text-slate-700">
                {order.address?.line1 || order.address?.street || "Customer Address"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Required Carrier</span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                {vehicleType}
              </span>
            </div>
          </div>

          {/* Vehicle Config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="LOADER">Loader / Commercial Auto</option>
                <option value="PICKUP_VAN">Pickup Van (Bolero / Ace)</option>
                <option value="MINI_TRUCK">Mini Truck (1-2 Ton)</option>
                <option value="E_RICKSHAW">E-Rickshaw Cargo</option>
                <option value="SCOOTER">Heavy Scooter</option>
                <option value="BIKE">Bike</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vehicle Plate # (Optional)
              </label>
              <input
                type="text"
                placeholder="UP 16 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
              />
            </div>
          </div>

          {/* Driver Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assign Dedicated Delivery Partner <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {loadingDrivers ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading delivery partners...</div>
              ) : drivers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No delivery partners found.</div>
              ) : (
                drivers.map((driver) => {
                  const isSelected = selectedDriverId === (driver._id || driver.id);
                  const isOnline = driver.availability === 'ONLINE' || driver.status === 'Active';
                  return (
                    <div
                      key={driver._id || driver.id}
                      onClick={() => setSelectedDriverId(driver._id || driver.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-100 hover:border-emerald-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                          {(driver.name || driver.displayName || 'D').charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{driver.name || driver.displayName}</span>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {driver.phone || 'No Phone'} • {driver.vehicleType || 'Commercial'}
                          </span>
                        </div>
                      </div>

                      <div className="pl-3">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-200" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedDriverId}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Truck className="w-4 h-4" />
              {submitting ? 'Dispatching...' : 'Dispatch Vehicle & Driver'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
