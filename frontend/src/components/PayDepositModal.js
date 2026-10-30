// Modal where a customer sends their GCash deposit details for a pre-order:
// shows where to pay and how much, then takes the reference number and a screenshot.
import React, { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Upload, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";
import { peso } from "../utils/labels";

export default function PayDepositModal({ order, settings, onClose, onPaid }) {
  const [reference, setReference] = useState(order.payment_reference || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText((settings?.gcash_number || "").replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available; the number is still visible */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!reference.trim()) return setError("Enter the GCash reference number.");
    if (!file) return setError("Attach a screenshot of your GCash receipt.");

    const fd = new FormData();
    fd.append("payment_reference", reference.trim());
    fd.append("proof", file);

    setSubmitting(true);
    try {
      const res = await api.post(`/orders/${order.id}/deposit`, fd);
      toast.success("Payment sent. We'll confirm it shortly.");
      onPaid?.(res.data.order);
      onClose();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      setError(
        (errors && Object.values(errors).flat().join(" ")) ||
          err?.response?.data?.message ||
          "Couldn't send your payment details. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-deposit-title"
      >
        <div className="flex items-start justify-between p-6 border-b border-line">
          <div>
            <h2 id="pay-deposit-title" className="text-xl font-bold text-brand-deep">Pay your deposit</h2>
            <p className="text-sm text-gray-500 mt-0.5">Order #{order.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Amount */}
          <div className="rounded-xl bg-sand p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-deep/80">Deposit due now</p>
              <p className="text-2xl font-bold text-brand">{peso(order.deposit_amount)}</p>
            </div>
            <div className="text-right text-sm text-brand-deep/80">
              <p>Order total {peso(order.total)}</p>
              <p>Balance on {order.fulfillment === "delivery" ? "delivery" : "pickup"}{" "}
                {peso(Number(order.total) - Number(order.deposit_amount))}</p>
            </div>
          </div>

          {/* Where to send it */}
          <div className="rounded-xl border border-line p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Smartphone size={16} className="text-brand" /> Send via GCash to
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tracking-wide text-gray-800">{settings?.gcash_number || "Loading..."}</p>
                <p className="text-sm text-gray-500">{settings?.gcash_name}</p>
              </div>
              <button
                type="button"
                onClick={copyNumber}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand border border-line rounded-full px-3 py-1.5 hover:bg-sand"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <ol className="mt-4 space-y-1 text-sm text-gray-500 list-decimal list-inside">
              <li>Open GCash and choose Send Money.</li>
              <li>Send exactly {peso(order.deposit_amount)} to the number above.</li>
              <li>Enter the reference number and attach your receipt below.</li>
            </ol>
          </div>

          {/* Proof */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">GCash reference number</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 1012 345 678901"
              className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </label>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Receipt screenshot</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="GCash receipt" className="w-full max-h-64 object-contain rounded-xl border border-line bg-gray-50" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-white/95 text-sm font-medium text-brand px-3 py-1.5 rounded-full shadow"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-line rounded-xl py-8 flex flex-col items-center text-gray-500 hover:border-brand hover:text-brand transition"
              >
                <Upload size={24} className="mb-2" />
                <span className="text-sm font-medium">Upload screenshot</span>
                <span className="text-xs mt-0.5">JPG or PNG, up to 5 MB</span>
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-full transition disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Submit payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
