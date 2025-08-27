import { Select, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";

const { Option } = Select;

export default function LanguageSelect({ label, value, onChange, disabled = false }) {
  // React Query for fetching languages
  const {
    data: languages = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/languages/");
      if (!res.ok) throw new Error("Failed to fetch languages");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes caching
  });

  if (isError) {
    return <div>Error loading languages</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <strong>{label}</strong>
      <Select
        showSearch
        placeholder="Select language"
        style={{ width: 180 }}
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
        {languages.map((lang) => (
          <Option key={lang.language_id} value={lang.language_id}>
            {lang.name} ({lang.ISO_code})
          </Option>
        ))}
      </Select>
    </div>
  );
}