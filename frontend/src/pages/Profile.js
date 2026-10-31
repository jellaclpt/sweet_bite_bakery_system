// src/pages/Profile.js
import React, { useState, useEffect, useRef } from "react";
import { KeyRound, Lock, X } from "lucide-react";
import { AuthField } from "../components/AuthLayout";
import api from "../api/api";
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
        if (!localStorage.getItem("token")) return;
        const res = await api.get("/user");
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
      if (!localStorage.getItem("token")) {
        toast.error("Authentication required. Please login again.");
        setLoading(false);
        return;
      }

      // Multipart forms can't be sent as PUT from the browser, so Laravel reads _method instead
      const fd = new FormData();
      fd.append("_method", "PUT");
      fd.append("name", trimmedName);
      fd.append("phone", form.phone ? form.phone.trim() : "");
      fd.append("address", form.address ? form.address.trim() : "");
      if (form.image && form.image instanceof File) {
        fd.append("image", form.image);
      }

      const res = await api.post("/profile/update", fd);
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
      const resp = err?.response?.data;

      if (resp?.errors) {
        Object.values(resp.errors).forEach((messages) => {
          toast.error(Array.isArray(messages) ? messages.join(" ") : messages);
        });
      } else if (resp?.message) {
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

  // Accounts created with Google have no password yet; they set one instead of changing it
  const settingFirstPassword = user?.has_password === false;

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
      // Goes to the backend API (this used to be sent to the website itself and never worked)
      const res = await api.put("/profile/change-password", {
        ...(settingFirstPassword ? {} : { old_password: passwordData.oldPassword }),
        new_password: passwordData.newPassword,
      });
      toast.success(res.data?.message || "Password changed successfully!");
      if (res.data?.user) setUser(res.data.user);
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const errors = err?.response?.data?.errors;
      toast.error(
        (errors && Object.values(errors).flat()[0]) || err?.response?.data?.message || "Failed to change password."
      );
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
          {settingFirstPassword ? "Set a Password" : "Change Password"}
        </button>
        {settingFirstPassword && (
          <p className="text-xs text-gray-500 text-center mt-2">
            You signed up with Google. Set a password to also log in with your email.
          </p>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="flex items-start justify-between p-6 border-b border-line">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-sand text-brand flex items-center justify-center">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h2 id="change-password-title" className="text-xl font-bold text-brand-deep">
                    {settingFirstPassword ? "Set a Password" : "Change Password"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {settingFirstPassword
                      ? "Then you can log in with your email or with Google."
                      : "Use at least 6 characters."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
              {!settingFirstPassword && (
                <AuthField
                  label="Current password"
                  icon={Lock}
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  required
                />
              )}
              <AuthField
                label="New password"
                icon={Lock}
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                required
              />
              <AuthField
                label="Confirm new password"
                icon={Lock}
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                required
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 border border-line rounded-xl py-3 font-medium text-gray-700 hover:bg-sand transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 bg-brand hover:bg-brand-hover text-white rounded-xl py-3 font-semibold transition disabled:opacity-60"
                >
                  {passwordLoading ? "Saving..." : settingFirstPassword ? "Set Password" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
