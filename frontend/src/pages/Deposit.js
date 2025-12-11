import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { API_BASE_URL } from "../config";

// Stripe publishable key (safe to be public)
const stripePromise = loadStripe("pk_test_51SbQtl2Rn4xRXd2vnoPe1SLsk9KsCAPSbmWKfFtWBkvyNXTyMYWc1SVsTBcfWEN3uR2W899k0lHG3J3rRzL7YYvb00rxTyigzx");

// Card input styling
const cardStyle = {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
      "::placeholder": { color: "#aab7c4" },
    },
    invalid: { color: "#9e2146" },
  },
  hidePostalCode: true,
};

function DepositForm() {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const presetAmounts = [10, 25, 50, 100];

  const handleDeposit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!stripe || !elements) {
      setErrorMsg("Stripe not loaded yet");
      return;
    }

    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create payment intent on backend
      const intentResponse = await fetch(`${API_BASE_URL}/deposit/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: depositAmount }),
      });

      const intentData = await intentResponse.json();

      if (!intentResponse.ok) {
        setErrorMsg(intentData.error || "Failed to create payment");
        setLoading(false);
        return;
      }

      // Step 2: Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        intentData.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Step 3: Confirm deposit on backend
        const confirmResponse = await fetch(`${API_BASE_URL}/deposit/confirm/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ payment_intent_id: paymentIntent.id }),
        });

        const confirmData = await confirmResponse.json();

        if (confirmResponse.ok) {
          setSuccessMsg(`$${confirmData.amount} added! New balance: $${confirmData.new_balance}`);
          setTimeout(() => navigate("/profile"), 2000);
        } else {
          setErrorMsg(confirmData.error || "Payment succeeded but confirmation failed");
        }
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h2 className="text-3xl font-bold mb-6 text-center">Add Funds</h2>

      <div className="card bg-base-100 shadow-xl">
        <form className="card-body" onSubmit={handleDeposit}>

          {errorMsg && (
            <div className="alert alert-error py-2">
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success py-2">
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="mb-4">
            <label className="label">
              <span className="label-text">Quick Select</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {presetAmounts.map(preset => (
                <button
                  key={preset}
                  type="button"
                  className={`btn btn-sm ${amount === String(preset) ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setAmount(String(preset))}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount ($)</span>
            </label>
            <input
              type="number"
              placeholder="Enter amount"
              className="input input-bordered"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              step="0.01"
            />
          </div>

          {/* Stripe Card Element */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">Card Details</span>
            </label>
            <div className="p-3 border rounded-lg bg-white">
              <CardElement options={cardStyle} />
            </div>
            <label className="label">
              <span className="label-text-alt text-info">Test card: 4242 4242 4242 4242, any future date, any CVC</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="form-control mt-6">
            <button
              type="submit"
              className={`btn btn-primary ${loading ? "loading" : ""}`}
              disabled={loading || !stripe || !amount}
            >
              {loading ? "Processing..." : `Deposit $${amount || "0"}`}
            </button>
          </div>

          <p className="text-xs text-center opacity-70 mt-4">
            Payments processed securely via Stripe
          </p>
        </form>
      </div>
    </div>
  );
}

// Wrap with Stripe Elements provider
export default function Deposit() {
  return (
    <Elements stripe={stripePromise}>
      <DepositForm />
    </Elements>
  );
}
