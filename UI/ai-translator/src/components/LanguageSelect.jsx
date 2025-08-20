import { useEffect, useState } from "react";
import { Select, Spin } from "antd";

const { Option } = Select;

export default function LanguageSelect({ label, value, onChange }) {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:8000/languages/");
        const data = await response.json();
        setLanguages(data);
      } catch (error) {
        console.error("Error fetching languages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLanguages();
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <strong>{label}</strong>
      <Select
        showSearch
        placeholder="Select language"
        style={{ width: 180 }}
        loading={loading}
        value={value ? value.language_id : undefined} // controlled by id
        notFoundContent={loading ? <Spin size="small" /> : "No language found"}
        filterOption={(input, option) =>
          option?.children
            ?.toString()
            ?.toLowerCase()
            ?.includes(input.toLowerCase())
        }
        onChange={(id) => {
          // find full object
          const langObj = languages.find((lang) => lang.language_id === id);
          onChange(langObj); // still send full object up
        }}
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
