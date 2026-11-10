import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  PackageCheck,
  PackagePlus,
  PackageX,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
  TrendingUp,
  MoreVertical,
  ArrowUp,
  Pencil,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { uploadToR2, deleteFromR2 } from "../lib/r2";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../../css/dashboard.css";

const initialForm = {
  name: "",
  sku: "",
  category: "",
  custom_category: "",
  brand: "",
  quantity: "",
  unit: "Piece",
  low_stock_alert: "",
  cost_price: "",
  selling_price: "",
  image_url: "",
  description: "",
};
const categories = [
  "General",
  "Electronics",
  "Clothing",
  "Food & Beverage",
  "Health & Beauty",
  "Home & Living",
];
const CUSTOM_CATEGORY = "__custom__";
const units = ["Piece", "Box", "Kg", "Litre", "Pack", "Dozen"];
const PRODUCTS_PER_PAGE = 8;

function getPaginationItems(totalPages, currentPage) {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages];
  if (currentPage >= totalPages - 2)
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", currentPage, "ellipsis-end", totalPages];
}

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [stockPeriod, setStockPeriod] = useState("this-month");
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    async function loadInventory() {
      const { data: businesses, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      if (businessError || !businesses?.[0]) {
        if (active) {
          setError(
            businessError?.message ||
              "Create your business from the dashboard first.",
          );
          setLoading(false);
        }
        return;
      }
      const currentBusinessId = businesses[0].id;
      const { data, error: productsError } = await supabase
        .from("inventory_products")
        .select("*")
        .eq("business_id", currentBusinessId)
        .order("created_at", { ascending: false });
      const { data: history, error: historyError } = await supabase
        .from("inventory_stock_history")
        .select("product_id, quantity, cost_price, recorded_at")
        .eq("business_id", currentBusinessId)
        .order("recorded_at", { ascending: true });
      if (active) {
        setBusinessId(currentBusinessId);
        setProducts(data ?? []);
        setStockHistory(history ?? []);
        setError(productsError?.message || historyError?.message || "");
        setLoading(false);
      }
    }
    loadInventory();
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (!showForm) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setShowForm(false);
    }
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const lenis = window.lenis;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    lenis?.stop();
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      lenis?.start();
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showForm]);

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        !categoryFilter || (product.category || "General") === categoryFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "in-stock"
          ? product.quantity > 5
          : statusFilter === "low-stock"
            ? product.quantity > 0 && product.quantity <= 5
            : product.quantity === 0);
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return result.sort((first, second) => {
      if (sortOrder === "name") return first.name.localeCompare(second.name);
      if (sortOrder === "price")
        return (
          (Number(second.selling_price) || 0) -
          (Number(first.selling_price) || 0)
        );
      return sortOrder === "oldest"
        ? new Date(first.created_at) - new Date(second.created_at)
        : new Date(second.created_at) - new Date(first.created_at);
    });
  }, [products, search, categoryFilter, statusFilter, sortOrder]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  );
  const firstVisibleProduct =
    filteredProducts.length === 0
      ? 0
      : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const lastVisibleProduct = Math.min(
    currentPage * PRODUCTS_PER_PAGE,
    filteredProducts.length,
  );
  const paginationItems = getPaginationItems(totalPages, currentPage);
  const stats = useMemo(
    () => ({
      total: products.length,
      inStock: products.filter((product) => product.quantity > 5).length,
      low: products.filter(
        (product) => product.quantity > 0 && product.quantity <= 5,
      ).length,
      out: products.filter((product) => product.quantity === 0).length,
    }),
    [products],
  );
  const monthlyTrend = useMemo(() => {
    const thisMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const thisMonthCount = products.filter(
      (product) => new Date(product.created_at) >= thisMonth,
    ).length;
    return {
      text: `${thisMonthCount} this month`,
      direction: thisMonthCount > 0 ? "up" : "neutral",
    };
  }, [products]);
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...categories,
          ...products
            .map((product) => product.category?.trim())
            .filter(Boolean),
        ]),
      ),
    [products],
  );
  const categorySummary = useMemo(() => {
    const counts = products.reduce((summary, product) => {
      const category = product.category || "General";
      summary[category] = (summary[category] || 0) + 1;
      return summary;
    }, {});
    const total = products.length || 1;
    return Object.entries(counts)
      .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  }, [products]);
  const lowStockProducts = products.filter((product) => product.quantity <= 5);
  const displayLowStockProducts = lowStockProducts.slice(0, 4);
  const costPrice = Number(form.cost_price) || 0;
  const sellingPrice = Number(form.selling_price) || 0;
  const profit = sellingPrice - costPrice;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  const stockValueData = useMemo(() => {
    const months = [];
    const now = new Date();
    const monthCount = stockPeriod === "this-year" ? 12 : 6;
    const productCreatedAt = new Map(
      products.map((product) => [
        String(product.id),
        new Date(product.created_at),
      ]),
    );
    const initialSnapshots = new Map();
    stockHistory.forEach((snapshot) => {
      const productId = String(snapshot.product_id);
      const createdAt = productCreatedAt.get(productId);
      const recordedAt = new Date(snapshot.recorded_at);
      const current = initialSnapshots.get(productId);
      if (
        createdAt &&
        !Number.isNaN(createdAt.getTime()) &&
        !Number.isNaN(recordedAt.getTime()) &&
        recordedAt >= createdAt &&
        (!current ||
          recordedAt < new Date(current.recorded_at))
      ) {
        initialSnapshots.set(productId, snapshot);
      }
    });
    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString("default", { month: "long" });
      const nextMonth = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        1,
      );
      const value = products.reduce((total, product) => {
        const createdAt = productCreatedAt.get(String(product.id));
        if (
          !createdAt ||
          createdAt < date ||
          createdAt >= nextMonth
        ) {
          return total;
        }
        const snapshot = initialSnapshots.get(String(product.id));
        const quantity = snapshot?.quantity ?? product.quantity;
        const costPrice = snapshot?.cost_price ?? product.cost_price;
        return total + (Number(costPrice) || 0) * (Number(quantity) || 0);
      }, 0);
      months.push({ month: monthName, value });
    }
    return months;
  }, [products, stockHistory, stockPeriod]);

  const currentStockValue = products.reduce(
    (total, product) =>
      total + (Number(product.cost_price) || 0) * product.quantity,
    0,
  );
  const selectedStockValue =
    stockPeriod === "last-month"
      ? stockValueData[stockValueData.length - 2]?.value || 0
      : currentStockValue;
  const comparisonValue =
    stockPeriod === "this-year"
      ? stockValueData[0]?.value || 0
      : stockValueData[stockValueData.length - 2]?.value || 0;
  const percentageChange =
    comparisonValue > 0
      ? (
          ((selectedStockValue - comparisonValue) / comparisonValue) *
          100
        ).toFixed(1)
      : 0;
  const comparisonLabel =
    stockPeriod === "this-year" ? "vs 12 months ago" : "vs last month";

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, sortOrder]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuOpen && !event.target.closest(".inventory-actions-cell")) {
        setActionMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionMenuOpen]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function closeForm() {
    setForm(initialForm);
    setShowForm(false);
    setEditingProduct(null);
    setError("");
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setError("");
    try {
      const imageUrl = await uploadToR2(file, 'inventory');
      updateForm("image_url", imageUrl);
    } catch (error) {
      setError(error.message || "Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  }

  async function addProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category:
        form.category === CUSTOM_CATEGORY
          ? form.custom_category.trim() || null
          : form.category || null,
      brand: form.brand.trim() || null,
      quantity: Number(form.quantity),
      unit: form.unit,
      low_stock_alert: form.low_stock_alert
        ? Number(form.low_stock_alert)
        : null,
      cost_price: costPrice,
      selling_price: sellingPrice,
      image_url: form.image_url || null,
      description: form.description.trim() || null,
    };
    const { data, error: insertError } = await supabase
      .from("inventory_products")
      .insert(payload)
      .select()
      .single();
    if (insertError) setError(insertError.message);
    else {
      setProducts((current) => [data, ...current]);
      setStockHistory((current) => [
        ...current,
        {
          product_id: data.id,
          quantity: data.quantity,
          cost_price: data.cost_price,
          recorded_at: data.created_at,
        },
      ]);
      setForm(initialForm);
      setShowForm(false);
      setToast("Product added successfully.");
      window.setTimeout(() => setToast(""), 3200);
    }
    setSaving(false);
  }

  async function deleteProduct(id) {
    const { error: deleteError } = await supabase
      .from("inventory_products")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    else {
      setProducts((current) => current.filter((product) => product.id !== id));
      setSelectedProducts((current) =>
        current.filter((productId) => productId !== id),
      );
    }
    setActionMenuOpen(null);
  }

  async function deleteSelectedProducts() {
    if (
      !selectedProducts.length ||
      !window.confirm(
        `Delete ${selectedProducts.length} selected product${selectedProducts.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    setError("");
    const { error: deleteError } = await supabase
      .from("inventory_products")
      .delete()
      .in("id", selectedProducts);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProducts((current) =>
      current.filter((product) => !selectedProducts.includes(product.id)),
    );
    setSelectedProducts([]);
    setToast("Selected products deleted.");
    window.setTimeout(() => setToast(""), 3200);
  }

  function handleEditProduct(product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku || "",
      category: product.category && categories.includes(product.category)
        ? product.category
        : product.category
          ? CUSTOM_CATEGORY
          : "",
      custom_category: product.category && !categories.includes(product.category)
        ? product.category
        : "",
      brand: product.brand || "",
      quantity: product.quantity,
      unit: product.unit || "Piece",
      low_stock_alert: product.low_stock_alert || "",
      cost_price: product.cost_price || "",
      selling_price: product.selling_price || "",
      image_url: product.image_url || "",
      description: product.description || "",
    });
    setShowForm(true);
    setActionMenuOpen(null);
  }

  async function updateProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    
    // Delete old image if a new one was uploaded
    if (form.image_url !== editingProduct.image_url && editingProduct.image_url) {
      try {
        await deleteFromR2(editingProduct.image_url);
      } catch (error) {
        console.error('Failed to delete old image:', error);
        // Continue with update even if deletion fails
      }
    }
    
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category:
        form.category === CUSTOM_CATEGORY
          ? form.custom_category.trim() || null
          : form.category || null,
      brand: form.brand.trim() || null,
      quantity: Number(form.quantity),
      unit: form.unit,
      low_stock_alert: form.low_stock_alert
        ? Number(form.low_stock_alert)
        : null,
      cost_price: costPrice,
      selling_price: sellingPrice,
      image_url: form.image_url || null,
      description: form.description.trim() || null,
    };
    const { data, error: updateError } = await supabase
      .from("inventory_products")
      .update(payload)
      .eq("id", editingProduct.id)
      .select()
      .single();
    if (updateError) setError(updateError.message);
    else {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingProduct.id ? data : product,
        ),
      );
      if (
        Number(data.quantity) !== Number(editingProduct.quantity) ||
        Number(data.cost_price) !== Number(editingProduct.cost_price)
      ) {
        setStockHistory((current) => [
          ...current,
          {
            product_id: data.id,
            quantity: data.quantity,
            cost_price: data.cost_price,
            recorded_at: data.updated_at || new Date().toISOString(),
          },
        ]);
      }
      setForm(initialForm);
      setShowForm(false);
      setEditingProduct(null);
      setToast("Product updated successfully.");
      window.setTimeout(() => setToast(""), 3200);
    }
    setSaving(false);
  }

  return (
    <main className="dashboard-page inventory-page">
      <div className="dashboard-workspace">
        <DashboardSidebar />
        <section className="dashboard-main">
          <DashboardHeader />
          <div className="inventory-content">
            <div className="inventory-title-row">
              <div>
                <h1>Inventory</h1>
                <p>Manage your products, stock levels and suppliers.</p>
              </div>
              <div className="inventory-title-actions">
                <button className="inventory-light-button" type="button">
                  <Upload size={14} /> Import
                </button>
                <button
                  className="inventory-dark-button"
                  type="button"
                  onClick={() => {
                    setError("");
                    setShowForm(true);
                  }}
                >
                  <Plus size={16} /> Add Product
                </button>
              </div>
            </div>
            <div className="inventory-stat-grid">
              <InventoryStat
                icon={<Box size={19} />}
                tone="neutral"
                label="Total Products"
                value={stats.total}
                detail="All products"
                percentage={0}
                trend={monthlyTrend}
              />
              <InventoryStat
                icon={<PackageCheck size={19} />}
                tone="green"
                label="In Stock"
                value={stats.inStock}
                detail={`${stats.total ? Math.round((stats.inStock / stats.total) * 100) : 0}% of total`}
                percentage={
                  stats.total
                    ? Math.round((stats.inStock / stats.total) * 100)
                    : 0
                }
              />
              <InventoryStat
                icon={<AlertTriangle size={19} />}
                tone="orange"
                label="Low Stock"
                value={stats.low}
                detail={`${stats.total ? Math.round((stats.low / stats.total) * 100) : 0}% of total`}
                percentage={
                  stats.total ? Math.round((stats.low / stats.total) * 100) : 0
                }
              />
              <InventoryStat
                icon={<PackageX size={19} />}
                tone="red"
                label="Out of Stock"
                value={stats.out}
                detail={`${stats.total ? Math.round((stats.out / stats.total) * 100) : 0}% of total`}
                percentage={
                  stats.total ? Math.round((stats.out / stats.total) * 100) : 0
                }
              />
            </div>
            {error && <p className="auth-error inventory-error">{error}</p>}
            <div className="inventory-layout">
              <section className="inventory-products-panel">
                <div className="inventory-panel-heading">
                  <div className="inventory-panel-title-row">
                    <div>
                      <h2>Product Inventory</h2>
                      <p>Track and manage all your products</p>
                    </div>
                    {selectedProducts.length > 0 && (
                      <div className="inventory-bulk-actions">
                        <span className="inventory-bulk-selection">
                          <b><Check size={11} strokeWidth={3} /></b>
                          {selectedProducts.length} product
                          {selectedProducts.length === 1 ? "" : "s"} selected
                        </span>
                        <button
                          className="inventory-bulk-delete"
                          type="button"
                          onClick={deleteSelectedProducts}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="inventory-filter-row">
                    <label className="inventory-search">
                      <Search size={14} />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search products..."
                        aria-label="Search products"
                      />
                    </label>
                    <select
                      className="inventory-filter-button"
                      value={categoryFilter}
                      onChange={(event) =>
                        setCategoryFilter(event.target.value)
                      }
                      aria-label="Filter by category"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <select
                      className="inventory-filter-button"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      aria-label="Filter by status"
                    >
                      <option value="">All Status</option>
                      <option value="in-stock">In Stock</option>
                      <option value="low-stock">Low Stock</option>
                      <option value="out-of-stock">Out of Stock</option>
                    </select>
                    <select
                      className="inventory-filter-button"
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value)}
                      aria-label="Sort products"
                    >
                      <option value="latest">Latest Added</option>
                      <option value="oldest">Oldest Added</option>
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                    </select>
                  </div>
                </div>
                <div className="inventory-table-scroll">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={
                              selectedProducts.length ===
                                paginatedProducts.length &&
                              paginatedProducts.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedProducts(
                                  paginatedProducts.map((p) => p.id),
                                );
                              else setSelectedProducts([]);
                            }}
                          />
                        </th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Unit Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td className="inventory-empty" colSpan="7">
                            Loading inventory...
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td className="inventory-empty" colSpan="7">
                            No products found.
                          </td>
                        </tr>
                      ) : (
                        paginatedProducts.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setSelectedProducts([
                                      ...selectedProducts,
                                      product.id,
                                    ]);
                                  else
                                    setSelectedProducts(
                                      selectedProducts.filter(
                                        (id) => id !== product.id,
                                      ),
                                    );
                                }}
                              />
                            </td>
                            <td>
                              <div className="inventory-product-cell">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" />
                                ) : (
                                  <span className="inventory-product-placeholder">
                                    <PackagePlus size={14} />
                                  </span>
                                )}
                                <span>
                                  <strong>{product.name}</strong>
                                  <small>{product.sku || "No SKU"}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="inventory-category">
                                {product.category || "General"}
                              </span>
                            </td>
                            <td
                              className={product.quantity <= 5 ? "is-low" : ""}
                            >
                              {product.quantity} {product.unit || "Piece"}
                            </td>
                            <td>
                              {product.selling_price
                                ? `₹${Number(product.selling_price).toLocaleString("en-IN")}`
                                : "—"}
                            </td>
                            <td>
                              <span
                                className={`inventory-status ${product.quantity === 0 ? "is-out" : product.quantity <= 5 ? "is-low" : "is-in"}`}
                              >
                                {product.quantity === 0
                                  ? "Out of stock"
                                  : product.quantity <= 5
                                    ? "Low stock"
                                    : "In stock"}
                              </span>
                            </td>
                            <td className="inventory-actions-cell">
                              <button
                                className="inventory-row-action"
                                type="button"
                                onClick={() =>
                                  setActionMenuOpen(
                                    actionMenuOpen === product.id
                                      ? null
                                      : product.id,
                                  )
                                }
                                aria-label="More actions"
                              >
                                <MoreVertical size={16} />
                              </button>
                              <ActionMenu
                                isOpen={actionMenuOpen === product.id}
                                onEdit={() => handleEditProduct(product)}
                                onDelete={() => deleteProduct(product.id)}
                                onClose={() => setActionMenuOpen(null)}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="inventory-mobile-list">
                  {loading ? (
                    <p className="inventory-mobile-empty">Loading inventory...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="inventory-mobile-empty">No products found.</p>
                  ) : (
                    paginatedProducts.map((product) => (
                      <article className="inventory-mobile-card" key={product.id}>
                        <input
                          className="inventory-mobile-checkbox"
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedProducts((current) => [
                                ...current,
                                product.id,
                              ]);
                            } else {
                              setSelectedProducts((current) =>
                                current.filter((id) => id !== product.id),
                              );
                            }
                          }}
                          aria-label={`Select ${product.name}`}
                        />
                        {product.image_url ? (
                          <img
                            className="inventory-mobile-image"
                            src={product.image_url}
                            alt=""
                          />
                        ) : (
                          <span className="inventory-mobile-image inventory-product-placeholder">
                            <PackagePlus size={18} />
                          </span>
                        )}
                        <div className="inventory-mobile-details">
                          <strong>{product.name}</strong>
                          <small>SKU: {product.sku || "No SKU"}</small>
                          <span
                            className={
                              product.quantity <= 5
                                ? "inventory-mobile-stock is-low"
                                : "inventory-mobile-stock is-in"
                            }
                          >
                            {product.quantity} {product.unit || "Piece"} in stock
                          </span>
                        </div>
                        <div className="inventory-mobile-meta">
                          <span
                            className={`inventory-status ${product.quantity === 0 ? "is-out" : product.quantity <= 5 ? "is-low" : "is-in"}`}
                          >
                            {product.quantity === 0
                              ? "Out of stock"
                              : product.quantity <= 5
                                ? "Low stock"
                                : "In stock"}
                          </span>
                          <strong>
                            {product.selling_price
                              ? `₹${Number(product.selling_price).toLocaleString("en-IN")}`
                              : "—"}
                          </strong>
                        </div>
                        <div className="inventory-mobile-actions inventory-actions-cell">
                          <button
                            className="inventory-row-action"
                            type="button"
                            onClick={() =>
                              setActionMenuOpen(
                                actionMenuOpen === product.id
                                  ? null
                                  : product.id,
                              )
                            }
                            aria-label={`Actions for ${product.name}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                          <ActionMenu
                            isOpen={actionMenuOpen === product.id}
                            onEdit={() => handleEditProduct(product)}
                            onDelete={() => deleteProduct(product.id)}
                            onClose={() => setActionMenuOpen(null)}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="inventory-table-footer">
                  <span>
                    Showing {firstVisibleProduct}–{lastVisibleProduct} of{" "}
                    {filteredProducts.length} products
                  </span>
                  <div className="inventory-pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => page - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft
                        size={17}
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    </button>
                    {paginationItems.map((item) =>
                      item.toString().startsWith("ellipsis") ? (
                        <span
                          className="inventory-pagination-ellipsis"
                          key={item}
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          className={item === currentPage ? "is-active" : ""}
                          type="button"
                          key={item}
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => page + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight
                        size={17}
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </section>
              <aside className="inventory-aside">
                <section className="inventory-side-panel">
                  <div className="inventory-side-heading">
                    <h2>Stock Value</h2>
                    <select
                      className="inventory-side-dropdown"
                      value={stockPeriod}
                      onChange={(event) => setStockPeriod(event.target.value)}
                      aria-label="Select stock value period"
                    >
                      <option value="this-month">This Month</option>
                      <option value="last-month">Last Month</option>
                      <option value="this-year">This Year</option>
                    </select>
                  </div>
                  <strong className="inventory-side-value">
                    ₹{selectedStockValue.toLocaleString("en-IN")}
                  </strong>
                  <span className="inventory-side-muted">
                    <TrendingUp size={12} /> {percentageChange >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(percentageChange)}% {comparisonLabel}
                  </span>
                  <div className="inventory-sparkline-chart">
                    <ResponsiveContainer width="100%" height={40}>
                      <LineChart
                        data={stockValueData}
                        margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                      >
                        <Tooltip
                          cursor={{ stroke: "#d7f0df", strokeWidth: 1 }}
                          formatter={(value) => [
                            `₹${Number(value).toLocaleString("en-IN")}`,
                            "Stock value",
                          ]}
                          labelFormatter={(label) => `${label} month-end`}
                          contentStyle={{
                            border: "1px solid #dfe8e2",
                            borderRadius: 7,
                            boxShadow: "0 4px 12px rgba(20, 40, 25, .12)",
                            fontSize: 11,
                          }}
                        />
                        <XAxis dataKey="month" hide />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#2e8f58"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 4,
                            fill: "#2e8f58",
                            stroke: "#fff",
                            strokeWidth: 2,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="inventory-side-panel">
                  <div className="inventory-side-heading">
                    <h2>Low Stock Items</h2>
                    <span
                      className="inventory-view-all"
                      onClick={() => setShowLowStockModal(true)}
                    >
                      View all →
                    </span>
                  </div>
                  <ul className="inventory-low-list">
                    {displayLowStockProducts.map((product) => (
                      <li key={product.id}>
                        <span className="inventory-mini-image">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" />
                          ) : (
                            <ImageIcon size={13} />
                          )}
                        </span>
                        <span>
                          <strong>{product.name}</strong>
                          <small>{product.quantity} left</small>
                        </span>
                        <em>Low Stock</em>
                      </li>
                    ))}
                  </ul>
                  {lowStockProducts.length === 0 && (
                    <span className="inventory-side-muted">
                      Everything is well stocked.
                    </span>
                  )}
                </section>{" "}
                <section className="inventory-side-panel">
                  <div className="inventory-side-heading">
                    <h2>Categories</h2>
                    <span
                      className="inventory-view-all"
                      onClick={() => setShowCategoriesModal(true)}
                    >
                      View all →
                    </span>
                  </div>
                  {categorySummary.length === 0 ? (
                    <span className="inventory-side-muted">
                      No categories yet.
                    </span>
                  ) : (
                    <div className="inventory-category-list">
                      {categorySummary.slice(0, 4).map(({ category, count }) => {
                        const largestCategoryCount = categorySummary[0].count;
                        const barPercentage = largestCategoryCount
                          ? Math.round((count / largestCategoryCount) * 100)
                          : 0;
                        return (
                          <div
                            className="inventory-category-item"
                            key={category}
                          >
                            <span>{category}</span>
                            <div className="inventory-category-bar">
                              <span style={{ width: `${barPercentage}%` }} />
                            </div>
                            <strong>{count}</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
      {showForm && (
        <ProductModal
          form={form}
          error={error}
          saving={saving}
          imageUploading={imageUploading}
          profit={profit}
          margin={margin}
          categories={availableCategories}
          onChange={updateForm}
          onImage={handleImage}
          onClose={closeForm}
          onSubmit={editingProduct ? updateProduct : addProduct}
          isEdit={!!editingProduct}
        />
      )}
      {showCategoriesModal && (
        <CategoriesModal
          categorySummary={categorySummary}
          onClose={() => setShowCategoriesModal(false)}
        />
      )}
      {showLowStockModal && (
        <LowStockModal
          lowStockProducts={lowStockProducts}
          onClose={() => setShowLowStockModal(false)}
        />
      )}
      {toast && (
        <div className="inventory-toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </main>
  );
}

function ProductModal({
  form,
  error,
  saving,
  imageUploading,
  profit,
  margin,
  categories,
  onChange,
  onImage,
  onClose,
  onSubmit,
  isEdit,
}) {
  return (
    <div
      className="inventory-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="inventory-modal"
        onSubmit={onSubmit}
        aria-labelledby={isEdit ? "edit-product-title" : "add-product-title"}
      >
        <header className="inventory-modal-header">
          <div>
            <h2 id={isEdit ? "edit-product-title" : "add-product-title"}>
              {isEdit ? "Edit Product" : "Add Product"}
            </h2>
            <p>
              {isEdit
                ? "Update product information"
                : "Add a new product to your inventory."}
            </p>
          </div>
          <button
            className="inventory-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="inventory-modal-body" data-lenis-prevent>
          <ModalSection title="Product Information">
            <div className="inventory-modal-grid">
              <ModalField label="Product Name" required>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(event) => onChange("name", event.target.value)}
                  placeholder="e.g. Wireless Mouse"
                />
              </ModalField>
              <ModalField label="SKU / Product ID">
                <input
                  value={form.sku}
                  onChange={(event) => onChange("sku", event.target.value)}
                  placeholder="e.g. WM-001"
                />
              </ModalField>
              <ModalField label="Category">
                <select
                  value={form.category}
                  onChange={(event) => onChange("category", event.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                  <option value={CUSTOM_CATEGORY}>Add custom category</option>
                </select>
                {form.category === CUSTOM_CATEGORY && (
                  <input
                    required
                    value={form.custom_category}
                    onChange={(event) =>
                      onChange("custom_category", event.target.value)
                    }
                    placeholder="e.g. Seasonal Products"
                    aria-label="Custom category"
                  />
                )}
              </ModalField>
              <ModalField label="Brand">
                <input
                  value={form.brand}
                  onChange={(event) => onChange("brand", event.target.value)}
                  placeholder="e.g. Logitech"
                />
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Inventory">
            <div className="inventory-modal-grid">
              <ModalField label="Stock Quantity" required>
                <input
                  required
                  min="0"
                  type="number"
                  value={form.quantity}
                  onChange={(event) => onChange("quantity", event.target.value)}
                  placeholder="0"
                />
              </ModalField>
              <ModalField label="Unit">
                <select
                  value={form.unit}
                  onChange={(event) => onChange("unit", event.target.value)}
                >
                  {units.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </ModalField>
              <ModalField label="Low Stock Alert">
                <input
                  min="0"
                  type="number"
                  value={form.low_stock_alert}
                  onChange={(event) =>
                    onChange("low_stock_alert", event.target.value)
                  }
                  placeholder="Optional"
                />
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Pricing">
            <div className="inventory-modal-grid">
              <ModalField label="Cost Price" required>
                <div className="inventory-input-prefix">
                  <span>₹</span>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.cost_price}
                    onChange={(event) =>
                      onChange("cost_price", event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </ModalField>
              <ModalField label="Selling Price" required>
                <div className="inventory-input-prefix">
                  <span>₹</span>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.selling_price}
                    onChange={(event) =>
                      onChange("selling_price", event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </ModalField>
            </div>
            <div
              className={`inventory-profit-preview ${profit < 0 ? "is-negative" : ""}`}
            >
              <span>
                Profit per unit{" "}
                <strong>
                  ₹
                  {profit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </strong>
              </span>
              <span>
                Profit margin <strong>{margin.toFixed(1)}%</strong>
              </span>
            </div>
          </ModalSection>
          <ModalSection title="Optional">
            <div className="inventory-modal-grid">
              <ModalField label="Product Image">
                <label className={`inventory-upload-field ${imageUploading ? "is-uploading" : ""}`}>
                  {imageUploading ? <LoaderCircle className="inventory-upload-spinner" size={15} aria-hidden="true" /> : <ImagePlus size={15} />}
                  <span>
                    {imageUploading ? "Uploading image..." : form.image_url ? "Image selected" : "Upload image"}
                  </span>
                  <input type="file" accept="image/*" onChange={onImage} disabled={imageUploading} />
                </label>
              </ModalField>
              <ModalField label="Description" wide>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    onChange("description", event.target.value)
                  }
                  placeholder="Add a short product description..."
                  rows="3"
                />
              </ModalField>
            </div>
          </ModalSection>
          {error && <p className="auth-error inventory-modal-error">{error}</p>}
        </div>
        <footer className="inventory-modal-footer">
          <button
            className="inventory-modal-cancel"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="inventory-modal-submit"
            type="submit"
            disabled={saving || imageUploading}
          >
            {imageUploading
              ? "Uploading image..."
              : saving
              ? isEdit
                ? "Updating..."
                : "Adding..."
              : isEdit
                ? "Update Product"
                : "Add Product"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ModalSection({ title, children }) {
  return (
    <section className="inventory-modal-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function ModalField({ label, required, wide, children }) {
  return (
    <label className={`inventory-modal-field ${wide ? "is-wide" : ""}`}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
    </label>
  );
}
function InventoryStat({
  icon,
  tone,
  label,
  value,
  detail,
  percentage,
  trend,
}) {
  return (
    <article className={`inventory-stat-card ${tone}`}>
      <span className="inventory-stat-icon">{icon}</span>
      <div>
        <span className="inventory-stat-label">{label}</span>
        <strong>{value}</strong>
        {trend && (
          <small className={`inventory-stat-trend ${trend.direction}`}>
            {trend.direction === "up" && <ArrowUp size={12} />} {trend.text}
          </small>
        )}
        {!trend && <small>{detail}</small>}
        {!trend && (
          <div className="inventory-stat-progress">
            <div
              className="inventory-stat-progress-bar"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function CategoriesModal({ categorySummary, onClose }) {
  return (
    <div
      className="inventory-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="inventory-modal">
        <header className="inventory-modal-header">
          <div>
            <h2>All Categories</h2>
            <p>View all your product categories</p>
          </div>
          <button
            className="inventory-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="inventory-modal-body" data-lenis-prevent>
          <div className="inventory-category-list">
            {categorySummary.map(({ category, count, percentage }) => (
              <div className="inventory-category-item" key={category}>
                <span>{category}</span>
                <div className="inventory-category-bar">
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LowStockModal({ lowStockProducts, onClose }) {
  return (
    <div
      className="inventory-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="inventory-modal">
        <header className="inventory-modal-header">
          <div>
            <h2>All Low Stock Items</h2>
            <p>View all products with low stock</p>
          </div>
          <button
            className="inventory-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="inventory-modal-body" data-lenis-prevent>
          <ul className="inventory-low-list">
            {lowStockProducts.map((product) => (
              <li key={product.id}>
                <span className="inventory-mini-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" />
                  ) : (
                    <ImageIcon size={13} />
                  )}
                </span>
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.quantity} left</small>
                </span>
                <em>Low Stock</em>
              </li>
            ))}
          </ul>
          {lowStockProducts.length === 0 && (
            <span className="inventory-side-muted">
              Everything is well stocked.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionMenu({ isOpen, onEdit, onDelete, onClose }) {
  if (!isOpen) return null;
  return (
    <div
      className="inventory-action-menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={onEdit}>
        <Pencil size={14} strokeWidth={2} />
        Edit
      </button>
      <button type="button" onClick={onDelete}>
        <Trash2 size={14} strokeWidth={2} />
        Delete
      </button>
    </div>
  );
}
