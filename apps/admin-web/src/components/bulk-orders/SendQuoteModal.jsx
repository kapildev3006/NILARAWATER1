import { useState, useEffect } from 'react';
import { X, DollarSign, Truck, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

export default function SendQuoteModal({ isOpen, onClose, order, onSuccess }) {
  const [quotePrice, setQuotePrice] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [vehicleRequirement, setVehicleRequirement] = useState('LOADER');
  const [validDays, setValidDays] = useState(7);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      const price = order.quoteDetails?.quotePricePaise 
        ? (order.quoteDetails.quotePricePaise / 100).toFixed(2)
        : (order.totalPrice || 0).toFixed(2);
      
      const suggestedAdvance = ((order.totalPrice || 0) * 0.25).toFixed(2);

      setQuotePrice(price);
      setAdvanceAmount(order.quoteDetails?.advanceRequiredPaise ? (order.quoteDetails.advanceRequiredPaise / 100).toFixed(2) : suggestedAdvance);
      setVehicleRequirement(order.quoteDetails?.vehicleRequirement || 'LOADER');
      setValidDays(7);
      setAdminNotes(order.quoteDetails?.adminNotes || `Quotation for ${order.quantity} x ${order.productName}. Dispatched via commercial carrier.`);
      setError('');
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pricePaise = Math.round(parseFloat(quotePrice) * 100);
    const advancePaise = Math.round(parseFloat(advanceAmount) * 100);

    if (isNaN(pricePaise) || pricePaise <= 0) {
      setError('Please enter a valid quotation price.');
      return;
    }

    if (advancePaise < 0 || advancePaise > pricePaise) {
      setError('Advance payment cannot exceed the total quotation price.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetchWithAuth(`/bulk-orders/${order._id}/quote`, {
        method: 'POST',
        body: JSON.stringify({
          quotePricePaise: pricePaise,
          advanceRequiredPaise: advancePaise,
          vehicleRequirement,
          validDays: parseInt(validDays, 10) || 7,
          adminNotes: adminNotes.trim()
        })
      });

      if (res.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to submit quote');
      }
    } catch (err) {
      console.error('Error submitting quote:', err);
      setError('An unexpected error occurred while sending the quote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-800">Send Commercial Quotation</h2>
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
          {/* Quick Summary Pill */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-700 font-bold block">Customer Requested</span>
              <span className="text-sm font-extrabold text-slate-800">{order.user?.displayName || "Guest"} ({order.user?.phone || "No Phone"})</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Est. Value</span>
              <span className="text-sm font-extrabold text-blue-700">₹{(order.totalPrice || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Quotation Price & Advance Required */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quoted Total (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="1"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Advance Required (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Requirement & Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vehicle Requirement
              </label>
              <select
                value={vehicleRequirement}
                onChange={(e) => setVehicleRequirement(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="BIKE">Bike / Two-Wheeler</option>
                <option value="SCOOTER">Heavy Scooter</option>
                <option value="E_RICKSHAW">E-Rickshaw Cargo</option>
                <option value="LOADER">Loader / Commercial Auto</option>
                <option value="PICKUP_VAN">Pickup Van (Bolero / Tata Ace)</option>
                <option value="MINI_TRUCK">Mini Truck (1-2 Ton)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quote Valid For (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Quote Terms / Notes for Customer
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              placeholder="e.g. Includes GST and unloading at premises. Empties deposit standard rules apply."
            />
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
              disabled={loading}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Send Quote to Customer'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
