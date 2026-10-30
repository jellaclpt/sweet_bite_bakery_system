// src/pages/Checkout.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../api/api";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import ReactDatePicker from "react-datepicker";
import { getImageUrl } from "../utils/imageUrl";
import { Minus, Plus, X, Trash2, ShoppingBag, Store, Truck } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

export default function Checkout() {
  const { items, subtotal, clearCart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const [fulfillment, setFulfillment] = useState("pickup");
  const [pickupTime, setPickupTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const total = subtotal();

  async function placeOrder() {
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (fulfillment === "pickup" && !pickupTime) {
      setError("Please choose pickup date and time.");
      return;
    }

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) {
        setError("You must be logged in to place an order.");
        setLoading(false);
        return;
      }

      const payload = {
        user_id: user.id,
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          customizations: it.customizations || null,
        })),
        fulfillment,
        pickup_time: pickupTime
          ? dayjs(pickupTime).format("YYYY-MM-DD HH:mm:ss")
          : null,
        payment_method: paymentMethod,
      };

      console.log("📦 Sending order payload:", payload);

      const res = await api.post("/orders", payload);
      console.log("✅ Order response:", res.data);

      clearCart();
      toast.success("Order placed successfully!");

      setTimeout(() => navigate("/orders"), 800);
    } catch (err) {
      console.error("❌ Order failed:", err);
      setError(err.response?.data?.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full border border-line rounded-xl px-3 py-2.5 bg-white outline-none text-gray-700 focus:ring-2 focus:ring-brand/40 focus:border-brand";

  return (
    <div className="min-h-screen bg-cream px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand">Checkout</h1>
          <p className="text-gray-500 mt-1">Review your cart and choose how you want to get your order.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Cart items */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-line shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Cart Items {items.length > 0 && <span className="text-gray-400 font-normal">({items.length})</span>}
              </h2>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 size={15} />
                  Clear all
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingBag className="mx-auto text-line mb-3" size={44} />
                <p className="text-gray-600 mb-4">Your cart is empty.</p>
                <button
                  onClick={() => navigate("/products")}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((it) => (
                  <li key={it.product.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        className="w-16 h-16 object-cover rounded-xl"
                        src={getImageUrl(it.product.image_url)}
                        alt={it.product.name}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{it.product.name}</div>
                        <div className="text-sm text-gray-500">
                          ₱{Number(it.product.base_price).toFixed(2)} each
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center rounded-full border border-line">
                        <button
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-brand"
                          onClick={() => updateQuantity(it.product.id, it.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{it.quantity}</span>
                        <button
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-brand"
                          onClick={() => updateQuantity(it.product.id, it.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="w-24 text-right font-semibold text-gray-800">
                        ₱{(Number(it.product.base_price) * it.quantity).toFixed(2)}
                      </div>

                      <button
                        onClick={() => removeItem(it.product.id)}
                        aria-label={`Remove ${it.product.name}`}
                        className="text-gray-400 hover:text-red-600 transition"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Order details */}
          <section className="bg-white rounded-2xl border border-line shadow-sm p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">Order Details</h2>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment Method</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-sand rounded-xl">
                {[
                  { value: "pickup", label: "Pickup", icon: <Store size={16} /> },
                  { value: "delivery", label: "Delivery", icon: <Truck size={16} /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      fulfillment === opt.value
                        ? "bg-white text-brand shadow-sm"
                        : "text-gray-600 hover:text-brand"
                    }`}
                    onClick={() => setFulfillment(opt.value)}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fulfillment === "pickup" ? "Pickup Date & Time" : "Delivery Date & Time"}
              </label>
              <ReactDatePicker
                selected={pickupTime}
                onChange={(date) => setPickupTime(date)}
                showTimeSelect
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                placeholderText="Select date and time"
                minDate={new Date()}
                className={fieldClass}
                wrapperClassName="w-full"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={fieldClass}
              >
                <option value="gcash">GCash</option>
                <option value="card">Card</option>
                <option value="paypal">PayPal</option>
                <option value="cod">Cash on Pickup or Delivery</option>
              </select>
            </div>

            <div className="flex justify-between items-center border-t border-line pt-4 mb-4">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-xl font-bold text-brand">₱{Number(total).toFixed(2)}</span>
            </div>

            <button
              onClick={placeOrder}
              disabled={loading || items.length === 0}
              className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-full transition disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? "Placing Order..." : "Place Order"}
            </button>

            {error && <p className="text-red-600 mt-3 text-sm text-center">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
