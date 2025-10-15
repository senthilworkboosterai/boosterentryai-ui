import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function FixReview() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");

  // 🧩 Load dummy data (for UI testing)
  useEffect(() => {
    setTimeout(() => {
      setDoc({
        id,
        client_name: "UltraTechCement",
        doc_type: "Invoice",
        uploaded_on: "Oct 15, 3:40 PM",
        data_extraction_status: "Completed",
        erp_entry_status: "Failed",
        file_name: "UltraTechCement_Invoice_20251016_004946_369267.pdf",
      });

      setFormData({
        Branch: "ARAKKONAM",
        Date: "2025-08-16",
        ConsignmentNo: "4486",
        Source: "ARAKKONAM",
        Destination: "CHENNAI",
        Vehicle: "TN73Y7849",
        EWayBillNo: "581862204376",
        Consignor: "UltraTech Cement Limited",
        Consignee: "UTCL MADHAVARAM",
        GSTType: "Unregistered",
        DeliveryAddress:
          "NO-378/3, 3RD STREET, THATTANKULAM ROAD, SADN: THANK ROA, TAMIL NADU",
        InvoiceNo: "6978014751",
        ContentName: "PPC",
        ActualWeight: "25.000",
        EWayBillValidUpto: "2025-08-17T23:59:00",
        InvoiceDate: "2025-08-16",
        EWayBillDate: "2025-08-16",
        GetRate: "437.00",
        GoodsType: "BAG",
      });
    }, 400);
  }, [id]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setMessage("✅ Dummy Save: Data updated locally (API pending).");
  };

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

  if (!doc)
    return (
      <div className="p-8 text-gray-600 text-center text-lg">
        Loading document...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* --- Document Summary Header --- */}
      <div className="bg-white shadow rounded-xl p-5 mb-6 flex flex-wrap items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-indigo-700 mb-2">
            {doc.client_name} – {doc.doc_type}
          </h2>
          <p className="text-sm text-gray-600">
            <strong>Uploaded On:</strong> {doc.uploaded_on}
          </p>
        </div>

        <div className="flex gap-3 mt-3 md:mt-0">
          <StatusBadge label="Data Extraction" status={doc.data_extraction_status} />
          <StatusBadge label="ERP Entry" status={doc.erp_entry_status} />
        </div>
      </div>

      {/* --- Main Split Layout --- */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* LEFT: PDF Viewer */}
        <div className="w-full md:w-1/2 bg-white shadow-lg rounded-xl p-4">
          <h3 className="text-indigo-700 font-semibold text-lg mb-3">
            Document Preview
          </h3>
          <iframe
            src={`http://127.0.0.1:5050/uploaded_docs/${doc.file_name}`}
            className="w-full h-[80vh] border rounded-lg"
            title="PDF Preview"
          ></iframe>
        </div>

        {/* RIGHT: Extracted Data */}
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
