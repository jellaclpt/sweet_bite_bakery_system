// src/pages/Orders.js
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock, CheckCircle2, ChevronDown, Package } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { getImageUrl } from "../utils/imageUrl";
import {
  formatLabel,
  formatPaymentMethod,
  orderStatusClass,
  formatPaymentStatus,
  paymentStatusClass,
  peso,
} from "../utils/labels";
import PayDepositModal from "../components/PayDepositModal";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [payingOrder, setPayingOrder] = useState(null);
  const [openIds, setOpenIds] = useState(() => new Set());
  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return; // wait until user is loaded

    api
      .get(`/orders/user/${user.id}`)
      .then((res) => setOrders(res.data.data || res.data))
      .catch((err) => console.error("Error fetching orders:", err))
      .finally(() => setLoading(false));

    api
      .get("/payment-settings")
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, [user]);

  // Coming straight from checkout (?pay=<order id>): open the deposit step
  useEffect(() => {
    const payId = searchParams.get("pay");
    if (!payId || orders.length === 0) return;
    const order = orders.find((o) => String(o.id) === payId);
    if (order && order.payment_status === "awaiting_deposit") setPayingOrder(order);
    setSearchParams({}, { replace: true });
  }, [orders, searchParams, setSearchParams]);

  const replaceOrder = (updated) =>
    setOrders((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-cream">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand"></div>
        <p className="mt-4 font-medium text-brand">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-10">
      <div className="max-w-screen-2xl mx-auto">
        <header className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Your Orders</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Track your pre-orders, deposits and pickup or delivery times. Tap an order to see its details.
          </p>
        </header>

        {orders.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-8 sm:p-10 text-center">
            <p className="text-gray-600 mb-4">No orders yet. Go grab a treat!</p>
            <Link
              to="/products"
              className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 items-start">
            {orders.map((order) => {
              const hasDeposit = Number(order.deposit_amount) > 0;
              const needsDeposit = order.payment_status === "awaiting_deposit" && order.status !== "cancelled";
              // What's left to pay on pickup/delivery once the deposit is in
              const balance =
                order.payment_status === "paid"
                  ? 0
                  : Number(order.total) - Math.max(Number(order.amount_paid || 0), Number(order.deposit_amount || 0));
              const open = openIds.has(order.id);
              const items = order.items || [];
              const itemCount = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
              const itemNames = items.map((it) => it.product_name).join(", ");
              const detailsId = `order-${order.id}-details`;

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
                  {/* Overview: always visible, tap to show or hide the details */}
                  <button
                    type="button"
                    onClick={() => toggle(order.id)}
                    aria-expanded={open}
                    aria-controls={detailsId}
                    className="w-full text-left p-4 sm:p-5 hover:bg-cream/60 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-base sm:text-lg text-gray-800">Order #{order.id}</h2>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${orderStatusClass(order.status)}`}>
                          {formatLabel(order.status)}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>

                    {order.pickup_time && (
                      <p className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 mt-1">
                        <Clock size={13} className="shrink-0" />
                        {formatLabel(order.fulfillment)} on{" "}
                        {new Date(order.pickup_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}

                    {items.length > 0 && (
                      <p className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 mt-1 min-w-0">
                        <Package size={13} className="shrink-0" />
                        <span className="shrink-0">
                          {itemCount} {itemCount === 1 ? "item" : "items"}:
                        </span>
                        <span className="truncate">{itemNames}</span>
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${paymentStatusClass(order.payment_status)}`}>
                        {formatPaymentStatus(order.payment_status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Total <span className="text-base font-bold text-brand ml-1">{peso(order.total)}</span>
                      </span>
                    </div>
                  </button>

                  {needsDeposit && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">
                      <button
                        onClick={() => setPayingOrder(order)}
                        className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-2 sm:py-2.5 rounded-full transition"
                      >
                        Pay {peso(order.deposit_amount)} deposit
                      </button>
                    </div>
                  )}

                  {/* Details */}
                  {open && (
                    <div id={detailsId} className="px-4 sm:px-5 pb-4 sm:pb-5 animate-dropdown-in">
                      {items.length > 0 && (
                        <div className="border-t border-line pt-3 space-y-2.5">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img
                                src={getImageUrl(item.product?.image_url || item.product_image)}
                                alt={item.product_name}
                                className="w-10 h-10 object-cover rounded-lg"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">{item.product_name}</div>
                                <div className="text-xs text-gray-500">Qty {item.quantity}</div>
                              </div>
                              <div className="text-sm text-gray-700">{peso(item.total_price)}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-line space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-500">
                          <span>Total</span>
                          <span className="text-gray-800 font-medium">{peso(order.total)}</span>
                        </div>
                        {hasDeposit && (
                          <div className="flex justify-between text-gray-500">
                            <span>Deposit (GCash)</span>
                            <span className="text-gray-800 font-medium">{peso(order.deposit_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-3 text-gray-500">
                          <span>
                            Balance on {order.fulfillment === "delivery" ? "delivery" : "pickup"}
                            {order.payment_method && ` (${formatPaymentMethod(order.payment_method)})`}
                          </span>
                          <span className="font-bold text-brand">{peso(balance)}</span>
                        </div>
                      </div>

                      {order.payment_status === "deposit_submitted" && (
                        <p className="mt-3 rounded-xl bg-blue-50 text-blue-700 text-xs px-3 py-2.5">
                          We received your GCash payment (ref. {order.payment_reference}) and are checking it.
                        </p>
                      )}
                      {order.payment_status === "deposit_paid" && (
                        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-green-50 text-green-700 text-xs px-3 py-2.5">
                          <CheckCircle2 size={14} /> Deposit confirmed. Your order is being prepared.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {payingOrder && (
        <PayDepositModal
          order={payingOrder}
          settings={settings}
          onClose={() => setPayingOrder(null)}
          onPaid={replaceOrder}
        />
      )}
    </div>
  );
}
