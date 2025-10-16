import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios"; // Ensure baseURL = http://127.0.0.1:5050

export default function FixReview() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Load the document and extracted/corrected JSON
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/human_review/${id}`);
        const data = res.data.data;

        setDoc(data.doc);

        // Prefer corrected_data if available
        const jsonData =
          data.corrected_data && Object.keys(data.corrected_data).length > 0
            ? data.corrected_data
            : data.extracted_data;

        setFormData(jsonData || {});
        setMessage("");
      } catch (err) {
        console.error("❌ Error fetching doc:", err);
        setMessage("❌ Failed to load document details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id]);

  // ✅ Handle input change
  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // ✅ Save corrected data
  const handleSave = async () => {
    try {
      const res = await api.post(`/api/human_review/update_corrected/${id}`, {
        corrected_json: formData,
      });
      setMessage(`✅ ${res.data.message}`);
    } catch (err) {
      console.error("❌ Save failed:", err);
      setMessage("❌ Failed to save changes.");
    }
  };

  // ✅ Handle UI states
  if (loading)
    return (
      <div className="p-10 text-gray-600 text-center text-lg animate-pulse">
        Loading document...
      </div>
    );

  if (!doc)
    return (
      <div className="p-10 text-gray-600 text-center text-lg">
        No document found.
      </div>
    );

  // ✅ Status badge component
  const StatusBadge = ({ label, status }) => {
    let color =
      status === "Completed"
        ? "bg-green-100 text-green-700"
        : status === "Failed"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700";
    return (
      <span
        className={`px-3 py-1 rounded text-sm font-medium ${color} border border-gray-200`}
      >
        {label}: {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="bg-white shadow rounded-xl p-5 mb-6 flex flex-wrap items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-indigo-700 mb-2">
            {doc.client_name || "Unknown Client"} – {doc.doc_type || "Document"}
          </h2>
          <p className="text-sm text-gray-600">
            <strong>Uploaded On:</strong> {doc.uploaded_on || "—"}
          </p>
        </div>

        <div className="flex gap-3 mt-3 md:mt-0">
          <StatusBadge label="Data Extraction" status={doc.data_extraction_status} />
          <StatusBadge label="ERP Entry" status={doc.erp_entry_status} />
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* LEFT SIDE - PDF Viewer */}
        <div className="w-full md:w-1/2 bg-white shadow-lg rounded-xl p-4">
          <h3 className="text-indigo-700 font-semibold text-lg mb-3">
            Document Preview
          </h3>

          {doc.file_url ? (
            <iframe
              src={doc.file_url}
              className="w-full h-[80vh] border rounded-lg"
              title="PDF Preview"
            ></iframe>
          ) : (
            <p className="text-sm text-gray-500 text-center italic">
              PDF not available.
            </p>
          )}
        </div>

        {/* RIGHT SIDE - JSON Editor */}
        <div className="w-full md:w-1/2 bg-white shadow-lg rounded-xl p-6 overflow-y-auto">
          <h3 className="text-indigo-700 font-semibold text-lg mb-4">
            Extracted Data (Editable)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(formData).map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key}
                </label>
                <input
                  type="text"
                  value={formData[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="mt-6 bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 transition"
          >
            Save Changes
          </button>

          {message && (
            <p className="mt-3 text-sm text-gray-600 font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
