import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

export default function Cart() {
  const { user, getUserType } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [vipDiscount, setVipDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCartWithFreshPrices();
  }, []);

  const loadCartWithFreshPrices = async () => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];

    if (storedCart.length === 0) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch current menu items to get fresh prices
      const response = await fetch(`${API_BASE_URL}/browse/`, {
        credentials: "include",
      });
      const data = await response.json();
      const menuItems = data.items || [];

      // Update cart items with fresh prices from backend
      const updatedCart = storedCart.map(cartItem => {
        const menuItem = menuItems.find(item => item.id === cartItem.id);
        if (menuItem) {
          return {
            ...cartItem,
            name: menuItem.name,
            desc: menuItem.description,
            price: parseFloat(menuItem.price),
          };
        }
        return {
          ...cartItem,
          price: parseFloat(cartItem.price),
        };
      }).filter(item => {
        // Remove items that no longer exist in the menu
        const exists = menuItems.some(menuItem => menuItem.id === item.id);
        return exists;
      });

      // Update localStorage with fresh data
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      setCartItems(updatedCart);
    } catch (error) {
      console.error("Failed to fetch fresh prices:", error);
      // Fallback to stored prices if fetch fails
      const normalizedCart = storedCart.map(item => ({
        ...item,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price
      }));
      setCartItems(normalizedCart);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateTotals(cartItems);
  }, [cartItems, user]);

  const calculateTotals = (items) => {
    const sub = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setSubtotal(sub);

    const isVip = getUserType() === "vip";
    const discount = isVip ? sub * 0.05 : 0;
    setVipDiscount(discount);

    setTotal(sub - discount);
  };

  const increaseQty = (id) => {
    const updated = cartItems.map(item =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const decreaseQty = (id) => {
    const updated = cartItems.map(item =>
      item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
    );
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const removeItem = (id) => {
    const updated = cartItems.filter(item => item.id !== id);
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const handleCheckout = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (cartItems.length === 0) {
      setErrorMsg("Your cart is empty");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          customer_id: user?.user?.customer_profile_id || user?.customer_profile_id,
          items: cartItems.map(item => ({
            menu_item_id: item.id,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Order failed");
        return;
      }

      setCartItems([]);
      localStorage.removeItem("cart");
      setSuccessMsg(data.message || "Order placed successfully!");
      calculateTotals([]);
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <h2 className="text-3xl font-bold mb-6">Your Cart</h2>
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-2 opacity-70">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h2 className="text-3xl font-bold mb-6">Your Cart</h2>

      {errorMsg && <div className="alert alert-error mb-4">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success mb-4">{successMsg}</div>}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1 overflow-x-auto">
          <table className="table w-full bg-base-100 shadow-lg rounded-box">
            <thead>
              <tr className="bg-base-200">
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm opacity-50">{item.desc}</div>
                  </td>
                  <td>
                    <div className="join">
                      <button className="btn btn-xs join-item" onClick={() => decreaseQty(item.id)}>-</button>
                      <button className="btn btn-xs join-item">{item.quantity}</button>
                      <button className="btn btn-xs join-item" onClick={() => increaseQty(item.id)}>+</button>
                    </div>
                  </td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => removeItem(item.id)}>x</button>
                  </td>
                </tr>
              ))}
              {cartItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-gray-500 py-4">
                    Your cart is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Order Summary */}
        <div className="w-full md:w-80">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Summary</h3>
              <div className="flex justify-between py-2">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {getUserType() === "vip" && (
                <div className="flex justify-between py-2 text-success">
                  <span>VIP Discount (5%)</span>
                  <span>-${vipDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="divider my-1"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="card-actions mt-4">
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleCheckout}
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
