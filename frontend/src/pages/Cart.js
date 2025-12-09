// frontend/src/pages/Cart.js
import React, { useState, useEffect } from "react";

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [vipDiscount, setVipDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);

    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
  }, []);

  useEffect(() => {
    calculateTotals(cartItems);
  }, [cartItems, user]);

  const calculateTotals = (items) => {
    const sub = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setSubtotal(sub);

    const discount = user?.user_type === "vip" ? sub * 0.05 : 0;
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

    if (!user) {
      setErrorMsg("You must be logged in to place an order");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMsg("Your cart is empty");
      return;
    }

    // Low balance check
    if (user.balance !== undefined && total > user.balance) {
      setErrorMsg("You don’t have enough balance to place this order.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/order/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          customer_id: user.user?.customer_profile_id || user.customer_profile_id,
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
      setSuccessMsg("Order placed successfully!");
      calculateTotals([]);
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error. Try again.");
    }
  };

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
              <div className="flex justify-between py-2 text-success">
                <span>VIP Discount</span>
                <span>-${vipDiscount.toFixed(2)}</span>
              </div>
              <div className="divider my-1"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* Low balance warning */}
              {user?.balance !== undefined && total > user.balance && (
                <div className="alert alert-warning mb-2">
                  Warning: You don’t have enough balance!
                </div>
              )}

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
