import { Globe } from "lucide-react";

export default function Header() {
  return (
    <div className="flex justify-between items-center border-b border-gray-200 pb-3">
      <div className="flex items-center gap-2">
        <Globe className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Zero Draft Generator
        </h1>
      </div>
      <div className="text-gray-600 text-sm font-medium">John Doe</div>
    </div>
  );
}
