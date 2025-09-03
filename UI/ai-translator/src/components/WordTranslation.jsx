import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Select, Card, Input, Typography, Spin, Button, message, Breadcrumb, notification, Popconfirm } from 'antd';
import { CopyOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, wordTokenAPI, booksAPI, languagesAPI, sourcesAPI } from './api.js';
import { useParams, Link } from 'react-router-dom';
import { draftAPI } from './api.js';
const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

export default function WordTranslation() {
  const { projectId } = useParams();
  const [selectedBook, setSelectedBook] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [translating, setTranslating] = useState({});
  const [activeTab, setActiveTab] = useState("editor");
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("Loading...");
  const [targetLang, setTargetLang] = useState("Unknown");
  const [projectBooks, setProjectBooks] = useState([]);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [editedTokens, setEditedTokens] = useState({});
  // Draft states
  const [draftContent, setDraftContent] = useState("");
  const [originalDraft, setOriginalDraft] = useState("");
  const [isDraftEdited, setIsDraftEdited] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const [currentDraft, setCurrentDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const translatingRef = useRef(true);

  useEffect(() => {
    translatingRef.current = true;
    return () => {
      translatingRef.current = false;
    };
  }, []);
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
        message.error("Failed to load books for this project");
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
  const fetchTokens = async (bookName) => {
    if (!bookName) return;
    setLoadingTokens(true);

    try {
      let data = [];
      try {
        data = await wordTokenAPI.getTokensByProjectAndBook(projectId, bookName);
      } catch (err) {
        if (err.response?.status === 404) {
          await wordTokenAPI.generateWordTokens(projectId, bookName);
          data = await wordTokenAPI.getTokensByProjectAndBook(projectId, bookName);
        } else {
          throw err;
        }
      }

      const preparedTokens = data.map((t) => ({
        ...t,
        translation: t.translated_text || "",
        originalTranslation: t.translated_text || "", // snapshot for discard
      }));


      setTokens(preparedTokens);
    } catch (e) {
      console.error("Failed to fetch or generate tokens", e);
      message.error("Failed to fetch or generate tokens");
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleBookChange = async (bookId) => {
    const selected = projectBooks.find((b) => b.book_id === bookId);
    setSelectedBook(selected);
    setSourceText(selected?.usfm_content || "No source content available");

    if (!selected?.book_name) return;

    try {
      await fetchTokens(selected.book_name);
    } catch (err) {
      console.error("Error fetching or generating tokens:", err);
    }
  };
  const handleGenerateTranslations = async () => {
    if (!selectedBook || tokens.length === 0) return;
    setLoadingTokens(true);

    try {
      const result = await wordTokenAPI.generateTokens(
        projectId,
        selectedBook.book_name
      );

      const translatedTokens = result?.data || [];

      // Update all tokens in parallel
      await Promise.all(
        translatedTokens.map(async (tr) => {
          setTokens((prevTokens) =>
            prevTokens.map((t) =>
              t.word_token_id === tr.word_token_id
                ? { ...t, translation: tr.translation || tr.translated_text }
                : t
            )
          );

          try {
            await wordTokenAPI.updateToken(tr.word_token_id, {
              translated_text: tr.translation || tr.translated_text,
              is_reviewed: true,
              is_active: true,
              book_name: selectedBook.book_name,
            });
          } catch (e) {
            console.error("Failed to update token", tr.word_token_id, e);
          }
        })
      );

      // Trigger notification after all updates
      notification.success({
        message: "Translation Regeneration Complete",
        description: "All tokens have been regenerated and saved successfully!",
        placement: "topRight",
        duration: 4,
      });

    } catch (e) {
      console.error(e);
      message.error("Translation failed");
    } finally {
      setLoadingTokens(false);
      setTranslating({});
    }
  };
  // ------------------ Draft Handling (via API) ------------------
  // useEffect(() => {
  //   const fetchDraft = async () => {
  //     if (!selectedBook || !projectId) return;

  //     try {
  //       setLoadingDraft(true);
  //       const response = await draftAPI.generateDraftForBook(projectId, selectedBook.book_name);
  //       const bookDraft = response?.data?.content || "";
  //       setDraftContent(bookDraft);
  //     } catch (error) {
  //       console.error("Failed to fetch draft", error);
  //       message.error("Could not load draft");
  //     } finally {
  //       setLoadingDraft(false);
  //     }
  //   };

  //   if (activeTab === "draft") {
  //     fetchDraft();
  //   }
  // }, [activeTab, projectId, selectedBook]);
  // useEffect(() => {
  //   if (!projectId || !selectedBook?.book_name) return;
  
  //   const fetchOrGenerateDraft = async () => {
  //     setLoadingDraft(true);
  //     try {
  //       // 1. Try fetching latest draft
  //       const res = await draftAPI.getLatestDraftForBook(projectId, selectedBook.book_name);
  //       const content = res?.data?.content || "";
  //       setDraftContent(content);
  //       setOriginalDraft(content);
  //     } catch (err) {
  //       if (err.response?.status === 404) {
  //         // 2. If no draft found → generate
  //         const genRes = await draftAPI.generateDraftForBook(projectId, selectedBook.book_name);
  //         const content = genRes?.data?.content || "";
  //         setDraftContent(content);
  //         setOriginalDraft(content);
  //         message.success(`Draft generated for ${selectedBook.book_name}`);
  //       } else {
  //         message.error("Failed to load draft");
  //       }
  //     } finally {
  //       setLoadingDraft(false);
  //     }
  //   };
  
  //   if (activeTab === "draft") {
  //     fetchOrGenerateDraft();
  //   }
  // }, [activeTab, projectId, selectedBook]);
  useEffect(() => {
    if (!projectId || !selectedBook?.book_name) return;
  
    const fetchOrGenerateDraft = async () => {
      setLoadingDraft(true);
      try {
        // 1. Try fetching latest draft
        const res = await draftAPI.getLatestDraft(projectId, selectedBook.book_name);
        const draft = res?.data;
        setCurrentDraft(draft);
        setDraftContent(draft?.content || "");
        setOriginalDraft(draft?.content || "");
      } catch (err) {
        if (err.response?.status === 404) {
          // 2. If no draft found → generate
          const genRes = await draftAPI.generateBookDraft(projectId, selectedBook.book_name);
          const draft = genRes?.data;
          setCurrentDraft(draft);
          setDraftContent(draft?.content || "");
          setOriginalDraft(draft?.content || "");
          message.success(`Draft generated for ${selectedBook.book_name}`);
        } else {
          message.error("Failed to load draft");
        }
      } finally {
        setLoadingDraft(false);
      }
    };
  
    if (activeTab === "draft") {
      fetchOrGenerateDraft();
    }
  }, [activeTab, projectId, selectedBook]);

  

  const handleDraftChange = (e) => {
    setDraftContent(e.target.value);
    setIsDraftEdited(e.target.value !== originalDraft);
  };
  // const handleSaveDraft = () => {
  //   if (!selectedBook) return;

  //   const key = `draft_${projectId}_${selectedBook.book_id}`;

  //   // Save the current draft content in localStorage
  //   localStorage.setItem(key, draftContent);

  //   // Update originalDraft and reset edited state
  //   setOriginalDraft(draftContent);
  //   setIsDraftEdited(false);

  //   message.success("Draft saved locally!");
  // };
  const handleSaveDraft = async () => {
    if (!selectedBook) return;
  
    if (!currentDraft?.draft_id) {
      message.error("No draft ID available to save");
      return;
    }
  
    try {
      setSaving(true);
  
      const updated = await draftAPI.updateDraft(currentDraft.draft_id, draftContent);
  
      // Normalize API response (sometimes it's wrapped in `data.data`, sometimes in `data`)
      const savedDraft = updated.data?.data || updated.data;
  
      setOriginalDraft(savedDraft.content);
      setCurrentDraft(savedDraft);
      setIsDraftEdited(false);
  
      message.success("Draft saved to database!");
    } catch (error) {
      console.error("Failed to save draft", error);
      message.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };
  
  // const handleDiscardDraft = () => {
  //   setDraftContent(originalDraft);
  //   setIsDraftEdited(false);
  //   message.info("Reverted to previous draft");
  // };
  const handleDiscardDraft = () => {
    setDraftContent(originalDraft);
    setIsDraftEdited(false);
    message.info("Reverted to previous draft");
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftContent);
    message.success("Draft copied to clipboard!");
  };
  const updateDraftFromEditor = (tokenId, newTranslation, oldTranslation, tokenText) => {
    if (!draftContent) return;
  
    let updatedDraft = draftContent;
  
    if (oldTranslation && oldTranslation !== tokenText) {
      const escapedOld = oldTranslation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOld, 'g');
      updatedDraft = updatedDraft.replace(regex, newTranslation);
    } else {
      const escapedToken = tokenText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedToken}\\b`, 'g');
      updatedDraft = updatedDraft.replace(regex, newTranslation);
    }
  
    setDraftContent(updatedDraft);
  
    // Do NOT touch isDraftEdited here
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
    message.success("Draft downloaded!");
  };

  if (projectLoading) return <Spin />;
  if (projectError) return <div>Error loading project</div>;
return (
  <div style={{ padding: '24px', position: 'relative', height: "100vh", display: "flex", flexDirection: "column" }}>
    <div style={{
      padding: '24px 32px 16px 32px',
      backgroundColor: '#f9f9fb',
      borderRadius: 12,
      marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { title: <Link to="/projects" style={{ color: '#8b5cf6', fontWeight: 500 }}>
          Projects
        </Link> },
          { title: <span style={{ fontWeight: 500 }}>{project?.name}</span> },
        ]}
        style={{ marginBottom: 8, fontSize: 14 }}
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
            onClick={() => setActiveTab('editor')}
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
            onClick={() => setActiveTab('draft')}
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
            activeTab === "editor" ? (
              tokens.some(t => t.translation && t.translation.trim() !== "") ? (
                <Popconfirm
                  title="Regenerate Translations? All regenerated translations will be saved automatically."
                  icon={<ExclamationCircleOutlined />}
                  onConfirm={() => {
                    setRegenerateLoading(true);
                    handleGenerateTranslations().finally(() => setRegenerateLoading(false));
                  }}
                  onCancel={() => message.info("Kept existing translations")}
                  okText="Yes, Regenerate"
                  cancelText="Cancel"
                >
                  <Button type="primary" loading={regenerateLoading}>
                    Generate Translations
                  </Button>
                </Popconfirm>
              ) : (
                <Button
                  type="primary"
                  onClick={() => {
                    setRegenerateLoading(true);
                    handleGenerateTranslations().finally(() => setRegenerateLoading(false));
                  }}
                  loading={regenerateLoading}
                >
                  Generate Translations
                </Button>
              )
            ) : (
              <>
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={handleCopyDraft}
                  style={{ marginRight: 8 }}
                  disabled={loadingTokens}
                >
                  Copy
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  size="small"
                  type="primary"
                  onClick={handleDownloadDraft}
                  disabled={loadingTokens}
                >
                  Download
                </Button>
              </>
            )
          }
        >
          <Row gutter={16} style={{ flex: 1 }}>
            <Col span={12} style={{ height: "100%", overflowY: "auto", paddingRight: 8, maxHeight: "70vh" }}>
              <h3>Source</h3>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 10, borderRadius: 4 }}>
                {sourceText || "No source loaded"}
              </pre>
            </Col>

            <Col span={12} style={{ height: "100%", overflowY: "auto", paddingLeft: 8, maxHeight: "70vh" }}>
              <h3>{activeTab === "editor" ? "Translation" : "Draft Translation"}</h3>
              {loadingTokens ? (
                <Spin />
              ) : tokens.length === 0 ? (
                <Text type="secondary">
                  {activeTab === "editor" ? "No word tokens found for this book." : "No draft available."}
                </Text>
              ) : activeTab === "editor" ? (
                tokens.map((token) => {
                  const isEdited = token.translation !== token.originalTranslation;
                  return (
                    <div
                      key={token.word_token_id}
                      style={{
                        marginBottom: 12,
                        backgroundColor: isEdited ? "#fffbe6" : "transparent",
                        padding: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text strong>{token.token_text}</Text>
                      <Input
                        placeholder="Enter translation"
                        value={token.translation || ""}
                        onChange={(e) => {
                          const prevTranslation = token.translation || "";
                          const newValue = e.target.value;

                          // update token in editor
                          setTokens(prevTokens =>
                            prevTokens.map(t =>
                              t.word_token_id === token.word_token_id
                                ? { ...t, translation: newValue }
                                : t
                            )
                          );

                          // mark token as edited
                          setEditedTokens(prev => ({
                            ...prev,
                            [token.word_token_id]: newValue !== token.originalTranslation
                          }));

                          // sync editor changes to draft (but don't trigger save/discard)
                          updateDraftFromEditor(token.word_token_id, newValue, prevTranslation, token.token_text);
                        }}
                        style={{ marginTop: 4 }}
                        suffix={translating[token.word_token_id] && <Spin size="small" />}
                      />

                      {editedTokens[token.word_token_id] && (
                        <div style={{ marginTop: 4 }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={async () => {
                              try {
                                await wordTokenAPI.updateToken(token.word_token_id, {
                                  translated_text: token.translation,
                                  is_reviewed: true,
                                  is_active: true,
                                  book_name: selectedBook.book_name,
                                });

                                message.success("Translation saved!");

                                // update snapshot
                                setTokens(prevTokens =>
                                  prevTokens.map(t =>
                                    t.word_token_id === token.word_token_id
                                      ? { ...t, originalTranslation: t.translation }
                                      : t
                                  )
                                );

                                setEditedTokens(prev => ({ ...prev, [token.word_token_id]: false }));
                              } catch (e) {
                                console.error(e);
                                message.error("Failed to save translation");
                              }
                            }}
                            style={{ marginRight: 8 }}
                          >
                            Save
                          </Button>

                          <Button
                            danger
                            size="small"
                            onClick={() => {
                              // revert token in editor
                              setTokens(prevTokens =>
                                prevTokens.map(t =>
                                  t.word_token_id === token.word_token_id
                                    ? { ...t, translation: t.originalTranslation }
                                    : t
                                )
                              );

                              // rebuild draft only for this token
                              updateDraftFromEditor(
                                token.word_token_id,
                                token.originalTranslation,
                                token.translation,
                                token.token_text
                              );

                              setEditedTokens(prev => ({ ...prev, [token.word_token_id]: false }));
                              message.info("Changes discarded");
                            }}
                          >
                            Discard
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  {loadingDraft ? (
                    <Spin tip="Loading draft..." />
                  ) : (
                    <TextArea
                      rows={20}
                      value={draftContent}
                      onChange={(e) => {
                        setDraftContent(e.target.value);
                        setIsDraftEdited(e.target.value !== originalDraft); // manual edits only
                      }}
                      style={{
                        backgroundColor: isDraftEdited ? "#fffbe6" : "transparent",
                        padding: 10,
                        borderRadius: 4,
                      }}
                    />
                  )}
                  {isDraftEdited && !loadingDraft && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        type="primary"
                        onClick={handleSaveDraft}
                        style={{ marginRight: 8 }}
                        disabled={loadingTokens}
                      >
                        Save
                      </Button>
                      <Button
                        onClick={handleDiscardDraft}
                        disabled={loadingTokens}
                      >
                        Discard
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Col>
          </Row>
        </Card>
      </>
    )}
  </div>
);
}

