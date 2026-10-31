import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { FiTrash, FiUpload } from "react-icons/fi";
import toast from "react-hot-toast";
import Select from "../../components/Select";
import { MAX_UPLOAD_BYTES, shrinkImage } from "../../utils/shrinkImage";

export default function ProductManagement() {
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    base_price: "",
    is_available: true,
    description: "",
    image: null,
  });

  const [categories, setCategories] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const formatMoney = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "";
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        console.log("Fetched categories:", response.data);
        
        // Categories will be auto-created by the backend if none exist
        if (response.data && response.data.length > 0) {
          setCategories(response.data);
        } else {
          // If still empty after auto-creation attempt, show warning
          console.warn("No categories available. Please refresh the page.");
          toast.error("No categories available. Please refresh the page.");
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        toast.error("Failed to load categories. Please refresh the page.");
      }
    };
    fetchCategories();
  }, []);

  const orderedCategories = React.useMemo(() => {
    const CATEGORY_ORDER = ["cake", "bread", "pastry", "cupcake", "cookies"];
    const byName = new Map(
      (Array.isArray(categories) ? categories : []).map((c) => [
        String(c?.name || "").trim().toLowerCase(),
        c,
      ])
    );

    return CATEGORY_ORDER.map((n) => byName.get(n)).filter(Boolean);
  }, [categories]);

  const handleChange = async (e) => {
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

      setForm((prev) => ({ ...prev, image }));
      setPreview(URL.createObjectURL(image));
      return;
    }

    // For non-file inputs, update normally
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!form.name || !form.category_id || !form.base_price) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate category_id is a valid integer
    const categoryId = parseInt(form.category_id);
    if (isNaN(categoryId) || categoryId <= 0) {
      toast.error("Please select a valid category");
      setLoading(false);
      return;
    }

    // Validate price
    const price = parseFloat(form.base_price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      setLoading(false);
      return;
    }

    const fd = new FormData();
    
    // Append fields with correct names
    fd.append("name", form.name.trim());
    fd.append("category_id", categoryId.toString());
    fd.append("base_price", price.toFixed(2));
    fd.append("is_available", form.is_available ? "1" : "0");
    fd.append("description", (form.description || "").trim());
    
    // Append image only if it's a valid File object
    if (form.image && form.image instanceof File) {
      console.log("Appending image to FormData:", form.image.name, form.image.size);
      fd.append("image", form.image);
    } else if (!form.image) {
      console.warn("No image selected - image is optional");
    }

    // Debug: Log FormData contents
    console.log("FormData being sent:");
    for (let pair of fd.entries()) {
      if (pair[1] instanceof File) {
        console.log(`${pair[0]}: File(${pair[1].name}, ${pair[1].size} bytes, ${pair[1].type})`);
      } else {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
    }

    try {
      // Send FormData without manual Content-Type header
      // Browser will automatically set: Content-Type: multipart/form-data; boundary=...
      const response = await api.post("/products", fd);
      
      console.log("Product created successfully:", response.data);
      toast.success("Product added successfully!");
      
      // Reset form
      setForm({
        name: "",
        category_id: "",
        base_price: "",
        is_available: true,
        description: "",
        image: null,
      });
      setPreview(null);
    } catch (err) {
      console.error("Product creation error:", err);
      console.error("Error response data:", err.response?.data);
      
      // Show detailed validation errors
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages = Object.values(errors).flat();
        errorMessages.forEach((msg) => toast.error(msg));
      } else {
        toast.error(err.response?.data?.message || "Failed to add product");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageRemove = () => {
    setForm({ ...form, image: null });
    setPreview(null);
  };

  return (
    // The sidebar and top bar come from AdminLayout, which stays on screen between admin pages
    <div>
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-brand-deep">Add Product</h1>
            <p className="text-sm text-gray-500">Create a new item for the customer menu</p>
          </header>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
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
                value={form.category_id ? String(form.category_id) : ""}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
                aria-label="Category"
                placeholder={orderedCategories.length === 0 ? "Loading categories..." : "Select category"}
                disabled={orderedCategories.length === 0}
                options={orderedCategories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
              />
            </div>

            {/* Image Upload - Drag & Drop Style */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>

              {!preview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand transition">
                  <FiUpload className="mx-auto text-4xl text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">
                    Drag & drop to upload or browse
                  </p>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer text-brand hover:underline"
                  >
                    Browse files
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={preview}
                    className="w-full h-64 object-cover rounded-lg border border-gray-300"
                    alt="Preview"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    <FiTrash />
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
                  value={form.base_price}
                  onChange={handleChange}
                  onBlur={() =>
                    setForm((prev) => ({
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
                value={form.is_available ? "1" : "0"}
                onChange={(e) => setForm({ ...form, is_available: e.target.value === "1" })}
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
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Enter product description"
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">

            <button
              type="button"
              onClick={() => {
                setForm({
                  name: "",
                  category_id: "",
                  base_price: "",
                  is_available: true,
                  description: "",
                  image: null,
                });
                setPreview(null);
              }}
              className="border border-line bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-sand transition"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
    </div>
  );
}
