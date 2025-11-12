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
  // message,
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
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useParams, Link } from "react-router-dom";
import { textDocumentAPI } from "./api.js";
import DownloadDraftButton from "./DownloadDraftButton";
import { InfoCircleOutlined } from "@ant-design/icons";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

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
  "nllb-english-zeme": {
    Model: "nllb-english-zeme",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "Zeme Naga, English",
  },
  "nllb-english-nagamese": {
    Model: "nllb-english-nagamese",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "English, Nagamese",
  },
  "nllb-gujrathi-koli_kachchi": {
    Model: "nllb-gujrathi-koli_kachchi",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "Gujarati, Kachi Koli",
  },
  "nllb-hindi-surjapuri": {
    Model: "nllb-hindi-surjapuri",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "Hindi, Surjapuri",
  },
  "nllb-gujarati-kukna": {
    Model: "nllb-gujarati-kukna",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "Gujarati, Kukna",
  },
  "nllb-gujarati-kutchi": {
    Model: "nllb-gujarati-kutchi",
    Tasks: "mt, text translation",
    "Language Code Type": "BCP-47",
    DevelopedBy: "Meta",
    License: "CC-BY-NC 4.0",
    Languages: "Gujarati, Kutchi",
  },
};
const MODEL_OPTIONS = [
  {
    label: "nllb-600M",
    value: "nllb-600M",
    tooltip: "General-purpose model for 200 languages.",
  },
  {
    label: "nllb-english-zeme",
    value: "nllb-english-zeme",
    tooltip: "This model only supports English -> Zeme Naga.",
  },
  {
    label: "nllb-gujrathi-koli_kachchi",
    value: "nllb-gujrathi-koli_kachchi",
    tooltip: "This model only supports Gujarati -> Kachi Koli.",
  },
  {
    label: "nllb-english-nagamese",
    value: "nllb-english-nagamese",
    tooltip: "This model only supports English ↔ Nagamese.",
  },
  {
    label: "nllb-hindi-surjapuri",
    value: "nllb-hindi-surjapuri",
    tooltip: "This model only supports Hindi ↔ Surjapuri.",
  },
  {
    label: "nllb-gujarati-kukna",
    value: "nllb-gujarati-kukna",
    tooltip: "This model only supports Gujarati ↔ Kukna.",
  },
  {
    label: "nllb-gujarati-kutchi",
    value: "nllb-gujarati-kutchi",
    tooltip: "This model only supports Gujarati ↔ Kutchi.",
  },
];

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

async function requestDocTranslation(
  token,
  file,
  srcLangCode,
  tgtLangCode,
  model_name,
  output_format = "txt"
) {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await vachanApi.post(
    `/model/text/translate-document?device=cpu&model_name=${model_name}&source_language=${srcLangCode}&target_language=${tgtLangCode}&output_format=${output_format}`,
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

// async function fetchAssets(token, jobId) {
//   const resp = await vachanApi.get(`/assets?job_id=${jobId}`, {
//     headers: { Authorization: `Bearer ${token}` },
//     responseType: "blob",
//   });
//   return await resp.data.text();
// }
async function fetchAssets(token, jobId) {
  const resp = await vachanApi.get(`/assets?job_id=${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "text", // allow plain text response too
  });

  console.log("📦 Raw assets data:", resp.data);

  // 🧠 Case 1: API returned direct translation (plain text)
  if (typeof resp.data === "string" && !resp.data.includes("asset_id")) {
    console.log("✅ API returned plain translated text directly");
    return resp.data.trim();
  }

  // 🧠 Case 2: API returned JSON with assets
  let assets;
  try {
    const data =
      typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    assets = data?.data?.files || data?.data || [];
  } catch (err) {
    console.warn("⚠️ Could not parse JSON, treating as plain text output");
    return resp.data.trim();
  }

  if (!Array.isArray(assets) || assets.length === 0) {
    console.error("❌ No assets found. Response was:", resp.data);
    throw new Error("No assets found for this job");
  }

  // Find the correct output file
  const outputFile = assets.find(
    (f) =>
      f.file_type?.toLowerCase().includes("output") ||
      f.asset_type?.toLowerCase().includes("output") ||
      f.file_name?.toLowerCase().includes("translated")
  );

  if (!outputFile) {
    console.error("❌ No output file found in assets:", assets);
    throw new Error("No output file found in assets");
  }

  // Download the translated text file
  const textResp = await vachanApi.get(
    `/assets/download?asset_id=${outputFile.asset_id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "text",
    }
  );

  console.log("📥 Downloaded translated text length:", textResp.data?.length);
  return textResp.data.trim();
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
  const translations = csvData
    .map((row) => row.Translation?.trim())
    .filter(Boolean);
  return structure
    .map((el) =>
      el.type === "translatable"
        ? el.prefix + (translations[el.translationIndex] || "")
        : el.originalLine
    )
    .join("\n");
}

function simpleTranslation(sourceText, csvData) {
  const translations = csvData
    .map((row) => row.Translation?.trim())
    .filter(Boolean);
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

  const { message, notification } = App.useApp();
  const [modal, modalContextHolder] = Modal.useModal();

  const showNotification = (type, title, description, duration = 2) => {
    try {
      notification[type]({
        key: 1,
        message: title,
        description: description,
        duration: duration,
        placement: "top", // appears top-center
        style: {
          fontSize: "13px", // smaller than 14px
          padding: "6px 12px", // tighter padding
          borderRadius: "4px", // subtle rounded corners
          maxWidth: "350px", // restrict width
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)", // subtle shadow
        },
      });

      // Method 3: Console log for debugging
      console.log(`${type.toUpperCase()}: ${title} - ${description}`);
    } catch (err) {
      console.error("Notification error:", err);
      // Fallback to browser alert
      alert(`${type.toUpperCase()}: ${description}`);
    }
  };

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
  useEffect(() => {
    if (!project?.source_language?.code || !project?.target_language?.code)
      return;

    const src = project.source_language.code;
    const tgt = project.target_language.code;
    let modelToUse = "nllb-600M";

    const isEngNzemePair = src === "eng_Latn" && tgt === "nzm_Latn";

    const isEngNagPair =
      (src === "eng_Latn" && tgt === "nag_Latn") ||
      (src === "nag_Latn" && tgt === "eng_Latn");

    const isGujGjkPair = src === "guj_Gujr" && tgt === "gjk_Gujr";

    const isHinSjpPair =
      (src === "hin_Deva" && tgt === "sjp_Deva") ||
      (src === "sjp_Deva" && tgt === "hin_Deva");

    const isGujKukPair =
      (src === "guj_Gujr" && tgt === "kex_Gujr") ||
      (src === "kex_Gujr" && tgt === "guj_Gujr");

    const isGujKutPair =
      (src === "guj_Gujr" && tgt === "kfr_Gujr") ||
      (src === "kfr_Gujr" && tgt === "guj_Gujr");

    if (isEngNzemePair) modelToUse = "nllb-english-zeme";
    else if (isEngNagPair) modelToUse = "nllb-english-nagamese";
    else if (isGujGjkPair) modelToUse = "nllb-gujrathi-koli_kachchi";
    else if (isHinSjpPair) modelToUse = "nllb-hindi-surjapuri";
    else if (isGujKukPair) modelToUse = "nllb-gujarati-kukna";
    else if (isGujKutPair) modelToUse = "nllb-gujarati-kutchi";

    setSelectedModel(modelToUse);
    console.log(`🎯 Auto-selected model for ${src} ↔ ${tgt}: ${modelToUse}`);
  }, [project]);

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
      showNotification(
        "success",
        "Translation Saved",
        "Translation saved successfully!"
      );
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
  const handleDeleteFile = () => {
    if (!selectedFile) return;
    modal.confirm({
      title: "Delete File",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${selectedFile.file_name}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await textDocumentAPI.deleteFile(projectId, selectedFile.id);
          message.success("File deleted successfully!");
          const updatedFiles = projectFiles.filter(
            (f) => f.id !== selectedFile.id
          );
          setProjectFiles(updatedFiles);
          setSelectedFile(null);
          setSourceText("");
          setTargetText("");
        } catch (err) {
          console.error(err);
          message.error("Failed to delete file");
        }
      },
    });
  };

  // ------------------  Upload handler ------------------
  const handleFileUpload = async (file) => {
    // 1. Validation Checks
    const allowedExtensions = [".txt", ".usfm", ".docx", ".pdf"];
    const fileExtension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      message.error(
        `Unsupported Format: Only .txt, .usfm, .docx, and .pdf files are supported.`
      );
      return Upload.LIST_IGNORE; // stop upload right away
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error(`File is too large: File must be smaller than 2MB!`);
      return Upload.LIST_IGNORE; // block upload
    }

    if (file.name.endsWith(".doc")) {
      message.error(
        `Unsupported File: Old Word (.doc) files are not supported. Use .docx, .txt, or .pdf.`
      );
      return false;
    }

    let textContent = "";

    try {
      // 2. File Reading Logic
      if (file.name.endsWith(".pdf")) {
        // Extract text from PDF using the worker
        const arrayBuffer = await file.arrayBuffer();
        // NOTE: The pdfjsLib must be imported correctly at the top of the file
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item) => item.str);
          // Join strings with a space to keep them readable, then add newline per page
          textContent += strings.join(" ") + "\n";
        }
      } else if (file.name.endsWith(".docx")) {
        // Extract text from DOCX using Mammoth
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });
        textContent = text;
      } else {
        // Simple text file reading (TXT, USFM)
        const reader = new FileReader();
        textContent = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      // 3. Update State
      setSourceText(textContent);
      setTargetText("");
      message.success(`File Loaded: ${file.name}`);
    } catch (err) {
      console.error("Failed to read file:", err);
      message.error("File Load Failed: Failed to load file.");
      return false;
    }

    return false; // prevent Ant Design from auto-uploading
  };

  // ------------------ Translate handler (Vachan workflow) ------------------
  const HARDCODED_PAIRS = {
    "nllb-english-zeme": { src: "eng_Latn", tgt: "nzm_Latn" },
    "nllb-english-nagamese": { src: "eng_Latn", tgt: "nag_Latn" },
    "nllb-gujrathi-koli_kachchi": { src: "guj_Gujr", tgt: "gjk_Gujr" },
    "nllb-hindi-surjapuri": { src: "hin_Deva", tgt: "sjp_Deva" },
    "nllb-gujarati-kukna": { src: "guj_Gujr", tgt: "kex_Gujr" },
    "nllb-gujarati-kutchi": { src: "guj_Gujr", tgt: "kfr_Gujr" },
  };
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
        message.warning(
          " This file contains USFM markers. The translation output may not be accurate.Use verse translation for better results."
        );

        const extracted = extractUSFMContent(sourceText);
        textToTranslate = extracted.plainText;
        isUSFM = true;
        usfmStructure = extracted.structure;
      } else {
        textToTranslate = sourceText;
      }
      // 🧩 DEBUG: Check what text is actually being sent to the API
      console.log("📤 Sending textToTranslate:", textToTranslate);
      console.log("📄 Length of textToTranslate:", textToTranslate.length);

      // 3. Prepare file
      const blob = new Blob([textToTranslate], { type: "text/plain" });
      const fileToSend = new File([blob], "content.txt", {
        type: "text/plain",
      });

      // //  Use source/target language from selected file or project default
      // let srcCode = selectedFile?.source_id || project?.source_language?.code;
      // let tgtCode = selectedFile?.target_id || project?.target_language?.code;
      let srcCode, tgtCode;

      if (selectedModel === "nllb-600M") {
        // Use project/file default
        srcCode = selectedFile?.source_id || project?.source_language?.code;
        tgtCode = selectedFile?.target_id || project?.target_language?.code;
      } else {
        // Use hardcoded pair
        const pair = HARDCODED_PAIRS[selectedModel];
        if (!pair) {
          message.error(
            `No hardcoded language pair found for model ${selectedModel}`
          );
          return;
        }
        srcCode = pair.src;
        tgtCode = pair.tgt;
      }

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
        selectedModel,
        "txt"
      );

      message.info("⏳ Translating... please wait");

      // 5. Poll until finished
      await pollJobStatus({ token, jobId });

      // 6. Fetch assets
      const csvText = await fetchAssets(token, jobId);
      console.log("📦 Fetched asset text:", csvText);
      console.log("📏 Asset length:", csvText?.length);
      // 7. Parse CSV
      // const parsed = Papa.parse(csvText, {
      //   header: true,
      //   skipEmptyLines: true,
      // });

      // // 8. Rebuild translation
      // const translatedText = isUSFM
      //   ? reconstructUSFM(usfmStructure, parsed.data)
      //   : simpleTranslation(textToTranslate, parsed.data);
      let translatedText;

      if (
        csvText.startsWith("{") || // JSON or structured data
        csvText.includes(",Translation") || // CSV header detected
        csvText.includes("\t") // TSV-like structure
      ) {
        // Parse CSV or TSV structured response
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        translatedText = isUSFM
          ? reconstructUSFM(usfmStructure, parsed.data)
          : simpleTranslation(textToTranslate, parsed.data);
      } else {
        // Plain translated text — use directly
        translatedText = csvText.trim();
      }

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
      {modalContextHolder}
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
          style={{ marginBottom: 16 }}
          items={[
            {
              title: <Link to="/projects">Projects</Link>,
            },
            {
              title: project?.project_name || "Project",
            },
            ...(selectedFile
              ? [
                  {
                    title: selectedFile.file_name,
                  },
                ]
              : []),
          ]}
        />
        <h2
          style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "#1f2937" }}
        >
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
              // const allowedTypes = [
              //   "application/pdf",
              //   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              //   "text/plain",
              //   "application/usfm",
              //   "text/usfm",
              // ];
              const allowedExtensions = [".pdf", ".docx", ".txt", ".usfm"];

              const fileExt = file.name
                .slice(file.name.lastIndexOf("."))
                .toLowerCase();
              // if (fileExt === ".pdf") {
              //   message.error("PDF file type is not supported for now");
              //   return Upload.LIST_IGNORE; // prevents upload
              // }
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
              icon={
                <UploadOutlined
                  style={{ color: "#1890ff", cursor: "pointer", fontSize: 20 }}
                />
              }
              title="add a new file"
              style={{
                marginLeft: 8,
                //backgroundColor: 'rgb(44, 141, 251)',
                // borderColor: "rgb(44, 141, 251)",
              }}
            />
          </Upload>
          {/* Delete File Button */}
          {selectedFile && selectedFile.file_name !== "sample.txt" && (
            <Tooltip title="Delete file">
              <Button
                type="text"
                icon={
                  <DeleteOutlined
                    style={{ color: "red", cursor: "pointer", fontSize: 20 }}
                  />
                }
                onClick={handleDeleteFile}
                danger
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Translation Editor */}
      {selectedFile && (
        <Card
          title={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Left: Heading */}
              <h3 style={{ margin: 0 }}>Translation Editor</h3>

              {/* Right: Model dropdown + Info button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Model Dropdown */}
                <Select
                  value={selectedModel}
                  style={{ width: 250 }}
                  dropdownRender={() => {
                    const src = project?.source_language?.code || "";
                    const tgt = project?.target_language?.code || "";

                    return (
                      <>
                        {MODEL_OPTIONS.map((opt) => {
                          const isSelected = opt.value === selectedModel;
                          const disabled = opt.value !== selectedModel;

                          return (
                            <Tooltip
                              key={opt.value}
                              title={opt.tooltip}
                              placement="right"
                              overlayInnerStyle={{
                                backgroundColor: "#fff",
                                color: "#000",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                padding: "6px 10px",
                              }}
                            >
                              <div
                                style={{
                                  padding: "6px 12px",
                                  cursor: disabled ? "not-allowed" : "default",
                                  color: disabled ? "#999" : "#000",
                                  backgroundColor: isSelected
                                    ? "#e6f7ff"
                                    : "transparent",
                                  fontWeight: isSelected ? 600 : 400,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent changing model
                                }}
                              >
                                <span>{opt.label}</span>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </>
                    );
                  }}
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <Option
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.value !== selectedModel}
                    >
                      {opt.label}
                    </Option>
                  ))}
                </Select>
                <Tooltip
                  title={
                    selectedModel && MODEL_INFO[selectedModel]
                      ? Object.entries(MODEL_INFO[selectedModel]).map(
                          ([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {value}
                            </div>
                          )
                        )
                      : "Select a model to view details"
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
                          showNotification(
                            "success",
                            "Copied",
                            "Text copied to clipboard!"
                          ); // 3.success("Copied to clipboard!");
                        }}
                        size="middle"
                      />
                    </Tooltip>

                    <DownloadDraftButton
                      content={targetText}
                      sourceLanguage={sourceLangName}
                      targetLanguage={targetLangName}
                      uploadedFileName={selectedFile?.file_name}
                      translationType="text"
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
