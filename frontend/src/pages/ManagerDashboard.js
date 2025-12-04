import React from 'react';

export default function ManagerDashboard() {
  // hardcoded dummy stats
  const stats = [
    { id: 1, title: "Total Orders", value: 128 },
    { id: 2, title: "Total Revenue", value: "$3,450" },
    { id: 3, title: "Active Users", value: 72 },
    { id: 4, title: "Pending Orders", value: 12 },
  ];

  // Dummy recent orders
  const orders = [
    { id: 1, customer: "Ahmed", item: "50 Nuggets", amount: "$12.99", status: "Delivered" },
    { id: 2, customer: "Hurera", item: "Butter Chicken", amount: "$14.99", status: "Pending" },
    { id: 3, customer: "Mahir", item: "Spicy Beef Bulgogi", amount: "$16.50", status: "Delivered" },
  ];

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Manager Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.id} className="card bg-base-100 shadow-xl p-4 text-center">
            <h3 className="text-lg font-bold">{stat.title}</h3>
            <p className="text-2xl mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders Table */}
      <div className="card bg-base-100 shadow-xl p-4">
        <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Customer</th>
                <th>Item</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.customer}</td>
                  <td>{order.item}</td>
                  <td>{order.amount}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}