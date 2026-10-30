// Human-readable labels for raw values stored by the backend (e.g. "cod", "pending")

const titleCase = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const PAYMENT_METHODS = {
  cod: "Cash",
  cash: "Cash",
  gcash: "GCash",
};

export const formatPaymentMethod = (value) =>
  PAYMENT_METHODS[String(value || "").toLowerCase()] || titleCase(value);

export const formatLabel = (value) => (value ? titleCase(value) : "—");

// Tailwind classes for order status pills
export const orderStatusClass = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "completed":
    case "delivered":
      return "bg-green-100 text-green-700";
    case "ready":
    case "out_for_delivery":
      return "bg-blue-100 text-blue-700";
    case "processing":
    case "preparing":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-sand text-brand-deep";
  }
};

// Pre-order payment statuses (deposit flow)
const PAYMENT_STATUS = {
  awaiting_deposit: { label: "Deposit needed", className: "bg-amber-100 text-amber-800" },
  deposit_submitted: { label: "Checking payment", className: "bg-blue-100 text-blue-700" },
  deposit_paid: { label: "Deposit paid", className: "bg-green-100 text-green-700" },
  paid: { label: "Fully paid", className: "bg-green-600 text-white" },
  unpaid: { label: "Unpaid", className: "bg-gray-100 text-gray-600" },
};

export const formatPaymentStatus = (value) =>
  PAYMENT_STATUS[value]?.label || formatLabel(value);

export const paymentStatusClass = (value) =>
  PAYMENT_STATUS[value]?.className || "bg-gray-100 text-gray-600";

export const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
