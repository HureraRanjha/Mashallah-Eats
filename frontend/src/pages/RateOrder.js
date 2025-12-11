import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function RateOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Ratings state
  const [foodRatings, setFoodRatings] = useState({});
  const [deliveryRating, setDeliveryRating] = useState(0);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/history/`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        const foundOrder = data.orders?.find(o => o.order_id === parseInt(orderId));
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setErrorMsg("Order not found");
        }
      } else {
        setErrorMsg(data.error || "Failed to load order");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleFoodRating = (itemId, rating) => {
    setFoodRatings(prev => ({ ...prev, [itemId]: rating }));
  };

  const submitFoodRating = async (orderItemId) => {
    const rating = foodRatings[orderItemId];
    if (!rating) {
      setErrorMsg("Please select a rating");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/review_food/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_item: orderItemId,
          rating: rating,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Food rating submitted!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDeliveryRating = async () => {
    if (!deliveryRating) {
      setErrorMsg("Please select a delivery rating");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/review_driver/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order: orderId,
          rating: deliveryRating,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Delivery rating submitted!");
        setTimeout(() => navigate("/profile"), 2000);
      } else {
        setErrorMsg(data.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`text-2xl ${star <= value ? "text-warning" : "text-gray-300"}`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );

  if (loading) {
    return <div className="p-6 text-center">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center text-error">{errorMsg || "Order not found"}</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h2 className="text-3xl font-bold mb-6">Rate Your Order</h2>

      {errorMsg && (
        <div className="alert alert-error mb-4">
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success mb-4">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Order Info */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title">Order #{order.order_id}</h3>
          <p className="opacity-70">{order.date}</p>
          <p>{order.items_summary}</p>
          <div className="badge badge-info">{order.status}</div>
        </div>
      </div>

      {/* Food Ratings */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title">Rate Your Food</h3>
          <p className="text-sm opacity-70 mb-4">How was the quality of your food?</p>

          {/* Since we don't have individual items from history, show general food rating */}
          <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <span className="font-semibold">Food Quality</span>
            <div className="flex items-center gap-4">
              <StarRating
                value={foodRatings["general"] || 0}
                onChange={(rating) => handleFoodRating("general", rating)}
              />
              <button
                className={`btn btn-sm btn-primary ${submitting ? "loading" : ""}`}
                onClick={() => submitFoodRating("general")}
                disabled={submitting || !foodRatings["general"]}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Rating */}
      {order.is_delivered && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="card-title">Rate Your Delivery</h3>
            <p className="text-sm opacity-70 mb-4">How was the delivery experience?</p>

            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <span className="font-semibold">Delivery Service</span>
              <div className="flex items-center gap-4">
                <StarRating
                  value={deliveryRating}
                  onChange={setDeliveryRating}
                />
                <button
                  className={`btn btn-sm btn-primary ${submitting ? "loading" : ""}`}
                  onClick={submitDeliveryRating}
                  disabled={submitting || !deliveryRating}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button className="btn btn-outline" onClick={() => navigate("/profile")}>
          Back to Profile
        </button>
      </div>
    </div>
  );
}
