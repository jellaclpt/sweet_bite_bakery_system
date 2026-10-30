// src/pages/Profile.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getImageUrl } from "../utils/imageUrl";

export default function Profile() {
  const { user, setUser } = useAuth(); // useAuth must provide setUser (updateUser)
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    image: null,
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // load profile from context user (or fallback to API)
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        image: null,
      });
      setPreview(user.image_url ? getImageUrl(user.image_url) : null);
      return;
    }

    // fallback: try to fetch user from API (if context not populated)
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.user || res.data;
        setForm({
          name: u.name || "",
          phone: u.phone || "",
          address: u.address || "",
          image: null,
        });
        setPreview(u.image_url ? getImageUrl(u.image_url) : null);
      } catch (err) {
        console.warn("Could not fetch user:", err?.response?.data || err);
      }
    };
    fetchUser();
  }, [user]);

  // input handler (handles file inputs too)
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      // validation client-side (optional)
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file (jpg, png).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be smaller than 5MB.");
        return;
      }
      setForm((p) => ({ ...p, image: file }));
      setPreview(URL.createObjectURL(file));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  // debug helper to log FormData contents (for dev only)
  // eslint-disable-next-line no-unused-vars
  const logFormData = (fd) => {
    try {
      const entries = [];
      // eslint-disable-next-line no-unused-vars
      for (const pair of fd.entries()) {
        // pair could be File; for File show file name
        entries.push(
          `${pair[0]} => ${
            pair[1] instanceof File ? `[File:${pair[1].name}]` : pair[1]
          }`
        );
      }
      console.log("FormData entries:", entries);
    } catch (e) {
      console.log("Could not read FormData entries (browser limitation)", e);
    }
  };

  // save profile
  const handleUpdate = async (e) => {
    e.preventDefault();

    // Validate name before processing
    const trimmedName = form.name ? form.name.trim() : "";
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        toast.error("Authentication required. Please login again.");
        setLoading(false);
        return;
      }

      // Create FormData
      const fd = new FormData();
      fd.append("_method", "PUT"); // <-- Spoof PUT for Laravel
      fd.append("name", trimmedName);
      fd.append("phone", form.phone ? form.phone.trim() : "");
      fd.append("address", form.address ? form.address.trim() : "");
      
      // Only append image if it's a valid File object
      if (form.image && form.image instanceof File) {
        console.log("Appending image:", form.image.name);
        fd.append("image", form.image);
      }

      // Debug: log what will be sent
      console.log("Sending FormData with name:", trimmedName);
      for (const [key, value] of fd.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`${key}: "${value}"`);
        }
      }

      // Use direct axios call without custom interceptors
      const apiBase = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
      const res = await axios.post(
        `${apiBase}/api/profile/update`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log("Profile update response:", res.data);
      toast.success("Profile updated successfully!");

      // Update global user object
      if (res?.data?.user) {
        setUser(res.data.user);
        // Update preview if image was uploaded
        if (res.data.user.image_url) {
          setPreview(getImageUrl(res.data.user.image_url));
        }
      }

      // Reset file input state
      setForm((prev) => ({ ...prev, image: null }));
    } catch (err) {
      console.error("Profile update error:", err);
      const resp = err?.response?.data;
      
      console.error("Full error response:", resp);

      if (resp?.errors) {
        // Show all validation errors with detailed logging
        console.error("Validation errors details:", resp.errors);
        Object.entries(resp.errors).forEach(([field, messages]) => {
          const errorMsg = Array.isArray(messages) ? messages.join(", ") : messages;
          console.error(`Field "${field}":`, errorMsg);
          toast.error(`${field}: ${errorMsg}`);
        });
      } else if (resp?.message) {
        console.error("Error message:", resp.message);
        toast.error(resp.message);
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // password handlers (unchanged)
  const handlePasswordChange = (e) =>
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "/profile/change-password",
        {
          old_password: passwordData.oldPassword,
          new_password: passwordData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      toast.success("Password changed successfully!");
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-6 pb-8 px-4 bg-cream">
      <div className="bg-white shadow-sm border border-line rounded-2xl p-6 sm:p-8 w-full max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-brand">My Profile</h1>

        <div className="flex justify-center mb-6">
          <div
            onClick={handleImageClick}
            className="group relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border-4"
            style={{ backgroundColor: "#f0e6dd", borderColor: "#e8ddd2" }}
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <span className="flex items-center justify-center w-full h-full select-none text-5xl font-semibold text-brand">
                {(form?.name || user?.name || "U").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none text-xs font-medium text-white bg-black/30 opacity-0 group-hover:opacity-100 transition">
              Change photo
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            name="image"
            onChange={handleChange}
            className="hidden"
          />
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 rounded-lg"
            style={{ backgroundColor: "#974D07" }}
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full mt-4 rounded-lg py-2 border-2"
          style={{ borderColor: "#d4a574", color: "#974D07" }}
        >
          Change Password
        </button>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#974D07" }}>Change Password</h2>
            <form onSubmit={handlePasswordUpdate} className="space-y-3">
              <input
                name="oldPassword"
                placeholder="Current password"
                type="password"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
              <input
                name="newPassword"
                placeholder="New password"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
              <input
                name="confirmPassword"
                placeholder="Confirm new password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 border rounded-lg px-3 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={passwordLoading} className="flex-1 text-white rounded-lg px-3 py-2" style={{ backgroundColor: "#974D07" }}>
                  {passwordLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
