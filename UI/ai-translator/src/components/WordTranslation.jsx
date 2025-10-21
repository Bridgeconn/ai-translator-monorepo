import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Select, Card, Input, Typography, Button, message, Breadcrumb, Popconfirm, Modal,notification,App,Tag,Spin,Tooltip,Progress,} from 'antd';
import { CopyOutlined, DownloadOutlined, ExclamationCircleOutlined,UploadOutlined,InfoCircleOutlined,DeleteOutlined} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, wordTokenAPI, booksAPI, languagesAPI, sourcesAPI, draftAPI } from './api.js';
import { useParams, Link } from 'react-router-dom';
import api from '../api';


const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

// Upload Summary Toast Component (copied from SourcesListPage)
/* ---------------- Upload Progress Modal ---------------- */
function UploadProgressModal({ visible, uploading = [], uploaded = [], skipped = [], total = 0, onClose }) {
  if (!visible) return null;

  const isComplete = uploaded.length + skipped.length === total;

  return (
    <Modal
      open={visible}
      title="Book upload status"
      footer={null}
      // closable={isComplete}
      onCancel={isComplete ? onClose : undefined}
      maskClosable={false}
      closeIcon={null}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong>
          Uploaded: {uploaded.length + skipped.length}/{total}
        </Text>
      </div>

      {uploading.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Currently uploading:</Text>
          <div style={{ marginTop: 8 }}>
            {uploading.map((code) => (
              <Tag color="blue" key={`uploading-${code}`} style={{ marginBottom: 6 }}>
                {code} <Spin size="small" style={{ marginLeft: 8 }} />
              </Tag>
            ))}
          </div>
        </div>
      )}

      {uploaded.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">✅ Uploaded ({uploaded.length}):</Text>
          <div style={{ marginTop: 8 }}>
            {uploaded.map((code) => (
              <Tag color="green" key={`uploaded-${code}`} style={{ marginBottom: 6 }}>
                {code}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">⚠️ Skipped (already exists | wrong format ) ({skipped.length}):</Text>
          <div style={{ marginTop: 8 }}>
            {skipped.map((code) => (
              <Tag color="gold" key={`skipped-${code}`} style={{ marginBottom: 6 }}>
                {code}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {isComplete && (
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button type="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}
export default function WordTranslation() {
  const { projectId } = useParams();
  const [selectedBook, setSelectedBook] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState({ name: "Loading...", BCP_code: "" });
  const [targetLang, setTargetLang] = useState({ name: "Unknown", BCP_code: "" });
  const [projectBooks, setProjectBooks] = useState([]);
  const [editedTokens, setEditedTokens] = useState({});
  const [draftContent, setDraftContent] = useState("");
  const [originalDraft, setOriginalDraft] = useState("");
  const [isDraftEdited, setIsDraftEdited] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] = notification.useNotification();
  const editedTokensRef = useRef(editedTokens);
  const [modal, modalContextHolder] = Modal.useModal();
  const { message: appMessage } = App.useApp();
  const eventSourceRef = useRef(null);
  const translationNotificationKey = useRef(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

    // Book upload states
    const [uploadSummaryOpen, setUploadSummaryOpen] = useState(false);
    const [uploadSummaryData, setUploadSummaryData] = useState({ uploaded: [], skipped: [] });
    const hiddenUploadInputRef = useRef(null);
    //Modal states
    const [uploadProgressOpen, setUploadProgressOpen] = useState(false);
    
    // Upload tracking
    const [uploadingBooks, setUploadingBooks] = useState([]);
    const [uploadedBooks, setUploadedBooks] = useState([]);
    const [skippedBooks, setSkippedBooks] = useState([]);
    const [totalBooks, setTotalBooks] = useState(0);
  const [selectedModel, setSelectedModel] = useState("nllb-600M");
  const [modelLanguageError, setModelLanguageError] = useState(""); // <-- ADD THIS
  const isManualSelection = useRef(false);

  const showNotification = (type, message, description, duration) => {
    notification[type]({
      message: message,
      description: description,
      duration: duration,
      placement: "topRight",
    });
  };
  const MODEL_INFO = {
    "nllb-600M": {
      Model: "nllb-600M",
      Tasks: "mt, text translation",
      "Language Code Type": "BCP-47",
      DevelopedBy: "Meta",
      License: "CC-BY-NC 4.0",
      Languages: "200 languages"
    },
    "nllb_finetuned_eng_nzm": {
      Model: "nllb_finetuned_eng_nzm",
      Tasks: "mt, text translation",
      "Language Code Type": "BCP-47",
      DevelopedBy: "Meta",
      License: "CC-BY-NC 4.0",
      Languages: "Zeme Naga, English"
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
    "nllb-hin-surjapuri": {
      Model: "nllb-hin-surjapuri",
      Tasks: "mt, text translation",
      "Language Code Type": "BCP-47",
      DevelopedBy: "Meta",
      License: "CC-BY-NC 4.0",
      Languages: "Hindi, Surjapuri",
    },
  };

  // Derived helpers
  const hasTokenEdits = Object.entries(editedTokens).some(([k, v]) => k !== 'draft_edited' && !!v);
  const showEditorUnsaved = hasTokenEdits;           // show save/discard in editor
  const showDraftUnsaved = isDraftEdited;            // show save/discard in draft
  // --- Model options ---
  // const MODEL_OPTIONS = [
  //   { label: "nllb-600M", value: "nllb-600M" },
  //   { label: "nllb_finetuned_eng_nzm", value: "nllb_finetuned_eng_nzm" },
  //   { label: "nllb-english-nagamese", value: "nllb-english-nagamese" },
  //   { label: "nllb-gujrathi-koli_kachchi", value: "nllb-gujrathi-koli_kachchi" },
  //   { label: "nllb-hin-surjapuri", value: "nllb-hin-surjapuri" },
  // ];
  
  // Keep isDraftEdited in sync anytime draft/original change (avoids timing issues)
  useEffect(() => {
    setIsDraftEdited(String(draftContent || "") !== String(originalDraft || ""));
  }, [draftContent, originalDraft]);

  useEffect(() => {
    editedTokensRef.current = editedTokens;
  }, [editedTokens]);

  // Fetch project details
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await projectsAPI.getAllProjects();
      return projects.find((p) => String(p.project_id) === String(projectId));
    },
    enabled: !!projectId,
  });

    // Book upload utility functions (adapted from SourcesListPage)
    const getExistingBooks = async (sourceId) => {
      try {
        const res = await api.get(`/books/by_source/${sourceId}`);
        return Array.isArray(res.data?.data) ? res.data.data : res.data || [];
      } catch (err) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    };
  
    const guessUSFMCode = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const txt = String(reader.result || "");
            const m = txt.match(/\\id\s+([^\s]+)/i);
            if (m && m[1]) {
              return resolve(m[1].replace(/[^0-9A-Za-z]/g, "").toUpperCase());
            }
          } catch {}
          const name = file.name.split(".")[0] || file.name;
          resolve(name.replace(/[^0-9A-Za-z]/g, "").toUpperCase());
        };
        reader.readAsText(file);
      });
  
      const uploadBooksForSource = async (sourceId, files) => {
        if (!sourceId || !files?.length) return { uploaded: [], skipped: [] };
      
        const existing = await getExistingBooks(sourceId);
        const existingCodes = new Set((existing || []).map((b) => b.book_code));
        const uploaded = [];
        const skipped = [];
      
        setTotalBooks(files.length);
        setUploadingBooks([]);   // start empty
        setUploadedBooks([]);
        setSkippedBooks([]);
        setUploadProgressOpen(true);
      
        for (const file of files) {
          const code = await guessUSFMCode(file);
      
          // mark as uploading (by code)
          setUploadingBooks((prev) => [...prev, code]);
      
          if (existingCodes.has(code)) {
            skipped.push(code);
            setSkippedBooks((prev) => [...prev, code]);
            setUploadingBooks((prev) => prev.filter((c) => c !== code));
            continue;
          }
      
          const formData = new FormData();
          formData.append("file", file);
      
          try {
            await api.post(`/books/upload_books/?source_id=${sourceId}`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            uploaded.push(code);
            setUploadedBooks((prev) => [...prev, code]);
            existingCodes.add(code);
          } catch {
            skipped.push(code);
            setSkippedBooks((prev) => [...prev, code]);
          } finally {
            // remove from uploading
            setUploadingBooks((prev) => prev.filter((c) => c !== code));
          }
        }
      
        return { uploaded, skipped };
      };
      
      
  
    // Handle book upload
    const handleUploadBooks = () => {
      if (!project?.source_id) {
        appMessage.error('No source found for this project');
        return;
      }
      
      if (hiddenUploadInputRef.current) {
        hiddenUploadInputRef.current.value = "";
        hiddenUploadInputRef.current.click();
      }
    };
  
    const onUploadFilesChosen = async (e) => {
      try {
        const files = Array.from(e.target.files || []);
        if (!files.length || !project?.source_id) return;
    
        await uploadBooksForSource(project.source_id, files);
    
        // 🔹 Refresh projectBooks list after upload
        const refreshed = await booksAPI.getBooksBySourceId(project.source_id);
        setProjectBooks(refreshed);
    
      } catch (error) {
        console.error("Upload failed:", error);
        appMessage.error("Upload failed, please try again.");
      } finally {
        e.target.value = ""; // reset input
      }
    };
    
    
  // Fetch books for the project
  useEffect(() => {
    const fetchBooks = async () => {
      if (!project?.source_id) return;
      try {
        const books = await booksAPI.getBooksBySourceId(project.source_id);
        setProjectBooks(books);
      } catch (e) {
        notificationApi.info({
          key: "upload-book-info", // 👈 unique key prevents duplicate
          message: "Info",
          description: "No books found. Please upload books to start translation.",
          placement: "top",
          duration: 3,
        });
      }
    };
    fetchBooks();
  }, [project]);
  useEffect(() => {
    const fetchLanguages = async () => {
      if (!project) return;
      try {
        let srcLangData = null;
        let tgtLangData = null;

        // Fetch Source Language Object
        if (project.source_id) {
          const source = await sourcesAPI.getSourceById(project.source_id);
          if (source?.language_id) {
            // Get the full language object which contains BCP_code
            srcLangData = await languagesAPI.getLanguageById(source.language_id);
          }
        }
        // Set state to the language object, or a fallback object if data is incomplete
        setSourceLang(srcLangData || { name: "Unknown", BCP_code: "" });

        // Fetch Target Language Object
        if (project.target_language_id) {
          // Get the full language object which contains BCP_code
          tgtLangData = await languagesAPI.getLanguageById(project.target_language_id);
        }
        // Set state to the language object, or a fallback object if data is incomplete
        setTargetLang(tgtLangData || { name: "Unknown", BCP_code: "" });

      } catch (e) {
        console.error("Failed to fetch languages", e);
        setSourceLang({ name: "Error", BCP_code: "" });
        setTargetLang({ name: "Error", BCP_code: "" });
      }
    };
    fetchLanguages();
  }, [project]);
  useEffect(() => {
    if (!sourceLang?.BCP_code || !targetLang?.BCP_code) return;
  
    const src = sourceLang.BCP_code;
    const tgt = targetLang.BCP_code;
  
    let modelToUse = "nllb-600M"; // default
  
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
  
    if (isEngNzemePair) {
      modelToUse = "nllb_finetuned_eng_nzm";
    } else if (isEngNagPair) {
      modelToUse = "nllb-english-nagamese";
    } else if (isGujGjkPair) {
      modelToUse = "nllb-gujrathi-koli_kachchi";
    } else if (isHinSjpPair) {
      modelToUse = "nllb-hin-surjapuri";
    }
  
    setSelectedModel(modelToUse);
    console.log(`🔁 Auto-selected model for ${src} ↔ ${tgt}: ${modelToUse}`);
  }, [sourceLang, targetLang]);
  //  -------- Fetch or Generate tokens ------------------
  const handleDeleteBook = () => {
    console.log("handleDeleteBook called");
    console.log("selectedBook:", selectedBook);
    console.log("project.source_id:", project?.source_id);

    if (!selectedBook) {
      messageApi.warning("No book selected to delete");
      return;
    }

    if (!project?.source_id) {
      messageApi.error("Cannot delete book: No source ID found");
      return;
    }
  
    modal.confirm({
      title: `Delete Book: ${selectedBook.book_name}?`,
      icon: <ExclamationCircleOutlined />,
      content: "This will permanently delete the book and all its content (chapters, verses).",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          console.log("Confirming delete for book_id:", selectedBook.book_id);
          
          // Call the delete API
          const response = await booksAPI.deleteBook(selectedBook.book_id);
          console.log("Delete response:", response);
          
          messageApi.success(`Book "${selectedBook.book_name}" deleted successfully`);
  
          // Refresh the books list from source
          const refreshedBooks = await booksAPI.getBooksBySourceId(project.source_id);
          console.log("Refreshed books after delete:", refreshedBooks);
          setProjectBooks(refreshedBooks);
          
          // Reset selectedBook and related states
          setSelectedBook(null);
          setTokens([]);
          setDraftContent("");
          setOriginalDraft("");
          setEditedTokens({});
          setTranslatedCount(0);
          setHasGenerated(false);
  
        } catch (err) {
          console.error("Failed to delete book:", err);
          console.error("Error details:", err.response);
          messageApi.error(`Failed to delete book: ${err.response?.data?.detail || err.message || "Unknown error"}`);
        }
      },
      onCancel: () => {
        console.log("Delete cancelled");
      }
    });
  };
  
  // ------------------ Fetch or Generate tokens ------------------
  const fetchTokens = async (bookId) => {
    if (!bookId) return;
    setLoadingTokens(true);

    try {
      // 1️⃣ First, try fetching existing tokens
      let tokens = [];
      try {
        tokens = await wordTokenAPI.getTokensByProjectAndBook(projectId, bookId);
      } catch (err) {
        // If 404 → tokens don't exist, we'll generate them
        if (err.response?.status !== 404) throw err;
      }

      // 2️⃣ If no tokens exist, generate them
      if (!tokens || tokens.length === 0) {
        await wordTokenAPI.generateWordTokens(projectId, bookId);
        // 2️⃣a Fetch again after generation
        tokens = await wordTokenAPI.getTokensByProjectAndBook(projectId, bookId);
      }
      console.log("[DEBUG] Tokens assigned:", tokens);


      // 3️⃣ Prepare tokens for editor
      const preparedTokens = tokens.map((t) => ({
        ...t,
        translation: t.translated_text || "",
        originalTranslation: t.translated_text || "",

      }));

      setTokens(preparedTokens);
      setTranslatedCount(preparedTokens.filter(t => t.translation?.trim() !== "").length);
      setEditedTokens(preparedTokens.reduce((acc, t) => ({ ...acc, [t.word_token_id]: false }), {}));
      setHasGenerated(preparedTokens.some(t => t.translation?.trim() !== ""));


    } catch (e) {
      console.error("Failed to fetch or generate tokens", e);
      notificationApi.error({
        message: "Error",
        description: "Failed to fetch or generate tokens ",
        placement: "top",
      });
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleBookChange = async (bookId) => {
    // ✅ Auto-save current draft if edited
    if (isDraftEdited && selectedBook) {
      await draftAPI.saveManualDraft(projectId, selectedBook.book_id, draftContent);
      notificationApi.success({
        message: "Success",
        description: "previous draft saved successfully",
        placement: "top",
      });
    }

    const selected = projectBooks.find((b) => b.book_id === bookId);
    setSelectedBook(selected);
    setSourceText(selected?.usfm_content || "No source content available");
    setTranslatedCount(0);
    setHasGenerated(false); // reset for new book

    // Reset states for new book
    setTokens([]);
    setDraftContent("");
    setOriginalDraft("");
    setEditedTokens({});
    setIsDraftEdited(false);
    setCurrentDraft(null);
    setLoadingTokens(false);
    setIsGenerating(false);

    // Fetch draft for new book
    if (activeTab === "draft") {
      fetchDraftIfExists(selected);
    }

    if (!selected?.book_id) return; // ✅ Check for book_id
    await fetchTokens(selected.book_id); // ✅ Pass book_id
  };

  // ------------------ Generate Translations ------------------//

  // ------------------ Generate Translations ------------------//
  const handleCancelTranslation = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsGenerating(false);
      
      // Close the ongoing translation notification
      if (translationNotificationKey.current) {
        notificationApi.destroy(translationNotificationKey.current);
        translationNotificationKey.current = null;
      }
      
      // Show cancellation notification
      notificationApi.warning({
        message: "Translation Cancelled",
        description: "Translation cancelled by the user.",
        placement: "top",
        duration: 3,
      });
    }
  };

  const handleGenerateTranslationsSSEWithPreserveEdits = async ({ fullRegenerate = true } = {}) => {
    if (!selectedBook?.book_id) return; // ✅ Check for bookId
    setIsGenerating(true);
    // Show persistent "Translating..." notification
  translationNotificationKey.current = `translation-${Date.now()}`;
  notificationApi.info({
    key: translationNotificationKey.current,
    message: "Translating...",
    description: "Translation is in progress. Please wait...",
    placement: "top",
    duration: 0, // Don't auto-close
    icon: <Spin />,
  });
  if (fullRegenerate && hasGenerated) {
    setTokens(prev => {
      const cleared = prev.map(t => ({ ...t, translation: "" }));
      setTranslatedCount(0);  
      return cleared;          
    });
  }  // Determine token IDs to translate based on No Continue
  const tokenIdsToTranslate = fullRegenerate
    ? undefined  // translate all tokens
    : tokens
        .filter(t => !t.translation?.trim())  // only untranslated tokens
        .map(t => t.word_token_id);
  
    try {
      const params = new URLSearchParams({
        book_id: selectedBook.book_id,
        model_name: selectedModel,
      });
      
      // Include token IDs only if in No Continue mode
      if (tokenIdsToTranslate) {
        tokenIdsToTranslate.forEach(id => params.append("token_ids", id));
      }
      // const eventSource = new EventSource(
      //   // import.meta.env.VITE_BACKEND_URL + `/api/generate_batch_stream/${projectId}?book_id=${encodeURIComponent(selectedBook.book_id)}`
      //   `${import.meta.env.VITE_BACKEND_URL}/api/generate_batch_stream/${projectId}?book_id=${encodeURIComponent(selectedBook.book_id)}&model_name=${encodeURIComponent(selectedModel)}`

      // );
      const eventSource = new EventSource(
        `${import.meta.env.VITE_BACKEND_URL}/api/generate_batch_stream/${projectId}?${params.toString()}`
      );
      
      eventSourceRef.current = eventSource;
      let hasError = false;
      eventSource.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.error("Invalid SSE JSON:", err);
          return;
        }
        if (data.error) {
          hasError = true;
          console.error("[SSE Error]", data.error);
          
          // Close the translating notification
          if (translationNotificationKey.current) {
            notificationApi.destroy(translationNotificationKey.current);
            translationNotificationKey.current = null;
          }
          
          notificationApi.error({
            message: "Error",
            description: "Translation failed. The server might be down or the network is slow. Please try again.",
            placement: "top",
            duration: 4,
          });
          
          setIsGenerating(false);
          eventSource.close();
          eventSourceRef.current = null;
          return;
        }
        if (data.token) {
          const t = data.token;

          // Update tokens and mark as "justUpdated" for highlighting
          setTokens(prevTokens => {
            const idx = prevTokens.findIndex(x => x.word_token_id === t.word_token_id);
            const newToken = {
              ...t,
              translation: t.translated_text,
              originalTranslation: t.translated_text,
              justUpdated: true // highlight flag
            };
            let updated;
            if (idx !== -1) {
              updated = [...prevTokens];
              updated[idx] = { ...updated[idx], ...newToken };
            } else {
              updated = [...prevTokens, newToken];
            }
            // ✅ FIX: count translated tokens properly
            const count = updated.filter(tok => tok.translation?.trim() !== "").length;
            setTranslatedCount(count);

            return updated;
          });
          // 🔹 ADD THIS: make sure editedTokens has an entry for new tokens
          setEditedTokens(prev => {
            if (prev && Object.prototype.hasOwnProperty.call(prev, t.word_token_id)) {
              return prev;
            }
            return { ...prev, [t.word_token_id]: false };
          });
          // Update draft if user hasn’t edited
          if (!editedTokensRef.current[t.word_token_id]) {
            updateDraftFromEditor(
              t.word_token_id,
              t.translated_text,
              t.originalTranslation || t.token_text,
              t.token_text,
              false
            );
          }


          // Remove highlight after 1 second
          setTimeout(() => {
            setTokens(prevTokens =>
              prevTokens.map(tok =>
                tok.word_token_id === t.word_token_id
                  ? { ...tok, justUpdated: false }
                  : tok
              )
            );
          }, 1000);
        }
        if (data.finished) {
          if (translationNotificationKey.current) {
            notificationApi.destroy(translationNotificationKey.current);
            translationNotificationKey.current = null;
          }
        
          if (hasError) {
            notificationApi.error({
              message: "Error",
              description: "Translation job failed. Please try again.",
              placement: "top",
            });
          } else {
            notificationApi.success({
              message: "Success",
              description: `All ${data.total ?? translatedCount} tokens translated!`,
              placement: "top",
            });
            setHasGenerated(true);
          }
          setIsGenerating(false);
          eventSource.close();
          eventSourceRef.current = null;
        }
      };


      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        // Close the translating notification
  if (translationNotificationKey.current) {
    notificationApi.destroy(translationNotificationKey.current);
    translationNotificationKey.current = null;
  }
        notificationApi.error({
          message: "Error",
          description: "Translation stream interrupted. Please try again.",
          placement: "top",
        });
        setIsGenerating(false); // 🔹 Reset on error
        eventSource.close();
        eventSourceRef.current = null;
      };

    } catch (err) {
      console.error("Failed to start SSE translation:", err);
      
      // Close the translating notification
      if (translationNotificationKey.current) {
        notificationApi.destroy(translationNotificationKey.current);
        translationNotificationKey.current = null;
      }
      
      notificationApi.error({
        message: "Error",
        description: "Failed to start translation stream. Please try again.",
        placement: "top",
        duration: 4,
      });
      setIsGenerating(false);
    }
  };

  // ------------------ Draft Handling (via API) ------------------

  const fetchDraftIfExists = async (book = selectedBook) => {
    if (!projectId || !selectedBook?.book_id) return;
    setLoadingDraft(true);
    try {
      const response = await draftAPI.getLatestDraftForBook(projectId, book.book_id);
      if (response) {
        setCurrentDraft(response);
        setDraftContent(response.content || "");
        setOriginalDraft(response.content || "");
        setIsDraftEdited(false);
      } else {
        // Draft doesn't exist → show source text, but DO NOT generate
        setDraftContent(selectedBook.usfm_content || "");
        setOriginalDraft(selectedBook.usfm_content || "");
        setIsDraftEdited(false);
        setCurrentDraft(null);
      }
    } catch (error) {
      console.error("[ERROR] fetchDraftIfExists:", error);
      notificationApi.error({
        message: "Error",
        description: "Failed to fetch draft.",
        placement: "top",
      });
    } finally {
      setLoadingDraft(false);
    }
  };
  useEffect(() => {
    if (activeTab === "draft" && selectedBook) {
      fetchDraftIfExists(selectedBook);
    }
  }, [activeTab, projectId, selectedBook]);

  const handleGenerateDraft = async () => {
    if (!projectId || !selectedBook?.book_id) return;
    setLoadingDraft(true);
    try {
      const generated = await draftAPI.generateDraftForBook(projectId, selectedBook.book_id);
      setCurrentDraft(generated);
      setDraftContent(generated?.content || "");
      setOriginalDraft(generated?.content || "");
      setIsDraftEdited(false);
      setEditedTokens(prev => {
        const updated = { ...prev };
        delete updated['draft_edited'];
        return updated;
      });
      notificationApi.success({
        message: "Success",
        description: `Draft generated for ${selectedBook.book_name}`,
        placement: "top",
      });
    } catch (error) {
      console.error("[ERROR] handleGenerateDraft:", error);
      notificationApi.error({
        message: "Error",
        description: "Failed to generate draft.",
        placement: "top",
      });
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleCopyDraft = () => {
    if (!draftContent?.trim()) {
      messageApi.warning("No draft content to copy");
      console.log("No draft content to copy");
      return;
    }

    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      // Modern secure API
      navigator.clipboard.writeText(draftContent)
        .then(() => {
          messageApi.success("Draft copied to clipboard!");
          console.log("Draft copied:", draftContent.slice(0, 100));
        })
        .catch((err) => {
          console.error("Clipboard copy failed:", err);
          messageApi.error("Failed to copy draft: " + (err.message || err));
        });
    } else {
      // Fallback for HTTP or older browsers
      const textarea = document.createElement("textarea");
      textarea.value = draftContent;
      textarea.style.position = "fixed"; // avoid scrolling
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const success = document.execCommand("copy");
        if (success) {
          messageApi.success("Draft copied to clipboard!");
          console.log("Draft copied (fallback):", draftContent.slice(0, 100));
        } else {
          throw new Error("execCommand returned false");
        }
      } catch (err) {
        console.error("Fallback copy failed:", err);
        messageApi.error("Failed to copy draft: " + (err.message || err));
      }

      document.body.removeChild(textarea);
    }
  };

  const updateDraftFromEditor = (tokenId, newTranslation, oldTranslation, tokenText, isManual = false) => {
    try {
      const oldVal = String(oldTranslation || tokenText || "");
      const newVal = String(newTranslation || "");

      setDraftContent(prevDraft => {
        if (prevDraft === null || prevDraft === undefined) return "";

        // Escape special regex characters
        const escapedOld = oldVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedOld, "g");

        // Replace only exact matches in draft
        const updatedDraft = String(prevDraft).replace(regex, newVal);  // ✅ force string

        return updatedDraft;
      });

      // Update editedTokens only if manual edit
      if (isManual) {
        setEditedTokens(prev => ({
          ...prev,
          [tokenId]: isManual
        }));
      }

    } catch (err) {
      console.error("[ERROR] updateDraftFromEditor failed:", err);
    }
  };
  const handleDownloadDraft = () => {
    const blob = new Blob([draftContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project?.name || "translation"}_draft.usfm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    messageApi.info("Draft downloaded!");
  };

  const handleSaveAll = async () => {
    if (!selectedBook) {
      notificationApi.error({
        message: "Error",
        description: "No book selected",
        placement: "top",
      });
      return;
    }
    if (!projectId) {
      notificationApi.error({
        message: "Error",
        description: "No project selected",
        placement: "top",
      }); return;
    }

    try {
      let updatedTokens = [];
      let draftToSave = null;
      let response = null;

      if (activeTab === "editor") {
        // collect edited tokens
        updatedTokens = tokens
          .filter(t => editedTokensRef.current[t.word_token_id])
          .map(t => ({
            word_token_id: t.word_token_id,
            translated_text: String(t.translation || "")
          }));
        draftToSave = draftContent;

        // ✅ save via tokens API
        response = await draftAPI.saveDraftForBook(
          projectId,
          selectedBook.book_id,
          updatedTokens,
          draftToSave
        );
      } else if (activeTab === "draft") {
        // free-form draft text only
        draftToSave = String(draftContent || "");

        // ✅ save via manual draft API
        response = await draftAPI.saveManualDraft(
          projectId,
          selectedBook.book_id,
          draftToSave
        );
      }

      notificationApi.success({
        message: "Success",
        description: "All translation saved successfully",
        placement: "top",
      });
      // Update local state based on response
      if (response?.draft) {
        setDraftContent(String(response.draft.content || ""));
        setOriginalDraft(String(response.draft.content || ""));
        setIsDraftEdited(false);
      }
      if (response?.updated_tokens) {
        setTokens(prevTokens =>
          prevTokens.map(t => {
            const updated = response.updated_tokens.find(
              u => u.word_token_id === t.word_token_id
            );
            return updated
              ? {
                ...t,
                translation: String(updated.translated_text),
                originalTranslation: String(updated.translated_text),
              }
              : t;
          })
        );

        // ✅ recalc based on all tokens to account for deletes
        setTranslatedCount(
          tokens.filter(t => t.translation?.trim() !== "").length
        );
      }

      // Reset edit flags
      setEditedTokens(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(k => (reset[k] = false));
        return reset;
      });
    } catch (err) {
      console.error("Failed to save translations:", err);
      notificationApi.error({
        message: "Error",
        description: "Failed to save translations",
        placement: "top",
      });
    }
  };
  const handleDiscardAll = () => {
    if (activeTab === "editor") {
      const resetTokens = tokens.map(t => ({
        ...t,
        translation: t.originalTranslation || t.translation,
      }));
      setTokens(resetTokens);

      setTranslatedCount(resetTokens.filter(t => t.translation?.trim() !== "").length);

      setEditedTokens(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(k => (reset[k] = false));
        return reset;
      });

      messageApi.info("Editor changes discarded.");
    } else if (activeTab === "draft") {
      // Reset draft to original content
      setDraftContent(originalDraft);
      setIsDraftEdited(false);
      setEditedTokens(prev => {
        const updated = { ...prev };
        delete updated['draft_edited']; // reset manual edit flag
        return updated;
      });
      messageApi.info("Draft changes discarded.");
    }
  };


  const attemptSetActiveTab = (tab) => {
    if (tab === activeTab) return;

    // If leaving draft and draft has unsaved changes -> confirm
    if (activeTab === "draft" && showDraftUnsaved) {
      Modal.confirm({
        title: "Unsaved draft changes",
        icon: <ExclamationCircleOutlined />,
        content: "You have unsaved changes in Draft. Save them before switching? (or discard to switch without saving)",
        okText: "Save & Switch",
        cancelText: "Discard & Switch",
        onOk: async () => {
          try {
            await handleSaveAll();
            setActiveTab(tab);
          } catch (err) {
            // handleSaveAll already shows messages
          }
        },
        onCancel: () => {
          // Discard and switch
          setDraftContent(originalDraft);
          setIsDraftEdited(false);
          setEditedTokens(prev => {
            const u = { ...prev };
            delete u.draft_edited;
            return u;
          });
          setActiveTab(tab);
        },
      });
      return;
    }

    // If leaving editor and tokens have unsaved edits -> confirm
    if (activeTab === "editor" && showEditorUnsaved) {
      Modal.confirm({
        title: "Unsaved editor changes",
        icon: <ExclamationCircleOutlined />,
        content: "You have unsaved translation edits. Save them before switching? (or discard to switch without saving)",
        okText: "Save & Switch",
        cancelText: "Discard & Switch",
        onOk: async () => {
          try {
            await handleSaveAll();
            setActiveTab(tab);
          } catch (err) { }
        },
        onCancel: () => {
          // Discard editor edits and switch
          setTokens(prevTokens =>
            prevTokens.map(t => ({
              ...t,
              translation: t.originalTranslation || t.translation,
            }))
          );
          setEditedTokens({});
          setActiveTab(tab);
        },
      });
      return;
    }

    setActiveTab(tab);
  };
  // if (projectLoading) return <Spin />;
  if (projectLoading) return <div>Loading project...</div>;
  if (projectError) return <div>Error loading project</div>;

  const hasTranslation = tokens?.length > 0 && tokens.some(t => t.translation?.trim() !== "");
  return (
    <div style={{ padding: '4px', position: 'relative', height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* {contextHolder} */}
      {messageContextHolder}
  {notificationContextHolder}
  {modalContextHolder}
    {/* Upload Summary Toast */}
    <UploadProgressModal
  visible={uploadProgressOpen}
  uploading={uploadingBooks}
  uploaded={uploadedBooks}
  skipped={skippedBooks}
  total={totalBooks}
  onClose={() => setUploadProgressOpen(false)}
/>

        {/* Hidden file input for book upload */}
        <input
        type="file"
        ref={hiddenUploadInputRef}
        style={{ display: "none" }}
        multiple
        accept=".usfm"
        onChange={onUploadFilesChosen}
      />
      <div style={{
        marginBottom: 24,
      }}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { title: <Link to="/projects" style={{ color: 'rgb(44, 141, 251)', fontWeight: 500 }}>Projects</Link> },
            { title: <span style={{ fontWeight: 500 }}>{project?.name}</span> },
          ]}
          style={{ marginBottom: '12px' }}
        />

        {/* Project Name */}
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
          Word Translation ({project?.name})
        </h2>
      </div>

     {/* Book Selector with Upload Button */}
     <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
            Select Book
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              className="custom-book-dropdown"
              placeholder="Select a book"
              style={{ width: 150, borderRadius: 8, fontSize: 16 }}
              onChange={handleBookChange}
              value={selectedBook?.book_id}
            >
              {projectBooks.map((book) => (
                <Option key={book.book_id} value={book.book_id}>
                  {book.book_name}
                </Option>
              ))}
            </Select>
            <Button
              type="text"
              //shape="circle"
              icon={<UploadOutlined 
                style={{ color: "#1890ff", cursor: "pointer", fontSize: 20 }}
              />}
              onClick={handleUploadBooks} 
              title="Upload Books"
              style={{
                //backgroundColor: 'rgb(44, 141, 251)',
                //borderColor: 'rgb(44, 141, 251)',
                
              }}
            />
           {selectedBook && (
              <Button
                type="text"
                icon={<DeleteOutlined style={{ color: "red", cursor: "pointer", fontSize: 20 }} />}
                onClick={handleDeleteBook}
                title="Delete Selected Book"
                danger
              />
            )}

          </div>
        </div>
      </div>
      {/* Progress Bar */}
      {selectedBook && tokens.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Progress
            percent={Math.round((translatedCount / tokens.length) * 100)}
            strokeColor="#52c41a"
            showInfo={true} // keep it true to use custom format
            format={() => (
              <span style={{ color: '#000' }}>
                {translatedCount}/{tokens.length} Tokens
              </span>
            )}
            status="active"
          />
        </div>
      )}
      {selectedBook && (
        <>
          {/* Tabs */}
          <div
            style={{
              width: 200,
              height: 30,
              display: 'flex',
              borderRadius: 30,
              border: '1px solid #d9d9d9',
              position: 'relative',
              margin: '24px auto',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 18,
              maxWidth: '90%',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: activeTab === 'editor' ? 0 : '50%',
                width: '50%',
                height: '100%',
                backgroundColor: 'rgb(44, 141, 251)',
                borderRadius: 30,
                transition: 'left 0.3s',
                zIndex: 0,
              }}
            />
            <div
              onClick={() => attemptSetActiveTab('editor')}
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                color: activeTab === 'editor' ? '#fff' : 'rgb(44, 141, 251)',
                fontWeight: 600,
                userSelect: 'none',
              }}
            >
              Editor
            </div>
            <div
              onClick={() => attemptSetActiveTab('draft')}
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                color: activeTab === 'draft' ? '#fff' : 'rgb(44, 141, 251)',
                fontWeight: 600,
                userSelect: 'none',
              }}
            >
              Draft
            </div>
          </div>

          <Card
            title={activeTab === "editor" ? "Translation Editor" : "Draft View"}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            extra={
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Show Unsaved Changes only for the active tab */}
                {((activeTab === "editor" && showEditorUnsaved) ||
                  (activeTab === "draft" && showDraftUnsaved)) && (
                    <div style={{
                      backgroundColor: '#fffbe6',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: '1px solid #fadb14',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span style={{ fontWeight: 'bold', color: '#d46b08', fontSize: '12px' }}>
                        Unsaved Changes:
                      </span>
                      <Button type="primary" onClick={handleSaveAll} size="medium" loading={saving}>
                        Save
                      </Button>
                      <Button onClick={handleDiscardAll} size="medium">
                        Discard
                      </Button>
                    </div>
                  )}
                {activeTab === "editor" ? (
                  <>
                    {/* Editor-specific buttons */}
                    {/* <Text type="secondary">
                      Progress: {translatedCount}/{tokens.length}
                    </Text> */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Tooltip
                        title={
                          selectedModel ? (
                            <div style={{ textAlign: "left", fontSize: 12 }}>
                              {Object.entries(MODEL_INFO[selectedModel]).map(([key, val]) => (
                                <div key={key}><b>{key}:</b> {val}</div>
                              ))}
                            </div>
                          ) : "Select a model to see info"
                        }
                        placement="left"
                        color="#f0f0f0"
                      >
                        <Button
                          type="text"
                          icon={<InfoCircleOutlined style={{ fontSize: 18, color: "#2c8dfb" }} />}
                          disabled={!selectedModel} // disables button when no model selected
                        />
                      </Tooltip>
                      <Select
  value={selectedModel}
  style={{ width: 250 }}
  dropdownRender={() => {
    const src = sourceLang?.BCP_code || "";
    const tgt = targetLang?.BCP_code || "";

    const models = [
      {
        label: "nllb-600M",
        value: "nllb-600M",
        tooltip: "General-purpose model for 200 languages.",
        valid: true, // always valid fallback
      },
      {
        label: "nllb_finetuned_eng_nzm",
        value: "nllb_finetuned_eng_nzm",
        tooltip: "This model ONLY supports English ↔ Zeme Naga.",
        valid:
          (src === "eng_Latn" && tgt === "nzm_Latn") ||
          (src === "nzm_Latn" && tgt === "eng_Latn"),
      },
      {
        label: "nllb-english-nagamese",
        value: "nllb-english-nagamese",
        tooltip: "This model ONLY supports English ↔ Nagamese.",
        valid:
          (src === "eng_Latn" && tgt === "nag_Latn") ||
          (src === "nag_Latn" && tgt === "eng_Latn"),
      },
      {
        label: "nllb-gujrathi-koli_kachchi",
        value: "nllb-gujrathi-koli_kachchi",
        tooltip: "This model ONLY supports Gujarati ↔ Kachi Koli.",
        valid:
          (src === "guj_Gujr" && tgt === "gjk_Gujr") ||
          (src === "gjk_Gujr" && tgt === "guj_Gujr"),
      },
      {
        label: "nllb-hin-surjapuri",
        value: "nllb-hin-surjapuri",
        tooltip: "This model ONLY supports Hindi ↔ Surjapuri.",
        valid:
          (src === "hin_Deva" && tgt === "sjp_Deva") ||
          (src === "sjp_Deva" && tgt === "hin_Deva"),
      },
    ];

    return (
      <>
        {models.map((opt) => {
          // Mark all non-selected, non-matching models as disabled (greyed)
          const disabled = opt.value !== selectedModel; // disable everything except the selected one
          const isSelected = opt.value === selectedModel;

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
                  backgroundColor: isSelected ? "#e6f7ff" : "transparent",
                  fontWeight: isSelected ? 600 : 400,
                }}
                onClick={(e) => {
                  e.stopPropagation(); // prevent closing or selecting others
                }}
              >
                {opt.label}
              </div>
            </Tooltip>
          );
        })}
      </>
    );
  }}
>
  <Option key={selectedModel} value={selectedModel}>
    {selectedModel}
  </Option>
</Select>
                    </div>

                    {/* {hasGenerated ? (
  isGenerating ? (
    <Button 
      danger 
      size="large"
      onClick={handleCancelTranslation}
    >
      Cancel Translation
    </Button>
  ) : (
    <Popconfirm
      disabled={isGenerating}
      title="Regenerate Translations? All regenerated translations will overwrite unsaved edits."
      icon={<ExclamationCircleOutlined />}
      onConfirm={() => {
        if (Object.values(editedTokens).some(Boolean)) {
          notificationApi.warning({
            message: "Warning",
            description: "you have unsaved edits. Please save them before regenerating translations.",
            placement: "top",
          });
        }
        handleGenerateTranslationsSSEWithPreserveEdits();
      }}
      okText="Yes, Regenerate"
      cancelText="Cancel"
    >
      <Tooltip title={!selectedModel ? "Please select a model first" : ""}>
      <Button type="primary" loading={isGenerating} disabled={!selectedModel || isGenerating}
      >
      {isGenerating ? "Regenerating..." : "Regenerate Translations"}
      </Button>
      </Tooltip>
    </Popconfirm>
  )
) : isGenerating ? ( */}
{hasGenerated ? (
  isGenerating ? (
    <Button 
      danger 
      size="large"
      onClick={handleCancelTranslation}
    >
      Cancel Translation
    </Button>
  ) : (
    <>
      {/* Button to open modal */}
      <Tooltip title={!selectedModel ? "Please select a model first" : ""}>
        <Button
          type="primary"
          disabled={!selectedModel || isGenerating}
          onClick={() => setIsModalVisible(true)}
        >
          {isGenerating ? "Translating..." : "Regenerate Translations"}
        </Button>
      </Tooltip>

      {/* 3-option modal */}
      <Modal
        visible={isModalVisible}
        title="Regenerate Translations"
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>Cancel</Button>,
          <Button
            key="no"
            onClick={() => {
              setIsModalVisible(false);
              handleGenerateTranslationsSSEWithPreserveEdits({ fullRegenerate: false });
            }}
          >
            No, Continue
          </Button>,
          <Button
            key="yes"
            type="primary"
            danger
            onClick={() => {
              setIsModalVisible(false);
              handleGenerateTranslationsSSEWithPreserveEdits({ fullRegenerate: true });
            }}
          >
            Yes, Regenerate
          </Button>
        ]}
      >
        Do you want to regenerate all translations, or continue from where you left off?
      </Modal>
    </>
  )
) : isGenerating ? (
  <Button 
    danger 
    size="large"
    onClick={handleCancelTranslation}
  >
    Cancel Translation
  </Button>
) : (
  <Tooltip title={!selectedModel ? "Please select a model first" : ""}>
                        <Button
                          type="primary"
                          size="large"
                          onClick={handleGenerateTranslationsSSEWithPreserveEdits}
                          loading={isGenerating}
                          disabled={!selectedModel || isGenerating}
                        >{isGenerating ? "Generating..." : "Generate Translations"}
                        </Button>
                      </Tooltip>
)}
                  </>
                ) : (
                  <>
                    {/* Draft-specific buttons */}
                    <Popconfirm
                      title={
                        // 1️⃣ Editor has unsaved edits (unsaved in editor tab)
                        showEditorUnsaved
                          ? "Generating a new draft will overwrite present draft changes. Are you sure?"
                          // 2️⃣ Draft free-form edited & saved
                          : editedTokens['draft_edited'] && !isDraftEdited
                            ? "You have manually edited the draft. Generating a new draft will overwrite these changes. Are you sure?"
                            // 3️⃣ Draft unsaved changes (from free-form edit not saved yet)
                            : isDraftEdited
                              ? "Generating a new draft will discard any unsaved draft edits. Are you sure?"
                              // 4️⃣ Default fallback
                              : "Generating a new draft will overwrite present draft changes. Are you sure?"
                      }
                      onConfirm={handleGenerateDraft}
                      okText="Yes, Generate"
                      cancelText="Cancel"
                    >
                      <Button type="primary" size="medium" loading={loadingDraft}>
                        {loadingDraft ? 'Generating...' : 'Generate Draft'}
                      </Button>
                    </Popconfirm>

                    <Button
                      icon={<CopyOutlined />}
                      size="medium"
                      onClick={handleCopyDraft}
                      disabled={loadingTokens || loadingDraft}
                    >
                      Copy
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      size="medium"
                      type="primary"
                      onClick={handleDownloadDraft}
                      disabled={loadingTokens || loadingDraft}
                    >
                      Download
                    </Button>
                  </>
                )}
              </div>
            }
          >
            <Row gutter={16} style={{ flex: 1 }}>
              <Col span={12} style={{ height: "100%" }}>
                <h3>Source</h3>
                <div style={{
                  height: "60vh",
                  overflowY: "auto",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                  padding: 10
                }}>
                  <pre style={{ whiteSpace: "pre-wrap", background: "#fff" }}>
                    {sourceText || "No source loaded"}
                  </pre>
                </div>
              </Col>

              <Col span={12} style={{ height: "100%" }}>
                <h3>{activeTab === "editor" ? "Translation" : "Draft Translation"}</h3>
                <div style={{
                  height: "60vh",
                  overflowY: "auto",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                  padding: '10px',
                  backgroundColor: '#FFFFFF',
                }}>
                  {tokens.length === 0 ? (
                    <Text type="secondary">
                      {activeTab === "editor" ? "No word tokens found for this book." : "No draft available."}
                    </Text>
                  ) : activeTab === "editor" ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      {tokens.map((token, index) => (
                        <div
                          key={token.word_token_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 20px',
                            borderBottom: index === tokens.length - 1 ? 'none' : '1px solid #f0f0f0',
                            backgroundColor: token.justUpdated
                              ? "#d6f5d6"
                              : (token.translation !== token.originalTranslation ? "#fffef7" : "transparent"),
                            transition: "background-color 0.5s",
                            gap: '20px',
                            width: 'fit-content'
                          }}
                        >
                          {/* Source Token Box */}
                          <div style={{
                            minWidth: '140px',
                            maxWidth: '140px',
                            padding: '8px 16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: '500',
                            fontSize: '16px',
                            color: '#2c3e50'
                          }}>
                            {token.token_text}
                          </div>

                          {/* Separator Line */}
                          <div style={{
                            width: '2px',
                            height: '20px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '1px'
                          }} />


                          <div style={{ flex: 1, position: 'relative' }}>
                            <Input
                              value={token.translation || ""}
                              onChange={(e) => {
                                const newTranslation = e.target.value;
                                const updatedTokens = tokens.map(t =>
                                  t.word_token_id === token.word_token_id
                                    ? { ...t, translation: newTranslation }
                                    : t
                                );

                                setTokens(updatedTokens);
                                setTranslatedCount(
                                  updatedTokens.filter(t => t.translation?.trim() !== "").length
                                );

                                setEditedTokens(prev => ({
                                  ...prev,
                                  [token.word_token_id]: true
                                }));

                                updateDraftFromEditor(
                                  token.word_token_id,
                                  newTranslation,
                                  token.originalTranslation,
                                  token.token_text,
                                  true
                                );

                              }}
                              style={{
                                fontSize: '16px',
                                border: 'none',
                                boxShadow: 'none',
                                backgroundColor: editedTokens[token.word_token_id] ? '#fffbe6' : 'transparent',
                                padding: '8px 12px',
                                borderBottom: '1px solid #e0e0e0'
                              }}
                              placeholder="Enter translation here..."
                              size="medium"
                              variant="unstyled"
                            />

                            {/* Status Indicator */}
                            {token.translation !== token.originalTranslation && (
                              <div style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#faad14'
                              }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <TextArea
                        rows={20}
                        value={draftContent}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftContent(String(val));

                          const draftChanged = val !== originalDraft;
                          setIsDraftEdited(draftChanged);
                          if (draftChanged) {
                            setEditedTokens(prev => ({
                              ...prev,
                              'draft_edited': true // Use a dedicated key to mark draft changes
                            }));
                          }
                          setIsDraftEdited(draftChanged);
                        }}
                        style={{
                          backgroundColor: isDraftEdited ? "#fffbe6" : "transparent",
                          padding: 10,
                          borderRadius: 4,
                        }}
                      />
                    </>
                  )}
                </div>
              </Col>
            </Row>
          </Card>
        </>
      )}
    </div>
  );
};