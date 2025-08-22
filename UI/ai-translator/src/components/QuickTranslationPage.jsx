import React, { useState } from "react";
import {
  Row,
  Col,
  Button,
  Input,
  message,
  Upload,
  Space,
  Typography,
  Card,
} from "antd";
import {
  UploadOutlined,
  TranslationOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import DownloadDraftButton from "./DownloadDraftButton";
import LanguageSelect from "./LanguageSelect";
import vachanApi from "../api/vachan";
import Papa from "papaparse"; // ✅ CSV parser

const { TextArea } = Input;
const { Title, Text } = Typography;

// ------------------ API Helpers ------------------
async function getAccessToken() {
  console.log("🔑 Requesting token:", "https://api.vachanengine.org/v2/ai/token");
  const params = new URLSearchParams();
  params.append("username", import.meta.env.VITE_VACHAN_USERNAME);
  params.append("password", import.meta.env.VITE_VACHAN_PASSWORD);

  const resp = await vachanApi.post("/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  console.log("✅ Token response:", resp.data);

  return resp.data.access_token;
}

async function requestDocTranslation(token, file, srcLangCode, tgtLangCode) {
  const formData = new FormData();
  formData.append("file", file);

  console.log("📦 Uploading file:", file.name, file.type, file.size);
  console.log(
    "📤 Sending document translation:",
    `${vachanApi.defaults.baseURL}/model/text/translate-document`
  );

  const resp = await vachanApi.post(
    `/model/text/translate-document?device=cpu&model_name=nllb-600M&source_language=${srcLangCode}&target_language=${tgtLangCode}`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  console.log("📥 Doc translation response:", resp.data);
  return resp.data.data.jobId;
}

// ------------------ Polling ------------------
async function pollJobStatus(token, jobId, onStatusUpdate) {
  while (true) {
    const resp = await vachanApi.get(`/model/job?job_id=${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = resp.data?.data?.status?.toLowerCase();
    console.log(`⏳ Job ${jobId} status:`, status);

    if (onStatusUpdate) onStatusUpdate(status);

    if (status?.includes("finished")) {
      return jobId;
    }
    if (status?.includes("failed")) {
      throw new Error("❌ Translation job failed");
    }

    await new Promise((r) => setTimeout(r, 3000)); // poll every 3s
  }
}



async function fetchAssets(token, jobId) {
  const resp = await vachanApi.get(`/assets?job_id=${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });

  console.log("📥 Assets response (blob):", resp.data);

  const text = await resp.data.text();
  console.log("📥 Assets response (parsed text):", text);
  return text;
}

export default function QuickTranslationPage() {
  const [sourceLang, setSourceLang] = useState(null);
  const [targetLang, setTargetLang] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [isTargetEdited, setIsTargetEdited] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");


  // ------------------ Copy & Paste Logic ------------------
  const handleCopy = (content) => {
    try {
      navigator.clipboard.writeText(content);
      message.success("✅ Copied!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      message.error(" Copy failed!");
    }
  };

  const handlePaste = async (setContent) => {
    try {
      const clipText = await navigator.clipboard.readText();
      setContent(clipText);
      message.success("📥 Pasted!");
    } catch (err) {
      console.error("Failed to paste: ", err);
      message.error(" Paste failed!");
    }
  };

  const handleClearAll = () => {
    setSourceText("");
    setTargetText("");
    setIsTargetEdited(false);
    message.info("🗑️ All text cleared!");
  };

  // ------------------ Syncing Source -> Target ------------------
  const handleSourceChange = (e) => {
    const newText = e.target.value;
    setSourceText(newText);
    if (!isTargetEdited) {
      setTargetText(newText);
    }
  };

  const handleTargetChange = (e) => {
    setTargetText(e.target.value);
    setIsTargetEdited(true);
  };

  // ------------------ File Upload Handler ------------------
  const handleFileUpload = (file) => {
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceText(e.target.result);
      setTargetText("");
      setIsTargetEdited(false);
      message.success(`✅ Loaded file: ${file.name}`);
    };
    reader.readAsText(file);
    return false;
  };

  // ------------------ Translation Call ------------------
  const handleTranslate = async () => {
    if (!sourceLang || !targetLang) {
      message.error("Please select both source and target languages");
      return;
    }
  
    try {
      const token = await getAccessToken(
        import.meta.env.VITE_VACHAN_USERNAME,
        import.meta.env.VITE_VACHAN_PASSWORD
      );
  
      let fileToSend;
  
      if (uploadedFile) {
        // ✅ Handle uploaded files by extension
        if (uploadedFile.name.endsWith(".usfm")) {
          const text = await uploadedFile.text();
          const plain = text
            .replace(/\\c\s+\d+/g, "\n\n") // chapters → paragraph
            .replace(/\\v\s+\d+/g, "\n")   // verses → line
            .replace(/\\[^\s]+/g, "");     // strip USFM markers
          const blob = new Blob([plain], { type: "text/plain" });
          fileToSend = new File([blob], "normalized.txt", { type: "text/plain" });
          console.log("📝 Normalized USFM → TXT, size:", fileToSend.size);
        } else if (uploadedFile.name.endsWith(".docx")) {
          // parse docx → txt (client-side with mammoth)
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const mammoth = await import("mammoth");
          const { value: text } = await mammoth.extractRawText({ arrayBuffer });
          const blob = new Blob([text], { type: "text/plain" });
          fileToSend = new File([blob], "normalized.txt", { type: "text/plain" });
          console.log("📝 Extracted DOCX → TXT, size:", fileToSend.size);
        } else if (uploadedFile.name.endsWith(".txt")) {
          fileToSend = uploadedFile; // send directly
        } else {
          message.error("❌ Unsupported file format. Please use .txt, .usfm, or .docx");
          return;
        }
      } else {
        // ✅ Handle copy-paste case → always wrap into .txt
        const blob = new Blob([sourceText], { type: "text/plain" });
        fileToSend = new File([blob], "input.txt", { type: "text/plain" });
        console.log("📝 Wrapped pasted text into TXT, size:", fileToSend.size);
      }

      const jobId = await requestDocTranslation(
        token,
        fileToSend,
        sourceLang?.BCP_code,
        targetLang?.BCP_code
      );
      setStatusMsg("⏳ Translating... please wait");

      console.log("sourceLang state:", sourceLang);
      console.log("targetLang state:", targetLang);

      const finishedJobId = await pollJobStatus(token, jobId, (status) => {
        setStatusMsg(`⏳ Job ${jobId} status: ${status}`);
      });

      const csvText = await fetchAssets(token, finishedJobId);

      // ✅ Use PapaParse to handle commas & quotes correctly
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      console.log("📥 Parsed CSV data:", parsed.data);

      const translations = parsed.data
        .map((row) => row.Translation?.trim())
        .filter((t) => t && t.length > 0);

      if (translations.length === 0) {
        message.error("No translations found in CSV");
        return;
      }

      setTargetText(translations.join("\n"));
      setIsTargetEdited(true);
      message.success("✅ Translation complete!");
    } catch (err) {
      console.error(err);
      message.error("❌ Translation failed");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Quick Translation</Title>
      <Text type="secondary">
        Translate instantly by pasting text or uploading a file.
      </Text>

      {/* Controls */}
      <Row
        justify="space-between"
        align="middle"
        style={{ marginTop: 20, marginBottom: 20 }}
        gutter={16}
      >
        <Col>
          <Space>
            <Text strong>Source</Text>
            <LanguageSelect value={sourceLang} onChange={setSourceLang} />
            <Text strong>Target</Text>
            <LanguageSelect value={targetLang} onChange={setTargetLang} />
          </Space>
        </Col>

        <Col>
        <Space direction="vertical">
          <Space>
            <Upload
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".txt,.usfm,.docx,.pdf"
            >
              <Button icon={<UploadOutlined />}>Upload File</Button>
            </Upload>
            <Button
              type="primary"
              icon={<TranslationOutlined />}
              onClick={handleTranslate}
            >
              Translate
            </Button>
           
          </Space>
          {statusMsg && <Text type="secondary">{statusMsg}</Text>}
        </Space>


        </Col>
      </Row>

      {/* Editor Panels */}
      <Row gutter={24}>
        {/* Source Panel */}
        <Col xs={24} md={12}>
          <Card
            title="Source"
            extra={
              <Button
                type="text"
                icon={<CloseOutlined />}
                style={{ color: "#ff7a00" }}
                onClick={handleClearAll}
              />
            }
            actions={[
              <Button
                type="text"
                key="paste"
                onClick={() => handlePaste(setSourceText)}
              >
                📥 Paste
              </Button>,
              <Button
                type="text"
                key="copy"
                onClick={() => handleCopy(sourceText)}
              >
                📋 Copy
              </Button>,
            ]}
          >
            <TextArea
              rows={12}
              value={sourceText}
              onChange={handleSourceChange}
              placeholder="Enter or paste text here..."
            />
          </Card>
        </Col>

        {/* Target Panel */}
        <Col xs={24} md={12}>
          <Card
            title="Target"
            actions={[
              <Button
                type="text"
                key="copy"
                onClick={() => handleCopy(targetText)}
              >
                📋 Copy
              </Button>,
              <DownloadDraftButton content={targetText} />, // ✅ pass target text
            ]}
          >
            <TextArea
              rows={12}
              value={targetText}
              onChange={handleTargetChange}
              placeholder="Translated text will appear here..."
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
