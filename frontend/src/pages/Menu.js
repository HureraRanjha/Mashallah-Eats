// frontend/src/pages/Menu.js
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function Menu() {
  const { user, getUserType } = useAuth();
  const [dishes, setDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Recommendations
  const [recommendations, setRecommendations] = useState(null);
  const [topChefs, setTopChefs] = useState([]);

  // Cart feedback
  const [addedToCart, setAddedToCart] = useState(null);

  const userType = getUserType();
  const canSeeVipDishes = userType === "vip" || userType === "manager" || userType === "chef";
  const canOrder = userType === "registered" || userType === "vip";

  useEffect(() => {
    fetchDishes();
    fetchRecommendations();
    fetchTopChefs();
  }, []);

  useEffect(() => {
    // Filter dishes: hide VIP exclusive dishes for non-VIP/non-manager users
    if (!searchQuery.trim()) {
      const filtered = dishes.filter(dish => !dish.is_vip_exclusive || canSeeVipDishes);
      setFilteredDishes(filtered);
    }
  }, [dishes, searchQuery, canSeeVipDishes]);

  const fetchDishes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/browse/`, {
        credentials: "include",
      });
      const data = await response.json();
      setDishes(data.items || []);
      setFilteredDishes(data.items || []);
    } catch (error) {
      console.error("Error loading dishes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/`, {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setRecommendations(data);
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
  };

  const fetchTopChefs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/top-chefs/`);
      const data = await response.json();
      if (response.ok) {
        setTopChefs(data.chefs || []);
      }
    } catch (error) {
      console.error("Error loading top chefs:", error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      const filtered = dishes.filter(dish => !dish.is_vip_exclusive || canSeeVipDishes);
      setFilteredDishes(filtered);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        // Filter VIP exclusive dishes for non-VIP/non-manager users
        const results = (data.results || []).filter(dish => !dish.is_vip_exclusive || canSeeVipDishes);
        setFilteredDishes(results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    const filtered = dishes.filter(dish => !dish.is_vip_exclusive || canSeeVipDishes);
    setFilteredDishes(filtered);
  };

  const addToCart = (dish) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Ensure price is a number
    const price = typeof dish.price === 'string' ? parseFloat(dish.price) : dish.price;

    const existingIndex = cart.findIndex(item => item.id === dish.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: dish.id,
        name: dish.name,
        desc: dish.description,
        price: price,
        quantity: 1
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    // Show feedback toast
    setAddedToCart(dish.id);
    setTimeout(() => setAddedToCart(null), 1500);
  };

  if (loading) {
    return <div className="p-6 text-center text-xl">Loading menu...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Top Chefs Section */}
      {topChefs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Our Top Chefs</h3>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {topChefs.map(chef => (
              <div key={chef.id} className="flex-shrink-0 text-center">
                <div className="avatar">
                  <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img
                      src={chef.profile_picture || "https://via.placeholder.com/80?text=Chef"}
                      alt={chef.name}
                    />
                  </div>
                </div>
                <p className="font-semibold mt-2">{chef.name}</p>
                <div className="flex items-center justify-center gap-1 text-sm">
                  <span className="text-warning">★</span>
                  <span>{chef.average_rating > 0 ? chef.average_rating.toFixed(1) : "N/A"}</span>
                </div>
                <p className="text-xs opacity-70">{chef.total_orders} orders</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations && (
        <div className="mb-8">
          {recommendations.personalized?.length > 0 ? (
            <>
              <h3 className="text-xl font-bold mb-4">Recommended For You</h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {recommendations.personalized.map(dish => (
                  <div key={dish.id} className="card card-compact bg-base-100 shadow-md w-48 flex-shrink-0">
                    <figure><img src={dish.image_url} alt={dish.name} className="h-24 w-full object-cover" /></figure>
                    <div className="card-body">
                      <h4 className="font-semibold text-sm">{dish.name}</h4>
                      <p className="text-primary font-bold">${parseFloat(dish.price).toFixed(2)}</p>
                      {canOrder && (
                        <button
                          className={`btn btn-xs ${addedToCart === dish.id ? "btn-success" : "btn-primary"} transition-all`}
                          onClick={() => addToCart(dish)}
                        >
                          {addedToCart === dish.id ? "Added!" : "Add"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-4">Popular Dishes</h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {recommendations.most_popular?.map(dish => (
                  <div key={dish.id} className="card card-compact bg-base-100 shadow-md w-48 flex-shrink-0">
                    <figure><img src={dish.image_url} alt={dish.name} className="h-24 w-full object-cover" /></figure>
                    <div className="card-body">
                      <h4 className="font-semibold text-sm">{dish.name}</h4>
                      <p className="text-primary font-bold">${parseFloat(dish.price).toFixed(2)}</p>
                      {canOrder && (
                        <button
                          className={`btn btn-xs ${addedToCart === dish.id ? "btn-success" : "btn-primary"} transition-all`}
                          onClick={() => addToCart(dish)}
                        >
                          {addedToCart === dish.id ? "Added!" : "Add"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Our Menu</h2>
        <form onSubmit={handleSearch} className="join">
          <input
            type="text"
            placeholder="Search dishes..."
            className="input input-bordered join-item w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className={`btn btn-primary join-item ${searching ? "loading" : ""}`}>
            {!searching && "Search"}
          </button>
          {searchQuery && (
            <button type="button" className="btn btn-ghost join-item" onClick={clearSearch}>
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <p className="mb-4 text-sm opacity-70">
          {filteredDishes.length} result(s) for "{searchQuery}"
        </p>
      )}

      {/* Menu Grid */}
      {filteredDishes.length === 0 ? (
        <div className="text-center py-12 opacity-70">
          <p className="text-xl">No dishes found</p>
          {searchQuery && <button className="btn btn-link" onClick={clearSearch}>Clear search</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDishes.map(dish => (
            <div
              key={dish.id}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200"
            >
              <figure>
                <img
                  src={dish.image_url}
                  alt={dish.name}
                  className="w-full h-48 object-cover"
                />
              </figure>

              <div className="card-body">
                <h2 className="card-title justify-between">
                  {dish.name}
                  <div className="badge badge-secondary">${parseFloat(dish.price).toFixed(2)}</div>
                </h2>

                <p>{dish.description}</p>

                {/* Rating */}
                {dish.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-warning">★</span>
                    <span>{parseFloat(dish.average_rating).toFixed(1)}</span>
                  </div>
                )}

                {/* VIP Badge */}
                {dish.is_vip_exclusive && (
                  <div className="badge badge-warning">VIP Only</div>
                )}

                {canOrder && (
                  <div className="card-actions justify-end mt-4">
                    <button
                      className={`btn btn-sm ${addedToCart === dish.id ? "btn-success" : "btn-primary"} transition-all duration-200`}
                      onClick={() => addToCart(dish)}
                    >
                      {addedToCart === dish.id ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Added!
                        </>
                      ) : (
                        "Add to Cart"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast notification for added to cart */}
      {addedToCart && (
        <div className="toast toast-end toast-bottom">
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Item added to cart!</span>
          </div>
        </div>
      )}
    </div>
  );
}
