// src/pages/Home.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Store, CalendarClock, ClipboardCheck, PackageCheck, ArrowRight } from "lucide-react";
import api from "../api/api";
import { getImageUrl } from "../utils/imageUrl";
import cakesBg from "../assets/cakes-bg.jpg";

const STEPS = [
  { icon: Store, title: "Choose your treats", text: "Browse cakes, breads, pastries and cookies baked in small batches." },
  { icon: CalendarClock, title: "Pick a date and time", text: "Schedule when you want it, from tomorrow up to the day of your event." },
  { icon: ClipboardCheck, title: "Place your pre-order", text: "We confirm your order and start baking it fresh for your schedule." },
  { icon: PackageCheck, title: "Pick up or get it delivered", text: "Collect it at the bakery or have it brought to your door." },
];

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api
      .get("/products")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setFeatured(list.filter((p) => p.is_available).slice(0, 6));
      })
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6">
        <div
          className="relative max-w-screen-2xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${cakesBg})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#2b1608]/90 via-[#2b1608]/60 to-transparent" />
          <div className="relative px-5 py-7 sm:px-8 sm:py-10 md:px-12 md:py-14 max-w-2xl text-white">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#F3C99A] mb-2 sm:mb-3">Sweet Bite Bakery</p>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-[1.1] mb-3 sm:mb-4">
              Baked fresh,
              <br />
              ready when you are.
            </h1>
            <p className="text-sm sm:text-base text-white/85 mb-5 sm:mb-6 max-w-lg">
              Pre-order cakes, breads and pastries for any day and time. We bake it for your schedule,
              so it’s fresh when you collect it.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base rounded-full font-semibold shadow-sm transition"
              >
                <ShoppingBag size={16} />
                Start a Pre-order
              </button>
              <button
                onClick={() => navigate("/orders")}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-4 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base rounded-full font-semibold backdrop-blur transition"
              >
                Track my orders
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How pre-ordering works */}
      <section className="px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <div className="max-w-screen-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-deep mb-1 sm:mb-2">How pre-ordering works</h2>
          <p className="text-sm sm:text-base text-gray-500 mb-5 sm:mb-8">Four simple steps from craving to cake box.</p>
          <ol className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="bg-white border border-line rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-5">
                  <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-sand text-brand flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
                  </span>
                  <span className="text-xl sm:text-3xl font-bold text-line">0{i + 1}</span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 leading-snug mb-1">{title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-10 pb-10 sm:pb-16">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex items-end justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-deep mb-1">Fresh from our ovens</h2>
                <p className="text-sm sm:text-base text-gray-500">A few favorites you can pre-order today.</p>
              </div>
              <button
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-1 text-sm sm:text-base text-brand font-semibold hover:underline shrink-0"
              >
                View all <span className="hidden sm:inline">products</span> <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-5">
              {featured.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => navigate("/products")}
                  className={`${i === 5 ? "xl:hidden " : ""}group text-left bg-white border border-line rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition`}
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={getImageUrl(p.image_url)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="p-2.5 sm:p-4">
                    {p.category?.name && (
                      <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400 mb-1">{p.category.name}</p>
                    )}
                    <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-sm sm:text-base font-bold text-brand mt-0.5">₱{Number(p.base_price).toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
