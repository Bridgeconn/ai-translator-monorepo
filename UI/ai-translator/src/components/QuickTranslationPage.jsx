import React, { useState, useEffect, useRef } from "react";
import {
  Row,
  Col,
  Button,
  Input,
  Upload,
  Space,
  Typography,
  Card,
  Spin,
  Modal,
  Select,
  Alert,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  TranslationOutlined,
  CloseOutlined,
  SwapOutlined,
  CopyOutlined,
  DownloadOutlined,
  SaveOutlined,
  SaveFilled,
  PlusOutlined,
} from "@ant-design/icons";
import DownloadDraftButton from "./DownloadDraftButton";
import LanguageSelect from "./LanguageSelect";
import vachanApi from "../api/vachan";
import Papa from "papaparse"; // CSV parser
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import { App } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useAuthModal } from "./AuthModalContext";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const { TextArea } = Input;
const { Title, Text } = Typography;

// A token that marks line boundaries. The MT model won’t translate this.
const LINE_SENTINEL = " ⟦LB⟧ ";
// ------------------ API Helpers ------------------
async function getAccessToken() {
  console.log(
    "🔑 Requesting token:",
    "https://api.vachanengine.org/v2/ai/token"
  );
  const params = new URLSearchParams();
  params.append("username", import.meta.env.VITE_VACHAN_USERNAME);
  params.append("password", import.meta.env.VITE_VACHAN_PASSWORD);

  const resp = await vachanApi.post("/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  console.log(" Token response:", resp.data);

  return resp.data.access_token;
}

async function requestDocTranslation(token, file, srcLangCode, tgtLangCode, model_name) {
  const formData = new FormData();
  formData.append("file", file);

  console.log("📦 Uploading file:", file.name, file.type, file.size);
  console.log(
    "📤 Sending document translation:",
    `${vachanApi.defaults.baseURL}/model/text/translate-document`
  );

  const resp = await vachanApi.post(
    `/model/text/translate-document?device=cpu&model_name=${model_name}&source_language=${srcLangCode}&target_language=${tgtLangCode}`,
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
async function pollJobStatus({
  token,
  jobId,
  onStatusUpdate,
  notification,
  maxAttempts = 200,
  interval = 3000,
  signal,
}) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      throw new Error("Translation cancelled");
    }

    try {
      const resp = await vachanApi.get(`/model/job?job_id=${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal, // attach abort signal to axios request
      });

      const status = resp.data?.data?.status?.toLowerCase();
      if (onStatusUpdate) onStatusUpdate(status);

      if (status?.includes("finished")) {
        return jobId;
      }

      if (status?.includes("failed")) {
        notification.error({
          message: "Translation Failed",
          description: "The translation job failed. Please try again later.",
        });
        throw new Error("Translation job failed");
      }
    } catch (err) {
      if (err.name === "CanceledError") {
        throw new Error("Translation cancelled");
      }
      notification.error({
        message: "Server Error",
        description: "Unable to check job status (server may be down).",
      });
      throw err;
    }

    attempts++;
    await new Promise((r) => setTimeout(r, interval));
  }

  notification.warning({
    message: "Translation Timeout",
    description: "The translation service did not respond in time.",
  });
  //throw new Error("Polling timed out after waiting too long");
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
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const { openLogin } = useAuthModal();
  const controllerRef = useRef(null);

  

  // Restore draft if available
  useEffect(() => {
    const draft = localStorage.getItem("quickTranslationDraft");
    if (draft) {
      try {
        const data = JSON.parse(draft);
        if (data.sourceText) setSourceText(data.sourceText);
        if (data.targetText) setTargetText(data.targetText);
        if (data.sourceLang) setSourceLang(data.sourceLang);
        if (data.targetLang) setTargetLang(data.targetLang);
        if (data.filename) setFilename(data.filename);
        if (typeof data.isTranslated === "boolean")
          setIsTranslated(data.isTranslated);

        // Clear it after restoring
        localStorage.removeItem("quickTranslationDraft");
      } catch (err) {
        console.error("Failed to restore draft:", err);
      }
    }
  }, []);
  const modelsInfo = {
    "nllb_finetuned_eng_nzm": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "Zeme Naga, English",
    },
    "nllb-600M": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "200 languages",
    },
  };
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showInfo = () => setIsModalVisible(true);
  const handleClose = () => setIsModalVisible(false);

  // ------------------ Additional state for error handling ------------------
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [filename, setFilename] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);
  const [createProjectModalVisible, setCreateProjectModalVisible] =
    useState(false);
  const [newProjectFilename, setNewProjectFilename] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState("");
  const [selectedModel, setSelectedModel] = useState("nllb-600M");
  const availableModels = [
    { label: "nllb-600M", value: "nllb-600M" },
    { label: "nllb_finetuned_eng_nzm", value: "nllb_finetuned_eng_nzm" }
  ];
  useEffect(() => {
    if (!saveModalVisible) return;

    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const resp = await fetch(
          import.meta.env.VITE_BACKEND_URL + "/api/project-text-documents/",
          {
            method: "GET", // explicitly tell it to use GET
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!resp.ok) {
          throw new Error(`Error ${resp.status}: ${resp.statusText}`);
        }

        const data = await resp.json();
        setProjects(data.data || []);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    };

    fetchProjects();
  }, [saveModalVisible]);

  // ------------------ Enhanced notification helper ------------------
  const showNotification = (type, title, description, duration = 4) => {
    try {
      notification[type]({
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
  // ✅ Auto-select correct model based on source/target languages
useEffect(() => {
  if (!sourceLang || !targetLang) return;

  const src = sourceLang.BCP_code;
  const tgt = targetLang.BCP_code;

  const isEngNzemePair =
    (src === "eng_Latn" && tgt === "nzm_Latn") ||
    (src === "nzm_Latn" && tgt === "eng_Latn");

  if (isEngNzemePair) {
    setSelectedModel("nllb_finetuned_eng_nzm");
  } else {
    setSelectedModel("nllb-600M");
  }
}, [sourceLang, targetLang]);

  // ------------------ Copy & Paste Logic ------------------
  const handleCopy = (content) => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          showNotification("success", "Copied", "Text copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          showNotification("error", "Copy Failed", "Could not copy text.");
        });
    } else {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showNotification("success", "Copied", "Text copied to clipboard!");
      } catch (err) {
        console.error("Fallback copy failed: ", err);
        showNotification("error", "Copy Failed", "Could not copy text.");
      }
      document.body.removeChild(textarea);
    }
  };

  const handlePaste = async (setContent) => {
    try {
      const clipText = await navigator.clipboard.readText();
      setContent(clipText);
      showNotification("success", "Pasted", "Text pasted from clipboard!");
    } catch (err) {
      console.error("Failed to paste: ", err);
      showNotification("error", "Paste Failed", "Could not paste text.");
    }
  };

  const handleClearAll = () => {
    setSourceText("");
    setTargetText("");
    setUploadedFile(null); // <--- clear uploaded file
    setIsTargetEdited(false);
    setStatusMsg("");
    showNotification("info", "Cleared", "All text cleared successfully.");
  };

  // ------------------ Syncing Source -> Target ------------------
  const handleSourceChange = (e) => {
    const newText = e.target.value;
    const sizeInMB = new Blob([newText]).size / 1024 / 1024;

    if (sizeInMB > 2) {
      showNotification(
        "error",
        "Too Large",
        "Text input must be smaller than 2MB!"
      );
      return; // don’t update state
    }
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
  const handleCancelTranslate = () => {
    controllerRef.current?.abort();
    setLoading(false);
    setStatusMsg("Translation cancelled.");
  };

  // ------------------ File Upload Handler ------------------
  const handleFileUpload = async (file) => {
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      showNotification(
        "error",
        "File is too large",
        "File must be smaller than 2MB!"
      );
      return Upload.LIST_IGNORE; // block upload
    }
    setUploadedFile(file);
    setFilename(file.name);
    setNewProjectFilename(file.name);

    if (file.name.endsWith(".doc")) {
      showNotification(
        "error",
        "Unsupported File",
        "Old Word (.doc) files are not supported. Use .docx, .txt, or .pdf."
      );

      return false;
    }

    let textContent = "";

    try {
      if (file.name.endsWith(".pdf")) {
        // Extract text from PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item) => item.str);
          textContent += strings.join(" ") + "\n";
        }
      } else if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });
        textContent = text;
      } else {
        const reader = new FileReader();
        textContent = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      setSourceText(textContent);
      setTargetText("");
      setIsTargetEdited(false);
      showNotification("success", "File Loaded", `Loaded file: ${file.name}`);
    } catch (err) {
      console.error("Failed to read file:", err);
      showNotification("error", "File Load Failed", "Failed to load file.");
      return false;
    }

    return false; // prevent auto upload
  };
  // ------------------ USFM-Aware Translation Handler ------------------
  const handleTranslate = async () => {
    if (!sourceLang || !targetLang) {
      showNotification(
        "error",
        "Missing Languages",
        "Please select both source and target languages before translating."
      );
      return;
    }

    if (!sourceText.trim() && !uploadedFile) {
      showNotification(
        "warning",
        "Missing Input",
        "Please enter or upload some source text first."
      );
      return;
    }

    //  Create AbortController right away so user can cancel anytime
    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;

    try {
      setLoading(true);
      setIsTranslated(false);
      setStatusMsg("⏳ Preparing translation...");

      // --- 1️⃣ Get API token ---
      const token = await getAccessToken(
        import.meta.env.VITE_VACHAN_USERNAME,
        import.meta.env.VITE_VACHAN_PASSWORD
      );
      if (signal.aborted) throw new Error("Translation cancelled");

      let textToTranslate = "";
      let isUSFMContent = false;
      let usfmStructure = null;

      // Normalization helpers
      const normalizeText = (text) =>
        text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((line) =>
            line
              .replace(/\s+([.,!?;:])/g, "$1")
              .replace(/([.,!?;:])(?=\S)/g, "$1 ")
              .replace(/\s+/g, " ")
              .trim()
          )
          .join("\n");

      const normalizeTranslation = (text) =>
        text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((line) => line.trim())
          .join("\n");

      // --- 2️⃣ Extract text from uploaded file or pasted text ---
      if (uploadedFile) {
        if (uploadedFile.name.endsWith(".pdf")) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          if (signal.aborted) throw new Error("Translation cancelled");

          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

          let pdfText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            if (signal.aborted) throw new Error("Translation cancelled");
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item) => item.str);
            pdfText += strings.join(" ") + "\n";
          }

          textToTranslate = normalizeText(pdfText);
        } else if (uploadedFile.name.endsWith(".docx")) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          if (signal.aborted) throw new Error("Translation cancelled");

          const mammoth = await import("mammoth");
          const { value: text } = await mammoth.extractRawText({ arrayBuffer });
          textToTranslate = normalizeText(text);
        } else {
          const fileContent = await uploadedFile.text();
          if (signal.aborted) throw new Error("Translation cancelled");

          if (containsUSFMMarkers(sourceText)) {
            showNotification(
              "warning",
              "USFM Markers Detected",
              "This text contains USFM markers. The translation output may not be accurate. Use verse translation for better results."
            );
          
            isUSFMContent = true;
            const extracted = extractUSFMContent(sourceText);
            usfmStructure = extracted.structure;
            textToTranslate = normalizeText(extracted.plainText);
          }
          
           else {
            textToTranslate = normalizeText(fileContent);
          }
        }
      } else {
        // Pasted text
        if (containsUSFMMarkers(sourceText)) {
          message.warning(
            " This file contains USFM markers. The translation output may not be accurate."
          )
          isUSFMContent = true;
          const extracted = extractUSFMContent(sourceText);
          usfmStructure = extracted.structure;
          textToTranslate = normalizeText(extracted.plainText);
        } else {
          textToTranslate = normalizeText(sourceText);
        }
      }

      if (signal.aborted) throw new Error("Translation cancelled");

      // --- 3️⃣ Prepare text file for translation API ---
      const blob = new Blob([textToTranslate], { type: "text/plain" });
      const fileToSend = new File([blob], "content_only.txt", {
        type: "text/plain",
      });

      console.log(
        "📤 Sending clean text to API:",
        textToTranslate.substring(0, 200) + "..."
      );

      // --- 4️⃣ Request translation job ---
      setStatusMsg("preparing translation...");
      const jobId = await requestDocTranslation(
        token,
        fileToSend,
        sourceLang?.BCP_code,
        targetLang?.BCP_code,
        selectedModel || "nllb-600M"
      );
      if (signal.aborted) throw new Error("Translation cancelled");

      setStatusMsg("⏳ Translating... please wait");

      // --- 5️⃣ Poll until job is finished ---
      const finishedJobId = await pollJobStatus({
        token,
        jobId,
        onStatusUpdate: (status) =>
          setStatusMsg(`Translation in progress...`),
        notification,
        signal, // ✅ pass controller signal here
      });
      if (signal.aborted) throw new Error("Translation cancelled");

      // --- 6️⃣ Fetch translated CSV ---
      const csvText = await fetchAssets(token, finishedJobId);
      if (signal.aborted) throw new Error("Translation cancelled");

      // --- 7️⃣ Parse CSV ---
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        trimHeaders: true,
      });

      console.log("📥 Parsed CSV data:", parsed.data);

      // --- 8️⃣ Rebuild translation ---
      let translatedText = "";
      if (isUSFMContent && usfmStructure) {
        translatedText = reconstructUSFM(usfmStructure, parsed.data);
      } else {
        translatedText = simpleTranslation(textToTranslate, parsed.data);
      }

      setTargetText(normalizeTranslation(translatedText));
      setIsTargetEdited(false);
      setIsTranslated(true);
      showNotification(
        "success",
        "Translation Complete",
        "Your translation is ready."
      );
      setStatusMsg("");
    } catch (err) {
      if (err.message === "Translation cancelled") {
        showNotification(
          "warning",
          "Translation Cancelled",
          "Translation cancelled by user."
        );
        setStatusMsg("Translation cancelled.");
      } else {
        console.error("Translation error:", err);
        showNotification("error", "Translation Failed", err.message);
        setStatusMsg("");
      }
    } finally {
      setLoading(false);
    }
  };
  //  Helper: detect USFM
  function containsUSFMMarkers(text) {
    return /\\(id|c|v|s\d?|p|q\d?|m|nb|b|d|sp|pb|li\d?|pi\d?|pc|pr|cls|table|tr|th\d?|tc\d?|tcc\d?)\b/.test(
      text
    );
  }

  // Helper: extract USFM
  function extractUSFMContent(usfmText) {
    const lines = usfmText.split("\n");
    const structure = [];
    const translatableSegments = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        structure.push({
          type: "empty",
          originalLine: line,
          lineNumber: index,
        });
      } else if (
        trimmed.match(/^\\(id|c|h|toc\d?|mt\d?|ms\d?|mr|s\d?|sr|r|d|sp|pb)/)
      ) {
        structure.push({
          type: "marker",
          originalLine: line,
          lineNumber: index,
        });
      } else if (trimmed.match(/^\\p$/)) {
        structure.push({
          type: "marker",
          originalLine: line,
          lineNumber: index,
        });
      } else {
        let translatableText = trimmed;
        let prefix = "";

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
            type: "translatable",
            originalLine: line,
            lineNumber: index,
            prefix,
            translationIndex: translatableSegments.length,
          });
          translatableSegments.push(translatableText.trim());
        } else {
          structure.push({
            type: "marker",
            originalLine: line,
            lineNumber: index,
          });
        }
      }
    });

    return {
      structure,
      plainText: translatableSegments.join("\n"),
      originalSegments: translatableSegments,
    };
  }

  // Helper: rebuild USFM
  function reconstructUSFM(structure, csvData) {
    const translations = csvData
      .map((row) => row.Translation?.trim())
      .filter(Boolean);

    return structure
      .map((element) => {
        if (element.type === "translatable") {
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
      })
      .join("\n");
  }

  //  Helper: non-USFM translation
  function simpleTranslation(sourceText, csvData) {
    const translations = csvData
      .map((row) => row.Translation?.trim())
      .filter(Boolean);
    const sourceLines = sourceText.split("\n");

    let translationIndex = 0;

    return sourceLines
      .map((line) => {
        const lineSentences = line.split(/(?<=[.!?।])\s+/);
        // split line into sentences
        const translatedSentences = lineSentences.map(
          () => translations[translationIndex++] || ""
        );
        return translatedSentences.join(" "); // keep all sentences on same line
      })
      .join("\n");
  }

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess("");

    // 🔑 Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification(
        "error",
        "Authentication Required",
        "Please login first."
      );

      // Save current state into localStorage before redirect
      localStorage.setItem(
        "quickTranslationDraft",
        JSON.stringify({
          sourceText,
          targetText,
          sourceLang,
          targetLang,
          filename,
          uploadedFileName: uploadedFile?.name || null,
          isTranslated,
        })
      );

      openLogin(); // redirect to login
      return;
    }

    if (!sourceLang || !targetLang) {
      const errorMsg =
        "Please select both source and target languages before saving";
      setSaveError(errorMsg);
      showNotification("error", "Missing Languages", errorMsg);
      return;
    }

    setSaveModalVisible(true);
    if (!filename && !uploadedFile) {
      // setFilename("manual-input.txt");
    }
  };

  // ------------------ Create Project Handler ------------------
  const handleCreateProject = async () => {
    setCreateProjectError("");
    setCreatingProject(true);

    if (!newProjectName.trim()) {
      const errorMsg = "Please provide a project name.";
      setCreateProjectError(errorMsg);
      showNotification("error", "Missing Project Name", errorMsg);
      setCreatingProject(false);
      return;
    }

    if (!newProjectFilename.trim()) {
      const errorMsg = "Please provide a filename.";
      setCreateProjectError(errorMsg);
      showNotification("error", "Missing Filename", errorMsg);
      setCreatingProject(false);
      return;
    }

    if (!sourceText || !targetText) {
      const errorMsg = "Source and translated text cannot be empty.";
      setCreateProjectError(errorMsg);
      showNotification("error", "Missing Content", errorMsg);
      setCreatingProject(false);
      return;
    }

    try {
      const payload = {
        project_name: newProjectName,
        files: [
          {
            file_name: newProjectFilename,
            source_text: sourceText,
            target_text: targetText,
            source_id: sourceLang.BCP_code,
            target_id: targetLang.BCP_code,
            source_language: {
              code: sourceLang.BCP_code,
              name: sourceLang.name,
              script: sourceLang.script || null,
            },
            target_language: {
              code: targetLang.BCP_code,
              name: targetLang.name,
              script: targetLang.script || null,
            },
          },
        ],
      };

      const token = localStorage.getItem("token");
      if (!token) {
        const errorMsg = "Authentication token not found. Please log in again.";
        setCreateProjectError(errorMsg);
        showNotification("error", "Authentication Error", errorMsg);
        setCreatingProject(false);
        return;
      }

      const response = await fetch(
        import.meta.env.VITE_BACKEND_URL + "/api/project-text-documents/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to create project";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.detail ||
            `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        setCreateProjectError(errorMessage);
        // showNotification("error", "Create Project Failed", errorMessage);
        setCreatingProject(false);
        return;
      }

      const result = await response.json();
      const successMsg = `Project "${newProjectName}" created successfully!`;
      showNotification("success", "Project Created", successMsg);

      // Close create project modal
      setCreateProjectModalVisible(false);
      setNewProjectName("");
      setNewProjectFilename("");
      setCreateProjectError("");

      // Refresh projects list
      try {
        const token = localStorage.getItem("token");
        const resp = await fetch(
          import.meta.env.VITE_BACKEND_URL + "/api/project-text-documents/",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (resp.ok) {
          const data = await resp.json();
          setProjects(data.data || []);

          // Select the newly created project
          if (result.data && result.data.project_id) {
            setSelectedProject(result.data.project_id);
          }
        }
      } catch (err) {
        console.error("Failed to refresh projects", err);
      }

      // Close save modal as well since project was created and saved
      setSaveModalVisible(false);
    } catch (error) {
      console.error("Network/unexpected error:", error);
      const errorMsg =
        error.message ||
        "Unexpected error occurred while creating project. Please try again.";
      setCreateProjectError(errorMsg);
      showNotification("error", "Network Error", errorMsg);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleSaveConfirm = async () => {
    setSaveError("");
    setSaveSuccess("");
    setSaving(true);

    if (!filename) {
      const errorMsg = "Please provide a filename.";
      setSaveError(errorMsg);
      showNotification("error", "Missing Filename", errorMsg);
      setSaving(false);
      return;
    }

    if (!sourceText || !targetText) {
      const errorMsg = "Source and translated text cannot be empty.";
      setSaveError(errorMsg);
      showNotification("error", "Missing Content", errorMsg);
      setSaving(false);
      return;
    }

    if (!sourceLang || !targetLang) {
      const errorMsg = "Source and target languages are required.";
      setSaveError(errorMsg);
      showNotification("error", "Missing Languages", errorMsg);
      setSaving(false);
      return;
    }

    try {
      const selectedProjectData = projects.find(
        (p) => p.project_id === selectedProject
      );
      const projectName = newProjectName || selectedProjectData?.project_name;

      if (!projectName) {
        const errorMsg = "Please select a project or enter a new project name.";
        setSaveError(errorMsg);
        showNotification("error", "Missing Project", errorMsg);
        setSaving(false);
        return;
      }

      const payload = {
        project_name: projectName,
        files: [
          {
            file_name: filename,
            source_text: sourceText,
            target_text: targetText,
            source_id: sourceLang.BCP_code,
            target_id: targetLang.BCP_code,
            source_language: {
              code: sourceLang.BCP_code,
              name: sourceLang.name,
              script: sourceLang.script || null,
            },
            target_language: {
              code: targetLang.BCP_code,
              name: targetLang.name,
              script: targetLang.script || null,
            },
          },
        ],
      };

      const token = localStorage.getItem("token");
      if (!token) {
        const errorMsg = "Authentication token not found. Please log in again.";
        setSaveError(errorMsg);
        showNotification("error", "Authentication Error", errorMsg);
        setSaving(false);
        return;
      }

      // 🔹 Duplicate check: same filename + identical content in selected project
      if (selectedProjectData) {
        const duplicate = selectedProjectData.files?.find(
          (f) =>
            f.file_name === filename &&
            f.source_text === sourceText &&
            f.target_text === targetText
        );

        if (duplicate) {
          Modal.confirm({
            title: "Already Saved",
            content:
              "This file with the same content is already saved. Do you want to save it again?",
            okText: "Save Again",
            cancelText: "Cancel",
            onOk: () =>
              performSave(payload, token, selectedProject, projectName),
            onCancel: () => setSaving(false),
          });
          return;
        }
      }

      // 🔹 No duplicates → save normally
      await performSave(payload, token, selectedProject, projectName);
    } catch (error) {
      console.error("Network/unexpected error:", error);
      const errorMsg =
        error.message ||
        "Unexpected error occurred while saving. Please try again.";
      setSaveError(errorMsg);
      showNotification("error", "Network Error", errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Extracted save logic into helper
  const performSave = async (payload, token, selectedProject, projectName) => {
    let url;
    if (selectedProject) {
      // existing project → add files
      url =
        import.meta.env.VITE_BACKEND_URL +
        `/api/project-text-documents/${selectedProject}/add-files`;
    } else {
      // new project → create
      url = import.meta.env.VITE_BACKEND_URL + "/api/project-text-documents/";
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      let errorMessage = "Failed to save translation";
      try {
        const errorData = await response.json();
        console.error("Save error:", errorData);
        errorMessage =
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      setSaveError(errorMessage);
      // showNotification("error", "Save Failed", errorMessage);
      return;
    }

    const result = await response.json();
    console.log("Save successful:", result);

    const successMsg = `Translation saved successfully! File "${payload.files[0].file_name}" added to project "${projectName}"`;
    setSaveSuccess(successMsg);
    // showNotification("success", "Save Successful", successMsg);

    setTimeout(() => {
      setSaveModalVisible(false);
      setNewProjectName("");
      setSelectedProject(null);
      setSaveSuccess("");
      setSaveError("");
    }, 2000);
  };
  return (
    <div style={{ padding: 24, marginBottom: 0 }}>
      <Title level={2} style={{ marginBottom: 0 }}>
        Quick Translation
      </Title>
      <Text
        type="secondary"
        style={{ display: "block", marginTop: 0, marginBottom: 20 }}
      >
        Translate instantly by pasting text or uploading a file.
      </Text>

      {/* Controls */}

      <Row gutter={24}>
        {/* Language Settings Section */}
        <Col span={24}>
          <Card
            style={{
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)", // ✅ shadow effect
              borderRadius: "10px", // rounded corners
            }}
          >
            <Title level={4}>🌐 Language Settings</Title>
            <Row gutter={16} align="bottom">
              {/* Source Language - Left side */}
              <Col xs={24} md={8}>
                <LanguageSelect
                  value={sourceLang}
                  onChange={setSourceLang}
                  disabled={loading}
                  placeholder="Select source language"
                />
              </Col>

              {/* Swap Button - Center */}
              <Col
                xs={24}
                md={2}
                style={{
                  textAlign: "center",

                }}
              >
                <Tooltip title="Swap Languages" color="#fff">
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
                </Tooltip>
              </Col>
              <Col xs={0} md={6} />
              {/* Target Language - Right side */}
              <Col xs={24} md={8} alignItems="right">
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
        <Col xs={24} md={12} style={{ marginTop: 16 }}>
          <Card
            title={<span>Source Text</span>}
            extra={<span style={{ fontWeight: 500 }}>{sourceLang?.label}</span>}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)", // ✅ shadow effect
              borderRadius: "10px",
            }}
            bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <TextArea
              rows={10}
              value={sourceText}
              onChange={handleSourceChange}
              placeholder="Enter or upload text to translate..."
              disabled={loading}
              style={{
                flex: 1,
                resize: "none",
                color: "#000", // text color
                "::placeholder": {
                  // placeholder styling
                  color: "#888", // slightly darker grey
                  opacity: 1, // ensure it shows properly
                },
              }}
            />
            {/* Container for buttons with flexbox layout */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center", // Changed from "flex-end" to "center"
                minHeight: "32px", // Add consistent height
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
                  disabled={loading}
                >
                  <Tooltip
                    title="Upload upto 2 MB(.txt, .usfm, .docx, .pdf )"
                    color="#fff"
                  >
                    <Button
                      icon={<UploadOutlined />}
                      disabled={loading}
                      style={{
                        background: "rgb(44 151 222 / 85%)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        color: "#000",
                        padding: "6px 14px",
                        cursor: loading ? "not-allowed" : "pointer",
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
                  styles={{ body: { color: "#000" } }}
                >
                  <Button
                    style={{
                      backgroundColor: "rgb(229, 118 ,119)",
                      color: "white",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      border: "none",
                    }}
                    onClick={handleClearAll}
                    icon={<CloseOutlined />}
                    disabled={loading}
                  />
                </Tooltip>
              </div>
            </div>
          </Card>
        </Col>
        {/* Target Panel */}
        <Col xs={24} md={12} style={{ marginTop: 16 }}>
          <Card
            title={<span>Translation</span>}
            extra={
              <Space>
                <Select
  value={selectedModel || undefined}
  onChange={setSelectedModel}
  disabled={loading}
  style={{ minWidth: 200 }}
>
  {availableModels.map((m) => {
    let disabled = false;
    let tooltip = "";

    const src = sourceLang?.BCP_code;
    const tgt = targetLang?.BCP_code;
    const isEngNzemePair =
      (src === "eng_Latn" && tgt === "nzm_Latn") ||
      (src === "nzm_Latn" && tgt === "eng_Latn");

    if (m.value === "nllb-600M" && isEngNzemePair) {
      disabled = true;
      tooltip = "This model does not support Zeme Naga language.";
    } else if (m.value === "nllb_finetuned_eng_nzm" && !isEngNzemePair) {
      disabled = true;
      tooltip = "This model supports only English ↔ Zeme Naga translation.";
    }

    return (
      <Select.Option key={m.value} value={m.value} disabled={disabled}>
        <Tooltip
          title={tooltip}
          placement="right"
          overlayInnerStyle={{
            backgroundColor: "#fff",
            color: "#000",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "6px 10px",
          }}
        >
          {m.label}
        </Tooltip>
      </Select.Option>
    );
  })}
</Select>
                <Tooltip
                  color="#ffffff"
                  title={
                    selectedModel ? (
                      <div style={{ color: 'var(--primary-color)' }}>
                        <div><strong>Model Name:</strong> {selectedModel}</div>
                        <div><strong>Tasks:</strong> {modelsInfo[selectedModel].tasks}</div>
                        <div><strong>Languages:</strong> {modelsInfo[selectedModel].languages}</div>
                        <div><strong>Language Code Type:</strong> {modelsInfo[selectedModel].languageCodeType}</div>
                        <div><strong>Developed By:</strong> {modelsInfo[selectedModel].developedBy}</div>
                        <div><strong>License:</strong> {modelsInfo[selectedModel].license}</div>
                      </div>
                    ) : "Select a model to see info"
                  }
                >
                  <Button
                    shape="circle"
                    icon={<InfoCircleOutlined />}
                    disabled={!selectedModel} // disables button when no model selected
                  />
                </Tooltip>

              </Space>
            }
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              borderRadius: "10px",
            }}
            bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <Spin
              spinning={loading}
              tip="Translating..."
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              <TextArea
                rows={10}
                value={targetText}
                onChange={handleTargetChange}
                placeholder="Translation will appear here..."
                disabled={loading}
                style={{
                  flex: 1,
                  resize: "none",
                  color: "#000",
                  "::placeholder": {
                    color: "#888",
                    opacity: 1,
                  },
                }}
              />
            </Spin>
            <div
              style={{
                marginTop: 12,
                minHeight: "32px",
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <Tooltip
                      title="Save Translation"
                      color="#fff"
                      styles={{ body: { color: "#000" } }}
                    >
                      <Button
                        type="default"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        disabled={!targetText || loading || !isTranslated}
                      />
                    </Tooltip>

                    <Tooltip
                      title="Copy translation to clipboard"
                      color="#fff"
                      styles={{ body: { color: "#000" } }}
                    >
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(targetText)}
                        disabled={loading || !targetText}
                      />
                    </Tooltip>

                    <DownloadDraftButton
                      content={targetText}
                      disabled={loading || !targetText}
                      targetLanguage={targetLang?.name}
                    />
                  </Space>
                </Col>
                <Col>{/* Add empty column for consistent spacing */}</Col>
              </Row>
            </div>
          </Card>
        </Col>

        {/* Translate button centered */}
        <Col span={24} style={{ textAlign: "center", marginTop: 24 }}>
          <Tooltip
            title={!selectedModel ? "Please select a model first" : ""}
            color="#fff"
          >
            <Button
              type="primary"
              danger={loading}
              size="medium"
              icon={loading ? <CloseOutlined /> : <TranslationOutlined />}
              onClick={() => {
                if (loading) {
                  handleCancelTranslate();
                } else {
                  handleTranslate();
                }
              }}
              disabled={!selectedModel} // disable if loading or no model selected
              style={{
                padding: "0 32px",
                borderRadius: "8px",
                minWidth: "200px",
                backgroundColor: loading
                  ? "#ff4d4f"
                  : !selectedModel
                    ? "#d9d9d9"
                    : "rgb(44,141,251)",
                borderColor: loading
                  ? "#ff4d4f"
                  : !selectedModel
                    ? "#d9d9d9"
                    : "rgb(44,141,251)",
                color: "#fff",
              }}
            >
              {loading ? "Cancel Translation" : "Translate"}
            </Button>
          </Tooltip>

          {statusMsg && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">{statusMsg}</Text>
            </div>
          )}
        </Col>

      </Row>
      <Modal
        title="Save Translation"
        open={saveModalVisible}
        onOk={handleSaveConfirm}
        onCancel={() => {
          setSelectedProject(null);
          setNewProjectName("");
          setFilename("");
          setSaveError("");
          setSaveSuccess("");
          setSaveModalVisible(false);
        }}
        confirmLoading={saving}
        okText={saving ? "Saving..." : "Save"}
        okButtonProps={{
          disabled: !selectedProject || !filename
        }}
      >
        {saveError && (
          <Alert
            message="Error"
            description={saveError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setSaveError("")}
          />
        )}

        {saveSuccess && (
          <Alert
            message="Success"
            description={saveSuccess}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setSaveSuccess("")}
          />
        )}

        <Text strong>Select project</Text>
        <br />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Select existing project"
            value={selectedProject}
            onChange={(val) => setSelectedProject(val)}
            allowClear
            disabled={saving}
          >
            {projects.map((p) => (
              <Option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </Option>
            ))}
          </Select>
          <Tooltip title="Create new project" color="#fff">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSaveModalVisible(false);  // Hide the save modal
              setCreateProjectModalVisible(true);
            }}
            disabled={saving}
          ></Button>
          </Tooltip>
        </div>

        <Input
          style={{ marginTop: 10 }}
          placeholder="Filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          disabled={!!uploadedFile || saving}
        />
      </Modal>

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={createProjectModalVisible}
        onOk={handleCreateProject}
        onCancel={() => {
          setCreateProjectModalVisible(false);
          setNewProjectName("");
          setNewProjectFilename("");
          setCreateProjectError("");
          setSaveModalVisible(true);  // Show the save modal again
        }}
        confirmLoading={creatingProject}
        okText={creatingProject ? "Creating..." : "Create"}
      >
        {createProjectError && (
          <Alert
            message="Error"
            description={createProjectError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setCreateProjectError("")}
          />
        )}

        <Input
          placeholder="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          disabled={creatingProject}
          style={{ marginBottom: 10 }}
        />

        <Input
          placeholder="Filename"
          value={newProjectFilename}
          onChange={(e) => setNewProjectFilename(e.target.value)}
          disabled={creatingProject}
        />
      </Modal>
    </div>
  );
}