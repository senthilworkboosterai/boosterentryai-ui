import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function HumanReview() {
  const [docs, setDocs] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState("");
  const [quickFilter, setQuickFilter] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // ✅ Load data
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
    fetchClients().then(() => fetchHumanReviewData(today, today));
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      const timer = setTimeout(() => fetchHumanReviewData(), 400);
      return () => clearTimeout(timer);
    }
  }, [filterClient, fromDate, toDate, quickFilter]);

  const fetchClients = async () => {
    try {
      const res = await api.get("/api/clients");
      setClients(res.data.data);
    } catch (err) {
      console.error("❌ Error fetching clients:", err);
    }
  };

  const fetchHumanReviewData = async (start = fromDate, end = toDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.append("client_id", filterClient);
      if (start) params.append("from_date", start);
      if (end) params.append("to_date", end);

      const res = await api.get(`/api/human_review?${params.toString()}`);
      setDocs(res.data.data || []);
      setMessage(`✅ ${res.data.data?.length || 0} document(s) requiring human review.`);
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setMessage("❌ Failed to load human review data.");
    } finally {
      setLoading(false);
    }
  };

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

  // ✅ Fix button — opens full new browser window (like screenshot #1)
  const handleFix = (doc) => {
    if (!doc?.id && !doc?.doc_id) {
      console.error("❌ Invalid document data:", doc);
      return;
    }

    const docId = doc.id ?? doc.doc_id;
    const url = `${window.location.origin}/human-review/fix/${docId}`;


    // Open in full browser window (not just a popup)
    window.open(url, "_blank");
  };

  const handleQuickFilter = (value) => {
    setQuickFilter(value);
    const today = new Date();
    let from = "",
      to = "";
    switch (value) {
      case "today":
        from = to = today.toISOString().split("T")[0];
        break;
      case "last7":
        const s7 = new Date(today);
        s7.setDate(today.getDate() - 7);
        from = s7.toISOString().split("T")[0];
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
        Human Review Dashboard
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Quick Filter</label>
          <select
            className="border rounded px-3 py-2"
            value={quickFilter}
            onChange={(e) => handleQuickFilter(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="last7">Last 7 Days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
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
        <p className="mb-4 text-sm text-indigo-600 animate-pulse">
          Loading documents for human review...
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
              <th className="p-3 border-b">Action</th>
            </tr>
          </thead>

          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center p-4 text-gray-500 italic"
                >
                  No documents require human review
                </td>
              </tr>
            ) : (
              docs.map((doc, index) => (
                <tr key={doc.id ?? doc.doc_id} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{index + 1}</td>
                  <td className="p-3 border-b">{doc.client_name}</td>
                  <td className="p-3 border-b text-indigo-600 underline">
                    {doc.doc_type}
                  </td>
                  <td className="p-3 border-b">
                    {formatDateTime(doc.uploaded_on)}
                  </td>
                  <td className="p-3 border-b">
                    <StatusBadge status={doc.data_extraction_status} />
                  </td>
                  <td className="p-3 border-b">
                    <StatusBadge status={doc.erp_entry_status} />
                  </td>
                  <td className="p-3 border-b">
                    <button
                      onClick={() => handleFix(doc)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm"
                    >
                      Fix
                    </button>
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

