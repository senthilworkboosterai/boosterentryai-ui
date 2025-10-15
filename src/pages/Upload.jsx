import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Upload() {
  const [clients, setClients] = useState([]);
  const [formats, setFormats] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch clients on load
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await api.get("/api/clients");
        setClients(res.data.data);
      } catch (err) {
        console.error("Error loading clients:", err);
        setMessage("❌ Error loading clients. Check console for details.");
      }
    }
    fetchClients();
  }, []);

  // Fetch document formats based on selected client
  const handleClientChange = async (e) => {
    const clientId = e.target.value;
    setSelectedClient(clientId);
    setSelectedFormat("");
    setFormats([]);

    if (clientId) {
      try {
        const res = await api.get(`/api/doc_formats/${clientId}`);
        setFormats(res.data.data);
      } catch (err) {
        console.error("Error loading formats:", err);
        setMessage("❌ Error loading formats. Check console for details.");
      }
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setFiles([...e.target.files]); // allows multiple file selection
  };

  // Handle file upload submit
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedClient || !selectedFormat || files.length === 0) {
      setMessage("⚠️ Please select client, format, and file(s) to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("client_id", selectedClient);
    formData.append("doc_format_id", selectedFormat);
    formData.append("uploaded_by", "senthil");

    files.forEach((file) => formData.append("files", file));

    try {
      setUploading(true);
      const res = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`✅ ${res.data.message}`);
      setFiles([]);
    } catch (err) {
      console.error("Upload failed:", err);
      setMessage("❌ Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-indigo-700 mb-6">
        Upload Invoice Document
      </h2>

      <form
        onSubmit={handleUpload}
        className="max-w-xl bg-white p-6 rounded-lg shadow"
      >
        {/* Client */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700">
            Select Client
          </label>
          <select
            className="w-full border rounded px-3 py-2"
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
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700">
            Select Format
          </label>
          <select
            className="w-full border rounded px-3 py-2"
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

        {/* Files */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700">
            Upload PDF(s)
          </label>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            className="w-full border rounded px-3 py-2"
          />

          {/* Show selected file list */}
          {files.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
              {files.map((f, i) => (
                <li key={i}>{f.name}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="submit"
          disabled={uploading}
          className={`w-full text-white py-2 rounded transition ${
            uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-gray-700 break-words">{message}</p>
        )}
      </form>
    </div>
  );
}
