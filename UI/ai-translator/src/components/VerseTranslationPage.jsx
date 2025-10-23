import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Typography,
  App,
  Space,
  Spin,
  Tabs,
  Row,
  Col,
  Switch,
  Select,
  Breadcrumb,
  Progress,
  Popconfirm,
  Modal,
  Tag,
  Divider,
  Radio,
} from "antd";
import {
  ThunderboltOutlined,
  SaveOutlined,
  CopyOutlined,
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import api, { translateChapter } from "./api";
import {
  generateDraftJson,
  saveDraft,
  fetchLatestDraft,
  booksAPI,
} from "./api";
import DownloadDraftButton from "../components/DownloadDraftButton";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/* ---------------- Upload Progress Modal ---------------- */
function UploadProgressModal({
  visible,
  uploading = [],
  uploaded = [],
  skipped = [],
  total = 0,
  onClose,
}) {
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
          Uploaded: {uploaded.length}/{total}
        </Text>
      </div>

      {uploading.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Currently uploading:</Text>
          <div style={{ marginTop: 8 }}>
            {uploading.map((code) => (
              <Tag
                color="blue"
                key={`uploading-${code}`}
                style={{ marginBottom: 6 }}
              >
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
              <Tag
                color="green"
                key={`uploaded-${code}`}
                style={{ marginBottom: 6 }}
              >
                {code}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            ⚠️ Skipped (already exists | wrong format ) ({skipped.length}):
          </Text>
          <div style={{ marginTop: 8 }}>
            {skipped.map((code) => (
              <Tag
                color="gold"
                key={`skipped-${code}`}
                style={{ marginBottom: 6 }}
              >
                {code}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* {isComplete && ( */}
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button type="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      {/* )} */}
    </Modal>
  );
}

const VerseTranslationPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState("all");
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);

  const [tokens, setTokens] = useState([]);
  const [isTokenized, setIsTokenized] = useState(false);

  const [showOnlyTranslated, setShowOnlyTranslated] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Translation");
  const [rawBookContent, setRawBookContent] = useState("");

  const [loadingSource, setLoadingSource] = useState(false); // fetching tokens/raw
  const [loadingTranslate, setLoadingTranslate] = useState(false); // translation only

  const [serverDraft, setServerDraft] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [isZemeNaga, setIsZemeNaga] = useState(false);

  // store edits per verse_token_id
  const [draftId, setDraftId] = useState(null); //Added to track draft ID
  const [editedDraft, setEditedDraft] = useState("");
  // Track unsaved edits per verse token
  const [editedTokens, setEditedTokens] = useState({});
  const [activeTab, setActiveTab] = useState("editor");
  const [originalDraft, setOriginalDraft] = useState(""); // NEW
  const [selectedModel, setSelectedModel] = useState("nllb-600M");
  const abortControllerRef = useRef(null);
  const [cancelTranslation, setCancelTranslation] = useState(false);
  const [draftChapter, setDraftChapter] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modal, modalContextHolder] = Modal.useModal();

  const { message } = App.useApp(); //get message instance
  const MODEL_INFO = {
    "nllb-600M": {
      Model: "nllb-600M",
      Tasks: "mt, text translation",
      "Language Code Type": "BCP-47",
      DevelopedBy: "Meta",
      License: "CC-BY-NC 4.0",
      Languages: "200 languages",
    },
    nllb_finetuned_eng_nzm: {
      Model: "nllb_finetuned_eng_nzm",
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
    "nllb-hin-surjapuri": {
      Model: "nllb-hin-surjapuri",
      Tasks: "mt, text translation",
      "Language Code Type": "BCP-47",
      DevelopedBy: "Meta",
      License: "CC-BY-NC 4.0",
      Languages: "Hindi, Surjapuri",
    },
  };
  const availableModels = [
    { label: "nllb-600M", value: "nllb-600M" },
    { label: "nllb_finetuned_eng_nzm", value: "nllb_finetuned_eng_nzm" },
    { label: "nllb-english-nagamese", value: "nllb-english-nagamese" },
    {
      label: "nllb-gujrathi-koli_kachchi",
      value: "nllb-gujrathi-koli_kachchi",
    },
    { label: "nllb-hin-surjapuri", value: "nllb-hin-surjapuri" },
  ];
  useEffect(() => {
    if (!project) return;

    const src = (project.source_language_name || "").toLowerCase().trim();
    const tgt = (project.target_language_name || "").toLowerCase().trim();
    let forcedModel = null;
    if (
      (src === "english" && tgt === "zeme naga") ||
      (src === "zeme naga" && tgt === "english")
    ) {
      forcedModel = "nllb_finetuned_eng_nzm";
    } else if (
      (src === "english" && tgt === "nagamese") ||
      (src === "nagamese" && tgt === "english")
    ) {
      forcedModel = "nllb-english-nagamese";
    } else if (
      (src === "gujarati" && tgt === "kachi koli") ||
      (src === "kachi koli" && tgt === "gujarati")
    ) {
      forcedModel = "nllb-gujrathi-koli_kachchi";
    } else if (
      (src === "hindi" && tgt === "surjapuri") ||
      (src === "surjapuri" && tgt === "hindi")
    ) {
      forcedModel = "nllb-hin-surjapuri";
    }

    if (forcedModel) {
      setSelectedModel(forcedModel);
    } else {
      setSelectedModel("nllb-600M");
    }
  }, [project]);
  // Book upload state
  const [isBookUploadModalOpen, setIsBookUploadModalOpen] = useState(false);
  //const [uploadProgressOpen, setUploadProgressOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    uploaded: [],
    skipped: [],
  });
  const hiddenUploadInputRef = useRef(null);
  // Modal control
  const [uploadProgressOpen, setUploadProgressOpen] = useState(false);

  // Upload tracking
  const [uploadingBooks, setUploadingBooks] = useState([]);
  const [uploadedBooks, setUploadedBooks] = useState([]);
  const [skippedBooks, setSkippedBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);

  // ---------- Book Upload Utils (from SourcesListPage) ----------
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
        } catch { }
        const name = file.name.split(".")[0] || file.name;
        resolve(name.replace(/[^0-9A-Za-z]/g, "").toUpperCase());
      };
      reader.readAsText(file);
    });

  const showUploadSummary = (uploaded = [], skipped = []) => {
    setSummaryData({ uploaded, skipped });
    setSummaryOpen(true);
  };

  const uploadBooksForSource = async (sourceId, files) => {
    if (!sourceId || !files?.length)
      return { uploading: [], uploaded: [], skipped: [], total: 0 };

    const existing = await getExistingBooks(sourceId);
    const existingCodes = new Set((existing || []).map((b) => b.book_code));
    const uploaded = [];
    const skipped = [];

    for (const file of files) {
      const code = await guessUSFMCode(file);

      if (existingCodes.has(code)) {
        skipped.push(code);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      try {
        await api.post(`/books/upload_books/?source_id=${sourceId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploaded.push(code);
        existingCodes.add(code);
      } catch {
        message.error(`Failed to upload ${code}`);
      }
    }

    return { uploaded, skipped };
  };

  const handleBookUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !project?.source_id) return;

    setTotalBooks(files.length);
    setUploadingBooks([]);
    setUploadedBooks([]);
    setSkippedBooks([]);
    setUploadProgressOpen(true);

    for (const file of files) {
      const code = await guessUSFMCode(file); // Get the book code

      // Mark as uploading (by code, not filename)
      setUploadingBooks((prev) => [...prev, code]);

      try {
        // Call your existing API helper
        const { uploaded, skipped } = await uploadBooksForSource(
          project.source_id,
          [file] // send one at a time
        );

        if (uploaded.length) {
          setUploadedBooks((prev) => [...prev, code]); // use code instead of file.name
        }
        if (skipped.length) {
          setSkippedBooks((prev) => [...prev, code]); // use code instead of file.name
        }
      } catch (err) {
        setSkippedBooks((prev) => [...prev, code]); // treat errors as skipped
      } finally {
        // Remove from "uploading"
        setUploadingBooks((prev) => prev.filter((c) => c !== code));
      }
    }

    // Refresh book list after uploads complete
    await fetchAvailableBooks(project.source_id);

    e.target.value = ""; // reset input
  };

  const openBookUploadModal = () => {
    setIsBookUploadModalOpen(true);
  };

  const openFileDialog = () => {
    if (hiddenUploadInputRef.current) {
      hiddenUploadInputRef.current.click();
    }
  };
  // ---------- Project / Books / Chapters ----------
  const fetchProjectDetails = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.data);
    } catch {
      message.error("Failed to fetch project details");
    }
  };

  const fetchAvailableBooks = async (sourceId) => {
    try {
      const res = await api.get(`/books/by_source/${sourceId}`);
      const bookData = res.data?.data || [];
      setBooks(bookData);

      // Show message only if empty
      if (bookData.length === 0) {
        message.info({
          content: "No books found. Please upload books to start translation.",
          key: "no-books", // prevents duplicate message stacking
          duration: 3,
        });
      }
    } catch (err) {
      setBooks([]);

      // Handle 404 (no data found)
      if (err.response?.status === 404) {
        message.info({
          content: "No books found. Please upload books to start translation.",
          key: "no-books", // same key — prevents repeat popup
          duration: 3,
        });
      } else {
        message.error({
          content: "Failed to fetch books",
          key: "fetch-error",
          duration: 3,
        });
      }
    }
  };

  const fetchChaptersByBook = async (bookId) => {
    try {
      const res = await api.get(`/api/books/${bookId}/chapters`);
      setChapters(res.data || []);
    } catch {
      message.error("Failed to fetch chapters");
    }
  };

  const fetchRawBook = async (bookName) => {
    try {
      setLoadingSource(true);
      const res = await api.get(`/books/by_source/${project?.source_id}`);
      const found = res.data.data.find((b) => b.book_name === bookName);
      if (found) setRawBookContent(found.usfm_content);
      else setRawBookContent("");
    } catch {
      message.error("Failed to fetch raw book content");
    } finally {
      setLoadingSource(false);
    }
  };
  const handleDeleteBook = () => {
    console.log("handleDeleteBook called");
    console.log("selectedBook:", selectedBook);
    console.log("project.source_id:", project?.source_id);

    if (!selectedBook || selectedBook === "all") {
      message.warning("No book selected to delete");
      return;
    }

    if (!project?.source_id) {
      message.error("Cannot delete book: No source ID found");
      return;
    }

    // Find the actual book object from the books array
    const bookObj = books.find((b) => b.book_name === selectedBook);

    if (!bookObj) {
      message.error("Book not found");
      return;
    }

    modal.confirm({
      title: `Delete Book: ${selectedBook}?`,
      icon: <ExclamationCircleOutlined />,
      content:
        "This will permanently delete the book and all its content (chapters, verses).",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          console.log("Confirming delete for book_id:", bookObj.book_id);

          // Call the delete API with the actual book_id
          const response = await booksAPI.deleteBook(bookObj.book_id);
          console.log("Delete response:", response);

          message.success(`Book "${selectedBook}" deleted successfully`);

          // Refresh the books list from source
          await fetchAvailableBooks(project.source_id);

          // Reset selection to "all"
          setSelectedBook("all");
          setSelectedChapter(null);
          setTokens([]);
          setChapters([]);
          setRawBookContent("");
          setServerDraft("");
          setEditedTokens({});
        } catch (err) {
          console.error("Failed to delete book:", err);
          console.error("Error details:", err.response);
          message.error(
            `Failed to delete book: ${err.response?.data?.detail || err.message || "Unknown error"
            }`
          );
        }
      },
      onCancel: () => {
        console.log("Delete cancelled");
      },
    });
  };
  // ---------- Ensure tokens exist for a book (generate if missing) ----------
  const ensureBookTokens = async (bookName) => {
    // Try to see if *any* tokens exist for this book first
    try {
      const res = await api.get(`/verse_tokens/by-project/${projectId}`, {
        params: { book_name: bookName, chapter: "" },
      });
      const existing = Array.isArray(res.data) ? res.data : [];
      if (existing.length > 0) return; // already there
    } catch (err) {
      // ignore → will attempt generation below
      if (err.response?.status !== 404) {
        // non-404 errors should bubble up
      }
    }

    const key = "gen-book-tokens";
    message.loading({
      key,
      content: "No tokens found. Generating tokens for this book…",
      duration: 0,
    });
    await api.post(`/verse_tokens/generate-verse-tokens/${projectId}`, null, {
      params: { book_name: bookName, chapter: "" }, // book-level generation
    });
    message.success({ key, content: "Tokens generated for the book." });
  };

  // ---------- Fetch tokens for current selection (book and optional chapter) ----------
  const fetchTokensForSelection = async (bookName, chapterNumber = null) => {
    if (!bookName || bookName === "all") {
      // Project-level view
      setLoadingSource(true);
      try {
        const res = await api.get(`/verse_tokens/by-project/${projectId}`, {
          params: { book_name: "", chapter: "" },
        });
        const data = Array.isArray(res.data) ? res.data : [];

        const merged = data.map((t, i) => ({
          ...t,
          verse_token_id:
            t.verse_token_id ||
            t.id ||
            t.token_id ||
            `${t.book_name || "book"}-${t.chapter_number || 0}-${t.verse_number || i
            }`,
          verse_translated_text:
            t.verse_translated_text || t.translated_text || "",
        }));

        // Deduplicate by verse_id + token_text
        const uniqueTokens = merged.reduce(
          (acc, t) => {
            const key = `${t.verse_id}-${t.token_text}`;
            if (!acc.map[key]) {
              acc.map[key] = true;
              acc.list.push(t);
            }
            return acc;
          },
          { map: {}, list: [] }
        ).list;

        setTokens(uniqueTokens);
        setIsTokenized(uniqueTokens.length > 0);
        if (uniqueTokens.length > 0 && uniqueTokens[0].target_language_name) {
          setTargetLanguage(uniqueTokens[0].target_language_name);
        }
      } catch {
        setTokens([]);
        setIsTokenized(false);
        message.error("Failed to fetch project tokens");
      } finally {
        setLoadingSource(false);
      }
      return;
    }

    // Chapter-specific fetching (similar to before)
    setLoadingSource(true);
    try {
      let data = [];

      if (chapterNumber) {
        const chapterObj = chapters.find(
          (ch) => ch.chapter_number === chapterNumber
        );
        if (!chapterObj) {
          setTokens([]);
          setIsTokenized(false);
          message.warning("Selected chapter not found.");
          return;
        }

        try {
          const res = await api.get(
            `/api/chapters/${chapterObj.chapter_id}/tokens`,
            {
              params: { project_id: projectId },
            }
          );
          data = Array.isArray(res.data) ? res.data : [];

          if (data.length === 0) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(
              `/api/chapters/${chapterObj.chapter_id}/tokens`,
              {
                params: { project_id: projectId },
              }
            );
            data = Array.isArray(res2.data) ? res2.data : [];
          }
        } catch (err) {
          if (err.response?.status === 404) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(
              `/api/chapters/${chapterObj.chapter_id}/tokens`,
              {
                params: { project_id: projectId },
              }
            );
            data = Array.isArray(res2.data) ? res2.data : [];
          } else {
            throw err;
          }
        }
      } else {
        const res = await api.get(`/verse_tokens/by-project/${projectId}`, {
          params: { book_name: bookName, chapter: "" },
        });
        data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          await ensureBookTokens(bookName);
          const res2 = await api.get(`/verse_tokens/by-project/${projectId}`, {
            params: { book_name: bookName, chapter: "" },
          });
          data = Array.isArray(res2.data) ? res2.data : [];
        }
      }

      const merged = data.map((t, i) => ({
        ...t,
        verse_token_id:
          t.verse_token_id ||
          t.id ||
          t.token_id ||
          `${bookName}-${chapterNumber || t.chapter_number || 0}-${t.verse_number || i
          }`,
        verse_translated_text:
          t.verse_translated_text || t.translated_text || "",
      }));

      // Deduplicate here as well
      const uniqueTokens = merged.reduce(
        (acc, t) => {
          const key = `${t.verse_id}-${t.token_text}`;
          if (!acc.map[key]) {
            acc.map[key] = true;
            acc.list.push(t);
          }
          return acc;
        },
        { map: {}, list: [] }
      ).list;

      setTokens(uniqueTokens);
      setIsTokenized(uniqueTokens.length > 0);
      if (uniqueTokens.length > 0 && uniqueTokens[0].target_language_name) {
        setTargetLanguage(uniqueTokens[0].target_language_name);
      }

      if (uniqueTokens.length === 0) {
        message.warning("No tokens available for this selection.");
      }
    } catch {
      message.error("Failed to fetch or generate tokens");
      setTokens([]);
      setIsTokenized(false);
    } finally {
      setLoadingSource(false);
    }
  };

  // ---------- Manual Save ----------
  const handleManualUpdate = async (tokenId, newText) => {
    try {
      console.log("🔍 Frontend: Saving manual update", {
        tokenId,
        newText: newText?.substring(0, 50),
        projectId
      });

      // 1. Update verse token in DB
      const res = await api.patch(
        `/verse_tokens/manual-update/${tokenId}?project_id=${projectId}`,
        {
          translated_text: newText, 
        }
      );
      // 2. Update local tokens state
      setTokens((prev) =>
        prev.map((t) =>
          t.verse_token_id === tokenId 
            ? { 
                ...t, 
                verse_translated_text: newText,
                ...res.data.data 
              } 
            : t
        )
      );

      // 3. Also update editedTokens to mark it as saved
      setEditedTokens((prev) => {
        const copy = { ...prev };
        delete copy[tokenId];  // Remove from edited state
        return copy;
      });

      message.success("Saved the verse!");
      
      // 4. Optional: Force refresh the draft if on draft tab
      if (activeTab === 'draft') {
        await updateServerDraft();
      }
      
    } catch (err) {
      message.error(`Failed to update: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleTranslateAllChunks = async () => {
    if (selectedBook === "all") {
      message.info("Please select a specific book to translate.");
      return;
    }
    // setTranslationAttempted(true);
    setCancelTranslation(false);
    setLoadingTranslate(true);

    const key = "translating";
    message.loading({ key, content: "Translating verses…", duration: 0 });

    try {
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        if (cancelTranslation) {
          message.warning({ key, content: "Translation canceled!" });
          break;
        }
        const res = await api.post(
          `/verse_tokens/translate-chunk/${projectId}/${selectedBook}`,
          null,
          { params: { skip, limit: 10, chapter: selectedChapter || "" } }
        );
        const newTokens = (Array.isArray(res.data) ? res.data : []).map(
          (t, i) => ({
            ...t,
            verse_token_id:
              t.verse_token_id ||
              t.id ||
              t.token_id ||
              `${selectedBook}-${t.chapter_number || selectedChapter || "all"
              }-${t.verse_number || i}-${skip}`,
            verse_translated_text:
              t.verse_translated_text || t.translated_text || "",
          })
        );

        setTokens((prev) =>
          prev.map((tok) => {
            const updated = newTokens.find(
              (nt) => nt.verse_token_id === tok.verse_token_id
            );
            return updated ? { ...tok, ...updated } : tok;
          })
        );

        if (newTokens.length < 10) hasMore = false;
        else skip += 10;
      }
      if (!cancelTranslation) {
        message.success({ key, content: "All verses translated!" });
      }
    } catch (err) {
      console.error("Translation error:", err);
      message.error({ key, content: `Error: ${err.message || "Failed"}` });
    } finally {
      setLoadingTranslate(false);
      setCancelTranslation(false);
    }
  };
  function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
  const getVerseNumbers = async (projectId, bookName, chapterNumber) => {
    const res = await api.get(
      `/verse_tokens/verse_tokens/verse-numbers/${projectId}/${bookName}/${chapterNumber}`
    );
    return res.data; // [1, 2, 3, ...]
  };
  // chapter Translate---------------------------------
  const handleTranslateChapter = async (fullRegenerate = true) => {
    if (selectedBook === "all" || !selectedChapter) {
      message.info("Please select a specific book and chapter to translate.");
      return;
    }
  // ✅ Only reset tokens if fullRegenerate is true
  if (fullRegenerate) {
    setTokens((prev) =>
      prev.map((tok) => ({ ...tok, verse_translated_text: "" }))
    );
  }

    setLoadingTranslate(true);
    setCancelTranslation(false);
    // setTranslationAttempted(true); // Create a new AbortController

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const key = "translating";
      message.loading({ key, content: "Starting translation…", duration: 0 });

      // 1. Get verse numbers
      const allVerseNumbers = await getVerseNumbers(
        projectId,
        selectedBook,
        selectedChapter
      );
      const uniqueVerseNumbers = Array.from(new Set(allVerseNumbers));
      const total = uniqueVerseNumbers.length;
      const batchSize = 5;

      for (let i = 0; i < total; i += batchSize) {
        if (cancelTranslation) {
          message.warning({ key, content: "Translation canceled!" });
          break; // stop the loop
        }
        const batch = uniqueVerseNumbers.slice(i, i + batchSize);

        // Show placeholder while batch in progress
        setTokens((prev) =>
          prev.map((tok) =>
            batch.includes(tok.verse_number)
              ? { ...tok, verse_translated_text: "Translating…" }
              : tok
          )
        );

        // API call
        const newTokens = await translateChapter(
          projectId,
          selectedBook,
          selectedChapter,
          batch,
          selectedModel,
          controller.signal,
          fullRegenerate  // <-- pass it here
        );

        if (newTokens?.length > 0) {
          setTokens((prev) => {
            // build updated array (always new reference)
            const updated = prev.map((tok) => {
              const match = newTokens.find(
                (nt) =>
                  nt.verse_number === tok.verse_number &&
                  nt.token_text === tok.token_text
              );
              return match
                ? {
                  ...tok,
                  verse_translated_text:
                    match.verse_translated_text ||
                    match.translated_text ||
                    "",
                  lastUpdated: Date.now(),
                }
                : tok;
            });
            return [...updated]; // <-- ensures React sees a new array
          });
        }

        // let React paint updates
        await new Promise((r) => setTimeout(r, 0));

        // Update progress
        const done = Math.min(i + batchSize, total);
        const percent = Math.round((done / total) * 100);
        message.loading({
          key,
          content: `Translating verses…  (${percent}%)`,
          duration: 0,
        });
      }

      if (!cancelTranslation) {
        message.success({ key, content: "Chapter translated successfully!" });
      }
    } catch (err) {
      const key = "translating";

      if (err.name === "CanceledError" || err.name === "AbortError") {
        console.log("Translation aborted");
        message.destroy(key); // Clear the "Starting translation..." message
        // Reset tokens that were showing "Translating…"
        setTokens((prev) =>
          prev.map((tok) =>
            tok.verse_translated_text === "Translating…"
              ? { ...tok, verse_translated_text: "" }
              : tok
          )
        );
        setLoadingTranslate(false);
        setCancelTranslation(false);
        abortControllerRef.current = null;
        message.warning("Translation canceled!");
        return;
      } else {
        console.error("Translation error:", err);
        message.error({ key, content: `Error: ${err.message || "Failed"}` });
      }
    } finally {
      setLoadingTranslate(false); // ✅ translation finished, dropdown enables
      setCancelTranslation(false); // Reset cancel state
      abortControllerRef.current = null;
    }
  };

  // fetch draft from server

  const updateServerDraft = async () => {
    if (!projectId || selectedBook === "all") {
      setServerDraft("");
      setDraftId(null);
      return;
    }

    try {
      setLoadingDraft(true);
      let draft = null;
      try {
        draft = await fetchLatestDraft(projectId, selectedBook);
      } catch (err) {
        if (err.response?.status === 404) {
          // no draft exists yet → generate one
          draft = await generateDraftJson(projectId, selectedBook);
        } else {
          throw err;
        }
      }
      if (draft) {
        setServerDraft(draft.content || "");
        setOriginalDraft(draft.content || ""); // NEW
        setDraftId(draft.draft_id);
      } else {
        setServerDraft("");
        setOriginalDraft(""); // NEW
        setDraftId(null);
      }
    } catch (err) {
      console.error(err);
      //message.error("Failed to fetch draft from server");
      setServerDraft("");
      setDraftId(null);
    } finally {
      setLoadingDraft(false);
    }
  };
  // useEffect(() => {
  //   // Only fetch draft when Draft tab is active
  //   if (activeTab === "draft" && selectedBook !== "all") {
  //     updateServerDraft();
  //   }
  // }, [activeTab, selectedBook]);

  // ---------- Progress / Draft ----------
  const chapterStats = useMemo(() => {
    if (!tokens || tokens.length === 0) return { translated: 0, total: 0 };
    const total = tokens.length;
    const translated = tokens.filter((t) => t.verse_translated_text).length;
    return { translated, total };
  }, [tokens]);
  const parseUSFMContent = (content) => {
    if (!content) return {};
    
    const chapters = {};
    const lines = content.split('\n');
    let currentChapter = null;
    let currentContent = [];
    
    lines.forEach(line => {
      const chapterMatch = line.match(/\\c\s+(\d+)/);
      if (chapterMatch) {
        // Save previous chapter if exists
        if (currentChapter !== null) {
          chapters[currentChapter] = currentContent.join('\n');
        }
        // Start new chapter
        currentChapter = parseInt(chapterMatch[1]);
        currentContent = [line];
      } else if (currentChapter !== null) {
        currentContent.push(line);
      } else {
        // Header content before first chapter
        if (!chapters['header']) chapters['header'] = [];
        chapters['header'].push(line);
      }
    });
    
    // Save last chapter
    if (currentChapter !== null) {
      chapters[currentChapter] = currentContent.join('\n');
    }
    
    // Convert header array to string
    if (chapters['header']) {
      chapters['header'] = chapters['header'].join('\n');
    }
    
    return chapters;
  };
  
  const parsedDraftChapters = useMemo(() => {
    return parseUSFMContent(serverDraft);
  }, [serverDraft]);
  
  const parsedSourceChapters = useMemo(() => {
    return parseUSFMContent(rawBookContent);
  }, [rawBookContent]);
  const currentDraftContent = useMemo(() => {
    if (!serverDraft) return '';
    if (!draftChapter) return serverDraft; // Show full draft if no chapter selected
    
    const header = parsedDraftChapters['header'] || '';
    const chapterContent = parsedDraftChapters[draftChapter] || '';
    
    return header ? `${header}\n\n${chapterContent}` : chapterContent;
  }, [serverDraft, draftChapter, parsedDraftChapters]);
  
  const currentSourceContent = useMemo(() => {
    if (!rawBookContent) return '';
    if (!draftChapter) return rawBookContent; // Show full source if no chapter selected
    
    const header = parsedSourceChapters['header'] || '';
    const chapterContent = parsedSourceChapters[draftChapter] || '';
    
    return header ? `${header}\n\n${chapterContent}` : chapterContent;
  }, [rawBookContent, draftChapter, parsedSourceChapters]);
  const filteredTokens = showOnlyTranslated
    ? tokens.filter((t) => t.verse_translated_text)
    : tokens;

  const copyDraft = async () => {
    try {
      const contentToCopy = serverDraft?.trim();

      if (!contentToCopy) {
        message.warning("No draft content to copy");
        console.log("No draft content to copy");
        return;
      }

      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        // Modern API (secure contexts)
        await navigator.clipboard.writeText(contentToCopy);
        message.success("Draft copied to clipboard");
        console.log("Draft copied:", contentToCopy.slice(0, 100));
      } else {
        // Fallback for insecure contexts or unsupported browsers
        const textarea = document.createElement("textarea");
        textarea.value = contentToCopy;
        textarea.style.position = "fixed"; // avoid scrolling
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          const success = document.execCommand("copy");
          if (success) {
            message.success("Draft copied to clipboard");
            console.log(
              "Draft copied (fallback):",
              contentToCopy.slice(0, 100)
            );
          } else {
            throw new Error("execCommand returned false");
          }
        } catch (err) {
          console.error("Fallback copy failed:", err);
          message.error("Failed to copy draft: " + (err.message || err));
        }

        document.body.removeChild(textarea);
      }
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      message.error("Failed to copy draft: " + (err.message || err));
    }
  };

  // ---------- Effects ----------
  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  useEffect(() => {
    if (project?.source_id) {
      fetchAvailableBooks(project.source_id);
    }
  }, [project]);

  useEffect(() => {
    if (selectedBook !== "all") {
      const bookObj = books.find((b) => b.book_name === selectedBook);
      if (bookObj) {
        fetchChaptersByBook(bookObj.book_id).then(() => {
          setSelectedChapter(null); // reset first
          // set chapter AFTER tokens are ensured
          ensureBookTokens(selectedBook).then(() => {
            setSelectedChapter(1); // trigger tokens fetch in chapter effect
          });
        });
      }

      setTokens([]);
      setIsTokenized(false);
      fetchRawBook(selectedBook);
      updateServerDraft();
    } else {
      setSelectedChapter(null);
      setTokens([]);
      setIsTokenized(false);
      setRawBookContent("");
    }
  }, [selectedBook]);

  useEffect(() => {
    if (selectedBook !== "all" && selectedChapter) {
      fetchTokensForSelection(selectedBook, selectedChapter);
    }
  }, [selectedBook, selectedChapter]);

  const hasExistingTranslations = useMemo(() => {
    return tokens.some(
      (t) => t.verse_translated_text && t.verse_translated_text.trim() !== ""
    );
  }, [tokens]);
  useEffect(() => {
    if (activeTab === 'draft' && selectedChapter) {
      setDraftChapter(selectedChapter);
    }
  }, [activeTab, selectedChapter]);

  // ---------- UI ----------
  return (
    <div
      style={{
        paddingTop: 20,
        paddingRight: 20,
        paddingBottom: 20,
        paddingLeft: 20,
      }}
    >
      {modalContextHolder}
      <UploadProgressModal
        visible={uploadProgressOpen}
        uploading={uploadingBooks}
        uploaded={uploadedBooks}
        skipped={skippedBooks}
        total={totalBooks}
        onClose={() => setUploadProgressOpen(false)}
      />
       {/* Verse Translation Modal */}
       <Modal
  visible={isModalVisible}
  title="Regenerate Translations"
  closable={false}
  onCancel={() => setIsModalVisible(false)}
  footer={[
    <Button key="cancel" onClick={() => setIsModalVisible(false)}>Cancel</Button>,
    <Button
      key="no"
      onClick={() => {
        setIsModalVisible(false);
        handleTranslateChapter(false); // continue from existing
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
        handleTranslateChapter(true); // full regenerate
      }}
    >
      Yes, Regenerate
    </Button>
  ]}
>
  Do you want to regenerate all translations, or continue from where you left off?
</Modal>
  {modalContextHolder}
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
        onChange={handleBookUpload}
      />

      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/projects">Projects</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{project?.name || "Loading..."}</Breadcrumb.Item>
        <Breadcrumb.Item>
          {selectedBook === "all" ? "All Books" : selectedBook}
        </Breadcrumb.Item>
        {selectedChapter && (
          <Breadcrumb.Item>Chapter {selectedChapter}</Breadcrumb.Item>
        )}
      </Breadcrumb>

      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <h2
          style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "#1f2937" }}
        >
          Verse Translation ({project?.name})
        </h2>
        {/* {project && (
          <Text>
            Source: {project.source_language_name} | Target:{" "}
            {project.target_language_name}
          </Text>
        )} */}

        {/* Book + Chapter Selectors with Upload Plus Icon */}
        <Space>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Select
              value={selectedBook}
              onChange={(val) => setSelectedBook(val)}
              style={{ minWidth: 200 }}
            >
              <Option value="all">Select a Book</Option>
              {books.map((b) => (
                <Option key={b.book_id} value={b.book_name}>
                  {b.book_name}
                </Option>
              ))}
            </Select>

            {/* Plus icon for book upload - only show when "All Books" is selected */}
            {/* {selectedBook === "all" && ( */}
            <Button
              type="text"
              //shape="circle"
              icon={
                <UploadOutlined
                  style={{ color: "#1890ff", cursor: "pointer", fontSize: 20 }}
                />
              }
              onClick={openFileDialog}
              title="Upload Books"
              style={{
                marginLeft: 8,
                //backgroundColor: 'rgb(44, 141, 251)',
                //  borderColor: 'rgb(44, 141, 251)',
              }}
            />
            {selectedBook && selectedBook !== "all" && (
              <Button
                type="text"
                icon={
                  <DeleteOutlined
                    style={{ color: "red", cursor: "pointer", fontSize: 20 }}
                  />
                }
                onClick={handleDeleteBook}
                title="Delete Selected Book"
                danger
              />
            )}
            {/* )} */}
          </div>

          {selectedBook !== "all" && chapters.length > 0 && (
  <Space>
    {/* Prev Button */}
    <Button
      type="text"
      disabled={
        activeTab === "draft"
          ? draftChapter === null || draftChapter === 1
          : !selectedChapter || selectedChapter === 1
      }
      onClick={() => {
        if (activeTab === "draft") {
          setDraftChapter((prev) =>
            prev === null ? 1 : Math.max(1, prev - 1)
          );
        } else {
          setSelectedChapter((prev) => Math.max(1, prev - 1));
        }
      }}
    >
      ◀
    </Button>

    {/* Unified Chapter Dropdown */}
    <Select
      value={activeTab === "draft" ? draftChapter : selectedChapter}
      style={{ minWidth: 150 }}
      onChange={(val) => {
        if (activeTab === "draft") {
          setDraftChapter(val);
        } else {
          setSelectedChapter(val);
        }
      }}
      placeholder="Select Chapter"
      disabled={chapters.length === 0}
    >
      {/* Show “All Chapters” only for Draft View */}
      {activeTab === "draft" && (
        <Option key="all" value={null}>
          All Chapters
        </Option>
      )}
      {chapters.map((ch) => (
        <Option key={ch.chapter_id} value={ch.chapter_number}>
          Chapter {ch.chapter_number}
        </Option>
      ))}
    </Select>

    {/* Next Button */}
    <Button
      type="text"
      disabled={
        activeTab === "draft"
          ? draftChapter !== null && draftChapter === chapters.length
          : !selectedChapter || selectedChapter === chapters.length
      }
      onClick={() => {
        if (activeTab === "draft") {
          setDraftChapter((prev) => {
            if (prev === null) return 1;
            return Math.min(chapters.length, prev + 1);
          });
        } else {
          setSelectedChapter((prev) => Math.min(chapters.length, prev + 1));
        }
      }}
    >
      ▶
    </Button>
  </Space>
)}


        </Space>
        {selectedBook !== "all" && chapters.length > 0 && (
        <Progress
          percent={100} // always full width
          success={{
            percent:
              chapterStats.total === 0
                ? 0
                : Math.round(
                  (chapterStats.translated / chapterStats.total) * 100
                ),
          }}
          format={() => (
            <span style={{ color: "#000" }}>
              {chapterStats.translated} / {chapterStats.total} verses
            </span>
          )}
          strokeColor="#d9d9d9" // always grey
          style={{ marginTop: 8, marginBottom: 8 }}
        />
        )}
      </Space>

      {selectedBook !== "all" && chapters.length > 0 && (
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key)}>
        {/* Editor */}

        <TabPane tab="Translation Editor" key="editor">
          <Row
            justify="end"
            align="middle"
            gutter={12}
            style={{ marginBottom: 12 }}
          >
            <Col>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Tooltip
                  title={
                    selectedModel ? (
                      <div style={{ textAlign: "left", fontSize: 12 }}>
                        {Object.entries(MODEL_INFO[selectedModel]).map(
                          ([key, val]) => (
                            <div key={key}>
                              <b>{key}:</b> {val}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      "Select a model to see info"
                    )
                  }
                  placement="left"
                  color="#f0f0f0"
                >
                  <Button
                    type="text"
                    icon={
                      <InfoCircleOutlined
                        style={{ fontSize: 18, color: "#2c8dfb" }}
                      />
                    }
                    disabled={!selectedModel} // disabled until a model is selected
                  />
                </Tooltip>
                <Select
                  style={{ width: 240 }}
                  value={selectedModel || undefined}
                  onChange={(val) => setSelectedModel(val)}
                  disabled={loadingTranslate}
                >
                  <Option
                    value="nllb-600M"
                    disabled={selectedModel !== "nllb-600M"}
                  >
                    <Tooltip
                      title="General-purpose model for 200 languages."
                      overlayInnerStyle={{
                        backgroundColor: "#fff",
                        color: "#000",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      nllb-600M
                    </Tooltip>
                  </Option>

                  <Option
                    value="nllb_finetuned_eng_nzm"
                    disabled={selectedModel !== "nllb_finetuned_eng_nzm"}
                  >
                    <Tooltip
                      title="This model ONLY supports English ↔ Zeme Naga."
                      overlayInnerStyle={{
                        backgroundColor: "#fff",
                        color: "#000",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      nllb-finetuned-eng-nzm
                    </Tooltip>
                  </Option>

                  <Option
                    value="nllb-english-nagamese"
                    disabled={selectedModel !== "nllb-english-nagamese"}
                  >
                    <Tooltip
                      title="This model ONLY supports English ↔ Nagamese."
                      overlayInnerStyle={{
                        backgroundColor: "#fff",
                        color: "#000",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      nllb-english-nagamese
                    </Tooltip>
                  </Option>

                  <Option
                    value="nllb-gujrathi-koli_kachchi"
                    disabled={selectedModel !== "nllb-gujrathi-koli_kachchi"}
                  >
                    <Tooltip
                      title="This model ONLY supports Gujarati ↔ Kachi Koli."
                      overlayInnerStyle={{
                        backgroundColor: "#fff",
                        color: "#000",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      nllb-gujrathi-koli_kachchi
                    </Tooltip>
                  </Option>

                  <Option
                    value="nllb-hin-surjapuri"
                    disabled={selectedModel !== "nllb-hin-surjapuri"}
                  >
                    <Tooltip
                      title="This model ONLY supports Hindi ↔ Surjapuri."
                      overlayInnerStyle={{
                        backgroundColor: "#fff",
                        color: "#000",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      nllb-hin-surjapuri
                    </Tooltip>
                  </Option>
                </Select>
              </div>
            </Col>
            <Col>
              <Tooltip
                title={
                  !selectedModel && selectedBook !== "all" && selectedChapter
                    ? "Please select a model first"
                    : ""
                }
                placement="top"
              >
                <span style={{ display: "inline-block" }}>
                  {loadingTranslate ? (
                    <Button
                      type="dashed"
                      icon={<ThunderboltOutlined />}
                      onClick={() => {
                        setCancelTranslation(true);
                        abortControllerRef.current?.abort();
                      }}
                      style={{ color: "red", borderColor: "red" }}
                    >
                      Cancel Translation
                    </Button>
                  ) 
                  : (
                    <Button
                      type="dashed"
                      icon={<ThunderboltOutlined />}
                      onClick={() => {
                        if (!hasExistingTranslations) {
                          // No previous translations → start immediately
                          handleTranslateChapter(true); // full regenerate
                        } else {
                          // Existing translations → show modal
                          setIsModalVisible(true);
                        }
                      }}                      disabled={
                        !selectedModel ||
                        selectedBook === "all" ||
                        !selectedChapter
                      }
                    >
                      Translate
                    </Button>
                  )}
                </span>
              </Tooltip>
            </Col>
          </Row>

          <Row gutter={16}>
            {/* Source */}
            <Col span={12}>
              <Card
                title={
                  <Row justify="space-between" align="middle">
                    <span>Source</span>
                  </Row>
                }
                style={{ maxHeight: "70vh", overflowY: "scroll" }}
              >
                {loadingSource ? (
                  <Spin size="large" />
                ) : isTokenized ? (
                  <>
                    {tokens.length > 0 && (
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 12 }}
                      >
                        {tokens[0].book_name}
                      </Text>
                    )}
                    {tokens.map((t, index) => (
                      <div
                        key={t.verse_token_id}
                        style={{
                          borderBottom: "1px solid #f0f0f0",
                          paddingTop: 8,
                          paddingBottom: 8,
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <Text
                          strong
                          style={{ minWidth: 30, textAlign: "right" }}
                        >
                          {index + 1}.
                        </Text>
                        <p style={{ margin: 0 }}>{t.token_text}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{
                    fontFamily: 'Roboto, sans-serif',
                    fontSize: 14,
                    fontStyle: 'normal',
                    color: '#333333',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}>
                    No content available, please select a book
                  </div>
                )}
              </Card>
            </Col>

            {/* Target */}
            <Col span={12}>
              <Card
                title={
                  <Row justify="space-between" align="middle">
                    <span>{targetLanguage}</span>
                    {/* <Button
                      type="dashed"
                      icon={<ThunderboltOutlined />}
                      onClick={
                        selectedChapter
                          ? handleTranslateChapter
                          : handleTranslateAllChunks
                      }
                      disabled={selectedBook === "all"}
                    >
                      Translate
                    </Button> */}
                  </Row>
                }
                style={{ maxHeight: "70vh", overflowY: "scroll" }}
              >
                {isTokenized ? (
                  tokens.map((t, index) => (
                    <div
                      key={t.verse_token_id}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        paddingTop: 8,
                        paddingBottom: 8,
                      }}
                    >
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 4 }}
                      >
                        Verse {index + 1}
                      </Text>
                      <>
                        <Input.TextArea
                          value={t.verse_translated_text}
                          autoSize={{ minRows: 3, maxRows: 6 }}
                          onChange={(e) => {
                            const newText = e.target.value;

                            setTokens((prev) =>
                              prev.map((tok) =>
                                tok.verse_token_id === t.verse_token_id
                                  ? { ...tok, verse_translated_text: newText }
                                  : tok
                              )
                            );

                            setEditedTokens((prev) => {
                              if (!prev[t.verse_token_id]) {
                                return {
                                  ...prev,
                                  [t.verse_token_id]: {
                                    old: t.verse_translated_text, // saved/original
                                    new: newText, // current edit
                                  },
                                };
                              }
                              return {
                                ...prev,
                                [t.verse_token_id]: {
                                  ...prev[t.verse_token_id],
                                  new: newText,
                                },
                              };
                            });
                          }}
                        />
                        <Space style={{ marginTop: 6 }}>
                          {editedTokens[t.verse_token_id] && (
                            <>
                              <Button
                                size="small"
                                icon={<SaveOutlined />}
                                onClick={async () => {
                                  await handleManualUpdate(
                                    t.verse_token_id,
                                    editedTokens[t.verse_token_id].new
                                  );
                                  setEditedTokens((prev) => {
                                    const copy = { ...prev };
                                    delete copy[t.verse_token_id];
                                    return copy;
                                  });
                                }}
                              >
                                Save
                              </Button>

                              <Button
                                size="small"
                                onClick={() => {
                                  // revert token text to the old/original one
                                  setTokens((prev) =>
                                    prev.map((tok) =>
                                      tok.verse_token_id === t.verse_token_id
                                        ? {
                                          ...tok,
                                          verse_translated_text:
                                            editedTokens[t.verse_token_id]
                                              .old,
                                        }
                                        : tok
                                    )
                                  );
                                  setEditedTokens((prev) => {
                                    const copy = { ...prev };
                                    delete copy[t.verse_token_id];
                                    return copy;
                                  });
                                }}
                              >
                                Discard
                              </Button>
                            </>
                          )}
                        </Space>
                      </>
                    </div>
                  ))
                ) : (
                  <div style={{
                    fontFamily: 'Roboto, sans-serif',
                    fontSize: 14,
                    fontStyle: 'normal',
                    color: '#333333',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}>
                    No content available, please select a book
                  </div>)}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Draft View" key="draft">
  {/* Chapter selector for draft view */}
  <Row gutter={16}>
   
            {/* --- New Source Draft Card --- */}
{selectedBook !== "all" && (
  <Col span={12}>
    <Card
      title="Source Draft"
      style={{ maxHeight: "70vh", overflowY: "scroll" }}
    >
      {rawBookContent ? (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {currentSourceContent}
        </pre>
      ) : (
        <p>No USFM content available for this book.</p>
      )}
    </Card>
  </Col>
)}

            {/* --- Existing Translation Draft Card --- */}
            <Col span={12}>
              <Card
                title="Translation Draft"
                extra={
                  <Space>
                    {/* Download → icon only */}
                    <DownloadDraftButton content={serverDraft} />

                    {/* Copy → icon only */}
                    <CopyOutlined
                      style={{
                        fontSize: 20,
                        color: "#black", // AntD primary blue, you can change
                        cursor: !(
                          serverDraft?.trim() ||
                          tokens.some((t) => t.verse_translated_text?.trim())
                        )
                          ? "not-allowed"
                          : "pointer",
                      }}
                      onClick={() => {
                        if (
                          serverDraft?.trim() ||
                          tokens.some((t) => t.verse_translated_text?.trim())
                        ) {
                          copyDraft();
                        }
                      }}
                    />
                    {/* Generate Draft Button */}
                    <Button
                      type="primary"
                      onClick={async () => {
                        try {
                          setLoadingDraft(true);

                          // 1️⃣ If there are unsaved edits in editor, merge them into tokens
                          const mergedTokens = tokens.map((t) => {
                            const edited = editedTokens[t.verse_token_id];
                            return edited
                              ? { ...t, verse_translated_text: edited.new }
                              : t;
                          });

                          // 2️⃣ Call API to generate draft using latest translations
                          const draft = await generateDraftJson(
                            projectId,
                            selectedBook,
                            mergedTokens
                          );

                          // 3️⃣ Update state
                          setServerDraft(draft.content || "");
                          setOriginalDraft(draft.content || ""); // NEW
                          setDraftId(draft.draft_id);

                          // 4️⃣ Clear temporary edited tokens
                          setEditedTokens({});
                          setEditedDraft(null);

                          message.success("Draft generated successfully!");
                        } catch (err) {
                          console.error("Generate draft error:", err);
                          message.error("Failed to generate draft");
                        } finally {
                          setLoadingDraft(false);
                        }
                      }}
                    >
                      Generate Draft
                    </Button>
                  </Space>
                }
                style={{ maxHeight: "70vh", overflowY: "scroll" }}
              >
                <Row gutter={16}>
                  {loadingDraft ? (
                    <Col
                      span={24}
                      style={{
                        textAlign: "center",
                        paddingTop: 20,
                        paddingRight: 20,
                        paddingBottom: 20,
                        paddingLeft: 20,
                      }}
                    >
                      <Spin size="large" />
                    </Col>
                  ) : serverDraft ? (
                    <Col span={24}>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Input.TextArea
                         value={editedDraft || currentDraftContent}
                          autoSize={{ minRows: 8, maxRows: 20 }}
                          style={{
                            whiteSpace: "pre-wrap",
                            fontFamily: "monospace",
                          }}
                          onChange={(e) => setEditedDraft(e.target.value)}
                        />

                        {/* Save & Discard Buttons */}
                        {editedDraft !== null &&
                          editedDraft !== serverDraft && (
                            <Space>
                              <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={async () => {
                                  try {
                                    if (draftId) {
                                      // Save draft to backend
                                      const res = await saveDraft(
                                        draftId,
                                        editedDraft
                                      );
                                      setServerDraft(res.content);
                                      setEditedDraft(null); // Reset edit mode

                                      message.success(
                                        "Draft saved successfully!"
                                      );
                                    } else {
                                      message.warning(
                                        "No draftId found to save"
                                      );
                                    }
                                  } catch (err) {
                                    console.error("Save draft error:", err);
                                    message.error("Failed to save draft");
                                  }
                                }}
                              >
                                Save
                              </Button>
                             <Button
  onClick={() => {
    setEditedDraft(currentDraftContent); // Changed from originalDraft
    message.info("Changes discarded");
  }}
>
  Discard
</Button>
                            </Space>
                          )}
                      </Space>
                    </Col>
                  ) : (
                    <Col span={24}>
                      <Card
                        title="Translation Draft"
                        style={{ maxHeight: "70vh", overflowY: "scroll" }}
                      >
                        <p style={{ fontStyle: "italic", color: "#888" }}>
                          No translation draft available yet. Run translation to
                          generate one.
                        </p>
                      </Card>
                    </Col>
                  )}
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
      )}
    </div>
  );
};

export default VerseTranslationPage;
