// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiEdit, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { getImageUrl } from "../../utils/imageUrl";
import Select from "../../components/Select";
import { MAX_UPLOAD_BYTES, shrinkImage } from "../../utils/shrinkImage";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all"); // all | cake | bread | pastry | cupcake | cookies
  const [priceSort, setPriceSort] = useState("asc"); // asc: lowest->highest, desc: highest->lowest
  const [perPage] = useState(50);
  const [page] = useState(1);
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category_id: "",
    base_price: "",
    is_available: true,
    description: "",
    image: null,
  });
  const [editPreview, setEditPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const formatMoney = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "";
  };

  const fetchProducts = useCallback(async (opts = {}) => {
    setError(null);
    try {
      const params = {
        page: opts.page || page,
        per_page: opts.per_page || perPage,
      };

      const res = await api.get("/products", { params });
      
      // Handle paginated response structure
      // Laravel pagination returns: { data: [...], current_page: 1, ... }
      // Non-paginated returns: [...]
      const data = res.data?.data ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      
      console.log("Fetched products:", data.length, "items");
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products");
      setLoading(false);
    }
  }, [page, perPage]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        if (response.data && response.data.length > 0) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProducts({ page: 1 });

    const interval = setInterval(() => {
      fetchProducts({ page: 1 });
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProducts]);

  const displayedProducts = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const cat = selectedCategory === "all" ? null : String(selectedCategory).toLowerCase();

    const filtered = (Array.isArray(products) ? products : []).filter((p) => {
      if (cat) {
        const categoryName = String(p.category?.name || "").trim().toLowerCase();
        if (categoryName !== cat) return false;
      }

      if (!q) return true;
      const name = String(p.name || "").toLowerCase();
      const categoryName = String(p.category?.name || "").toLowerCase();
      return name.includes(q) || categoryName.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      const ap = Number(a.base_price) || 0;
      const bp = Number(b.base_price) || 0;
      return priceSort === "desc" ? bp - ap : ap - bp;
    });

    return sorted;
  }, [products, search, selectedCategory, priceSort]);

  const stats = useMemo(() => {
    const total = displayedProducts.length;
    const available = displayedProducts.filter((p) => {
      const v = p.is_available;
      return v === true || v === 1 || v === "1";
    }).length;
    const unavailable = total - available;
    const recent = [...displayedProducts]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )
      .slice(0, 6);

    return { total, available, unavailable, recent };
  }, [displayedProducts]);

  // Open Edit Modal
  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      category_id: product.category_id || product.category?.id || "",
      base_price: formatMoney(product.base_price),
      // Convert to string for select compatibility
      is_available: product.is_available === 1 || product.is_available === true ? "1" : "0",
      description: product.description || "",
      image: null,
    });
    setEditPreview(product.image_url ? getImageUrl(product.image_url) : null);
    setEditModalOpen(true);
  };

  // Close Edit Modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingProduct(null);
    setEditPreview(null);
    setEditForm({
      name: "",
      category_id: "",
      base_price: "",
      is_available: true,
      description: "",
      image: null,
    });
  };

  // Handle Edit Form Change
  const handleEditChange = async (e) => {
    const { name, value, files } = e.target;

    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      // Big phone photos are resized here, so only truly huge files are refused
      const image = await shrinkImage(file, { maxDimension: 1600 });
      if (image.size > MAX_UPLOAD_BYTES) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setEditForm((prev) => ({ ...prev, image }));
      setEditPreview(URL.createObjectURL(image));
    } else {
      // is_available is stored as the string "1" or "0"
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      // Validate required fields
      if (!editForm.name || !editForm.category_id || !editForm.base_price) {
        toast.error("Please fill in all required fields");
        setEditLoading(false);
        return;
      }

      const categoryId = parseInt(editForm.category_id);
      if (isNaN(categoryId) || categoryId <= 0) {
        toast.error("Please select a valid category");
        setEditLoading(false);
        return;
      }

      const basePrice = parseFloat(editForm.base_price);
      if (isNaN(basePrice) || basePrice < 0) {
        toast.error("Please enter a valid price");
        setEditLoading(false);
        return;
      }

      const fd = new FormData();
      fd.append("_method", "PUT");
      fd.append("name", editForm.name.trim());
      fd.append("category_id", categoryId.toString());
      fd.append("base_price", basePrice.toFixed(2));
      // Always send as string "1" or "0"
      fd.append("is_available", editForm.is_available);
      fd.append("description", (editForm.description || "").trim());
      if (editForm.image && editForm.image instanceof File) {
        fd.append("image", editForm.image);
      }

      console.log("Edit FormData entries:");
      for (const [k, v] of fd.entries()) {
        console.log(`${k}:`, v instanceof File ? `File(${v.name}, ${v.size} bytes)` : v);
      }

      const response = await api.post(`/products/${editingProduct.id}`, fd);
      console.log("Update response:", response.data);
      
      toast.success("Product updated successfully!");
      handleCloseEditModal();
      
      // Refresh products to see the updated image
      await fetchProducts({ page: 1 });
    } catch (err) {
      console.error("Product update error:", err);
      console.error("Error response:", err.response?.data);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages = Object.values(errors).flat();
        errorMessages.forEach((msg) => toast.error(msg));
      } else {
        toast.error(err.response?.data?.message || "Failed to update product");
      }
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Modal
  const handleDeleteClick = (product) => {
    setDeletingProduct(product);
    setDeleteModalOpen(true);
  };

  // Close Delete Modal
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingProduct(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    setDeleteLoading(true);

    try {
      await api.delete(`/products/${deletingProduct.id}`);
      toast.success("Product deleted successfully!");
      handleCloseDeleteModal();
      fetchProducts({ page: 1 }); // Refresh products
    } catch (err) {
      console.error("Product delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    // The sidebar and top bar come from AdminLayout, which stays on screen between admin pages
    <>
        <div>
          {/* HEADER */}
          <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-deep">
                Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Overview of products and recent activity
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-80">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search products..."
                  aria-label="Search products"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-gray-800 placeholder:text-gray-400 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-4 focus:ring-brand/15"
                />
              </div>

              <Select
                className="w-full sm:w-44"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by category"
                options={[
                  { value: "all", label: "All categories" },
                  { value: "cake", label: "Cake" },
                  { value: "bread", label: "Bread" },
                  { value: "pastry", label: "Pastry" },
                  { value: "cupcake", label: "Cupcake" },
                  { value: "cookies", label: "Cookies" },
                ]}
              />

              <Select
                className="w-full sm:w-64"
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value)}
                aria-label="Sort by price"
                options={[
                  { value: "asc", label: "Price: lowest to highest" },
                  { value: "desc", label: "Price: highest to lowest" },
                ]}
              />
            </div>
          </header>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-5 rounded-xl shadow">
              <div className="text-sm text-gray-600">Total Products</div>
              <div className="text-3xl font-bold text-brand-deep">
                {stats.total}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <div className="text-sm text-gray-600">Available</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.available}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <div className="text-sm text-gray-600">Out of Stock</div>
              <div className="text-3xl font-bold text-red-600">
                {stats.unavailable}
              </div>
            </div>
          </div>

          {/* Recent Products - Standalone Card */}
          <div className="bg-white rounded-xl p-5 shadow border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-deep">Recent Products</h3>
              <span className="text-xs text-gray-500">Latest</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.recent.length === 0 && (
                <div className="col-span-full text-sm text-gray-500 text-center py-4">
                  No recent products
                </div>
              )}

              {stats.recent.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  <img
                    src={getImageUrl(p.image_url)}
                    alt={p.name}
                    className="w-16 h-16 rounded object-cover border mb-2"
                  />
                  <div className="text-center w-full">
                    <div className="font-medium text-sm text-gray-800 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 mb-1">{p.category?.name || "—"}</div>
                    <div className="text-sm font-semibold text-brand">
                      ₱{Number(p.base_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#F7F3EF] text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Image</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan="7" className="p-6 text-center">
                      Loading products...
                    </td>
                  </tr>
                )}

                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-6 text-center">
                      No products found.
                    </td>
                  </tr>
                )}
                
                {!loading && products.length > 0 && displayedProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-6 text-center">
                      No products found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  displayedProducts.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-[#FFF9F5]">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <img
                          src={getImageUrl(p.image_url)}
                          alt={p.name}
                          className="w-12 h-12 rounded object-cover border"
                        />
                      </td>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">
                        {p.category?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ₱{Number(p.base_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.is_available === true || p.is_available === 1 || p.is_available === "1" ? (
                          <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            Available
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(p)}
                            className="p-2 text-brand hover:bg-brand hover:text-white rounded-lg transition"
                            title="Edit product"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="p-2 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition"
                            title="Delete product"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {error && <div className="mt-4 text-red-500">{error}</div>}
        </div>

      {/* Edit Product Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-brand-deep">Edit Product</h2>
              <button
                onClick={handleCloseEditModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <Select
                    name="category_id"
                    value={editForm.category_id ? String(editForm.category_id) : ""}
                    onChange={handleEditChange}
                    required
                    placeholder="Select category"
                    aria-label="Category"
                    options={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
                  />
                </div>

                {/* Image Upload */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image
                  </label>
                  {!editPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-gray-600 mb-2">No image selected</p>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleEditChange}
                        className="hidden"
                        id="edit-image-upload"
                      />
                      <label
                        htmlFor="edit-image-upload"
                        className="cursor-pointer text-brand hover:underline"
                      >
                        Browse files
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={editPreview}
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                        alt="Preview"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, image: null, deleteImage: true });
                          setEditPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="base_price"
                      value={editForm.base_price}
                      onChange={handleEditChange}
                      onBlur={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          base_price: formatMoney(prev.base_price),
                        }))
                      }
                      required
                      className="w-full border border-gray-300 px-3 py-2 pl-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <Select
                    name="is_available"
                    value={editForm.is_available}
                    onChange={handleEditChange}
                    aria-label="Availability"
                    options={[
                      { value: "1", label: "Available" },
                      { value: "0", label: "Out of Stock" },
                    ]}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Enter product description"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? "Updating..." : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-red-600">Delete Product</h2>
                <button
                  onClick={handleCloseDeleteModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete this product?
                </p>
                {deletingProduct && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-semibold text-gray-800">{deletingProduct.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={deleteLoading}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
