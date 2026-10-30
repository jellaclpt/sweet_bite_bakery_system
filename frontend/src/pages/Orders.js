// src/pages/Orders.js
import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { getImageUrl } from "../utils/imageUrl";
import { formatLabel, formatPaymentMethod, orderStatusClass } from "../utils/labels";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return; // wait until user is loaded

    api
      .get(`/orders/user/${user.id}`)
      .then((res) => {
        console.log("✅ Orders API:", res.data);
        setOrders(res.data.data || res.data);
      })
      .catch((err) => {
        console.error("❌ Error fetching orders:", err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-cream">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand"></div>
        <p className="mt-4 font-medium text-brand">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-6 pt-6 pb-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand">Your Orders</h1>
          <p className="text-gray-500 mt-1">Track your pre-orders and pickup or delivery times.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-line shadow-sm p-6 flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-lg text-gray-800">Order #{order.id}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${orderStatusClass(order.status)}`}>
                    {formatLabel(order.status)}
                  </span>
                </div>

                <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm mb-4">
                  <dt className="text-gray-500">Payment</dt>
                  <dd
                    className={`font-medium text-right ${
                      order.payment_status === "paid" ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {formatLabel(order.payment_status)}
                  </dd>
                  <dt className="text-gray-500">Method</dt>
                  <dd className="font-medium text-right text-gray-700">
                    {formatPaymentMethod(order.payment_method)}
                  </dd>
                  <dt className="text-gray-500">Fulfillment</dt>
                  <dd className="font-medium text-right text-gray-700">{formatLabel(order.fulfillment)}</dd>
                </dl>

                {order.items?.length > 0 && (
                  <div className="border-t border-line pt-4 space-y-3 flex-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img
                          src={getImageUrl(item.product_image)}
                          alt={item.product_name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {item.product_name}
                          </div>
                          <div className="text-xs text-gray-500">Qty {item.quantity}</div>
                        </div>
                        <div className="text-sm text-gray-700">
                          ₱{Number(item.total_price).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-line flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-lg text-brand">
                    ₱{Number(order.total).toFixed(2)}
                  </span>
                </div>

                {order.pickup_time && (
                  <p className="mt-2 text-xs text-gray-400">
                    {order.fulfillment === "delivery" ? "Delivery" : "Pickup"} time:{" "}
                    {new Date(order.pickup_time).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
