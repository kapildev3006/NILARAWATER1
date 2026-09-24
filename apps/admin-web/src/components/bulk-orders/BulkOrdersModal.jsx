import { X, Calendar, Clock, MapPin, Package, DollarSign, CreditCard, Truck, Send, CheckCircle2, RotateCcw } from "lucide-react";

export default function BulkOrdersModal({ order, onClose, onUpdateStatus, onOpenQuote, onOpenDispatch }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Bulk Order Details</h2>
            <p className="text-sm text-slate-500 mt-1">
              Order #{order._id.substring(order._id.length - 8).toUpperCase()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-slate-500">Name</div>
                  <div className="font-medium text-slate-800">{order.user?.displayName || "Guest Customer"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Phone</div>
                  <div className="font-medium text-slate-800">{order.user?.phone || "Not Provided"}</div>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Delivery Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Date</div>
                    <div className="font-medium text-slate-800">{order.deliveryDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Time Slot</div>
                    <div className="font-medium text-slate-800">{order.timeSlot}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Order Summary</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{order.productName}</div>
                    <div className="text-sm text-slate-500">Quantity: {order.quantity}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Design Details */}
            {order.customDesign && order.customDesign.isCustom && (
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Custom Design Details</h3>
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">Event Name</span>
                    <span className="font-medium text-slate-800">{order.customDesign.eventName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Theme / Color</span>
                    <span className="font-medium text-slate-800">{order.customDesign.theme || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Tagline</span>
                    <span className="font-medium text-slate-800">{order.customDesign.tagline || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Printing Type</span>
                    <span className="font-medium text-slate-800">{order.customDesign.printingType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Cap Color</span>
                    <span className="font-medium text-slate-800">{order.customDesign.capColor || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Label Finish</span>
                    <span className="font-medium text-slate-800">{order.customDesign.labelFinish || 'N/A'}</span>
                  </div>
                  {order.customDesign.specialInstructions && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block mb-1">Instructions</span>
                      <span className="font-medium text-slate-800">{order.customDesign.specialInstructions}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commercial Quotation & Vehicle Fulfillment */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Quotation & Carrier Logistics</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {order.bulkStatus || order.status}
                </span>
              </h3>
              
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Quoted Total</span>
                  <span className="text-sm font-bold text-slate-800">
                    ₹{order.quoteDetails?.quotePricePaise ? (order.quoteDetails.quotePricePaise / 100).toFixed(2) : order.totalPrice.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Advance Token Required</span>
                  <span className="text-sm font-bold text-slate-800">
                    ₹{order.quoteDetails?.advanceRequiredPaise ? (order.quoteDetails.advanceRequiredPaise / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Vehicle Requirement</span>
                  <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md inline-block">
                    {order.quoteDetails?.vehicleRequirement || order.vehicleRequirement || 'LOADER'}
                  </span>
                </div>

                {order.quoteDetails?.adminNotes && (
                  <div className="md:col-span-3 border-t border-slate-200/50 pt-2">
                    <span className="text-slate-400 block mb-1 font-medium">Admin Quotation Terms</span>
                    <p className="text-slate-700 font-medium italic">{order.quoteDetails.adminNotes}</p>
                  </div>
                )}

                {order.deliveryPartner && (
                  <div className="md:col-span-2 border-t border-slate-200/50 pt-2">
                    <span className="text-slate-400 block mb-1 font-medium">Dispatched Driver</span>
                    <p className="text-slate-800 font-bold">
                      {order.deliveryPartner.displayName || order.deliveryPartner.name || "Assigned Driver"} ({order.deliveryPartner.phone || "No phone"})
                    </p>
                  </div>
                )}

                {(order.jarsDelivered !== undefined || order.emptyJarsCollected !== undefined) && (
                  <div className="md:col-span-3 border-t border-slate-200/50 pt-2 flex items-center gap-6">
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Full Jars Delivered</span>
                      <span className="text-sm font-extrabold text-emerald-600">{order.jarsDelivered || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Empty Jars Collected</span>
                      <span className="text-sm font-extrabold text-blue-600">{order.emptyJarsCollected || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Address */}
            <div className="space-y-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-3">Payment</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-500">Method</div>
                      <div className="font-medium text-slate-800">{order.paymentMethod}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-500">Total Amount</div>
                      <div className="font-medium text-slate-800 text-lg">₹{order.totalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-3">Address</h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                  <div>
                    <div className="font-medium text-slate-800">{order.address?.title || "Custom Address"}</div>
                    <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {order.address?.line1 || "No address provided"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex flex-wrap justify-between items-center gap-3">
          <div>
            <span className="text-xs text-slate-500 mr-2">Status:</span>
            <span className="font-bold text-xs text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-md">
              {order.bulkStatus || order.status}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {/* Quote Action */}
            {(order.bulkStatus === 'BULK_REQUESTED' || order.status === 'Pending' || order.bulkStatus === 'UNDER_REVIEW') && onOpenQuote && (
              <button 
                onClick={onOpenQuote}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send / Revise Quote
              </button>
            )}

            {/* Dispatch Action */}
            {(order.bulkStatus === 'CUSTOMER_APPROVED' || order.bulkStatus === 'CONFIRMED' || order.bulkStatus === 'READY_FOR_DISPATCH' || (order.status === 'Confirmed' && !order.deliveryPartner)) && onOpenDispatch && (
              <button 
                onClick={onOpenDispatch}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                Dispatch Vehicle & Driver
              </button>
            )}

            {order.status !== 'Cancelled' && (
              <button 
                onClick={() => onUpdateStatus('Cancelled')}
                className="px-4 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
              >
                Cancel Order
              </button>
            )}
            
            {(order.status === 'Processing' || order.bulkStatus === 'DISPATCHED') && (
              <button 
                onClick={() => onUpdateStatus('Delivered')}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                Mark Delivered
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
