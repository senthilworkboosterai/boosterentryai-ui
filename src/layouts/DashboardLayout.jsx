import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Upload, Monitor, ClipboardCheck } from "lucide-react";

export default function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ================== SIDEBAR ================== */}
      <aside className="w-64 bg-[#3B29D9] text-white flex flex-col">
        {/* Brand Title - Centered and smaller */}
        <div className="text-center py-4 border-b border-indigo-500/25 shadow-sm">
          <h1 className="text-[20px] font-semibold text-white tracking-wide">
            BoosterEntryAI
          </h1>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col space-y-1 px-3 mt-3">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition ${
                isActive
                  ? "bg-[#5243F3] text-white font-semibold"
                  : "text-indigo-100 hover:bg-[#5243F3] hover:text-white"
              }`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition ${
                isActive
                  ? "bg-[#5243F3] text-white font-semibold"
                  : "text-indigo-100 hover:bg-[#5243F3] hover:text-white"
              }`
            }
          >
            <Upload size={18} />
            Upload
          </NavLink>

          <NavLink
            to="/monitoring"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition ${
                isActive
                  ? "bg-[#5243F3] text-white font-semibold"
                  : "text-indigo-100 hover:bg-[#5243F3] hover:text-white"
              }`
            }
          >
            <Monitor size={18} />
            Monitoring
          </NavLink>

          <NavLink
            to="/human-review"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition ${
                isActive
                  ? "bg-[#5243F3] text-white font-semibold"
                  : "text-indigo-100 hover:bg-[#5243F3] hover:text-white"
              }`
            }
          >
            <ClipboardCheck size={18} />
            Human Review
          </NavLink>
        </nav>
      </aside>

      {/* ================== MAIN CONTENT ================== */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm flex justify-between items-center px-8 py-3">
          <h2 className="text-[18px] font-medium text-gray-800 tracking-wide">
            KSS Roadways
          </h2>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition"
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span className="text-[15px] font-medium">Logout</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
