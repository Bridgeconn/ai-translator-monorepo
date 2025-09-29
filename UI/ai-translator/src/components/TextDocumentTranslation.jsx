import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Select,
  Card,
  Input,
  Typography,
  Spin,
  Button,
  message,
  Breadcrumb,
  Tooltip,
  App,
  Upload,
} from "antd";
import { languagesAPI } from "./api.js";
import { EditOutlined, CopyOutlined, UploadOutlined, CloseOutlined, TranslationOutlined, } from "@ant-design/icons";
import { useParams, Link } from "react-router-dom";
import { textDocumentAPI } from "./api.js";
import DownloadDraftButton from "./DownloadDraftButton";
import { InfoCircleOutlined } from "@ant-design/icons";

// Added imports for translation workflow
import vachanApi from "../api/vachan";
import Papa from "papaparse";

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;
const MODEL_INFO = {
  "nllb-600M": {
    Model: "nllb-600M",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "200 languages",
  },
  "nllb_finetuned_eng_nzm": {
    Model: "nllb_finetuned_eng_nzm",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "Zeme Naga, English",
  },
};

// ------------------  Vachan Helpers ------------------
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append("username", import.meta.env.VITE_VACHAN_USERNAME);
  params.append("password", import.meta.env.VITE_VACHAN_PASSWORD);

  const resp = await vachanApi.post("/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return resp.data.access_token;
}

async function requestDocTranslation(token, file, srcLangCode, tgtLangCode, model_name) {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await vachanApi.post(
    `/model/text/translate-document?device=cpu&model_name=${model_name}&source_language=${srcLangCode}&target_language=${tgtLangCode}`,
    formData,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return resp.data.data.jobId;
}

async function pollJobStatus({ token, jobId }) {
  let attempts = 0;
  while (attempts < 80) {
    const resp = await vachanApi.get(`/model/job?job_id=${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = resp.data?.data?.status?.toLowerCase();
    if (status?.includes("finished")) return jobId;
    if (status?.includes("failed")) throw new Error("Translation failed");
    attempts++;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Polling timed out");
}

async function fetchAssets(token, jobId) {
  const resp = await vachanApi.get(`/assets?job_id=${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
  return await resp.data.text();
}
// ------------------  USFM Helpers ------------------
function containsUSFMMarkers(text) {
  return /\\(id|c|v|s\d?|p|q\d?|m|nb|b|d|sp|pb|li\d?|pi\d?|pc|pr|cls)\b/.test(
    text
  );
}

function extractUSFMContent(usfmText) {
  const lines = usfmText.split("\n");
  const structure = [];
  const segments = [];
  lines.forEach((line) => {
    const verseMatch = line.match(/^(\\v\s+\d+\s*)(.*)/);
    if (verseMatch) {
      structure.push({
        type: "translatable",
        prefix: verseMatch[1],
        originalLine: line,
        translationIndex: segments.length,
      });
      segments.push(verseMatch[2]);
    } else {
      structure.push({ type: "marker", originalLine: line });
    }
  });
  return { structure, plainText: segments.join("\n") };
}

function reconstructUSFM(structure, csvData) {
  const translations = csvData.map((row) => row.Translation?.trim()).filter(Boolean);
  return structure
    .map((el) =>
      el.type === "translatable"
        ? el.prefix + (translations[el.translationIndex] || "")
        : el.originalLine
    )
    .join("\n");
}

function simpleTranslation(sourceText, csvData) {
  const translations = csvData.map((row) => row.Translation?.trim()).filter(Boolean);
  const lines = sourceText.split("\n");
  let idx = 0;
  return lines
    .map((line) => {
      const sentences = line.split(/(?<=[.!?।])\s+/);
      return sentences.map(() => translations[idx++] || "").join(" ");
    })
    .join("\n");
}

export default function TextDocumentTranslation() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSourceEdited, setIsSourceEdited] = useState(false);
  const [sourceLangName, setSourceLangName] = useState('');
  const [targetLangName, setTargetLangName] = useState('');

  const getSourceKey = (projectId, fileId) => `sourceEdit_${projectId}_${fileId}`;
  const getSelectedFileKey = (projectId) => `selectedFile_${projectId}`;
  const getTempSourceKey = (projectId) => `tempSource_${projectId}`;
  const [selectedModel, setSelectedModel] = useState(null); // default

  const { message } = App.useApp();

  // ------------------ Fetch Project + Files ------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const proj = await textDocumentAPI.getProjectById(projectId);
        setProject(proj);
        setProjectFiles(proj.files || []);
        // Derive source/target languages from first file (assuming uniform across project)
        if (proj.files && proj.files.length > 0) {
          const firstFile = proj.files[0];
          setProject({
            ...proj,
            source_language: { code: firstFile.source_id },
            target_language: { code: firstFile.target_id },
          });

          // Fetch initial language names
          try {
            const srcLang = await languagesAPI.getLanguageByBcp(firstFile.source_id);
            const tgtLang = await languagesAPI.getLanguageByBcp(firstFile.target_id);
            setSourceLangName(srcLang?.name || firstFile.source_id);
            setTargetLangName(tgtLang?.name || firstFile.target_id);
          } catch (err) {
            console.error('Failed to fetch initial languages:', err);
            setSourceLangName(firstFile.source_id);
            setTargetLangName(firstFile.target_id);
          }
        }
        // Auto-select saved file after loading files
        const savedSelectedId = localStorage.getItem(getSelectedFileKey(projectId));
        if (savedSelectedId && proj.files && proj.files.some(f => f.id === savedSelectedId)) {
          handleFileChange(savedSelectedId);
        } else {
          // Load temp source if no file selected
          const tempSource = localStorage.getItem(getTempSourceKey(projectId));
          if (tempSource) {
            setSourceText(tempSource);
            setIsSourceEdited(true);
          }
        }
      } catch (err) {
        console.error(err);
        message.error("Failed to load project files");
      }
    };
    if (projectId) fetchData();
  }, [projectId]);

  // ------------------ Handle File Selection ------------------
  const handleFileChange = async (fileId) => {
    // Clear previous localStorage if switching files
    if (selectedFile) {
      localStorage.removeItem(getSourceKey(projectId, selectedFile.id));
    }
    const file = projectFiles.find((f) => f.id === fileId);
    if (!file) return;
    setSelectedFile(file);
    const savedSource = localStorage.getItem(getSourceKey(projectId, fileId));
    setSourceText(savedSource || file.source_text || "");
    setTargetText(file.target_text || "");
    setIsEdited(false);
    setIsSourceEdited(!!savedSource);

    // Fetch language names for selected file
    try {
      const srcLang = await languagesAPI.getLanguageByBcp(file.source_id);
      const tgtLang = await languagesAPI.getLanguageByBcp(file.target_id);
      setSourceLangName(srcLang?.name || file.source_id);
      setTargetLangName(tgtLang?.name || file.target_id);
    } catch (err) {
      console.error('Failed to fetch languages:', err);
      setSourceLangName(file.source_id);
      setTargetLangName(file.target_id);
    }
  };

  // ------------------ Draft Editing ------------------
  const handleDraftChange = (e) => {
    setTargetText(e.target.value);
    setIsEdited(true);
  };

  const handleSaveDraft = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      await textDocumentAPI.updateFile(projectId, selectedFile.id, {
        target_text: targetText,
      });
      message.success("Translation saved!");
      setIsEdited(false);
      setIsEditing(false); // exit edit mode after save
    } catch (err) {
      console.error(err);
      message.error("Failed to save translation");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardDraft = () => {
    setTargetText(selectedFile?.target_text || "");
    setIsEdited(false);
    setIsEditing(false); // exit edit mode
    message.info("Reverted to saved translation");
  };

  // ------------------  Upload handler ------------------
  const handleFileUpload = (file) => {
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error("File must be smaller than 2MB!");
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = (e) => setSourceText(e.target.result);
    reader.readAsText(file);
    return false; // prevent auto upload
  };

  // ------------------ Translate handler (Vachan workflow) ------------------
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      message.warning("Please enter or upload source text first");
      return;
    }
    try {
      setLoading(true);

      // 1. Get token
      const token = await getAccessToken();

      // 2. Detect USFM or plain text
      let textToTranslate = "";
      let isUSFM = false;
      let usfmStructure = null;
      if (containsUSFMMarkers(sourceText)) {
        const extracted = extractUSFMContent(sourceText);
        textToTranslate = extracted.plainText;
        isUSFM = true;
        usfmStructure = extracted.structure;
      } else {
        textToTranslate = sourceText;
      }

      // 3. Prepare file
      const blob = new Blob([textToTranslate], { type: "text/plain" });
      const fileToSend = new File([blob], "content.txt", { type: "text/plain" });

      //  Use source/target language from selected file or project default
      let srcCode = selectedFile?.source_id || project?.source_language?.code;
      let tgtCode = selectedFile?.target_id || project?.target_language?.code;

      if (!srcCode || !tgtCode) {
        message.error("Source or target language is not set for this project/file.");
        return;
      }

      // ---  Request translation job using those languages ---
      // message.info("Preparing translation...");
      const jobId = await requestDocTranslation(
        token,
        fileToSend,
        srcCode,
        tgtCode,
        selectedModel
      );

      message.info("⏳ Translating... please wait");


      // 5. Poll until finished
      await pollJobStatus({ token, jobId });

      // 6. Fetch assets
      const csvText = await fetchAssets(token, jobId);

      // 7. Parse CSV
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      // 8. Rebuild translation
      const translatedText = isUSFM
        ? reconstructUSFM(usfmStructure, parsed.data)
        : simpleTranslation(textToTranslate, parsed.data);

      setTargetText(translatedText);
      message.success("Translation complete!");

      // Auto-save the source and translated text if a file is selected
      if (selectedFile) {
        try {
          await textDocumentAPI.updateFile(projectId, selectedFile.id, {
            source_text: sourceText, // Save the edited source text
            target_text: translatedText
          });
        } catch (err) {
          console.error(err);
          message.warning("Translation completed but failed to save automatically.");
        }
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!project) return <Spin />;

  return (
    <div
      style={{
        padding: "24px",
        position: "relative",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 32px 16px 32px",
          backgroundColor: "#f9f9fb",
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Breadcrumb
          items={[
            {
              title: (
                <Link to="/projects" style={{ color: "#2c8dfb", fontWeight: 500 }}>
                  Projects
                </Link>
              ),
            },
            { title: <span style={{ fontWeight: 500 }}>{project?.project_name}</span> },
          ]}
          style={{ marginBottom: 8, fontSize: 14 }}
        />

        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "#1f2937" }}>
          Document Translation ({sourceLangName} - {targetLangName})
        </h2>
      </div>

      {/* File Selector */}
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
          Select File
        </Text>
        <Select
          placeholder="Select a file"
          style={{ width: 200 }}
          onChange={handleFileChange}
          value={selectedFile?.id}
        >
          {projectFiles.map((f) => (
            <Option key={f.id} value={f.id}>
              {f.file_name}
            </Option>
          ))}
        </Select>
      </div>

      {selectedFile && (
        <Card
          title={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* Left: Heading */}
              <h3 style={{ margin: 0 }}>Translation Editor</h3>

              {/* Right: Model dropdown + Info button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Model Dropdown */}
                <Select
                  placeholder="Select Model"
                  style={{ width: 160 }}
                  value={selectedModel}
                  onChange={(value) => setSelectedModel(value)}
                > <Option value="nllb-600M">nllb-600M</Option>
                  <Option value="nllb_finetuned_eng_nzm">nllb_finetuned_eng_nzm</Option>

                </Select>
                <Tooltip
                  title={
                    selectedModel
                      ? Object.entries(MODEL_INFO[selectedModel]).map(
                        ([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {value}
                          </div>
                        )
                      )
                      : "Select a model to see info"
                  }
                  color="#fff"
                  overlayStyle={{ whiteSpace: "pre-line" }}
                >
                  <Button
                    shape="circle"
                    icon={<InfoCircleOutlined />}
                    disabled={!selectedModel} // disable if no model selected
                  />
                </Tooltip>

              </div>
            </div>
          }
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Row gutter={16} style={{ flex: 1 }}>
            {/* Source */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <h3>Source</h3>
              <TextArea
                rows={20}
                value={sourceText}
                onChange={(e) => {
                  setSourceText(e.target.value);
                  setIsSourceEdited(true);
                  const key = selectedFile ? getSourceKey(projectId, selectedFile.id) : getTempSourceKey(projectId);
                  localStorage.setItem(key, e.target.value);
                }}
                placeholder="Enter or upload text to translate..."
                style={{ marginBottom: 8 }}
              />
              {/* Upload + Clear buttons */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: "32px",
                }}
              >
                {/* Left side - Upload section */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Upload
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                    accept=".txt,.usfm,.docx,.pdf"
                  >
                    <Tooltip
                      title="Upload upto 2 MB(.txt, .usfm, .docx, .pdf )"
                      color="#fff"
                    >
                      <Button
                        icon={<UploadOutlined />}
                        style={{
                          background: "rgb(44 151 222 / 85%)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          color: "#000",
                          padding: "6px 14px",
                        }}
                      />
                    </Tooltip>
                  </Upload>
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: "12px",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    <strong>Drop .txt, .usfm, .docx, .pdf up to 2 MB</strong>
                  </Typography.Text>
                </div>

                {/* Right side - Clear button */}
                <div>
                  <Tooltip
                    title="Clear"
                    color="#fff"
                    style={{ color: "#000" }}
                  >
                    <Button
                      style={{
                        backgroundColor: "rgb(229, 118 ,119)",
                        color: "white",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        border: "none",
                      }}
                      onClick={() => {
                        setSourceText("");
                        setTargetText("");
                        const key = selectedFile ? getSourceKey(projectId, selectedFile.id) : getTempSourceKey(projectId);
                        localStorage.removeItem(key);
                        setIsSourceEdited(false);
                      }}
                      icon={<CloseOutlined />}
                    />
                  </Tooltip>
                </div>
              </div>
            </Col>
            {/* Target */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Target</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {!isEditing ? (
                    <>
                      {/* Copy Button */}
                      <Tooltip
                        title="Copy translation"
                        color="#fff"
                        style={{ color: "#000" }}
                      >
                        <Button
                          type="default"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(targetText || "");
                            message.success("Copied to clipboard!");
                          }}
                          size="middle"
                        />
                      </Tooltip>

                      <DownloadDraftButton
                        content={targetText}
                      //disabled={loading || !targetText}
                      />

                      {/* Edit Button */}
                      <Tooltip
                        title="Edit draft"
                        color="#fff"
                        style={{ color: "#000" }}
                      >
                        <Button
                          type="default"
                          icon={<EditOutlined />}
                          onClick={() => setIsEditing(true)}
                          size="middle"
                        />
                      </Tooltip>
                    </>
                  ) : (
                    // Show Save + Discard when editing
                    <div>
                      <Button
                        type="primary"
                        onClick={handleSaveDraft}
                        style={{ marginRight: 8 }}
                        size="small"
                        loading={loading}
                      >
                        Save
                      </Button>
                      <Button size="small" onClick={handleDiscardDraft}>
                        Discard
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <TextArea
                rows={20}
                value={targetText}
                onChange={handleDraftChange}
                readOnly={!isEditing}
                style={{
                  marginTop: 8,
                  backgroundColor: isEdited ? "#fffbe6" : "transparent",
                }}
              />
            </Col>
          </Row>
          {/*  Translate button centered below both panels */}
          <Row justify="center" style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<TranslationOutlined />}
              onClick={handleTranslate}
              loading={loading}
            >
              {loading ? "Translating..." : "Translate"}
            </Button>
          </Row>
        </Card>
      )}
    </div>
  );
}