// frontend/src/pages/Menu.js
import React from 'react';

export default function Menu() {
  // Hardcoded data for the skeleton (Foundation Phase requirement)
  const dishes = [
    { id: 1, name: "Ahmed's 50 Piece Nuggets", price: 12.99, desc: "Perfect for protein gainz", img: "https://placehold.co/400x225" },
    { id: 2, name: "Butter Chicken", price: 14.99, desc: "Rich and creamy homemade sauce", img: "https://placehold.co/400x225" },
    { id: 3, name: "Spicy Beef Bulgogi", price: 16.50, desc: "Marinated grilled beef", img: "https://placehold.co/400x225" },
    { id: 4, name: "Shrimp Fried Rice", price: 11.99, desc: "Classic wok-fried rice", img: "https://placehold.co/400x225" },
  ];

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Our Menu</h2>
      
      {/* Grid Layout for Menu Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map((dish) => (
          <div key={dish.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200">
            <figure><img src={dish.img} alt={dish.name} className="w-full h-48 object-cover" /></figure>
            <div className="card-body">
              <h2 className="card-title justify-between">
                {dish.name}
                <div className="badge badge-secondary">${dish.price}</div>
              </h2>
              <p>{dish.desc}</p>
              <div className="card-actions justify-end mt-4">
                <button className="btn btn-primary btn-sm">Add to Cart</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}