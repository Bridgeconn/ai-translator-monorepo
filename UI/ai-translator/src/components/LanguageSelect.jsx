import { Select, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";

const { Option } = Select;

export default function LanguageSelect({ label, value, onChange, disabled = false,placeholder = "Select language",filterList = []}) {
  // React Query for fetching languages
  const {
    data: languages = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + "/languages/");
      if (!res.ok) throw new Error("Failed to fetch languages");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes caching
  });

  if (isError) {
    return <div>Error loading languages</div>;
  }
// Apply dynamic filtering (for paired language logic)
const filteredLanguages =
  filterList.length > 0
    ? languages.filter((lang) => filterList.includes(lang.name))
    : languages;
  return (
    <div style={{ display: "flex", alignItems: "center"}}>
      <strong>{label}</strong>
      <Select
        showSearch
        placeholder={placeholder}
        style={{ width: 250,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)", // ✅ shadow effect
          borderRadius: "6px"   }}
        loading={isLoading}
        value={value ? value.language_id : undefined}
        notFoundContent={
          isLoading ? <Spin size="small" /> : "No language found"
        }
        filterOption={(input, option) =>
          option?.children
            ?.toString()
            ?.toLowerCase()
            ?.includes(input.toLowerCase())
        }
        onChange={(id) => {
          const langObj = languages.find((lang) => lang.language_id === id);
          onChange(langObj);
        }}
        disabled={disabled || isLoading} // ✅ disable while translating
      >
        {filteredLanguages.map((lang) => (
  <Option key={lang.language_id} value={lang.language_id}>
    {lang.name}
  </Option>
))}
      </Select>
    </div>
  );
}