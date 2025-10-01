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
  Modal,
} from "antd";
import { languagesAPI } from "./api.js";
import {
  EditOutlined,
  CopyOutlined,
  UploadOutlined,
  CloseOutlined,
  TranslationOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useParams, Link } from "react-router-dom";
import { textDocumentAPI } from "./api.js";
import DownloadDraftButton from "./DownloadDraftButton";
import { InfoCircleOutlined } from "@ant-design/icons";

// Added imports for translation workflow
import vachanApi from "../api/vachan";
import Papa from "papaparse";

const { Option } = Select;
const { TextArea } = Input;
const { Text: TypographyText } = Typography;
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
  while (attempts < 200) {
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
  const [isEditing, setIsEditing] = useState(true);
  const [isSourceEditing, setIsSourceEditing] = useState(false);
  const [isSourceEdited, setIsSourceEdited] = useState(false);
  const [sourceLangName, setSourceLangName] = useState("");
  const [targetLangName, setTargetLangName] = useState("");
  const [clearModalVisible, setClearModalVisible] = useState(false);

  const getSourceKey = (projectId, fileId) =>
    `sourceEdit_${projectId}_${fileId}`;
  const getSelectedFileKey = (projectId) => `selectedFile_${projectId}`;
  const getTempSourceKey = (projectId) => `tempSource_${projectId}`;
  const [selectedModel, setSelectedModel] = useState("nllb-600M"); 

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
            const srcLang = await languagesAPI.getLanguageByBcp(
              firstFile.source_id
            );
            const tgtLang = await languagesAPI.getLanguageByBcp(
              firstFile.target_id
            );
            setSourceLangName(srcLang?.name || firstFile.source_id);
            setTargetLangName(tgtLang?.name || firstFile.target_id);
          } catch (err) {
            console.error("Failed to fetch initial languages:", err);
            setSourceLangName(firstFile.source_id);
            setTargetLangName(firstFile.target_id);
          }
        }
        // Auto-select saved file after loading files
        const savedSelectedId = localStorage.getItem(
          getSelectedFileKey(projectId)
        );
        if (
          savedSelectedId &&
          proj.files &&
          proj.files.some((f) => f.id === savedSelectedId)
        ) {
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
    const file = projectFiles.find((f) => f.id === fileId);
    if (!file) return;
    setSelectedFile(file);
    setSourceText(file.source_text || "");
    setTargetText(file.target_text || "");
    setIsEdited(false);
    setIsSourceEditing(false);

    // Fetch language names for selected file
    try {
      const srcLang = await languagesAPI.getLanguageByBcp(file.source_id);
      const tgtLang = await languagesAPI.getLanguageByBcp(file.target_id);
      setSourceLangName(srcLang?.name || file.source_id);
      setTargetLangName(tgtLang?.name || file.target_id);
    } catch (err) {
      console.error("Failed to fetch languages:", err);
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
      setSelectedFile((prev) => ({ ...prev, target_text: targetText }));
      setProjectFiles((prev) =>
        prev.map((f) =>
          f.id === selectedFile.id ? { ...f, target_text: targetText } : f
        )
      );
      message.success("Translation saved!");
      setIsEdited(false);
      // setIsEditing(false);
    } catch (err) {
      console.error(err);
      message.error("Failed to save translation");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Source Editing ------------------
  const handleSaveSource = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      await textDocumentAPI.updateFile(projectId, selectedFile.id, {
        source_text: sourceText,
      });
      setSelectedFile((prev) => ({ ...prev, source_text: sourceText }));
      setProjectFiles((prev) =>
        prev.map((f) =>
          f.id === selectedFile.id ? { ...f, source_text: sourceText } : f
        )
      );
      message.success("Source Updated");
      setIsSourceEditing(false);
    } catch (err) {
      console.error(err);
      message.error("Failed to save source");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardSource = () => {
    setSourceText(selectedFile?.source_text || "");
    setIsSourceEditing(false);
  };

  // const handleDiscardDraft = () => {
  //   setTargetText(selectedFile?.target_text || "");
  //   setIsEdited(false);
  //   setIsEditing(false);
  //   message.info("Reverted to saved translation");
  // };

  const handleClearConfirm = async () => {
    try {
      if (selectedFile) {
        await textDocumentAPI.clearFileContent(projectId, selectedFile.id);
      }
      setSourceText("");
      setTargetText("");
      if (selectedFile) {
        setProjectFiles((prev) =>
          prev.map((f) =>
            f.id === selectedFile.id
              ? { ...f, source_text: "", target_text: "" }
              : f
          )
        );
      }
      if (!selectedFile) {
        localStorage.removeItem(getTempSourceKey(projectId));
      }
      setIsSourceEdited(false);
      setIsSourceEditing(false);
      setIsEdited(false);
      // setIsEditing(false);
      message.success("Content cleared successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to clear content");
    } finally {
      setClearModalVisible(false);
    }
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
      const fileToSend = new File([blob], "content.txt", {
        type: "text/plain",
      });

      //  Use source/target language from selected file or project default
      let srcCode = selectedFile?.source_id || project?.source_language?.code;
      let tgtCode = selectedFile?.target_id || project?.target_language?.code;

      if (!srcCode || !tgtCode) {
        message.error(
          "Source or target language is not set for this project/file."
        );
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
            target_text: translatedText,
          });
        } catch (err) {
          console.error(err);
          message.warning(
            "Translation completed but failed to save automatically."
          );
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
                <Link
                  to="/projects"
                  style={{ color: "#2c8dfb", fontWeight: 500 }}
                >
                  Projects
                </Link>
              ),
            },
            {
              title: (
                <span style={{ fontWeight: 500 }}>{project?.project_name}</span>
              ),
            },
          ]}
          style={{ marginBottom: 8, fontSize: 14 }}
        />

        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "#1f2937" }}>
          Document Translation ({sourceLangName} - {targetLangName})
        </h2>
      </div>

      {/* File Selector with Upload Button */}
      <div style={{ marginBottom: 12 }}>
        <TypographyText
          strong
          style={{ display: "block", marginBottom: 4, fontSize: 14 }}
        >
          Select File
        </TypographyText>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Select
            placeholder="Select a file"
            style={{ width: 200 }}
            onChange={handleFileChange}
            value={selectedFile?.id || undefined} // avoid null warning
          >
            {projectFiles.map((f) => (
              <Option key={f.id} value={f.id}>
                {f.file_name}
              </Option>
            ))}
          </Select>

          {/* Plus Icon for uploading a new file */}
          <Upload
            showUploadList={false}
            accept=".docx,.pdf,.txt,.usfm"
            beforeUpload={(file) => {
              const allowedTypes = [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain",
                "application/usfm",
                "text/usfm",
              ];
              const allowedExtensions = [".pdf", ".docx", ".txt", ".usfm"];

              const fileExt = file.name
                .slice(file.name.lastIndexOf("."))
                .toLowerCase();
              if (!allowedExtensions.includes(fileExt)) {
                message.error(`${file.name} is not a supported file type`);
                return Upload.LIST_IGNORE; // prevents upload
              }
              return true; // allow upload
            }}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                const formData = new FormData();
                formData.append("file", file);

                const uploadedFile = await textDocumentAPI.uploadFile(
                  projectId,
                  formData
                );

                setProjectFiles((prev) => [...prev, uploadedFile]);
                setSelectedFile(uploadedFile);
                setSourceText(uploadedFile.source_text || "");
                setTargetText(uploadedFile.target_text || "");

                message.success(`${file.name} uploaded successfully!`);
                onSuccess(null, file);
              } catch (err) {
                console.error(err);
                const errorMsg =
                  err?.response?.data?.detail ||
                  err?.message ||
                  "Unknown error";
                message.error(`${errorMsg}`);
                onError(err);
              }
            }}
          >
            <Button
              icon={<PlusOutlined />}
              title="add a new file"
              style={{
                marginLeft: 8,
                //backgroundColor: 'rgb(44, 141, 251)',
                borderColor: "rgb(44, 141, 251)",
              }}
            />
          </Upload>
        </div>
      </div>

      {/* Translation Editor */}
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
              {/* Upload + Clear buttons */}
              <div
                onClick={() => !isSourceEditing && setIsSourceEditing(true)}
                style={{
                  cursor: isSourceEditing ? "default" : "pointer",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Source</h3>
                  {isSourceEditing && (
                    <div>
                      <Button
                        type="primary"
                        onClick={handleSaveSource}
                        style={{ marginRight: 8 }}
                        size="small"
                        loading={loading}
                      >
                        Save
                      </Button>
                      <Button size="small" onClick={handleDiscardSource}>
                        Discard
                      </Button>
                    </div>
                  )}
                </div>

                <TextArea
                  rows={20}
                  value={sourceText}
                  onChange={(e) => {
                    setSourceText(e.target.value);
                    setIsSourceEdited(true);
                    if (!selectedFile) {
                      // Save to localStorage only for temp source
                      localStorage.setItem(
                        getTempSourceKey(projectId),
                        e.target.value
                      );
                    }
                  }}
                  readOnly={!isSourceEditing}
                  placeholder="Enter or upload text to translate..."
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    backgroundColor: isSourceEdited ? "#fffbe6" : "transparent",
                  }}
                />
                {/*  Upload + Clear buttons */}
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
                      onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setClearModalVisible(true);
                        }}
                        icon={<CloseOutlined />}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Col>
            {/* Target */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0 }}>Target</h3>
                <div style={{ display: "flex", gap: 8 }}>
                    <>
                    <Tooltip
                        title="Save"
                        color="#fff"
                        style={{ color: "#000" }}
                      >
                        <Button
                          type="default"
                          icon={<SaveOutlined />}
                          onClick={handleSaveDraft}
                          size="middle"
                        />
                      </Tooltip>
                      <Tooltip
                        title="Copy"
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
                  
                      />
                    </>
                   {/* : (
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
                  )} */}
                </div>
              </div>

              <TextArea
                rows={20}
                value={targetText}
                onChange={handleDraftChange}
                // readOnly={!isEditing}
                style={{
                  marginTop: 8,
                  backgroundColor: isEdited ? "#fffbe6" : "transparent",
                }}
              />
            </Col>
          </Row>
          {/*  Translate button centered below both panels */}
          <Row justify="center" style={{ marginTop: 16 }}>
  <Tooltip
    title={!selectedModel ? "Please select a model first" : ""}
    color="#fff"
  >
    <Button
      type="primary"
      icon={<TranslationOutlined />}
      onClick={handleTranslate}
      loading={loading}
      disabled={!selectedModel} // <-- disable if no model selected
    >
      {loading ? "Translating..." : "Translate"}
    </Button>
  </Tooltip>
</Row>

        </Card>
      )}

      <Modal
        title="Confirm Clear"
        open={clearModalVisible}
        onCancel={() => setClearModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setClearModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="clear"
            type="primary"
            danger
            onClick={handleClearConfirm}
          >
            Clear
          </Button>,
        ]}
      >
        <p>This will clear both source and target permanently.</p>
      </Modal>
    </div>
  );
}
