import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Monitor,
  FileCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/dashboard" },
    { name: "Upload", icon: <Upload size={18} />, path: "/upload" },
    { name: "Monitoring", icon: <Monitor size={18} />, path: "/monitoring" },
    { name: "Manual Review", icon: <FileCheck size={18} />, path: "/manual-review" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-indigo-700 text-white transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500">
          <h1 className="text-xl font-bold">BoosterEntryAI</h1>
          <button
            className="md:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="mt-6 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-2 rounded-md transition ${
                location.pathname === item.path
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-indigo-600"
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-md">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-indigo-700"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg font-semibold text-gray-700">
              Dashboard Overview
            </h2>
          </div>
          <button className="flex items-center gap-2 text-gray-600 hover:text-indigo-700 transition">
            <LogOut size={18} />
            Logout
          </button>
        </header>

        <main className="flex-1 p-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Welcome to BoosterEntryAI Dashboard
            </h3>
            <p className="text-gray-600">
              This is your main workspace. Use the sidebar to navigate between
              different modules.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
