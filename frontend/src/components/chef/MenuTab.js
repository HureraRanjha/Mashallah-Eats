import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function MenuTab({ menuItems, onRefresh, onMessage }) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    is_vip_exclusive: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      is_vip_exclusive: false,
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      image_url: item.image_url || "",
      is_vip_exclusive: item.is_vip_exclusive || false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const url = editingItem
        ? `${API_BASE_URL}/chef/menu/update/`
        : `${API_BASE_URL}/add_item/`;

      const body = editingItem
        ? { item_id: editingItem.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", editingItem ? "Item updated successfully" : "Item added successfully");
        closeModal();
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to save item");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chef/menu/delete/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ item_id: itemId }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Item deleted successfully");
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to delete item");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">My Menu Items</h3>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Item
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="text-center py-8 opacity-70">
          No menu items yet. Click "Add Item" to create your first dish!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <div key={item.id} className="card bg-base-100 shadow-lg">
              {item.image_url && (
                <figure>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-48 w-full object-cover"
                  />
                </figure>
              )}
              <div className="card-body">
                <h4 className="card-title">
                  {item.name}
                  {item.is_vip_exclusive && (
                    <span className="badge badge-warning">VIP</span>
                  )}
                </h4>
                <p className="text-sm opacity-70">{item.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-lg font-bold text-primary">
                    ${parseFloat(item.price).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-warning">★</span>
                    <span>{item.average_rating?.toFixed(1) || "N/A"}</span>
                  </div>
                </div>
                <div className="text-sm opacity-60">
                  {item.total_orders || 0} orders
                </div>
                <div className="card-actions justify-end mt-2">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEditModal(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={actionLoading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Name *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Price *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input input-bordered"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Image URL</span>
                </label>
                <input
                  type="url"
                  className="input input-bordered"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="form-control mb-4">
                <label className="label cursor-pointer">
                  <span className="label-text">VIP Exclusive</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-warning"
                    checked={formData.is_vip_exclusive}
                    onChange={(e) => setFormData({ ...formData, is_vip_exclusive: e.target.checked })}
                  />
                </label>
              </div>

              <div className="modal-action">
                <button type="button" className="btn" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : editingItem ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </div>
  );
}
