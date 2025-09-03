import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Select, Card, Input, Typography, Spin, Button, message, Breadcrumb,Popconfirm } from 'antd';
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
  const [messageApi, contextHolder] = message.useMessage();
 
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
  const fetchTokens = async (bookName) => {
    if (!bookName) return;
    setLoadingTokens(true);
 
    try {
      const encodedBookName = encodeURIComponent(bookName); // ✅ Correct: encode here
 
      // 1️⃣ Try fetching existing tokens
      let data = [];
      try {
        data = await wordTokenAPI.getTokensByProjectAndBook(projectId, bookName);
      } catch (err) {
        if (err.response?.status !== 404) throw err;
      }
 
      // 2️⃣ If no tokens exist → generate them
      if (!data || data.length === 0) {
        const genRes = await wordTokenAPI.generateTokens(projectId, bookName);
        data = genRes?.data || [];
      }
      if (!data || data.length === 0) {
        const genRes = await wordTokenAPI.generateBatchTokens(projectId, bookName);
      
        if (genRes?.failed_batches?.length > 0) {
          messageApi.error(`Translation Failed. Batch(es) failed: ${genRes.failed_batches.join(", ")}`);
          return;
        }
        
      
        data = genRes?.translated_tokens || [];
      }
      
 
      // 3️⃣ Prepare tokens for editor
      const preparedTokens = data.map((t) => ({
        ...t,
        translation: t.translated_text || "",
        originalTranslation: t.translated_text || "",
      }));
 
      setTokens(preparedTokens);
    } catch (e) {
      console.error("Failed to fetch or generate tokens", e);
      messageApi.error("Failed to fetch or generate tokens");
    } finally {
      setLoadingTokens(false);
    }
};
 
 
 
  // ------------------ Handle Book Selection ------------------
//   const handleBookChange = async (bookId) => {
//     const selected = projectBooks.find((b) => b.book_id === bookId);
//     // setSelectedBook(selected);
//     // setSourceText(selected?.usfm_content || "No source content available");
 
//     // if (!selected?.book_name) return;
 
//     // const cleanBookName = selected.book_name;
//     // console.log("[DEBUG] Selected book:", cleanBookName);
//     // await fetchTokens(cleanBookName); // ✅ Correct: pass raw name, encoded inside fetchTokens
//     setSelectedBook(selected);
// setSourceText(selected?.usfm_content || "No source content available");
 
// // ----------- RESET STATES FOR NEW BOOK -------------
// setTokens([]);
// setDraftContent("");
// setOriginalDraft("");
// setEditedTokens({});
// setIsDraftEdited(false);
// // -----------------------------------------------
 
// if (!selected?.book_name) return;
 
// const cleanBookName = selected.book_name;
// console.log("[DEBUG] Selected book:", cleanBookName);
// await fetchTokens(cleanBookName);
 
// };
const handleBookChange = async (bookId) => {
  const selected = projectBooks.find((b) => b.book_id === bookId);
  setSelectedBook(selected);
  setSourceText(selected?.usfm_content || "No source content available");
 
  // ----------- RESET STATES FOR NEW BOOK -------------
  setTokens([]);
  setDraftContent("");
  setOriginalDraft("");
  setEditedTokens({});
  setIsDraftEdited(false);
  setCurrentDraft(null); // reset currentDraft
  // -----------------------------------------------
 
  // Immediately fetch draft if Draft tab is active
  if (activeTab === "draft") {
    fetchOrGenerateDraft(); // ✅ call draft API here
  }
 
  if (!selected?.book_name) return;
  const cleanBookName = selected.book_name;
  console.log("[DEBUG] Selected book:", cleanBookName);
  await fetchTokens(cleanBookName);
};
 
  // const handleGenerateTranslations = async () => {
  //   if (!selectedBook) return;
  //   setLoadingTokens(true);
 
  //   try {
  //     // Call the new batch API
  //     const result = await wordTokenAPI.generateBatchTokens(projectId, selectedBook.book_name);
  //     const translatedTokens = result?.data || result || [];
 
  //     setTokens(
  //       translatedTokens.map((t) => ({
  //         ...t,
  //         translation: t.translated_text || t.translation || "",
  //         originalTranslation: t.translated_text || t.translation || "",
  //       }))
  //     );
 
  //     notification.success({
  //       message: "Translation Regeneration Complete",
  //       description: "All tokens translation have been regenerated and saved successfully!",
  //       placement: "topRight",
  //       duration: 4,
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     message.error("Translation failed");
  //   } finally {
  //     setLoadingTokens(false);
  //     setTranslating({});
  //   }
  // };
  // ------------------ Helper: Fetch with timeout ------------------
  
const fetchWithTimeout = (promise, timeout = 30000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Translation request timed out")), timeout);
    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
 
  const handleGenerateTranslations = async () => {
    if (!selectedBook) return;
    setLoadingTokens(true);
  
    try {
      // Fetch batch translations with timeout (5 min for large books)
      const result = await fetchWithTimeout(
        wordTokenAPI.generateBatchTokens(projectId, selectedBook.book_name),
        300000
      );
  
      // If any batch failed → show error and stop
      if (result?.failed_batches?.length > 0) {
        messageApi.error(`Translation Failed. Batch(es) failed: ${result.failed_batches.join(", ")}`);
        setTokens([]);
        if (!isDraftEdited) {
          setDraftContent("");
          setOriginalDraft("");
        }
        return;
      }
      
  
      const translatedTokens = Array.isArray(result) ? result : result?.translated_tokens || [];
  
      // ------------------ 1️⃣ Update editor tokens ------------------
      setTokens(
        translatedTokens.map((t) => ({
          ...t,
          translation: t.translated_text || t.translation || "",
          originalTranslation: t.translated_text || t.translation || "",
        }))
      );
  
      // ------------------ 2️⃣ Update draft ------------------
      let baseContent = currentDraft?.content || draftContent;
if (!baseContent || baseContent.trim() === "") {
  baseContent = sourceText || ""; // fallback to source text
}
 
const updatedDraft = translatedTokens.reduce((draft, token) => {
  const oldText = token.token_text;
  const newText = token.translated_text || token.translation || "";
  const escapedOld = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return draft.replace(new RegExp(`\\b${escapedOld}\\b`, 'g'), newText);
}, baseContent);
 
setDraftContent(updatedDraft);
setOriginalDraft(updatedDraft);
setCurrentDraft({ ...currentDraft, content: updatedDraft });
 
      // ------------------ 3️⃣ Show success ------------------
      messageApi.success("Translations generated successfully! Editor and Draft have been updated.");
 
    } catch (error) {
      console.error("[ERROR] handleGenerateTranslations:", error);
      setTokens([]);
      if (!isDraftEdited) {
        setDraftContent("");
        setOriginalDraft("");
      }
  
      messageApi.error("Translation failed. Server may be down or network is slow.");
 
    } finally {
      setLoadingTokens(false);
      setTranslating({});
    }
  };
  
  
  // ------------------ Draft Handling (via API) ------------------
  useEffect(() => {
    if (!projectId || !selectedBook?.book_name) return;
  
    const fetchOrGenerateDraft = async () => {
      setLoadingDraft(true);
      try {
        // ✅ Try fetching the latest draft
        const response = await draftAPI.getLatestDraftForBook(projectId, selectedBook.book_name);
  
        if (response) {
          // Draft exists → set it
          setCurrentDraft(response);
          if (!draftContent) {
            setDraftContent(response.content || "");
            setOriginalDraft(response.content || "");
          }
        } else {
          // Draft not found → generate new one
          const generated = await draftAPI.generateDraftForBook(projectId, selectedBook.book_name);
          setCurrentDraft(generated);
          setDraftContent(generated?.content || "");
          setOriginalDraft(generated?.content || "");
          setIsDraftEdited(false);
  
          messageApi.success(`Draft generated for ${selectedBook.book_name}`);
        }
      } catch (error) {
        console.error("[ERROR] fetchOrGenerateDraft:", error);
        messageApi.error("Failed to fetch or generate draft");
      } finally {
        setLoadingDraft(false);
      }
    };
  
    if (activeTab === "draft") {
      fetchOrGenerateDraft();
    }
  }, [projectId, selectedBook, activeTab]);
  
  const handleDraftChange = (e) => {
    setDraftContent(e.target.value);
    setIsDraftEdited(e.target.value !== originalDraft);
  };
  const handleSaveDraft = () => {
    setOriginalDraft(draftContent);
    setIsDraftEdited(false);
    messageApi.success("Draft saved locally!");
  };
 
  const handleDiscardDraft = () => {
    setDraftContent(originalDraft);
    setIsDraftEdited(false);
    messageApi.info("Reverted to previous draft");
  };
 
  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftContent);
    messageApi.success("Draft copied to clipboard!");
  };
  const updateDraftFromEditor = (tokenId, newTranslation, oldTranslation, tokenText) => {
    if (!draftContent) return;
  
    try {
      // Decide what to replace
      const textToReplace = oldTranslation && oldTranslation !== tokenText ? oldTranslation : tokenText;
      if (!textToReplace) return;
  
      // Escape special regex characters
      const escapedText = textToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
      // Replace all occurrences globally
      const regex = new RegExp(escapedText, 'g');
  
      // Only replace if draftContent contains the text
      if (regex.test(draftContent)) {
        const updatedDraft = draftContent.replace(regex, newTranslation || '');
        setDraftContent(updatedDraft);
      }
    } catch (error) {
      console.error("[ERROR] updateDraftFromEditor failed:", error);
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
 
  if (projectLoading) return <Spin />;
  if (projectError) return <div>Error loading project</div>;
  return (
    <div style={{ padding: '24px', position: 'relative', height: "100vh", display: "flex", flexDirection: "column" }}>
      {contextHolder}  {/* <-- ADD THIS LINE */}
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
            { title: <Link to="/projects" style={{ color: '#8b5cf6', fontWeight: 500 }}>Projects</Link> },
            { title: <span style={{ fontWeight: 500 }}>{project?.name}</span> },
          ]}
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
            // extra={
            //   activeTab === "editor" ? (
                // tokens.some(t => t.translation && t.translation.trim() !== "") ? (
                //   // </Popconfirm>
                //   <Popconfirm
                //     title="Regenerate Translations? All regenerated translations will be saved automatically."
                //     icon={<ExclamationCircleOutlined />}
                //     onConfirm={handleGenerateTranslations}
                //     okText="Yes, Regenerate"
                //     cancelText="Cancel"
                //   >
                //     <Button type="primary" loading={regenerateLoading}>
                //       {tokens.some(t => t.translation) ? "Regenerate Translations" : "Generate Translations"}
                //     </Button>
                //   </Popconfirm>
 
                // ) : (
                //   <Button
                //     type="primary"
                //     onClick={() => {
                //       setRegenerateLoading(true);
                //       handleGenerateTranslations().finally(() => setRegenerateLoading(false));
                //     }}
                //     loading={regenerateLoading}
                //   >
                //     Generate Translations
                //   </Button>
                // )
                extra={
                  activeTab === "editor" ? (
                    tokens?.some(t => t.translation?.trim() !== "") ? (
                      <Popconfirm
                        title="Regenerate Translations? All regenerated translations will be saved automatically."
                        icon={<ExclamationCircleOutlined />}
                        onConfirm={() => {
                          setRegenerateLoading(true);
                          handleGenerateTranslations().finally(() => setRegenerateLoading(false));
                        }}
                        okText="Yes, Regenerate"
                        cancelText="Cancel"
                      >
                        <Button type="primary" loading={regenerateLoading}>
                          Regenerate Translations
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
                              onClick={() => {
                                setTokens(prevTokens =>
                                  prevTokens.map(t =>
                                    t.word_token_id === token.word_token_id
                                      ? { ...t, originalTranslation: t.translation }
                                      : t
                                  )
                                );
                                setEditedTokens(prev => ({ ...prev, [token.word_token_id]: false }));
                                messageApi.success("Translation updated locally!");
                              }}
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
                                messageApi.info("Changes discarded");
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
 
 
 