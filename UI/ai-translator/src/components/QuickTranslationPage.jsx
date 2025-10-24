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
import { App } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useAuthModal } from "./AuthModalContext";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const { TextArea } = Input;
const { Title, Text } = Typography;
// A token that marks line boundaries. The MT model won’t translate this.
const LINE_SENTINEL = " ⟦LB⟧ ";
// ------------------ API Helpers ------------------
async function getAccessToken() {
  // console.log(
  //   "🔑 Requesting token:",
  //   "https://stagingapi.vachanengine.org/v2/ai/token"
  // );
  const params = new URLSearchParams();
  params.append("username", import.meta.env.VITE_VACHAN_USERNAME);
  params.append("password", import.meta.env.VITE_VACHAN_PASSWORD);

  const resp = await vachanApi.post("/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  console.log(" Token response:", resp.data);

  return resp.data.access_token;
}

// async function requestDocTranslation(
//   token,
//   file,
//   srcLangCode,
//   tgtLangCode,
//   model_name
// ) {
//   const formData = new FormData();
//   formData.append("file", file);

//   const resp = await vachanApi.post(
//     `/model/text/translate-document?device=cpu&model_name=${model_name}&source_language=${srcLangCode}&target_language=${tgtLangCode}&output_format=txt`,
//     formData,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "multipart/form-data",
//       },
//     }
//   );

//   console.log("📥 Doc translation response:", resp.data);
//   return resp.data.data.jobId;
// }
async function requestDocTranslation(token, file, srcLangCode, tgtLangCode, model_name) {
  const formData = new FormData();
  formData.append("file", file);

  // 🔹 Hardcoded pairs for fine-tuned models
  const hardcodedPairs = {
    "nllb-english-zeme": { src: "eng_Latn", tgt: "nzm_Latn" },
    "nllb-english-nagamese": { src: "eng_Latn", tgt: "nag_Latn" },
    "nllb-gujrathi-koli_kachchi": { src: "guj_Gujr", tgt: "gjk_Gujr" },
    "nllb-hindi-surjapuri": { src: "hin_Deva", tgt: "sjp_Deva" },
    "nllb-gujarati-kukna": { src: "guj_Gujr", tgt: "kex_Gujr" },
    "nllb-gujarati-kutchi": { src: "guj_Gujr", tgt: "kfr_Gujr" },
  };

  let url = `/model/text/translate-document?device=cpu&model_name=${model_name}&output_format=txt`;

  // 🧩 Only add source/target if using default model
  if (model_name === "nllb-600M") {
    url += `&source_language=${srcLangCode}&target_language=${tgtLangCode}`;
  } else if (hardcodedPairs[model_name]) {
    const { src, tgt } = hardcodedPairs[model_name];
    url += `&source_language=${src}&target_language=${tgt}`;
  }

  console.log("📤 Translation API URL:", url);

  const resp = await vachanApi.post(url, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  console.log("📥 Doc translation response:", resp.data);
  return resp.data.data.jobId;
}

// ------------------ Polling ------------------
async function pollJobStatus({
  token,
  jobId,
  onStatusUpdate,
  notification,
  maxAttempts = 1200,
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
  // ------------------ Daily Limit & Incognito Detection ------------------
  const DAILY_LIMIT = 5;
  const STORAGE_KEY = "anon_translation_usage";
// ✅ Modern, cross-browser incognito / private detection
async function isIncognitoMode() {
  try {
    const ua = navigator.userAgent.toLowerCase();

    // ✅ Safari / iOS
    if (/safari/.test(ua) && !/chrome/.test(ua)) {
      try {
        window.openDatabase(null, null, null, null);
        return false;
      } catch {
        return true;
      }
    }

    // ✅ Firefox
    if (ua.includes("firefox")) {
      try {
        const persisted = await navigator.storage.persist();
        return !persisted;
      } catch {
        return true;
      }
    }

     // ✅ Chrome / Edge / Brave
     if (window.showOpenFilePicker) {
      // Use the modern OPFS API behavior
      try {
        const root = await navigator.storage.getDirectory();
        await root.getFileHandle('test', { create: true });
        return false;
      } catch (err) {
        return true; // fails silently in incognito
      }
    }

    return false; // fallback
  } catch (err) {
    console.error("Incognito detection failed:", err);
    return false;
  }
}

  // LocalStorage helpers
  const getUsage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { count: 0, date: new Date().toDateString() };
    return JSON.parse(stored);
  };

  const updateUsage = (count) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ count, date: new Date().toDateString() })
    );
  };

  const checkReset = () => {
    const usage = getUsage();
    const today = new Date().toDateString();
    if (usage.date !== today) updateUsage(0);
  };
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
  const [isIncognito, setIsIncognito] = useState(false);
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
  // Check and initialize daily translation usage + detect incognito
  useEffect(() => {
    async function initUsageCheck() {
      checkReset();
      const incog = await isIncognitoMode();
      setIsIncognito(incog);
    }
    initUsageCheck();
  }, []);
  useEffect(() => {
    console.log("Incognito detected?", isIncognito);
  }, [isIncognito]);
  
  const modelsInfo = {
    "nllb-600M": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "200 languages",
    },
    "nllb-english-zeme": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "English, Zeme Naga (nzm_Latn)",
    },
    "nllb-english-nagamese": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "English, Nagamese (nag_Latn)",
    },
    "nllb-gujrathi-koli_kachchi": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "Gujarati, Kachi Koli (gjk_Gujr)",
    },
    "nllb-hindi-surjapuri": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "Hindi, Surjapuri (sjp_Deva)",

    },
    "nllb-gujarati-kukna": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "Gujarati, Kukna (gjk_Gujr)",
    },
    "nllb-gujarati-kutchi": {
      tasks: "mt, text translation",
      languageCodeType: "BCP-47",
      developedBy: "Meta",
      license: "CC-BY-NC 4.0",
      languages: "Gujarati, Kutchi (gjk_Gujr)",
    },
  };

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
  const [filteredTargetLangs, setFilteredTargetLangs] = useState([]);
  const [filteredSourceLangs, setFilteredSourceLangs] = useState([]);
  const [isInvalidPair, setIsInvalidPair] = useState(false);

  const availableModels = [
    { label: "nllb-600M", value: "nllb-600M" },
    { label: "nllb-english-zeme", value: "nllb-english-zeme" },
    { label: "nllb-english-nagamese", value: "nllb-english-nagamese" },
    {
      label: "nllb-gujrathi-koli_kachchi",
      value: "nllb-gujrathi-koli_kachchi",
    },
    { label: "nllb-hindi-surjapuri", value: "nllb-hindi-surjapuri" },
    { label: "nllb-gujarati-kukna", value: "nllb-gujarati-kukna" },
    { label: "nllb-gujarati-kutchi", value: "nllb-gujarati-kutchi" },
  ];
  
  // const LANGUAGE_PAIRS = {
  //   "Zeme Naga": ["English"],
  //   English: ["Zeme Naga", "Nagamese"],
  //   Nagamese: ["English"],
  //   "Kachi Koli": ["Gujarati"],
  //   Gujarati: ["Kachi Koli"],
  //   Surjapuri: ["Hindi"],
  //   Hindi: ["Surjapuri"],
  // };
  // One-way filter mapping (special languages restrict pairing)
  const FILTER_MAP = {
    Nagamese: ["English"],
    Surjapuri: ["Hindi"],
    Kukna: ["Gujarati"],
    Kutchi: ["Gujarati"],
    "Zeme Naga": ["English"],     // English only as target
  "Kachi Koli": ["Gujarati"],   // Gujarati only as target
  };  
  
  // useEffect(() => {
  //   if (!sourceLang || !targetLang) {
  //     setIsInvalidPair(false);
  //     return;
  //   }
  
  //   const src = sourceLang.name;
  //   const tgt = targetLang.name;
  
  //   // ❌ These specific one-way pairs are NOT allowed
  //   const disallowedPairs = [
  //     ["Zeme Naga", "English"], // disallow reverse
  //     ["Kachi Koli", "Gujarati"], // disallow reverse
  //   ];
  
  //   // ✅ Allowed special pairs (two-way unless disallowed above)
  //   const specialPairs = {
  //     Nagamese: "English",
  //     Surjapuri: "Hindi",
  //     Kukna: "Gujarati",
  //     // Kutchi: "Gujarati",
  //     // "Zeme Naga": "English", // forward allowed (English → Zeme)
  //     // "Kachi Koli": "Gujarati", // forward allowed (Gujarati → Kachi)
  //   };
  
  //   let invalid = false;
  
  //   // 🔍 1️⃣ Check disallowed pairs first
  //   invalid = disallowedPairs.some(([s, t]) => s === src && t === tgt);
  
  //   // 🔍 2️⃣ Check normal special-pair rules (only if not already invalid)
  //   if (!invalid) {
  //     const isSourceSpecial = Object.keys(specialPairs).includes(src);
  //     const isTargetSpecial = Object.keys(specialPairs).includes(tgt);
  
  //     if (isSourceSpecial) {
  //       invalid = specialPairs[src] !== tgt;
  //     } else if (isTargetSpecial) {
  //       invalid = specialPairs[tgt] !== src;
  //     }
  //   }
  
  //   if (invalid) {
  //     setIsInvalidPair(true);
  //     notification.error({
  //       message: "Unsupported Language Pair",
  //       description: `${src} ↔ ${tgt} is not supported by available models.`,
  //       duration: 3,
  //     });
  //   } else {
  //     setIsInvalidPair(false);
  //   }
  // }, [sourceLang, targetLang]);
  // One-way exceptions: reverse of these are NOT allowed
const DISALLOWED_REVERSE = [
  ["Zeme Naga", "English"],
  ["Kachi Koli", "Gujarati"],
];

  // ✅ New Validation Effect
useEffect(() => {
  if (!sourceLang || !targetLang) {
    setIsInvalidPair(false);
    return;
  }

  const src = sourceLang.name;
  const tgt = targetLang.name;

  // Helper function to check invalid pairs
  const isInvalidPairCheck = (srcName, tgtName) => {
    const FILTER_MAP = {
      Nagamese: ["English"],
      Surjapuri: ["Hindi"],
      Kukna: ["Gujarati"],
      Kutchi: ["Gujarati"],
      "Zeme Naga": ["English"],
      "Kachi Koli": ["Gujarati"],
    };
  
    // 1️⃣ Check if this pair is explicitly disallowed (one-way)
    if (DISALLOWED_REVERSE.some(([s, t]) => s === srcName && t === tgtName)) return true;
  
    // 2️⃣ Check source → target restriction
    if (FILTER_MAP[srcName] && !FILTER_MAP[srcName].includes(tgtName)) return true;
  
    // 3️⃣ Check target → source restriction
    if (FILTER_MAP[tgtName] && !FILTER_MAP[tgtName].includes(srcName)) return true;
  
    return false;
  };
  
  const invalid = isInvalidPairCheck(src, tgt);

  setIsInvalidPair(invalid);

  if (invalid) {
    setSelectedModel(null); // remove wrong model
    notification.error({
      message: "Unsupported Language Pair",
      description: `${src} ↔ ${tgt} is not supported by available models.`,
      duration: 2.5,
    });
  } else {
    // Auto-select correct model for special languages
    if ((src === "English" && tgt === "Zeme Naga"))
      setSelectedModel("nllb-english-zeme");
    else if ((src === "English" && tgt === "Nagamese") || (src === "Nagamese" && tgt === "English"))
      setSelectedModel("nllb-english-nagamese");
    else if ((src === "Gujarati" && tgt === "Kukna") || (src === "Kukna" && tgt === "Gujarati"))
      setSelectedModel("nllb-gujarati-kukna");
    else if ((src === "Gujarati" && tgt === "Kutchi") || (src === "Kutchi" && tgt === "Gujarati"))
      setSelectedModel("nllb-gujarati-kutchi");
    else if ((src === "Hindi" && tgt === "Surjapuri") || (src === "Surjapuri" && tgt === "Hindi"))
      setSelectedModel("nllb-hindi-surjapuri");
    else if ((src === "Gujarati" && tgt === "Kachi Koli"))
      setSelectedModel("nllb-gujrathi-koli_kachchi");
    else
      setSelectedModel("nllb-600M"); // default
  }
}, [sourceLang, targetLang]);

  
  useEffect(() => {
    if (!saveModalVisible) return;

    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const resp = await fetch(
          import.meta.env.VITE_BACKEND_URL + "/stagingapi/project-text-documents/",
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
  // ✅ Auto-select correct model based on source/target languages
  useEffect(() => {
    if (!sourceLang || !targetLang) return;
    const src = sourceLang.BCP_code;
    const tgt = targetLang.BCP_code;
    // Check for English ↔ Zeme Naga
    const isEngNzemePair =
      (src === "eng_Latn" && tgt === "nzm_Latn") 

    // Check for English ↔ Nagamese
    const isEngNagPair =
      (src === "eng_Latn" && tgt === "nag_Latn") ||
      (src === "nag_Latn" && tgt === "eng_Latn");
    // Check for Gujarati ↔ Kachi Koli
    const isGujGjkPair =
      (src === "guj_Gujr" && tgt === "gjk_Gujr") ||
      (src === "gjk_Gujr" && tgt === "guj_Gujr");

    // Check for Hindi ↔ Surjapuri
    const isHinSjpPair =
      (src === "hin_Deva" && tgt === "sjp_Deva") ||
      (src === "sjp_Deva" && tgt === "hin_Deva");
    const isGujKuknaPair =
      (src === "guj_Gujr" && tgt === "kex_Gujr") ||
      (src === "kex_Gujr" && tgt === "guj_Gujr");
    
    const isGujKutchiPair =
      (src === "guj_Gujr" && tgt === "kfr_Gujr") ||
      (src === "kfr_Gujr" && tgt === "guj_Gujr");  

    if (isEngNzemePair) {
      setSelectedModel("nllb-english-zeme");
    } else if (isEngNagPair) {
      setSelectedModel("nllb-english-nagamese");
    } else if (isGujGjkPair) {
      setSelectedModel("nllb-gujrathi-koli_kachchi");
    } else if (isHinSjpPair) {
      setSelectedModel("nllb-hindi-surjapuri");
    } else if (isGujKuknaPair) {
      setSelectedModel("nllb-gujarati-kukna");
    } else if (isGujKutchiPair) {
      setSelectedModel("nllb-gujarati-kutchi");
    }
    else {
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
    if (uploadedFile) {
      setUploadedFile(null);
      setFilename("manual-input.txt");
      console.log("✂️ Cleared uploaded file since user edited text manually");
    }

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
    const allowedExtensions = [".txt", ".usfm", ".docx", ".pdf"];
    const fileExtension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      showNotification(
        "error",
        "Unsupported Format",
        "Only .txt, .usfm, .docx, and .pdf files are supported."
      );
      return Upload.LIST_IGNORE; // stop upload right away
    }
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
    // 🚫 Block incognito users completely
    if (isIncognito) {
      showNotification(
        "warning",
        "Private Browsing Disabled",
        "Translation is not available in private/incognito mode. Please open this page in a normal browser window."
      );
      return;
    }
    const token = localStorage.getItem("token"); // detect logged-in user
    const usage = getUsage();
    
    // Block anonymous users if they reached limit
    if (!token && usage.count >= DAILY_LIMIT) {
      showNotification(
        "warning",
        "Daily Limit Reached",
        "Your free translation limit for today is over. Please log in to continue using the translation service."
      );
      return;
    }
    
    // ✅ Increment only if user is NOT logged in
    if (!token) {
      updateUsage(usage.count + 1);
    }
    
    // Proceed with translation    
    if (!sourceLang || !targetLang) {
      showNotification(
        "error",
        "Missing Languages",
        "Please select both source and target languages before translating."
      );
      return;
    }
    // ✅ Recalculate the correct model right here
    const src = sourceLang.BCP_code;
    const tgt = targetLang.BCP_code;

    let modelToUse = "nllb-600M"; // default

    const isEngNzemePair =
      (src === "eng_Latn" && tgt === "nzm_Latn")

    const isEngNagPair =
      (src === "eng_Latn" && tgt === "nag_Latn") ||
      (src === "nag_Latn" && tgt === "eng_Latn");

    const isGujGjkPair =
      (src === "guj_Gujr" && tgt === "gjk_Gujr") ||
      (src === "gjk_Gujr" && tgt === "guj_Gujr");

    const isHinSjpPair =
      (src === "hin_Deva" && tgt === "sjp_Deva") ||
      (src === "sjp_Deva" && tgt === "hin_Deva");
    const isGujKuknaPair =
      (src === "guj_Gujr" && tgt === "kex_Gujr") ||
      (src === "kex_Gujr" && tgt === "guj_Gujr");
    
    const isGujKutchiPair =
      (src === "guj_Gujr" && tgt === "kfr_Gujr") ||
      (src === "kfr_Gujr" && tgt === "guj_Gujr");  


    if (isEngNzemePair) {
      modelToUse = "nllb-english-zeme";
    } else if (isEngNagPair) {
      modelToUse = "nllb-english-nagamese";
    } else if (isGujGjkPair) {
      modelToUse = "nllb-gujrathi-koli_kachchi";
    } else if (isHinSjpPair) {
      modelToUse = "nllb-hindi-surjapuri";
    }else if (isGujKuknaPair) {
      modelToUse = "nllb-gujarati-kukna";
    } else if (isGujKutchiPair) {
      modelToUse = "nllb-gujarati-kutchi";
      }
      else{
        modelToUse = "nllb-600M";
      }
    console.log("🎯 Using model for translation:", modelToUse);

    if (!sourceText.trim() && !uploadedFile) {
      showNotification(
        "warning",
        "Missing Input",
        "Please enter or upload some source text first."
      );
      return;
    }
    //     let fileToSend = uploadedFile;

    // if (!uploadedFile && sourceText.trim() !== "") {
    //   const blob = new Blob([sourceText], { type: "text/plain" });
    //   fileToSend = new File([blob], "content_only.txt", { type: "text/plain" });
    //   console.log("📝 Created virtual file from typed text:", fileToSend);
    // }

    let fileToSend;

    if (sourceText.trim() !== "") {
      // Always use latest edited text from sourceText
      const blob = new Blob([sourceText], { type: "text/plain" });
      fileToSend = new File([blob], "edited_source.txt", {
        type: "text/plain",
      });
    } else if (uploadedFile) {
      // fallback if text box empty
      fileToSend = uploadedFile;
    } else {
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
      } else {
        textToTranslate = normalizeText(sourceText);
        if (textToTranslate.trim().length < 5) {
          textToTranslate += "\n"; // Adds minimal context
        }
      }

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
        modelToUse
      );
      if (signal.aborted) throw new Error("Translation cancelled");

      setStatusMsg("⏳ Translating... please wait");

      // --- 5️⃣ Poll until job is finished ---
      const finishedJobId = await pollJobStatus({
        token,
        jobId,
        onStatusUpdate: (status) => setStatusMsg(`Translation in progress...`),
        notification,
        signal, // ✅ pass controller signal here
      });
      if (signal.aborted) throw new Error("Translation cancelled");

      // --- 6️⃣ Fetch translated CSV ---
      const csvText = await fetchAssets(token, finishedJobId);
      if (signal.aborted) throw new Error("Translation cancelled");

      // // Check if the response looks like CSV (first line should have "Source" and "Translation" headers)
      const firstLine = csvText.split("\n")[0];
      const isCSVFormat =
        firstLine.toLowerCase().includes("sentence") ||
        (firstLine.toLowerCase().includes("source") &&
          (firstLine.toLowerCase().includes("translation") ||
            firstLine.toLowerCase().includes("target")));

      console.log("🔍 First line:", firstLine);
      console.log("🔍 Is CSV format?", isCSVFormat);
      let translatedText = "";

      if (!isCSVFormat) {
        // ✅ API returned plain text directly - just use it!
        console.log("✅ API returned plain text directly");
        translatedText = csvText.trim();

        // If it's USFM, we might need to reconstruct structure
        if (isUSFMContent && usfmStructure) {
          // Split the plain text by lines and try to match with structure
          const translationLines = translatedText
            .split("\n")
            .filter((l) => l.trim());
          translatedText = reconstructUSFMFromPlainText(
            usfmStructure,
            translationLines
          );
        }
      } else {
        // Parse as CSV
        console.log("📥 Parsing as CSV format");
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          trimHeaders: true,
        });

        console.log("📥 Parsed CSV data:", parsed.data);

        if (!parsed.data || parsed.data.length === 0) {
          throw new Error("No translation data received from API");
        }
        // --- 8️⃣ Rebuild translation from CSV ---
        if (isUSFMContent && usfmStructure) {
          translatedText = reconstructUSFM(usfmStructure, parsed.data);
        } else {
          translatedText = simpleTranslation(textToTranslate, parsed.data);
        }
      }
      console.log("✅ Final translated text:", translatedText);
      if (!translatedText || translatedText.trim() === "") {
        throw new Error("Translation resulted in empty text");
      }
      if (
        sourceText.trim() !== "" &&
        translatedText.trim() === textToTranslate.trim()
      ) {
        // Use textToTranslate, which is the normalized source text sent to the API
        throw new Error(
          "Translation failed: The server returned the original source text. Please check the API logs or contact support."
        );
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
  function reconstructUSFMFromPlainText(structure, translationLines) {
    let translationIndex = 0;

    return structure
      .map((element) => {
        if (element.type === "translatable") {
          const translation = translationLines[translationIndex++];
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
    console.log("🔍 CSV Data received:", csvData);
    console.log("🔍 Source text:", sourceText);
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
        import.meta.env.VITE_BACKEND_URL + "/stagingapi/project-text-documents/",
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
          import.meta.env.VITE_BACKEND_URL + "/stagingapi/project-text-documents/",
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
        `/stagingapi/project-text-documents/${selectedProject}/add-files`;
    } else {
      // new project → create
      url = import.meta.env.VITE_BACKEND_URL + "/stagingapi/project-text-documents/";
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
            styles={{
              body: {
                padding: 18, // 👈 replace bodyStyle={{ padding: 8 }}
              },
            }}
          >
            {/* <Title style={{marginBlock:0}} level={5}>🌐 Language Settings</Title> */}
            <Row
              gutter={16}
              align="middle"
              justify="center"
              className="lang-select-row"
            // style={{ marginTop: 0 }}
            >
              <Col xs={24} sm={24} md={11} lg={11}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    // marginRight: "100px",
                  }}
                >
                  {/* <LanguageSelect
                    value={sourceLang}
                    onChange={(lang) => {
                      setSourceLang(lang);
                      // ✅ Apply one-way filtering based on special language selection
                      if (lang && FILTER_MAP[lang.name]) {
                        setFilteredTargetLangs(FILTER_MAP[lang.name]);
                      } else {
                        setFilteredTargetLangs([]); // show all languages
                      }

                      // Optional: reset target if current one is invalid
                      if (lang && FILTER_MAP[lang.name]) {
                        const allowed = FILTER_MAP[lang.name];
                        if (!allowed.some((n) => n === targetLang?.name)) {
                          setTargetLang(null);
                        }
                      }
                      // ✅ Clear reverse filtering when source changes
                      setFilteredSourceLangs([]);
                    }}
                    disabled={loading}
                    filterList={filteredSourceLangs}
                    placeholder="Select source language"
                    style={{ width: "60%" }}
                  /> */}
                  <LanguageSelect
  value={sourceLang}
  onChange={(lang) => {
    setSourceLang(lang);

    // ✅ Filter target languages based on source selection
    if (lang?.name && FILTER_MAP[lang.name]) {
      setFilteredTargetLangs(FILTER_MAP[lang.name]);

      // Reset target if the current target is not allowed
      if (!FILTER_MAP[lang.name].includes(targetLang?.name)) {
        setTargetLang(null);
      }
    } else {
      // No restriction → show all targets
      setFilteredTargetLangs([]);
    }

    // ✅ Clear source-side filters when source changes
    setFilteredSourceLangs([]);
  }}
  disabled={loading}
  filterList={filteredSourceLangs}
  placeholder="Select source language"
  style={{ width: "60%" }}
/>

                </div>
              </Col>

              <Col
                xs={24}
                sm={24}
                md={2}
                lg={2}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <div className="swap-button-wrapper">
                  <Tooltip title="Swap Languages" color="#fff">
                    <Button
                      shape="circle"
                      icon={<SwapOutlined />}
                      onClick={() => {
                        // ✅ Clear filters first to avoid blank dropdown bug
                        setFilteredTargetLangs([]);
                        setFilteredSourceLangs([]);
                        const temp = sourceLang;
                        setSourceLang(targetLang);
                        setTargetLang(temp);
                      }}
                      disabled={loading}
                    />
                  </Tooltip>
                </div>
              </Col>

              <Col xs={24} sm={24} md={11} lg={11}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    // marginLeft: "100px",
                  }}
                >
                  {/* <LanguageSelect
                    value={targetLang}
                    onChange={(lang) => {
                      setTargetLang(lang);

                      // ✅ Only apply filtering when target is one of the special languages
                      if (
                        lang &&
                        [
                          "Zeme Naga",
                          "Nagamese",
                          "Kachi Koli",
                          "Surjapuri",
                          ,"Kukna","Kutchi",
                        ].includes(lang.name)
                      ) {
                        // Each special target has one specific allowed source
                        const filterMap = {
                          "Zeme Naga": ["English"],
                          Nagamese: ["English"],
                          "Kachi Koli": ["Gujarati"],
                          Surjapuri: ["Hindi"],
                          "Kukna": ["Gujarati"],
                          "Kutchi": ["Gujarati"]                     
                        };
                        setFilteredSourceLangs(filterMap[lang.name]);
                      } else {
                        // Base or unrestricted target language → show all sources
                        setFilteredSourceLangs([]);
                      }

                      // ✅ Reset source if current source is not allowed anymore
                      if (
                        lang &&
                        [
                          "Zeme Naga",
                          "Nagamese",
                          "Kachi Koli",
                          "Surjapuri",
                          "Kukna","Kutchi"
                        ].includes(lang.name)
                      ) {
                        // const allowedSource = {
                        //   "Zeme Naga": ["English"],
                        //   Nagamese: ["English"],
                        //   "Kachi Koli": ["Gujarati"],
                        //   Surjapuri: ["Hindi"],
                        //   "Kukna": ["Gujarati"],
                        //   "Kutchi": ["Gujarati"],
                        // }[lang.name];
                        // if (!allowedSource.includes(sourceLang?.name)) {
                        //   setSourceLang(null);
                        // }
                        if (lang?.name && FILTER_MAP[lang.name]) {
                          setFilteredSourceLangs(FILTER_MAP[lang.name]);
                          if (!FILTER_MAP[lang.name].includes(sourceLang?.name)) setSourceLang(null);
                        } else {
                          setFilteredSourceLangs([]);
                        }
                        
                      }
                      // ✅ Clear any target-side filters (since we’re filtering source only)
                      setFilteredTargetLangs([]);
                    }}
                    disabled={loading}
                    filterList={filteredTargetLangs}
                    placeholder="Select target language"
                    style={{ width: "60%" }}
                  /> */}
                  <LanguageSelect
  value={targetLang}
  onChange={(lang) => {
    setTargetLang(lang);

    // ✅ Filter source languages based on target selection
    if (lang?.name && FILTER_MAP[lang.name]) {
      setFilteredSourceLangs(FILTER_MAP[lang.name]);

      // Reset source if the current source is not allowed
      if (!FILTER_MAP[lang.name].includes(sourceLang?.name)) {
        setSourceLang(null);
      }
    } else {
      // No restriction → show all sources
      setFilteredSourceLangs([]);
    }

    // ✅ Clear target-side filters (since we’re filtering source only)
    setFilteredTargetLangs([]);
  }}
  disabled={loading}
  filterList={filteredTargetLangs}
  placeholder="Select target language"
  style={{ width: "60%" }}
/>

                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Source Panel */}
        <Col xs={24} md={12} style={{ marginTop: 16 }}>
          <Card
            title={<span>Source Text</span>}
            extra={
              sourceText && (
                <Tooltip
                  title="Clear"
                  color="#fff"
                  styles={{ body: { color: "#000" } }}
                >
                  <Button
                    shape="circle"
                    onClick={handleClearAll}
                    icon={<CloseOutlined />}
                    disabled={loading}
                  />
                </Tooltip>
              )
            }
            style={{
              height: "110%",
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
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center", // vertically center icons
                minHeight: "32px",
              }}
            >
              {/* Left side - Upload button and note */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Upload
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  accept=".txt,.usfm,.docx,.pdf"
                  disabled={loading}
                >
                  <Tooltip title="Upload File" color="#fff">
                    <Button
                      type="default"
                      icon={<UploadOutlined />}
                      disabled={loading}
                      style={{
                        // background: "",
                        // border: "1px solid #e5e7eb",
                        // borderRadius: "6px",
                        // color: "#000",
                        padding: "5px 30px",
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    />
                  </Tooltip>
                </Upload>
                <Typography.Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    // marginTop: "0px",
                    display: "block",
                  }}
                >
                  Supported formats: TXT, PDF, DOCX, USFM • up to 2 MB
                </Typography.Text>
              </div>

              {/* Right side - Clear button */}
              {/* <div>
                
              </div> */}
            </div>
          </Card>
        </Col>

        {/* Target Panel */}
        <Col xs={24} md={12} style={{ marginTop: 16 }}>
          <Card
            title={<span>Translation</span>}
            extra={
              <Space>
                <Tooltip title="Select Model" color="#fff">
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

                    const isEngNagPair =
                      (src === "eng_Latn" && tgt === "nag_Latn") ||
                      (src === "nag_Latn" && tgt === "eng_Latn");
                    const isGujGjkPair =
                      (src === "guj_Gujr" && tgt === "gjk_Gujr") ||
                      (src === "gjk_Gujr" && tgt === "guj_Gujr");
                    const isHinSjpPair =
                      (src === "hin_Deva" && tgt === "sjp_Deva") ||
                      (src === "sjp_Deva" && tgt === "hin_Deva");
                    const isGujKuknaPair =
                      (src === "guj_Gujr" && tgt === "kex_Gujr") ||
                      (src === "kex_Gujr" && tgt === "guj_Gujr");
                    
                    const isGujKutchiPair =
                      (src === "guj_Gujr" && tgt === "kfr_Gujr") ||
                      (src === "kfr_Gujr" && tgt === "guj_Gujr");
                    
                    // Disable nllb-600M for specialized language pairs
                    if (
                      m.value === "nllb-600M" &&
                      (isEngNzemePair ||
                        isEngNagPair ||
                        isGujGjkPair ||
                        isHinSjpPair||
                        isGujKuknaPair||
                        isGujKutchiPair)
                    ) {
                      disabled = true;
                      tooltip =
                        "Use the specialized fine-tuned model for this language pair.";
                    }
                    // Only enable fine-tuned models for their specific language pairs
                    else if (
                      m.value === "nllb-english-zeme" &&
                      !isEngNzemePair
                    ) {
                      disabled = true;
                      tooltip =
                        "This model only supports English -> Zeme Naga translation.";
                    } else if (
                      m.value === "nllb-english-nagamese" &&
                      !isEngNagPair
                    ) {
                      disabled = true;
                      tooltip =
                        "This model only supports English ↔ Naga translation.";
                    } else if (
                      m.value === "nllb-gujrathi-koli_kachchi" &&
                      !isGujGjkPair
                    ) {
                      disabled = true;
                      tooltip =
                        "This model only supports Gujarati -> Kachi Koli translation.";
                    } else if (
                      m.value === "nllb-hindi-surjapuri" &&
                      !isHinSjpPair
                    )
                     {
                      disabled = true;
                      tooltip =
                        "This model only supports Hindi ↔ Surjapuri translation.";
                    }
                    else if (m.value === "nllb-gujarati-kukna" && !isGujKuknaPair) {
                      disabled = true;
                      tooltip = "This model only supports Gujarati ↔ Kukna translation.";
                    } else if (m.value === "nllb-gujarati-kutchi" && !isGujKutchiPair) {
                      disabled = true;
                      tooltip = "This model only supports Gujarati ↔ Kutchi translation.";
                    }                    
                    return (
                      <Select.Option
                        key={m.value}
                        value={m.value}
                        disabled={disabled}
                      >
                        <Tooltip
                          title={tooltip}
                          placement="right"
                          overlayInnerStyle={{
                            backgroundColor: "#fff",
                            color: "#000",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            // padding: "6px 10px",
                            maxWidth: "250px",
                          }}
                        >
                          {m.label}
                        </Tooltip>
                      </Select.Option>
                    );
                  })}
                </Select>
                </Tooltip>
                <Tooltip
                  color="#ffffff"
                  title={
                    selectedModel ? (
                      <div style={{ color: "var(--primary-color)" }}>
                        <div>
                          <strong>Model Name:</strong> {selectedModel}
                        </div>
                        <div>
                          <strong>Tasks:</strong>{" "}
                          {modelsInfo[selectedModel].tasks}
                        </div>
                        <div>
                          <strong>Languages:</strong>{" "}
                          {modelsInfo[selectedModel].languages}
                        </div>
                        <div>
                          <strong>Language Code Type:</strong>{" "}
                          {modelsInfo[selectedModel].languageCodeType}
                        </div>
                        <div>
                          <strong>Developed By:</strong>{" "}
                          {modelsInfo[selectedModel].developedBy}
                        </div>
                        <div>
                          <strong>License:</strong>{" "}
                          {modelsInfo[selectedModel].license}
                        </div>
                      </div>
                    ) : (
                      "Select a model to see info"
                    )
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
              height: "110%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              borderRadius: "10px",
            }}
            bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 320,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* <Spin
              spinning={loading}
              tip="Translating..."
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            > */}
              <TextArea
                rows={10}
                value={targetText}
                onChange={handleTargetChange}
                placeholder="Translation will appear here..."
                disabled={loading}
                style={{
                  flex: 1,
                  resize: "none",
                  color: "#000", // text color
                  "::placeholder": {
                    // placeholder styling
                    opacity: 1, // ensure it shows properly
                    height: "100%",
                  },
                }}
              />
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0, // top:0; right:0; bottom:0; left:0
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.65)", // semi-transparent overlay
                    zIndex: 10,
                    pointerEvents: "none", // let clicks pass if you want; set true to block
                  }}
                >
                  <Spin tip="Translating..." />
                </div>
              )}
            </div>
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
                      targetLanguage={targetLang?.BCP_code}
                      sourceLanguage={sourceLang?.BCP_code}
                    />
                  </Space>
                </Col>
                <Col>
                <Tooltip
  title={
    isInvalidPair
      ? "This language pair is not supported by the selected model."
      : isIncognito
      ? "Translation is not available in private browsing mode. Please use a normal browser."
      : !selectedModel
      ? "Please select a model first"
      : ""
  }
  color="#fff"
>
  <Button
    type="primary"
    danger={loading || isInvalidPair}
    size="medium"
    onClick={() => {
      if (loading) handleCancelTranslate();
      else handleTranslate();
    }}
    disabled={
      !selectedModel ||
      isIncognito ||
      isInvalidPair ||
      !sourceLang ||
      !targetLang ||
      (!sourceText.trim() && !uploadedFile)
    }
    style={{
      padding: "0 32px",
      borderRadius: "8px",
      minWidth: "100px",
      backgroundColor: isInvalidPair
        ? "#bfbfbf"
        : loading
        ? "#ff4d4f"
        : isIncognito
        ? "#d9d9d9"
        : "rgb(44,141,251)",
      borderColor: isInvalidPair
        ? "#bfbfbf"
        : loading
        ? "#ff4d4f"
        : isIncognito
        ? "#d9d9d9"
        : "rgb(44,141,251)",
      color: "#fff",
      cursor: isInvalidPair ? "not-allowed" : "pointer",
    }}
  >
    {isInvalidPair
      ? "Translate"
      : loading
      ? "Cancel Translation"
      : "Translate"}
  </Button>
</Tooltip>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        {/* Translate button centered */}
        {/* <Col span={24} style={{ textAlign: "center", marginTop: 24 }}>
          {statusMsg && (
            <div style={{ marginTop: 12 }}>
              <Text>{statusMsg}</Text>
            </div>
          )}
        </Col> */}
        {statusMsg && (
          <div
            style={{ marginTop: "80px", textAlign: "center", width: "100%" }}
          >
            <Text>{statusMsg}</Text>
          </div>
        )}
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
          disabled: !selectedProject || !filename,
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
                setSaveModalVisible(false); // Hide the save modal
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
          setSaveModalVisible(true); // Show the save modal again
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