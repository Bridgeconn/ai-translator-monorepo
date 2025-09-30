import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Select, Card, Input, Typography, Button, message, Breadcrumb, Popconfirm, Modal, notification } from 'antd';
import { CopyOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, wordTokenAPI, booksAPI, languagesAPI, sourcesAPI, draftAPI } from './api.js';
import { useParams, Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Progress } from 'antd';

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

export default function WordTranslation() {
  const { projectId } = useParams();
  const [selectedBook, setSelectedBook] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("Loading...");
  const [targetLang, setTargetLang] = useState("Unknown");
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
  const [selectedModel, setSelectedModel] = useState("nllb-600M");

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
    }
  };

  // Derived helpers
  const hasTokenEdits = Object.entries(editedTokens).some(([k, v]) => k !== 'draft_edited' && !!v);
  const showEditorUnsaved = hasTokenEdits;           // show save/discard in editor
  const showDraftUnsaved = isDraftEdited;            // show save/discard in draft
  // --- Model options ---
  const MODEL_OPTIONS = [
    { label: "NLLB 600M", value: "nllb-600M" },
    { label: "NLLB Fine-tuned ENG → NZM", value: "nllb_finetuned_eng_nzm" }
  ];
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

  // Fetch books for the project
  useEffect(() => {
    const fetchBooks = async () => {
      if (!project?.source_id) return;
      try {
        const books = await booksAPI.getBooksBySourceId(project.source_id);
        setProjectBooks(books);
      } catch (e) {
        notificationApi.error({
          message: "Error",
          description: "Failed to load book for this project",
          placement: "top",
        });
      }
    };
    fetchBooks();
  }, [project]);

  // Fetch language names
  useEffect(() => {
    const fetchLanguages = async () => {
      if (!project) return;
      try {
        if (project.source_id) {
          const source = await sourcesAPI.getSourceById(project.source_id);
          if (source?.language_id) {
            const srcLang = await languagesAPI.getLanguageById(source.language_id);
            setSourceLang(srcLang?.name || "Unknown");
          } else {
            setSourceLang(source?.language_name || "Unknown");
          }
        }
        if (project.target_language_id) {
          const tgt = await languagesAPI.getLanguageById(project.target_language_id);
          setTargetLang(tgt?.name || "Unknown");
        }
      } catch (e) {
        console.error("Failed to fetch languages", e);
      }
    };
    fetchLanguages();
  }, [project]);

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
  const handleGenerateTranslationsSSEWithPreserveEdits = async () => {
    if (!selectedBook?.book_id) return; // ✅ Check for bookId
    setIsGenerating(true);
    if (hasGenerated) {
      setTokens(prev => {
        const cleared = prev.map(t => ({ ...t, translation: "" }));
        setTranslatedCount(0);  // 🔹 reset immediately after clearing tokens
        return cleared;          // ✅ return the cleared tokens array to update state
      });
    }
    try {
      const eventSource = new EventSource(
        // import.meta.env.VITE_BACKEND_URL + `/api/generate_batch_stream/${projectId}?book_id=${encodeURIComponent(selectedBook.book_id)}`
        `${import.meta.env.VITE_BACKEND_URL}/api/generate_batch_stream/${projectId}?book_id=${encodeURIComponent(selectedBook.book_id)}&model_name=${encodeURIComponent(selectedModel)}`

      );
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
          notificationApi.error({
            message: "Error",
            description: "Translation failed. The server might be down or the network is slow. Please try again.",
            placement: "top",
          }); setIsGenerating(false);
          eventSource.close();
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

        //   if (data.finished && !hasError) {
        //     notificationApi.success({
        //       message: "Success",
        //       description: `All ${data.total ?? translatedCount} tokens translated!`,
        //       placement: "top",
        //     });
        //     setIsGenerating(false);
        //     setHasGenerated(true);
        //     eventSource.close();
        //   }
        // };
        if (data.finished) {
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
        }
      };


      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        notificationApi.error({
          message: "Error",
          description: "Translation stream interrupted. Please try again.",
          placement: "top",
        });
        setIsGenerating(false); // 🔹 Reset on error
        eventSource.close();
      };

    } catch (err) {
      console.error("Failed to start SSE translation:", err);
      notificationApi.error({
        message: "Error",
        description: "Failed to start translation stream. Please try again.",
        placement: "top",
      });
      setIsGenerating(false); // 🔹 Reset on failure

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

      {/* Book Selector */}
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
          Select Book
        </Text>
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
                        value={selectedModel || undefined} 
                        style={{ width: 220, borderRadius: 8, fontSize: 16 }}
                        onChange={(val) => setSelectedModel(val)}
                        disabled={isGenerating} 
                      >
                        {MODEL_OPTIONS.map((m) => (
                          <Option key={m.value} value={m.value}>{m.label}</Option>
                        ))}
                      </Select>
                    </div>

                    {hasGenerated ? (
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
                        <Button type="primary" loading={isGenerating}disabled={!selectedModel || isGenerating}
                        >
                          {isGenerating ? "Regenerating..." : "Regenerate Translations"}
                        </Button>
                        </Tooltip>
                      </Popconfirm>
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