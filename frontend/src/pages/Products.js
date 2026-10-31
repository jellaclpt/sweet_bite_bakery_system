// src/pages/Products.js
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useCart } from "../context/CartContext";
import { getImageUrl } from "../utils/imageUrl";
import toast from "react-hot-toast";
import { Minus, Plus } from "lucide-react";
import Select from "../components/Select";

// Categories appear in this order; any new category goes after them
const CATEGORY_ORDER = ["cake", "bread", "pastry", "cupcake", "cookies"];

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");

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

  // Group products by category, in the bakery's usual order
  const groups = useMemo(() => {
    const map = new Map();
    for (const product of products) {
      const name = product.category?.name || "Other";
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(product);
    }
    const rank = (name) => {
      const i = CATEGORY_ORDER.indexOf(name.toLowerCase());
      return i === -1 ? CATEGORY_ORDER.length : i;
    };
    return [...map.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([name, items]) => ({ name, items }));
  }, [products]);

  // One flat list: every product ("All") or just the chosen category, in the chosen order
  const visibleProducts = useMemo(() => {
    const list = groups
      .filter((g) => activeCategory === "all" || g.name === activeCategory)
      .flatMap((g) => g.items);
    const price = (p) => Number(p.base_price) || 0;
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    switch (sortBy) {
      case "name-asc":
        return [...list].sort(byName);
      case "name-desc":
        return [...list].sort((a, b) => byName(b, a));
      case "price-asc":
        return [...list].sort((a, b) => price(a) - price(b) || byName(a, b));
      case "price-desc":
        return [...list].sort((a, b) => price(b) - price(a) || byName(a, b));
      default:
        return list; // cakes first, then breads, pastries, cupcakes, cookies
    }
  }, [groups, activeCategory, sortBy]);

  const renderCard = (product) => {
    const unavailable = !product.is_available || product.is_available === 0;
    const qty = quantities[product.id] || 1;
    return (
      <div
        key={product.id}
        className={`relative bg-white rounded-xl sm:rounded-2xl border border-line shadow-sm p-2 sm:p-4 flex flex-col transition ${
          unavailable ? "opacity-70" : "hover:shadow-md hover:-translate-y-0.5"
        }`}
      >
        <img
          src={getImageUrl(product.image_url)}
          alt={product.name}
          className={`w-full aspect-[4/3] sm:aspect-auto sm:h-44 object-cover rounded-lg sm:rounded-xl mb-2 sm:mb-4 ${
            unavailable ? "grayscale" : ""
          }`}
        />

        {unavailable && (
          <span className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 bg-white/95 text-red-600 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
            Out of Stock
          </span>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-800 leading-snug line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="hidden sm:block text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
          )}
          <p className="text-sm sm:text-lg font-bold text-brand mt-0.5 sm:mt-1">
            ₱{Number(product.base_price).toFixed(2)}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 sm:mt-4 gap-1.5 sm:gap-2">
          <div className="flex items-center justify-between sm:justify-start rounded-full border border-line">
            <button
              type="button"
              aria-label={`Decrease quantity of ${product.name}`}
              className="w-8 h-7 sm:h-9 flex items-center justify-center text-gray-600 hover:text-brand disabled:opacity-40"
              onClick={() => handleQuantityChange(product.id, -1)}
              disabled={unavailable || qty <= 1}
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-xs sm:text-sm font-medium">{qty}</span>
            <button
              type="button"
              aria-label={`Increase quantity of ${product.name}`}
              className="w-8 h-7 sm:h-9 flex items-center justify-center text-gray-600 hover:text-brand disabled:opacity-40"
              onClick={() => handleQuantityChange(product.id, +1)}
              disabled={unavailable}
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            className="sm:flex-1 whitespace-nowrap bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-semibold px-3 py-1.5 sm:py-2.5 rounded-full transition disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
            onClick={() => handleAddToCart(product)}
            disabled={unavailable}
          >
            {unavailable ? "Unavailable" : "Add to Cart"}
          </button>
        </div>
      </div>
    );
  };

  const gridClass = "grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6";

  if (loading) {
    return (
      <div className="min-h-screen bg-cream px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-10">
        <div className={`max-w-screen-2xl mx-auto ${gridClass}`}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-line animate-pulse">
              <div className="w-full aspect-[4/3] sm:aspect-auto sm:h-40 rounded-xl mb-4 bg-sand"></div>
              <div className="w-3/4 h-4 rounded mb-2 bg-line"></div>
              <div className="w-1/2 h-4 rounded bg-line"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-10">
      <div className="max-w-screen-2xl mx-auto">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Our Products</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Freshly baked and made to order. Pick your treats and add them to your cart.
          </p>
        </header>

        {groups.length > 0 && (
          // Category filter: scrolls sideways on phones, stays under the navbar while scrolling
          <div className="sticky top-0 md:top-16 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 mb-4 sm:mb-6 bg-cream/95 backdrop-blur">
            <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Product categories">
              {[{ name: "all", label: "All", count: products.length }, ...groups.map((g) => ({ name: g.name, label: g.name, count: g.items.length }))].map(
                ({ name, label, count }) => {
                  const active = activeCategory === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setActiveCategory(name);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium border transition ${
                        active
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-white text-gray-700 border-line hover:border-brand/50 hover:text-brand"
                      }`}
                    >
                      {label}
                      <span className={`text-xs ${active ? "text-white/80" : "text-gray-400"}`}>{count}</span>
                    </button>
                  );
                }
              )}
            </div>
            <Select
              className="shrink-0 w-36 sm:w-56"
              size="sm"
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={SORT_OPTIONS}
            />
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-10 text-center text-gray-500">
            No products available right now. Please check back soon.
          </div>
        ) : (
          <div className={gridClass}>{visibleProducts.map(renderCard)}</div>
        )}
      </div>
    </div>
  );
}
