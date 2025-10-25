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

  // Order you requested
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

  // Normalizer to compare keys: remove non-alphanumeric & lowercase
  const normalizeKey = (s) => {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  };

  // Candidate key variants for a canonical key (helps match "E-Way Bill NO" -> "EWayBillNo")
  const variantsFor = (canonical) => {
    const v = [canonical];
    // variant without spaces/hyphens
    v.push(canonical.replace(/\s+/g, "").replace(/-/g, ""));
    // variant with spaces replaced by single space normalized
    v.push(canonical.replace(/[-_]/g, " "));
    // lowercase-only normalized
    v.push(canonical.toLowerCase());
    return Array.from(new Set(v));
  };

  // Build a map of normalizedKey -> actualKeyPresentInSource
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

        // doc container
        const docObj = payload.doc ?? payload;
        setDoc(docObj);

        // Prefer corrected_data over extracted_data
        const corrected = payload.corrected_data ?? payload?.corrected_data ?? {};
        const extracted = payload.extracted_data ?? payload?.extracted_data ?? payload?.raw_extracted ?? {};

        // Build displaySource (prefer corrected if present)
        const sourceData = (corrected && Object.keys(corrected).length > 0) ? corrected : extracted;

        // Read ValidationStatus from multiple places (top-level or inside extracted/corrected)
        const validationFromTop =
          payload.ValidationStatus ||
          payload.validation ||
          payload.validationStatus ||
          null;

        // Also try inside sourceData if not found at top-level
        let foundValidation = validationFromTop;
        if (!foundValidation) {
          // try to find a nested object called ValidationStatus or validation...
          if (sourceData && typeof sourceData === "object") {
            const tryKeys = ["ValidationStatus", "validation", "validationStatus", "Validation"];
            for (const k of tryKeys) {
              const cand = sourceData[k];
              if (cand && typeof cand === "object" && Array.isArray(cand.FailedFields)) {
                foundValidation = cand;
                break;
              }
            }
            // As last resort, search deeper: keys whose value is an object with FailedFields
            if (!foundValidation) {
              const deepSearch = (o) => {
                if (!o || typeof o !== "object") return null;
                if (o.FailedFields && Array.isArray(o.FailedFields)) return o;
                for (const k of Object.keys(o)) {
                  try {
                    const sub = o[k];
                    if (sub && typeof sub === "object") {
                      const got = deepSearch(sub);
                      if (got) return got;
                    } else if (typeof sub === "string") {
                      try {
                        const parsed = JSON.parse(sub);
                        const got2 = deepSearch(parsed);
                        if (got2) return got2;
                      } catch (e) {}
                    }
                  } catch (e) {}
                }
                return null;
              };
              foundValidation = deepSearch(sourceData);
            }
          }
        }

        setValidationStatus(foundValidation || null);

        // Build ordered display object using preferredOrder
        const ordered = {};
        for (const key of preferredOrder) {
          const presentKey = findKeyInSource(sourceData, key);
          if (presentKey) {
            ordered[key] = sourceData[presentKey];
          }
        }

        // If some preferred keys are missing but exist with alternate casing, we already handled.
        // Optionally you can also append any extra fallback keys here (not required)

        setFormData(ordered || {});

        // Build failed map from ValidationStatus (if present)
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
      // send corrected_json as the frontend's edited final_data
      await api.post(`/api/human_review/update_corrected/${id}`, {
        corrected_json: formData,
      });
      setMessage("Saved");
    } catch (e) {
      console.error("Save failed:", e);
      setMessage("Save failed");
    }
  };

  // Helpers for validation highlighting
  const isFailed = (fieldLabel) => {
    const n = normalizeKey(fieldLabel);
    return failedSet.has(n);
  };
  const getReason = (fieldLabel) => {
    const n = normalizeKey(fieldLabel);
    return failedMap[n] ?? null;
  };

  const refreshValidationFromResponse = () => {
    if (!validationStatus) {
      setMessage("No ValidationStatus present to refresh.");
      return;
    }
    const arr = Array.isArray(validationStatus.FailedFields) ? validationStatus.FailedFields : [];
    const setS = new Set();
    const map = {};
    arr.forEach((f) => {
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
    setMessage(`${arr.length} field(s) failed validation (refreshed).`);
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-indigo-700 font-semibold text-lg">Extracted Data (Editable)</h3>
            <div className="flex gap-2">
              <button onClick={refreshValidationFromResponse} className="text-sm px-3 py-1 border rounded bg-white hover:bg-gray-50">
                Refresh validation
              </button>
              <button
                onClick={() => {
                  console.log("DEBUG doc:", doc);
                  console.log("DEBUG formData:", formData);
                  console.log("DEBUG validationStatus:", validationStatus);
                }}
                className="text-sm px-3 py-1 border rounded bg-white hover:bg-gray-50"
              >
                Debug log
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {preferredOrder.map((label) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="text"
                  value={formData[label] ?? ""}
                  onChange={(e) => handleChange(label, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 ${
                    isFailed(label) ? "border-red-500 bg-red-50 focus:ring-red-400" : "border-gray-300 focus:ring-indigo-400"
                  }`}
                />
                {isFailed(label) && <p className="text-xs text-red-600 mt-1">⚠️ {getReason(label) || "Field failed validation"}</p>}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleSave} className="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 transition">
              Save Changes
            </button>
            <button onClick={refreshValidationFromResponse} className="bg-white border px-4 py-2 rounded hover:bg-gray-50">
              Re-evaluate highlights
            </button>
          </div>

          {message && <p className="mt-3 text-sm text-gray-600 font-medium">{message}</p>}
        </div>
      </div>
    </div>
  );
}
