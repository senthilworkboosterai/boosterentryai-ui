// FixReview.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export default function FixReview() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [formData, setFormData] = useState({});
  const [validationStatus, setValidationStatus] = useState(null);
  const [failedSet, setFailedSet] = useState(new Set());
  const [failedMap, setFailedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const preferredOrder = [
    "Branch",
    "Date",
    "ConsignmentNo",
    "Source",
    "Destination",
    "Vehicle",
    "EWayBillNo",
    "Consignor",
    "Consignee",
    "GSTType",
    "Delivery Address",
    "Invoice No",
    "ContentName",
    "ActualWeight",
    "E-WayBill ValidUpto",
    "Invoice Date",
    "E-Way Bill Date",
    "Get Rate",
    "GoodsType",
  ];

  const normalizeKey = (s) => {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  };

  const variantsFor = (canonical) => {
    const v = [canonical];
    v.push(canonical.replace(/\s+/g, "").replace(/-/g, ""));
    v.push(canonical.replace(/[-_]/g, " "));
    v.push(canonical.toLowerCase());
    return Array.from(new Set(v));
  };

  const findKeyInSource = (sourceObj, canonicalKey) => {
    if (!sourceObj || typeof sourceObj !== "object") return null;
    const candidates = variantsFor(canonicalKey).map((s) => normalizeKey(s));
    const sourceKeys = Object.keys(sourceObj || {});
    for (const sk of sourceKeys) {
      const n = normalizeKey(sk);
      if (candidates.includes(n)) return sk;
    }
    return null;
  };

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/human_review/${id}`);
        if (!res?.data) throw new Error("Invalid API response");
        const payload = res.data.data ?? res.data;

        const docObj = payload.doc ?? payload;
        setDoc(docObj);

        const corrected = payload.corrected_data ?? {};
        const extracted =
          payload.extracted_data ??
          payload?.raw_extracted ??
          {};
        const sourceData =
          corrected && Object.keys(corrected).length > 0
            ? corrected
            : extracted;

        const validationFromTop =
          payload.ValidationStatus ||
          payload.validation ||
          payload.validationStatus ||
          null;

        let foundValidation = validationFromTop;
        if (!foundValidation && sourceData && typeof sourceData === "object") {
          const tryKeys = ["ValidationStatus", "validation", "validationStatus", "Validation"];
          for (const k of tryKeys) {
            const cand = sourceData[k];
            if (cand && typeof cand === "object" && Array.isArray(cand.FailedFields)) {
              foundValidation = cand;
              break;
            }
          }
        }

        setValidationStatus(foundValidation || null);

        const ordered = {};
        for (const key of preferredOrder) {
          const presentKey = findKeyInSource(sourceData, key);
          if (presentKey) ordered[key] = sourceData[presentKey];
        }

        setFormData(ordered || {});

        // 🔴 Validation failure map — keep this logic for red highlight
        if (foundValidation && Array.isArray(foundValidation.FailedFields)) {
          const setS = new Set();
          const map = {};
          foundValidation.FailedFields.forEach((f) => {
            const rawField = f.Field ?? f.field ?? f.FieldName ?? f.name ?? "";
            const reason = f.Reason ?? f.reason ?? f.message ?? "";
            const n = normalizeKey(rawField);
            if (n) {
              setS.add(n);
              map[n] = reason || "Failed validation";
            }
          });
          setFailedSet(setS);
          setFailedMap(map);
          setMessage(`${foundValidation.FailedFields.length} field(s) failed validation.`);
        } else {
          setFailedSet(new Set());
          setFailedMap({});
        }
      } catch (err) {
        console.error("❌ Error loading doc:", err);
        setMessage("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await api.post(`/api/human_review/update_corrected/${id}`, {
        corrected_json: formData,
      });
      setMessage("Saved");
    } catch (e) {
      console.error("Save failed:", e);
      setMessage("Save failed");
    }
  };

  const isFailed = (fieldLabel) => {
    const n = normalizeKey(fieldLabel);
    return failedSet.has(n);
  };
  const getReason = (fieldLabel) => {
    const n = normalizeKey(fieldLabel);
    return failedMap[n] ?? null;
  };

  if (loading) {
    return <div className="p-10 text-gray-600 text-center">Loading document...</div>;
  }
  if (!doc) {
    return <div className="p-10 text-gray-600 text-center">No document found.</div>;
  }

  const StatusBadge = ({ label, status }) => {
    let color =
      status === "Completed"
        ? "bg-green-100 text-green-700"
        : status === "Failed"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700";
    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${color} border border-gray-200`}>
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
        {/* LEFT - PDF */}
        <div className="relative w-full h-[90vh] bg-gray-100 rounded-xl shadow-inner overflow-hidden">
          {doc.file_url ? (
            <iframe src={doc.file_url} title="PDF Preview" className="absolute inset-0 w-full h-full border-none rounded-xl" />
          ) : (
            <div className="p-6">PDF not available</div>
          )}
        </div>

        {/* RIGHT - Editable Form */}
        <div className="w-full md:w-1/2 bg-white shadow-lg rounded-xl p-6 overflow-y-auto">
          <h3 className="text-indigo-700 font-semibold text-lg mb-4">Extracted Data (Editable)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {preferredOrder.map((label) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="text"
                  value={formData[label] ?? ""}
                  onChange={(e) => handleChange(label, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 ${
                    isFailed(label)
                      ? "border-red-500 bg-red-50 focus:ring-red-400"
                      : "border-gray-300 focus:ring-indigo-400"
                  }`}
                />
                {isFailed(label) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ {getReason(label) || "Field failed validation"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ✅ Only Save button retained */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              className="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 transition"
            >
              Save Changes
            </button>
          </div>

          {message && <p className="mt-3 text-sm text-gray-600 font-medium">{message}</p>}
        </div>
      </div>
    </div>
  );
}
