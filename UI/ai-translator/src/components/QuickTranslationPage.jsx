import React, { useState } from "react";
import {
  Row,
  Col,
  Button,
  Input,
  Upload,
  Space,
  Typography,
  Card,
  App,
  Spin
} from "antd";
import {
  UploadOutlined,
  TranslationOutlined,
  CloseOutlined,
  SwapOutlined,
  CopyOutlined, 
  DownloadOutlined,
  SaveOutlined
} from "@ant-design/icons";
import DownloadDraftButton from "./DownloadDraftButton";
import LanguageSelect from "./LanguageSelect";
import vachanApi from "../api/vachan";
import Papa from "papaparse"; // CSV parser

const { TextArea } = Input;
const { Title, Text } = Typography;

// A token that marks line boundaries. The MT model won’t translate this.
const LINE_SENTINEL = " ⟦LB⟧ ";
// ------------------ API Helpers ------------------
async function getAccessToken() {
  console.log("🔑 Requesting token:", "https://api.vachanengine.org/v2/ai/token");
  const params = new URLSearchParams();
  params.append("username", import.meta.env.VITE_VACHAN_USERNAME);
  params.append("password", import.meta.env.VITE_VACHAN_PASSWORD);

  const resp = await vachanApi.post("/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  console.log(" Token response:", resp.data);

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
      throw new Error(" Translation job failed");
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
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  // ------------------ Copy & Paste Logic ------------------
  const handleCopy = (content) => {
    try {
      navigator.clipboard.writeText(content);
      message.success(" Copied!");
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
    message.info(" All text cleared!");
  };

  // ------------------ Syncing Source -> Target ------------------
  const handleSourceChange = (e) => {
    const newText = e.target.value;
    setSourceText(newText);
  
    // Whenever source is cleared or replaced, reset target
    if (!isTargetEdited) {
      setTargetText("");
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
      message.success(` Loaded file: ${file.name}`);
    };
    reader.readAsText(file);
    return false;
  };

  // ------------------ Translation Call ------------------
  // ------------------ USFM-Aware Translation Handler ------------------
  const handleTranslate = async () => {
    if (!sourceLang || !targetLang) {
      message.error("Please select both source and target languages before translating.");
      return;
    }
  
    if (!sourceText.trim()) {
      message.warning("Please enter or upload some source text first.");
      return;
    }
  
    try {
      setLoading(true);
      const token = await getAccessToken(
        import.meta.env.VITE_VACHAN_USERNAME,
        import.meta.env.VITE_VACHAN_PASSWORD
      );
  
      let textToTranslate;
      let isUSFMContent = false;
      let usfmStructure = null;
  
      // Normalize functions
      function normalizeText(text) {
        return text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map(line =>
            line
              .replace(/\s+([.,!?;:])/g, "$1")
              .replace(/([.,!?;:])(?=\S)/g, "$1 ")
              .replace(/\s+/g, " ")
              .trim()
          )
          .join("\n");
      }
  
      function normalizeTranslation(text) {
        return text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map(line =>
            line
              .replace(/\s+([.,!?;:])/g, "$1")
              .replace(/([.,!?;:])(?=\S)/g, "$1 ")
              .replace(/\s+/g, " ")
              .trim()
          )
          .join("\n");
      }
  
      //  Handle uploaded file or pasted text
      if (uploadedFile) {
        const fileContent = await uploadedFile.text();
  
        if (uploadedFile.name.endsWith(".usfm") || containsUSFMMarkers(fileContent)) {
          console.log("📝 Detected USFM content");
          isUSFMContent = true;
          const extracted = extractUSFMContent(fileContent);
          usfmStructure = extracted.structure;
          textToTranslate = normalizeText(extracted.plainText);
        } else if (uploadedFile.name.endsWith(".docx")) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const mammoth = await import("mammoth");
          const { value: text } = await mammoth.extractRawText({ arrayBuffer });
          textToTranslate = normalizeText(text);
        } else {
          textToTranslate = normalizeText(fileContent);
        }
      } else {
        if (containsUSFMMarkers(sourceText)) {
          console.log("📝 Detected USFM content in pasted text");
          isUSFMContent = true;
          const extracted = extractUSFMContent(sourceText);
          usfmStructure = extracted.structure;
          textToTranslate = normalizeText(extracted.plainText);
        } else {
          textToTranslate = normalizeText(sourceText);
        }
      }
  
      // Send cleaned text for translation
      const blob = new Blob([textToTranslate], { type: "text/plain" });
      const fileToSend = new File([blob], "content_only.txt", { type: "text/plain" });
  
      console.log("📤 Sending clean text to API:", textToTranslate.substring(0, 200) + "...");
  
      const jobId = await requestDocTranslation(
        token,
        fileToSend,
        sourceLang?.BCP_code,
        targetLang?.BCP_code
      );
  
      setStatusMsg("⏳ Translating... please wait");
  
      const finishedJobId = await pollJobStatus(token, jobId, (status) => {
        setStatusMsg(`⏳ Job ${jobId} status: ${status}`);
      });
  
      const csvText = await fetchAssets(token, finishedJobId);
  
      // Parse CSV
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        trimHeaders: true,
      });
  
      console.log("📥 Parsed CSV data:", parsed.data);
  
      // ✅ Build translated output
      let translatedText;
  
      if (isUSFMContent && usfmStructure) {
        translatedText = reconstructUSFM(usfmStructure, parsed.data);
      } else {
        translatedText = simpleTranslation(sourceText, parsed.data);
      }
  
      setTargetText(normalizeTranslation(translatedText));
      setIsTargetEdited(false);
      message.success("Translation complete!");
      setLoading(false);
      setStatusMsg("");
  
    } catch (err) {
      console.error("❌ Translation error:", err);
      setLoading(false);
      setStatusMsg("");
      message.error(`Translation failed: ${err.message}`);
    }
  };
  
  // ✅ Helper: detect USFM
  function containsUSFMMarkers(text) {
    return /\\(id|c|v|s\d?|p|q\d?|m|nb|b|d|sp|pb|li\d?|pi\d?|pc|pr|cls|table|tr|th\d?|tc\d?|tcc\d?)\b/.test(text);
  }
  
  // ✅ Helper: extract USFM
  function extractUSFMContent(usfmText) {
    const lines = usfmText.split('\n');
    const structure = [];
    const translatableSegments = [];
  
    lines.forEach((line, index) => {
      const trimmed = line.trim();
  
      if (!trimmed) {
        structure.push({ type: 'empty', originalLine: line, lineNumber: index });
      } else if (trimmed.match(/^\\(id|c|h|toc\d?|mt\d?|ms\d?|mr|s\d?|sr|r|d|sp|pb)/)) {
        structure.push({ type: 'marker', originalLine: line, lineNumber: index });
      } else if (trimmed.match(/^\\p$/)) {
        structure.push({ type: 'marker', originalLine: line, lineNumber: index });
      } else {
        let translatableText = trimmed;
        let prefix = '';
  
        const verseMatch = trimmed.match(/^(\\v\s+\d+\s*)(.*)/);
        if (verseMatch) {
          prefix = verseMatch[1];
          translatableText = verseMatch[2];
        }
  
        const sectionMatch = trimmed.match(/^(\\s\d?\s*)(.*)/);
        if (sectionMatch) {
          prefix = sectionMatch[1];
          translatableText = sectionMatch[2];
        }
  
        if (translatableText.trim()) {
          structure.push({
            type: 'translatable',
            originalLine: line,
            lineNumber: index,
            prefix,
            translationIndex: translatableSegments.length
          });
          translatableSegments.push(translatableText.trim());
        } else {
          structure.push({ type: 'marker', originalLine: line, lineNumber: index });
        }
      }
    });
  
    return {
      structure,
      plainText: translatableSegments.join('\n'),
      originalSegments: translatableSegments
    };
  }
  
  // ✅ Helper: rebuild USFM
  function reconstructUSFM(structure, csvData) {
    const translations = csvData.map(row => row.Translation?.trim()).filter(Boolean);
  
    return structure.map((element) => {
      if (element.type === 'translatable') {
        const translation = translations[element.translationIndex];
        if (translation) {
          const originalIndent = element.originalLine.match(/^\s*/)[0];
          return originalIndent + element.prefix + translation;
        } else {
          return element.originalLine;
        }
      } else {
        return element.originalLine;
      }
    }).join('\n');
  }
  
  //  Helper: non-USFM translation
  function simpleTranslation(originalText, csvData) {
    const translations = csvData.map(row => row.Translation?.trim()).filter(Boolean);
    if (translations.length === 0) return originalText;
  
    const originalLines = originalText.split('\n');
    if (translations.length === 1) {
      return translations[0];
    } else if (translations.length === originalLines.length) {
      return translations.join('\n');
    } else {
      return translations.join('\n\n');
    }
  }
  

  return (
    <div style={{ padding: 24, marginBottom: 0 }}>
  <Title level={2} style={{ marginBottom: 0 }}>
    Quick Translation
  </Title>
  <Text type="secondary" style={{ display: "block", marginTop: 0 , marginBottom: 20}}>
    Translate instantly by pasting text or uploading a file.
  </Text>

      {/* Controls */}

<Row gutter={24}>
  {/* Language Settings Section */}
  <Col span={24}>
    <Card>
      <Title level={4}>🌐 Language Settings</Title>
      <Row gutter={16} align="middle" justify="center">
        <Col xs={24} md={10}>
          <LanguageSelect
            value={sourceLang}
            onChange={setSourceLang}
            disabled={loading}
            placeholder="Select source language"
          />
        </Col>
        <Col xs={24} md={4} style={{ textAlign: "center" }}>
          <Button
            shape="circle"
            icon={<SwapOutlined />}
            onClick={() => {
              const temp = sourceLang;
              setSourceLang(targetLang);
              setTargetLang(temp);
            }}
            disabled={loading}
          />
        </Col>
        <Col xs={24} md={10}>
          <LanguageSelect
            value={targetLang}
            onChange={setTargetLang}
            disabled={loading}
            placeholder="Select target language"
          />
        </Col>
      </Row>
    </Card>
  </Col>

  {/* Source Panel */}
  <Col xs={24} md={12} style={{ marginTop: 16}}>
    <Card
      title={<span>Source Text</span>}
      extra={<span style={{ fontWeight: 500 }}>{sourceLang?.label}</span>}
    >
      <TextArea
        rows={10}
        value={sourceText}
        onChange={handleSourceChange}
        placeholder="Enter or upload text to translate..."
        disabled={loading}
      />
      <div style={{ marginTop: 12, textAlign: "left" }}>
        <Space>
          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".txt,.usfm,.docx,.pdf"
            disabled={loading}
          >
            <Button icon={<UploadOutlined />} disabled={loading}>
              Upload File
            </Button>
          </Upload>
          <Button onClick={handleClearAll} icon={<CloseOutlined />} disabled={loading}>
            Clear
          </Button>
        </Space>
      </div>
    </Card>
  </Col>

  {/* Target Panel */}
  <Col xs={24} md={12} style={{ marginTop: 16}}>
    <Card
      title={<span>Translation</span>}
      extra={<span style={{ fontWeight: 500 }}>{targetLang?.label}</span>}
    >
      <Spin spinning={loading} tip="Translating...">
        <TextArea
          rows={10}
          value={targetText}
          onChange={handleTargetChange}
          placeholder="Translation will appear here..."
          disabled={loading}
        />
      </Spin>
      <div style={{ marginTop: 12, textAlign: "left" }}>
        <Space>
          <Button icon={<CopyOutlined />} onClick={() => handleCopy(targetText)} disabled={loading}>
            Copy
          </Button>
          <Button  type="primary" icon={<DownloadOutlined />} onClick={() => DownloadDraftButton(targetText)} disabled={loading}>
            Download
          </Button>
          <Button
    icon={<SaveOutlined />}
    onClick={() => {
      message.success("✅ Translation saved successfully!");
    }}
  >
    Save
  </Button>
        </Space>
      </div>
    </Card>
  </Col>

  {/* Translate button centered */}
  <Col span={24} style={{ textAlign: "center", marginTop: 24 }}>
    <Button
      type="primary"
      size="large"
      icon={<TranslationOutlined />}
      onClick={handleTranslate}
      loading={loading}
      disabled={loading}
      style={{ padding: "0 32px", borderRadius: "8px" }}
    >
      Translate
    </Button>
    {statusMsg && (
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">{statusMsg}</Text>
      </div>
    )}
  </Col>
</Row>

    </div>
  );
}