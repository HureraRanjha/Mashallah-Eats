// frontend/src/pages/Menu.js
import React, { useEffect, useState } from "react";

export default function Menu() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/browse/");
        const data = await response.json();
        console.log("Backend returned:", data);
        setDishes(data.items); // <- FIXED
      } catch (error) {
        console.error("Error loading dishes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, []);

  const addToCart = (dish) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Check if item is already in cart
    const existingIndex = cart.findIndex(item => item.id === dish.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1; // Increase quantity if exists
    } else {
      cart.push({ 
        id: dish.id,
        name: dish.name,
        desc: dish.description,
        price: dish.price,
        quantity: 1
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`${dish.name} added to cart!`);
  };

  if (loading) {
    return <div className="p-6 text-center text-xl">Loading menu...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Our Menu</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map(dish => (
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
                <div className="badge badge-secondary">${dish.price}</div>
              </h2>

              <p>{dish.description}</p>

              <div className="card-actions justify-end mt-4">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => addToCart(dish)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
