// src/pages/Products.js
import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { getImageUrl } from "../utils/imageUrl";
import toast from "react-hot-toast";
import { Minus, Plus } from "lucide-react";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState({});

  // ✅ Fetch products from backend
  useEffect(() => {
    api
      .get("/products")
      .then((res) => {
        setProducts(res.data.data || res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching products:", err);
        setLoading(false);
      });
  }, []);

  // ✅ Adjust quantity per product
  const handleQuantityChange = (id, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  // ✅ Add to cart and reset quantity
  const handleAddToCart = (product) => {
    const qty = quantities[product.id] || 1;
    addToCart(product, qty);
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    toast.success(`${product.name} added to cart`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream px-6 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-line animate-pulse">
              <div className="w-full h-40 rounded-xl mb-4 bg-sand"></div>
              <div className="w-3/4 h-4 rounded mb-2 bg-line"></div>
              <div className="w-1/2 h-4 rounded bg-line"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand">Our Products</h1>
          <p className="text-gray-500 mt-1">
            Freshly baked and made to order. Pick your treats and add them to your cart.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.length > 0 ? (
            products.map((product) => {
              const unavailable = !product.is_available || product.is_available === 0;
              const qty = quantities[product.id] || 1;
              return (
                <div
                  key={product.id}
                  className={`relative bg-white rounded-2xl border border-line shadow-sm p-4 flex flex-col transition ${
                    unavailable ? "opacity-70" : "hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <img
                    src={getImageUrl(product.image_url)}
                    alt={product.name}
                    className={`w-full h-44 object-cover rounded-xl mb-4 ${unavailable ? "grayscale" : ""}`}
                  />

                  {unavailable && (
                    <span className="absolute top-6 right-6 bg-white/95 text-red-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                      Out of Stock
                    </span>
                  )}

                  <div className="flex-1">
                    {product.category?.name && (
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                        {product.category.name}
                      </p>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800 leading-snug">
                      {product.name}
                    </h2>
                    <p className="text-lg font-bold text-brand mt-1">
                      ₱{Number(product.base_price).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 gap-3">
                    <div className="flex items-center rounded-full border border-line">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-brand disabled:opacity-40"
                        onClick={() => handleQuantityChange(product.id, -1)}
                        disabled={unavailable || qty <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-brand disabled:opacity-40"
                        onClick={() => handleQuantityChange(product.id, +1)}
                        disabled={unavailable}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="flex-1 bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-full transition disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                      onClick={() => handleAddToCart(product)}
                      disabled={unavailable}
                    >
                      {unavailable ? "Unavailable" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white border border-line rounded-2xl p-10 text-center text-gray-500">
              No products available right now. Please check back soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
