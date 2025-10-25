import { useEffect, useState, useRef } from "react";
import api from "../api/axios";

export default function Upload() {
  const [clients, setClients] = useState([]);
  const [formats, setFormats] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dropRef = useRef(null);

  const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/bmp",
  "image/tiff"
];

const isAllowedFile = (file) => ALLOWED_TYPES.includes(file.type);


  // ✅ Fetch clients on mount
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await api.get("/api/clients");
        setClients(res.data.data);
      } catch (err) {
        console.error("❌ Error loading clients:", err);
        setMessage("❌ Error loading clients. Check console for details.");
      }
    }
    fetchClients();
  }, []);

  // ✅ Fetch formats when client changes
  const handleClientChange = async (e) => {
    const clientId = e.target.value;
    setSelectedClient(clientId);
    setSelectedFormat("");
    setFormats([]);
    if (!clientId) return;

    try {
      const res = await api.get(`/api/doc_formats/${clientId}`);
      setFormats(res.data.data);
    } catch (err) {
      console.error("❌ Error loading formats:", err);
      setMessage("❌ Error loading formats. Check console for details.");
    }
  };

  // ✅ Handle file select or drop
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ✅ Remove a file
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e) => {
  e.preventDefault();
  if (!selectedClient || !selectedFormat || files.length === 0) {
    setMessage("⚠️ Please select client, format, and at least one file.");
    return;
  }

  const formData = new FormData();
  formData.append("client_id", selectedClient);
  formData.append("doc_format_id", selectedFormat);
  formData.append("uploaded_by", "senthil");
  files.forEach((file) => formData.append("files", file));

  try {
    setUploading(true);
    setMessage("⏳ Uploading files...");

    // debug: log file names and formData entries
    console.log("Uploading files:", files.map(f => f.name));
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1] instanceof File ? pair[1].name : pair[1]);
    }

    // IMPORTANT: do NOT set the Content-Type header manually — let axios set it with the boundary
    const res = await api.post("/api/upload", formData);

    if (res.data && res.data.status === "success") {
      const saved = res.data.data || [];
      if (saved.length > 0) {
        const names = saved.map((s) => s.file_name).join(", ");
        setMessage(`✅ Uploaded: ${names}`);
      } else {
        setMessage(`✅ ${res.data.message || "Upload succeeded."}`);
      }
      setFiles([]); // clear selected files in UI
    } else {
      setMessage(`❌ Upload error: ${res.data?.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("❌ Upload failed:", err);
    setMessage("❌ Upload failed. Check console for details.");
  } finally {
    setUploading(false);
  }
};


  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-indigo-700 mb-6">
        Document Upload Center
      </h2>

      <form
        onSubmit={handleUpload}
        className="max-w-2xl bg-white p-6 rounded-2xl shadow-lg space-y-6"
      >
        {/* Client */}
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Select Client
          </label>
          <select
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
            value={selectedClient}
            onChange={handleClientChange}
          >
            <option value="">-- Choose Client --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Select Document Type
          </label>
          <select
            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            disabled={!selectedClient}
          >
            <option value="">-- Choose Format --</option>
            {formats.map((fmt) => (
              <option key={fmt.id} value={fmt.id}>
                {fmt.doc_type}
              </option>
            ))}
          </select>
        </div>

        {/* Drag-and-drop Zone */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
            isDragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 hover:border-indigo-400"
          }`}
        >
          <p className="text-gray-600">
            {isDragging ? "Release to upload files" : "Drag and drop one or more invoices here"}
          </p>
          <p className="text-sm text-gray-500 mt-1">JPG, PNG, or PDF files supported</p>

          <label
            htmlFor="file-upload"
            className="inline-block mt-3 px-5 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700"
          >
            Choose Files
          </label>
          <input
          id="file-upload"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,application/pdf,image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          />

        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="font-medium text-gray-700 mb-2">
              Selected Files ({files.length})
            </p>
            <ul className="divide-y divide-gray-200">
              {files.map((file, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center py-2 text-sm text-gray-600"
                >
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload Button */}
        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-2 text-white font-medium rounded-lg transition ${
            uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {uploading ? "Uploading..." : "Start Upload"}
        </button>

        {message && (
          <p
            className={`mt-4 text-sm font-medium ${
              message.startsWith("✅")
                ? "text-green-600"
                : message.startsWith("❌")
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
