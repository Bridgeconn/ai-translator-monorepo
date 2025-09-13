import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Select, Card, Input, Typography, Button, message, Breadcrumb, Popconfirm, Modal } from 'antd';
import { CopyOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, wordTokenAPI, booksAPI, languagesAPI, sourcesAPI, draftAPI } from './api.js';
import { useParams, Link } from 'react-router-dom';
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
  const [messageApi, contextHolder] = message.useMessage();
  const editedTokensRef = useRef(editedTokens);
  // Derived helpers
  const hasTokenEdits = Object.entries(editedTokens).some(([k, v]) => k !== 'draft_edited' && !!v);
  const showEditorUnsaved = hasTokenEdits;           // show save/discard in editor
  const showDraftUnsaved = isDraftEdited;            // show save/discard in draft

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
        messageApi.error("Failed to load books for this project");
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
      messageApi.error("Failed to fetch or generate tokens");
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleBookChange = async (bookId) => {
    // ✅ Auto-save current draft if edited
    if (isDraftEdited && selectedBook) {
      await draftAPI.saveManualDraft(projectId, selectedBook.book_id, draftContent);
      messageApi.success("Previous draft saved successfully.");

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
    setTranslatedCount(0);
    if (hasGenerated) {
      setTokens(prev =>
        prev.map(t => ({
          ...t,
          translation: "",
          // originalTranslation: "",
        }))
      );
    }

    try {
      const eventSource = new EventSource(
        `http://localhost:8000/api/generate_batch_stream/${projectId}?book_id=${encodeURIComponent(selectedBook.book_id)}`
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
          messageApi.error("Translation failed. The server might be down or the network is slow. Please try again.");
          setIsGenerating(false);
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

        if (data.finished && !hasError) {
          messageApi.success(`All ${data.total ?? translatedCount} tokens translated!`);
          setIsGenerating(false);
          setHasGenerated(true);
          eventSource.close();
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        messageApi.error("Translation stream interrupted. Please try again.");
        setIsGenerating(false); // 🔹 Reset on error
        eventSource.close();
      };

    } catch (err) {
      console.error("Failed to start SSE translation:", err);
      messageApi.error("Failed to start translation stream.");
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
      messageApi.error("Failed to fetch draft");
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
      messageApi.success(`Draft generated for ${selectedBook.book_name}`);
    } catch (error) {
      console.error("[ERROR] handleGenerateDraft:", error);
      messageApi.error("Failed to generate draft");
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftContent);
    messageApi.success("Draft copied to clipboard!");
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
    messageApi.success("Draft downloaded!");
  };

  const handleSaveAll = async () => {
    if (!selectedBook) {
      messageApi.error("No book selected");
      return;
    }
    if (!projectId) {
      messageApi.error("No project selected");
      return;
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

      messageApi.success("All translations saved successfully!");

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
      messageApi.error("Failed to save translations");
    }
  };

  const handleDiscardAll = () => {
    if (activeTab === "editor") {
      const resetTokens = tokens.map(t => ({
        ...t,
        translation: t.originalTranslation || t.translation,
      }));
      setTokens(resetTokens);
    
      // ✅ recalc translatedCount after discarding
      setTranslatedCount(resetTokens.filter(t => t.translation?.trim() !== "").length);
    
      setEditedTokens(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(k => (reset[k] = false));
        return reset;
      });
    
      messageApi.info("Editor changes discarded.");
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
      {contextHolder}
      <div style={{
        backgroundColor: 'rgb(245, 245, 245)',
        borderRadius: 12,
        marginBottom: 24,
      }}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { title: <Link to="/projects" style={{ color: '#8b5cf6', fontWeight: 500 }}>Projects</Link> },
            { title: <span style={{ fontWeight: 500 }}>{project?.name}</span> },
          ]}
          style={{ marginBottom: '12px' }}
        />

        {/* Project Name */}
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
          {project?.name} - Word Translation
        </h2>

        {/* Languages */}
        <p style={{ marginTop: 16, fontSize: 16, color: '#555' }}>
          <span style={{ fontWeight: 500 }}>Source:</span> {sourceLang} | <span style={{ fontWeight: 500 }}>Target:</span> {targetLang}
        </p>
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
                backgroundColor: '#8b5cf6',
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
                color: activeTab === 'editor' ? '#fff' : '#722ed1',
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
                color: activeTab === 'draft' ? '#fff' : '#722ed1',
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
                      <Button type="primary" onClick={handleSaveAll} size="small" loading={saving}>
                        Save All
                      </Button>
                      <Button onClick={handleDiscardAll} size="small">
                        Discard All
                      </Button>
                    </div>
                  )}
                {activeTab === "editor" ? (
                  <>
                    {/* Editor-specific buttons */}
                    <Text type="secondary">
                      Progress: {translatedCount}/{tokens.length}
                    </Text>
                    {hasGenerated ? (
                      <Popconfirm
                        disabled={isGenerating}
                        title="Regenerate Translations? All regenerated translations will overwrite unsaved edits."
                        icon={<ExclamationCircleOutlined />}
                        onConfirm={() => {
                          if (Object.values(editedTokens).some(Boolean)) {
                            messageApi.warning(
                              "You have unsaved edits. Regenerating will overwrite them!"
                            );
                          }
                          handleGenerateTranslationsSSEWithPreserveEdits();
                        }}
                        okText="Yes, Regenerate"
                        cancelText="Cancel"
                      >
                        <Button type="primary" loading={isGenerating}>
                          {isGenerating ? "Regenerating..." : "Regenerate Translations"}
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button
                        type="primary"
                        onClick={handleGenerateTranslationsSSEWithPreserveEdits}
                        loading={isGenerating}
                        disabled={isGenerating}
                      >{isGenerating ? "Generating..." : "Generate Translations"}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Draft-specific buttons */}
                    <Popconfirm
                      title="Generate a new draft? All unsaved draft edits will be lost."
                      onConfirm={handleGenerateDraft}
                      okText="Yes, Generate"
                      cancelText="Cancel"
                    >
                      <Button
                        type="primary"
                        size="small"
                        loading={loadingDraft}
                      >
                        {loadingDraft ? 'Generating...' : 'Generate Draft'}
                      </Button>
                    </Popconfirm>
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={handleCopyDraft}
                      disabled={loadingTokens || loadingDraft}
                    >
                      Copy
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      size="small"
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

                          // This is the crucial logic to fix the saving issue.
                          // It now uses a dedicated key to mark draft changes.
                          if (draftChanged) {
                            setEditedTokens(prev => ({
                              ...prev,
                              'draft_edited': true // Use a dedicated key to mark draft changes
                            }));
                          } else {
                            // If the draft is reverted to its original state, remove the key.
                            setEditedTokens(prev => {
                              const updated = { ...prev };
                              delete updated.draft_edited;
                              return updated;
                            });
                          }
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