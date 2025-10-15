import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [chartData, setChartData] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState("");
  const [quickFilter, setQuickFilter] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Initialize with today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
    fetchClients();
    fetchDashboardData(today, today);
  }, []);

  // ✅ Refetch when filters change
  useEffect(() => {
    if (fromDate && toDate) {
      const timer = setTimeout(() => fetchDashboardData(fromDate, toDate), 400);
      return () => clearTimeout(timer);
    }
  }, [filterClient, fromDate, toDate, quickFilter]);

  // ✅ Fetch clients
  const fetchClients = async () => {
    try {
      const res = await api.get("/api/clients");
      setClients(res.data.data);
    } catch (err) {
      console.error("❌ Error fetching clients:", err);
    }
  };

  // ✅ Fetch dashboard summary
  const fetchDashboardData = async (startDate, endDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.append("client_id", filterClient);
      if (startDate) params.append("from_date", startDate);
      if (endDate) params.append("to_date", endDate);

      const res = await api.get(`/api/dashboard_summary?${params.toString()}`);
      console.log("📊 Dashboard API Response:", res.data);

      if (res.data.status === "success") {
        setSummary(res.data.summary);
        setChartData(res.data.trend);
        setRecentDocs(res.data.recent);
      }
    } catch (err) {
      console.error("❌ Error fetching dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle quick filters
  const handleQuickFilter = (value) => {
    setQuickFilter(value);
    const today = new Date();
    let from = "";
    let to = "";

    switch (value) {
      case "today":
        from = to = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        from = to = y.toISOString().split("T")[0];
        break;
      case "last7":
        const s7 = new Date(today);
        s7.setDate(today.getDate() - 7);
        from = s7.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "thisMonth":
        const sm = new Date(today.getFullYear(), today.getMonth(), 1);
        from = sm.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "lastMonth":
        const slm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const elm = new Date(today.getFullYear(), today.getMonth(), 0);
        from = slm.toISOString().split("T")[0];
        to = elm.toISOString().split("T")[0];
        break;
      case "last30":
        const s30 = new Date(today);
        s30.setDate(today.getDate() - 30);
        from = s30.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "last90":
        const s90 = new Date(today);
        s90.setDate(today.getDate() - 90);
        from = s90.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      default:
        from = "";
        to = "";
    }

    setFromDate(from);
    setToDate(to);
  };

  const StatusBadge = ({ status }) => {
    let colorClass = "bg-gray-100 text-gray-700";
    if (status?.toLowerCase().includes("completed"))
      colorClass = "bg-green-100 text-green-700";
    else if (status?.toLowerCase().includes("progress"))
      colorClass = "bg-yellow-100 text-yellow-700";
    else if (status?.toLowerCase().includes("failed"))
      colorClass = "bg-red-100 text-red-700";
    else if (status?.toLowerCase().includes("human"))
      colorClass = "bg-indigo-100 text-indigo-700";

    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-indigo-700 mb-6">
        Dashboard Overview
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 items-end">
        {/* Quick Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quick Filter
          </label>
          <select
            className="border rounded px-3 py-2"
            value={quickFilter}
            onChange={(e) => handleQuickFilter(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
          </select>
        </div>

        {/* From / To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {/* Client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <select
            className="border rounded px-3 py-2"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading dashboard data...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
            {[
              { title: "Total Documents", value: summary.total_docs, color: "bg-indigo-100 text-indigo-700" },
              { title: "In Progress", value: summary.in_progress, color: "bg-yellow-100 text-yellow-700" },
              { title: "Completed", value: summary.completed, color: "bg-green-100 text-green-700" },
              { title: "Failed", value: summary.failed, color: "bg-red-100 text-red-700" },
              { title: "Human Review", value: summary.human_review, color: "bg-purple-100 text-purple-700" },
            ].map((card, i) => (
              <div
                key={i}
                className={`rounded-2xl shadow p-4 flex flex-col justify-center items-center ${card.color}`}
              >
                <p className="text-sm font-medium">{card.title}</p>
                <h3 className="text-3xl font-semibold">{card.value ?? 0}</h3>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white shadow rounded-lg p-6 mb-10">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Documents Processed Over Time
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="documents" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Recent Uploads
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-indigo-50 text-gray-700 text-left">
                    <th className="p-3 border-b">#</th>
                    <th className="p-3 border-b">Client</th>
                    <th className="p-3 border-b">Document Type</th>
                    <th className="p-3 border-b">Uploaded On</th>
                    <th className="p-3 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center p-4 text-gray-500 italic">
                        No recent uploads
                      </td>
                    </tr>
                  ) : (
                    recentDocs.map((doc, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 border-b">{i + 1}</td>
                        <td className="p-3 border-b">{doc.client}</td>
                        <td className="p-3 border-b">{doc.doc_type}</td>
                        <td className="p-3 border-b">
                          {new Date(doc.uploaded_on).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td className="p-3 border-b">
                          <StatusBadge status={doc.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
