// Admin Orders: review GCash deposits, confirm payments and move pre-orders through their stages
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiX, FiImage, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/api";
import {
  formatLabel,
  formatPaymentMethod,
  formatPaymentStatus,
  paymentStatusClass,
  peso,
} from "../../utils/labels";
import Select from "../../components/Select";

const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

const FILTERS = [
  { key: "all", label: "All orders" },
  { key: "review", label: "Needs review", match: (o) => o.payment_status === "deposit_submitted" },
  { key: "awaiting", label: "Awaiting deposit", match: (o) => o.payment_status === "awaiting_deposit" && o.status !== "cancelled" },
  { key: "active", label: "In progress", match: (o) => ["confirmed", "preparing", "ready"].includes(o.status) },
  { key: "done", label: "Completed", match: (o) => o.status === "completed" },
  { key: "cancelled", label: "Cancelled", match: (o) => o.status === "cancelled" },
];

const formatSchedule = (o) =>
  o.pickup_time
    ? new Date(o.pickup_time).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Not set";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [reviewing, setReviewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data?.data || res.data || []);
    } catch (err) {
      toast.error("Couldn't load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach((f) => (c[f.key] = f.match ? orders.filter(f.match).length : orders.length));
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter);
    return f?.match ? orders.filter(f.match) : orders;
  }, [orders, filter]);

  const replace = (updated) => {
    setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    setReviewing((r) => (r && r.id === updated.id ? updated : r));
  };

  const updatePayment = async (order, action, message) => {
    setBusyId(order.id);
    try {
      const res = await api.patch(`/admin/orders/${order.id}/payment`, { action });
      replace(res.data.order);
      toast.success(message);
      if (action !== "mark_paid") setReviewing(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (order, status) => {
    setBusyId(order.id);
    try {
      const res = await api.patch(`/admin/orders/${order.id}/status`, { status });
      replace(res.data.order);
      toast.success(`Order #${order.id} marked ${formatLabel(status)}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-deep">Orders</h1>
          <p className="text-sm text-gray-500">Check GCash deposits, confirm payments and update order progress</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand border border-line bg-white rounded-lg px-4 py-2 hover:bg-sand"
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
              filter === f.key
                ? "bg-brand-cocoa text-white border-brand-cocoa"
                : "bg-white text-gray-600 border-line hover:border-brand"
            }`}
          >
            {f.label}
            <span className={`ml-2 text-xs ${filter === f.key ? "text-white/70" : "text-gray-400"}`}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F7F3EF] text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-left">Schedule</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading orders...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No orders here.</td>
              </tr>
            ) : (
              visible.map((o) => (
                <tr key={o.id} className="align-top hover:bg-[#FFF9F5]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-800">#{o.id}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">{o.user?.name || "Guest"}</p>
                    <p className="text-xs text-gray-500">{o.user?.phone || o.user?.email}</p>
                  </td>
                  <td className="px-4 py-4 max-w-[220px]">
                    {(o.items || []).map((it) => (
                      <p key={it.id} className="text-gray-700 truncate">
                        {it.product_name} <span className="text-gray-400">× {it.quantity}</span>
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-gray-800">{formatSchedule(o)}</p>
                    <p className="text-xs text-gray-500">{formatLabel(o.fulfillment)}</p>
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <p className="font-semibold text-gray-800">{peso(o.total)}</p>
                    <p className="text-xs text-gray-500">Deposit {peso(o.deposit_amount)}</p>
                    <p className="text-xs text-gray-500">Received {peso(o.amount_paid)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${paymentStatusClass(o.payment_status)}`}>
                      {formatPaymentStatus(o.payment_status)}
                    </span>
                    {o.payment_proof_url && (
                      <button
                        onClick={() => setReviewing(o)}
                        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      >
                        <FiImage /> View proof
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Select
                      size="sm"
                      className="w-36"
                      value={STATUS_OPTIONS.includes(o.status) ? o.status : ""}
                      onChange={(e) => updateStatus(o, e.target.value)}
                      disabled={busyId === o.id}
                      aria-label={`Status of order #${o.id}`}
                      placeholder={formatLabel(o.status)}
                      options={STATUS_OPTIONS.map((s) => ({ value: s, label: formatLabel(s) }))}
                    />
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {o.payment_status === "deposit_submitted" && (
                      <button
                        onClick={() => setReviewing(o)}
                        className="bg-brand hover:bg-brand-hover text-white text-xs font-semibold px-3 py-2 rounded-lg"
                      >
                        Review deposit
                      </button>
                    )}
                    {o.payment_status === "deposit_paid" && (
                      <button
                        onClick={() => updatePayment(o, "mark_paid", `Order #${o.id} marked fully paid`)}
                        disabled={busyId === o.id}
                        className="border border-brand text-brand hover:bg-sand text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
                      >
                        Balance received
                      </button>
                    )}
                    {o.payment_status === "awaiting_deposit" && (
                      <span className="text-xs text-gray-400">Waiting for customer</span>
                    )}
                    {/* Orders placed before deposits existed */}
                    {o.payment_status === "unpaid" && o.status !== "cancelled" && (
                      <button
                        onClick={() => updatePayment(o, "mark_paid", `Order #${o.id} marked fully paid`)}
                        disabled={busyId === o.id}
                        className="border border-brand text-brand hover:bg-sand text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                    )}
                    {o.payment_status === "paid" && <span className="text-xs text-green-700 font-medium">Settled</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Deposit review */}
      {reviewing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReviewing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-brand-deep">Deposit for order #{reviewing.id}</h2>
                <p className="text-sm text-gray-500">{reviewing.user?.name} · {reviewing.user?.phone || reviewing.user?.email}</p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-gray-500 hover:text-gray-700">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <a href={reviewing.payment_proof_url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={reviewing.payment_proof_url}
                  alt="GCash receipt"
                  className="w-full max-h-[420px] object-contain rounded-xl border border-line bg-gray-50"
                />
                <span className="block text-xs text-gray-400 mt-1.5">Click to open full size</span>
              </a>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Reference number</dt>
                  <dd className="text-lg font-semibold tracking-wide text-gray-800">{reviewing.payment_reference}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Expected deposit</dt>
                  <dd className="text-lg font-bold text-brand">{peso(reviewing.deposit_amount)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3">
                  <dt className="text-gray-500">Order total</dt>
                  <dd className="font-medium">{peso(reviewing.total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Balance on {reviewing.fulfillment}</dt>
                  <dd className="font-medium">
                    {peso(Number(reviewing.total) - Number(reviewing.deposit_amount))} ({formatPaymentMethod(reviewing.payment_method)})
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Submitted</dt>
                  <dd className="font-medium">
                    {reviewing.payment_submitted_at
                      ? new Date(reviewing.payment_submitted_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${paymentStatusClass(reviewing.payment_status)}`}>
                      {formatPaymentStatus(reviewing.payment_status)}
                    </span>
                  </dd>
                </div>
                <p className="text-xs text-gray-400 pt-2">
                  Check that the amount and reference number match a transfer in your GCash history before confirming.
                </p>
              </dl>
            </div>

            {reviewing.payment_status === "deposit_submitted" && (
              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => updatePayment(reviewing, "reject_deposit", "Customer asked to resubmit payment")}
                  disabled={busyId === reviewing.id}
                  className="px-5 py-2.5 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => updatePayment(reviewing, "confirm_deposit", `Deposit confirmed for order #${reviewing.id}`)}
                  disabled={busyId === reviewing.id}
                  className="px-5 py-2.5 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover disabled:opacity-50"
                >
                  Confirm deposit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
