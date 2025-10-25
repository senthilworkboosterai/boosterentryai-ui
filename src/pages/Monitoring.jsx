import { useEffet, useState } from "react";
import api from "../api/axios";

export default function Monitoring() {
  const [docs, setDocs] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [quickFilter, setQuickFilter] = useState("today"); // ✅ default to today
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ On mount: set today’s date, fetch clients, and initial data
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
    setQuickFilter("today");
    fetchClients().then(() => {
      fetchMonitoringData(today, today); // 🔥 load today's data right away
    });
  }, []);

  // ✅ Auto-refresh on filter change (after first load)
  useEffect(() => {
    if (fromDate && toDate) {
      const timer = setTimeout(() => fetchMonitoringData(), 400);
      return () => clearTimeout(timer);
    }
  }, [filterClient, filterStatus, fromDate, toDate, quickFilter]);

  // --- Fetch Clients ---
  const fetchClients = async () => {
    try {
      const res = await api.get("/api/clients");
      setClients(res.data.data);
    } catch (err) {
      console.error("❌ Error fetching clients:", err);
    }
  };

  // --- Fetch Monitoring Data ---
  const fetchMonitoringData = async (startDate = fromDate, endDate = toDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.append("client_id", filterClient);
      if (filterStatus) params.append("status", filterStatus);
      if (startDate) params.append("from_date", startDate);
      if (endDate) params.append("to_date", endDate);

      const res = await api.get(`/api/monitoring?${params.toString()}`);
      setDocs(res.data.data || []);
      setMessage(`✅ Loaded ${res.data.data?.length || 0} document(s).`);
    } catch (err) {
      console.error("❌ Error fetching monitoring data:", err);
      setMessage("❌ Failed to load monitoring data.");
    } finally {
      setLoading(false);
    }
  };

  // --- Format Timestamp ---
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isNaN(date)) return timestamp;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // --- Status Badge ---
  const StatusBadge = ({ status }) => {
    let colorClass = "bg-gray-100 text-gray-700";
    if (status?.toLowerCase().includes("success") || status === "Completed")
      colorClass = "bg-green-100 text-green-700";
    else if (status?.toLowerCase().includes("progress"))
      colorClass = "bg-yellow-100 text-yellow-700";
    else if (status?.toLowerCase().includes("failed"))
      colorClass = "bg-red-100 text-red-700";
    else if (status?.toLowerCase().includes("not started"))
      colorClass = "bg-gray-100 text-gray-600";

    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${colorClass}`}>
        {status}
      </span>
    );
  };

  // --- Quick Filter Handler ---
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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-indigo-700 mb-6">
        Document Monitoring Dashboard
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
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

        {/* Date Inputs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={quickFilter !== ""}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            disabled={quickFilter !== ""}
          />
        </div>

        {/* Client Filter */}
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

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="border rounded px-3 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Loading / Message */}
      {loading ? (
        <p className="mb-4 text-sm text-indigo-600 animate-pulse">
          Loading today's data...
        </p>
      ) : (
        message && <p className="mb-4 text-sm text-gray-700">{message}</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-indigo-50 text-gray-700 text-left">
              <th className="p-3 border-b">#</th>
              <th className="p-3 border-b">Client</th>
              <th className="p-3 border-b">Document Type</th>
              <th className="p-3 border-b">Uploaded On</th>
              <th className="p-3 border-b">Data Extraction</th>
              <th className="p-3 border-b">ERP Entry</th>
              <th className="p-3 border-b">Overall Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500 italic">
                  No records found
                </td>
              </tr>
            ) : (
              docs.map((doc, index) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{index + 1}</td>
                  <td className="p-3 border-b">{doc.client_name}</td>
                
<td className="p-3 border-b text-indigo-600 underline cursor-pointer">
  <a
    href={`${window.location.origin}/invoice/${doc.id}`}
    onClick={(e) => {
      e.preventDefault();
    console.log("📂 File URL:",`${window.location.origin}/invoice/${doc.id}`);

      // ✅ Open invoice page in a new standalone full window (like human review)
      const id = doc.id || doc.doc_id;
      const width = 1300;
      const height = 900;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        `${window.location.origin}/invoice/${id}`,
        "_blank",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );
    }}
  >
    {doc.doc_type}
  </a>
</td>



                  <td className="p-3 border-b">{formatDateTime(doc.uploaded_on)}</td>
                  <td className="p-3 border-b">
                    <StatusBadge status={doc.data_extraction_status} />
                  </td>
                  <td className="p-3 border-b">
                    <StatusBadge status={doc.erp_entry_status} />
                  </td>
                  <td className="p-3 border-b">
                    <StatusBadge status={doc.overall_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
