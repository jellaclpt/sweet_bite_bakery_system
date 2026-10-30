// src/pages/Orders.js
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock, CheckCircle2 } from "lucide-react";
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
    <div className="min-h-screen bg-cream px-6 lg:px-10 pt-6 pb-10">
      <div className="max-w-screen-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand">Your Orders</h1>
          <p className="text-gray-500 mt-1">Track your pre-orders, deposits and pickup or delivery times.</p>
        </header>

        {orders.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-10 text-center">
            <p className="text-gray-600 mb-4">No orders yet. Go grab a treat!</p>
            <Link
              to="/products"
              className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 items-start">
            {orders.map((order) => {
              const hasDeposit = Number(order.deposit_amount) > 0;
              const needsDeposit = order.payment_status === "awaiting_deposit" && order.status !== "cancelled";
              // What's left to pay on pickup/delivery once the deposit is in
              const balance =
                order.payment_status === "paid"
                  ? 0
                  : Number(order.total) - Math.max(Number(order.amount_paid || 0), Number(order.deposit_amount || 0));

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-line shadow-sm p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <h2 className="font-semibold text-lg text-gray-800">Order #{order.id}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${orderStatusClass(order.status)}`}>
                      {formatLabel(order.status)}
                    </span>
                  </div>
                  {order.pickup_time && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                      <Clock size={14} />
                      {formatLabel(order.fulfillment)} on{" "}
                      {new Date(order.pickup_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}

                  {order.items?.length > 0 && (
                    <div className="border-t border-line pt-4 space-y-3">
                      {order.items.map((item) => (
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

                  {/* Payment */}
                  <div className="mt-4 pt-4 border-t border-line space-y-1.5 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-700">Payment</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${paymentStatusClass(order.payment_status)}`}>
                        {formatPaymentStatus(order.payment_status)}
                      </span>
                    </div>
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
                    <div className="flex justify-between text-gray-500">
                      <span>
                        Balance on {order.fulfillment === "delivery" ? "delivery" : "pickup"}
                        {order.payment_method && ` (${formatPaymentMethod(order.payment_method)})`}
                      </span>
                      <span className="font-bold text-brand">{peso(balance)}</span>
                    </div>
                  </div>

                  {needsDeposit && (
                    <button
                      onClick={() => setPayingOrder(order)}
                      className="mt-5 w-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-2.5 rounded-full transition"
                    >
                      Pay {peso(order.deposit_amount)} deposit
                    </button>
                  )}
                  {order.payment_status === "deposit_submitted" && (
                    <p className="mt-5 rounded-xl bg-blue-50 text-blue-700 text-xs px-3 py-2.5">
                      We received your GCash payment (ref. {order.payment_reference}) and are checking it.
                    </p>
                  )}
                  {order.payment_status === "deposit_paid" && (
                    <p className="mt-5 flex items-center gap-1.5 rounded-xl bg-green-50 text-green-700 text-xs px-3 py-2.5">
                      <CheckCircle2 size={14} /> Deposit confirmed. Your order is being prepared.
                    </p>
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
