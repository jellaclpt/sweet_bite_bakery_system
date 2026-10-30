// src/pages/Home.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import logo from "../assets/logo.png";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-6 bg-cream">
      {/* Hero section */}
      <div className="max-w-2xl flex flex-col items-center">
        <img src={logo} alt="" className="w-20 h-20 mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold text-brand leading-tight mb-4">
          Welcome to Sweet Bite Bakery
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          Indulge in our freshly baked pastries, cakes, and cookies, made
          with love and the finest ingredients. Pre-order your favorites today.
        </p>

        <button
          onClick={() => navigate("/products")}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-7 py-3 rounded-full text-base font-semibold shadow-sm transition"
        >
          <ShoppingBag size={18} />
          Shop Now
        </button>
      </div>

      {/* Decorative footer */}
      <p className="mt-16 text-gray-400 text-sm italic">
        “Life is short. Eat dessert first.”
      </p>
    </div>
  );
}
