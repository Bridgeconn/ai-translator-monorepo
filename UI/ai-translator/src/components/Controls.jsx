export default function Controls() {
    return (
      <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left Toggle */}
          <div className="flex gap-2">
            <button className="px-4 py-1 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 text-sm">
              Text
            </button>
            <button className="px-4 py-1 rounded-md bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold shadow">
              Bible+
            </button>
          </div>
  
          {/* Middle Dropdowns */}
          <div className="flex items-center gap-2">
            <select className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
              <option>English</option>
              <option>Hindi</option>
            </select>
            <span className="font-bold text-gray-500">⇆</span>
            <select className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
              <option>Malayalam</option>
              <option>Tamil</option>
            </select>
          </div>
  
          {/* Right Controls */}
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
              <option>Verse</option>
              <option>Chapter</option>
            </select>
            <button className="px-4 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow">
              Generate
            </button>
          </div>
        </div>
      </div>
    );
  }
  