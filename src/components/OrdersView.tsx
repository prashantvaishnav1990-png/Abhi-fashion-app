import React, { useState } from 'react';
import {
  PackageCheck,
  Search,
  MessageCircle,
  Truck,
  CheckCircle2,
  Clock,
  Box,
  XCircle,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  Smartphone,
  User,
} from 'lucide-react';
import { CustomerProfile, Order, OrderStatus, StoreSettings } from '../types';

interface OrdersViewProps {
  orders: Order[];
  settings: StoreSettings;
  currentCustomer?: CustomerProfile | null;
  onOpenLogin?: () => void;
  onCancelOrder: (orderId: string) => void;
  onContinueShopping: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  settings,
  currentCustomer,
  onOpenLogin,
  onCancelOrder,
  onContinueShopping,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.mobile.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' || order.orderStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Confirmed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Packed':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'Shipped':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Delivered':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Cancelled':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };

  const statusSteps: OrderStatus[] = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];

  const getStepIndex = (status: OrderStatus) => {
    return statusSteps.indexOf(status);
  };

  const handleWhatsAppInquiry = (order: Order) => {
    const cleanPhone = settings.whatsappNumber.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi ABHI FASHION, I have a query about my Order #${order.orderNumber} (Placed on ${new Date(
        order.createdAt
      ).toLocaleDateString()}). Current status is ${order.orderStatus}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-amber-400" />
            My Orders & Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track real-time status of your men's fashion orders in Chhuikhadan
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
          />
        </div>
      </div>

      {/* Customer Status / Login Prompt */}
      {currentCustomer ? (
        <div className="p-3.5 mb-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Orders for: <span className="text-amber-400">{currentCustomer.name || 'Customer'}</span> (+91 {currentCustomer.mobile})
              </p>
              <p className="text-[10px] text-slate-400">
                Aapke is mobile number se jude sabhi live aur purane orders yahan dikhenge.
              </p>
            </div>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
            >
              Account
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 mb-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                Apne Sabhi Orders Dekhne Ke Liye Mobile Se Login Karein
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Chahe aap naye device me ho, apna mobile number darj karke apne pichle saare orders aur live tracking dekh sakte hain.
              </p>
            </div>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 text-xs font-black shrink-0 transition cursor-pointer shadow-md"
            >
              📱 Mobile Login Karein
            </button>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {['all', 'Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer border ${
                statusFilter === status
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {status === 'all' ? 'All Orders' : status}
            </button>
          )
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400">
          <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Orders Found</h3>
          <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
            {searchQuery
              ? 'No orders match your search criteria. Check your order reference ID.'
              : "You haven't placed any orders yet."}
          </p>
          <button
            onClick={onContinueShopping}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs inline-flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <span>Start Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const currentStepIdx = getStepIndex(order.orderStatus);
            const isCancellable =
              order.orderStatus === 'Pending' || order.orderStatus === 'Confirmed';

            return (
              <div
                key={order.id}
                id={`order-card-${order.orderNumber}`}
                className="bg-[#111827] rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg space-y-4"
              >
                {/* Header: ID, Date, Amount, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm sm:text-base text-amber-400">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-base sm:text-lg font-black text-white">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Tracking Stepper (if not cancelled) */}
                {order.orderStatus !== 'Cancelled' ? (
                  <div className="py-2">
                    <div className="grid grid-cols-5 gap-1 text-center relative">
                      {statusSteps.map((step, idx) => {
                        const isCompleted = currentStepIdx >= idx;
                        const isCurrent = currentStepIdx === idx;
                        return (
                          <div key={step} className="flex flex-col items-center relative">
                            {/* Circle icon */}
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition z-10 ${
                                isCurrent
                                  ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20'
                                  : isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {isCompleted && !isCurrent ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`text-[10px] sm:text-[11px] mt-1.5 font-semibold ${
                                isCurrent
                                  ? 'text-amber-400 font-bold'
                                  : isCompleted
                                  ? 'text-slate-200'
                                  : 'text-slate-500'
                              }`}
                            >
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>This order was cancelled. Restocked in inventory.</span>
                  </div>
                )}

                {/* Items preview */}
                <div className="space-y-2 pt-1">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80"
                    >
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-12 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">{item.productName}</h4>
                        <span className="text-[11px] text-slate-400">
                          Size: <strong className="text-slate-200">{item.selectedSize}</strong> • Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="font-bold text-white text-xs">
                        ₹{item.totalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Easy EMI Mandate Details */}
                {(order.emiDetails || order.customer.upiId) && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-emerald-300">
                        ⚡ Easy EMI (किस्त): {order.emiDetails?.tenure || '3 Months'} • ₹{order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/mo
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Registered UPI ID: <span className="font-mono font-bold text-amber-300">{order.emiDetails?.mandateUpiId || order.customer.upiId}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                      EMI Pending Approval
                    </span>
                  </div>
                )}

                {/* Footer details & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    <span>Payment: </span>
                    <strong className="text-white uppercase">{order.paymentMethod}</strong> (
                    <span className="text-emerald-400 font-semibold">{order.paymentStatus}</span>)
                    <span className="mx-2">•</span>
                    <span>Delivery to: </span>
                    <strong className="text-white">{order.customer.city}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* WhatsApp inquiry */}
                    <button
                      onClick={() => handleWhatsAppInquiry(order)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Store</span>
                    </button>

                    {/* Cancel button if pending */}
                    {isCancellable && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to cancel order #${order.orderNumber}?`)) {
                            onCancelOrder(order.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40 font-bold text-xs transition cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
