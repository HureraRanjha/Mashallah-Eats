import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function NewPost() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [topicType, setTopicType] = useState("general");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // For selecting specific chef/dish/delivery
  const [chefs, setChefs] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [deliveryPeople, setDeliveryPeople] = useState([]);
  const [selectedRelated, setSelectedRelated] = useState("");

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      // Fetch chefs and delivery people
      const empRes = await fetch(`${API_BASE_URL}/feedback-targets/`, {
        credentials: "include",
      });
      const empData = await empRes.json();
      if (empRes.ok) {
        setChefs(empData.chefs || []);
        setDeliveryPeople(empData.delivery_people || []);
      }

      // Fetch dishes
      const dishRes = await fetch(`${API_BASE_URL}/browse/`, {
        credentials: "include",
      });
      const dishData = await dishRes.json();
      if (dishRes.ok) {
        setDishes(dishData.items || []);
      }
    } catch (error) {
      console.error("Failed to load options:", error);
    }
  };

  const submitTopic = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("Please enter a title");
      return;
    }

    setLoading(true);

    try {
      const body = {
        title,
        topic_type: topicType,
      };

      // Add related entity based on topic type
      if (topicType === "chef" && selectedRelated) {
        body.related_chef = parseInt(selectedRelated);
      } else if (topicType === "dish" && selectedRelated) {
        body.related_dish = parseInt(selectedRelated);
      } else if (topicType === "delivery" && selectedRelated) {
        body.related_delivery = parseInt(selectedRelated);
      }

      const res = await fetch(`${API_BASE_URL}/topic/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        navigate("/discussion");
      } else {
        setErrorMsg(data.error || "Failed to create topic. Make sure you're logged in.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRelatedOptions = () => {
    switch (topicType) {
      case 'chef':
        return chefs.map(c => ({ id: c.id, name: c.username }));
      case 'dish':
        return dishes.map(d => ({ id: d.id, name: d.name }));
      case 'delivery':
        return deliveryPeople.map(d => ({ id: d.id, name: d.username }));
      default:
        return [];
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h2 className="text-2xl font-bold mb-4">Create New Topic</h2>

      <div className="card bg-base-100 shadow-xl">
        <form className="card-body" onSubmit={submitTopic}>
          {errorMsg && (
            <div className="alert alert-error py-2 mb-4">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Topic Type */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Topic Type</span>
            </label>
            <select
              className="select select-bordered"
              value={topicType}
              onChange={(e) => {
                setTopicType(e.target.value);
                setSelectedRelated("");
              }}
            >
              <option value="general">General Discussion</option>
              <option value="chef">About a Chef</option>
              <option value="dish">About a Dish</option>
              <option value="delivery">About Delivery</option>
            </select>
          </div>

          {/* Related Entity Selection */}
          {topicType !== "general" && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  {topicType === "chef" && "Select Chef"}
                  {topicType === "dish" && "Select Dish"}
                  {topicType === "delivery" && "Select Delivery Person"}
                </span>
              </label>
              <select
                className="select select-bordered"
                value={selectedRelated}
                onChange={(e) => setSelectedRelated(e.target.value)}
              >
                <option value="">-- Optional --</option>
                {getRelatedOptions().map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Topic Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="What do you want to discuss?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="form-control mt-6">
            <button
              type="submit"
              className={`btn btn-primary ${loading ? "loading" : ""}`}
              disabled={loading || !title.trim()}
            >
              {loading ? "Creating..." : "Create Topic"}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={() => navigate("/discussion")}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
