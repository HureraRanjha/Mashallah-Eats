// frontend/src/pages/Cart.js
import React from 'react';

export default function Cart() {
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h2 className="text-3xl font-bold mb-6">Your Cart</h2>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cart Items List */}
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
              {/* Dummy Item 1 */}
              <tr>
                <td>
                  <div className="font-bold">Ahmed's Nuggets</div>
                  <div className="text-sm opacity-50">50 pieces</div>
                </td>
                <td>
                  <div className="join">
                    <button className="btn btn-xs join-item">-</button>
                    <button className="btn btn-xs join-item">1</button>
                    <button className="btn btn-xs join-item">+</button>
                  </div>
                </td>
                <td>$12.99</td>
                <td><button className="btn btn-ghost btn-xs text-error">x</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Order Summary Box */}
        <div className="w-full md:w-80">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Summary</h3>
              <div className="flex justify-between py-2">
                <span>Subtotal</span>
                <span>$12.99</span>
              </div>
              <div className="flex justify-between py-2 text-success">
                <span>VIP Discount</span>
                <span>-$0.00</span>
              </div>
              <div className="divider my-1"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>$12.99</span>
              </div>
              <div className="card-actions mt-4">
                <button className="btn btn-primary btn-block">Checkout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}