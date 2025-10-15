export default function Login() {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-100 to-indigo-200">
        <div className="bg-white p-8 rounded-2xl shadow-md w-96 text-center">
          <h1 className="text-2xl font-bold text-indigo-700 mb-6">
            BoosterEntryAI Login
          </h1>
  
          <form className="space-y-4">
            <div className="text-left">
              <label className="block text-gray-600 text-sm mb-1">Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
  
            <div className="text-left">
              <label className="block text-gray-600 text-sm mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
  
            <button
              type="button"
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition"
            >
              Login
            </button>
          </form>
  
          <p className="mt-6 text-xs text-gray-500">
            © {new Date().getFullYear()} BoosterEntryAI — Document Intelligence Platform
          </p>
        </div>
      </div>
    );
  }
  