import { Upload, X, Download } from "lucide-react";

export default function EditorPanel({ placeholder, showClose }) {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-md border border-gray-100">
      {/* Toolbar */}
      <div className="flex justify-end p-2 text-gray-500">
        {showClose && (
          <X className="w-5 h-5 cursor-pointer hover:text-red-500 transition" />
        )}
      </div>

      {/* Text Area */}
      <textarea
        className="min-h-[260px] md:min-h-[320px] m-2 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm resize-none outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
        placeholder={placeholder}
      />

      {/* Footer */}
      <div className="flex justify-between p-2 text-gray-500 border-t">
        <Upload className="w-5 h-5 cursor-pointer hover:text-indigo-600 transition" />
        <Download className="w-5 h-5 cursor-pointer hover:text-indigo-600 transition" />
      </div>
    </div>
  );
}
