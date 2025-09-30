
import React, { useEffect, useState, useMemo } from "react";
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
} from "antd";
import {
  ThunderboltOutlined,
  SaveOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import api, { translateChapter } from "./api";
import { generateDraftJson, saveDraft, fetchLatestDraft } from "./api";
import DownloadDraftButton from "../components/DownloadDraftButton";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

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
  const [translationAttempted, setTranslationAttempted] = useState(false); // Updated for clarity

  // store edits per verse_token_id
  const [draftId, setDraftId] = useState(null); //Added to track draft ID
  const [editedDraft, setEditedDraft] = useState("");
  // Track unsaved edits per verse token
  const [editedTokens, setEditedTokens] = useState({});
  const [activeTab, setActiveTab] = useState("editor");
  const [originalDraft, setOriginalDraft] = useState(""); // NEW
  const [selectedModel, setSelectedModel] = useState(null);


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
    "nllb_finetuned_eng_nzm": {
      Model: "nllb_finetuned_eng_nzm",
      Tasks: "mt, text translation",
      "Language Code Type": "BCP-47",
      DevelopedBy: "Meta",
      License: "CC-BY-NC 4.0",
      Languages: "Zeme Naga, English",
    },
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
      setBooks(res.data.data);
    } catch {
      message.error("Failed to fetch books");
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
            `${t.book_name || "book"}-${t.chapter_number || 0}-${t.verse_number || i}`,
          verse_translated_text:
            t.verse_translated_text || t.translated_text || "",
        }));

        // Deduplicate by verse_id + token_text
        const uniqueTokens = merged.reduce((acc, t) => {
          const key = `${t.verse_id}-${t.token_text}`;
          if (!acc.map[key]) {
            acc.map[key] = true;
            acc.list.push(t);
          }
          return acc;
        }, { map: {}, list: [] }).list;

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
        const chapterObj = chapters.find(ch => ch.chapter_number === chapterNumber);
        if (!chapterObj) {
          setTokens([]);
          setIsTokenized(false);
          message.warning("Selected chapter not found.");
          return;
        }

        try {
          const res = await api.get(`/api/chapters/${chapterObj.chapter_id}/tokens`, {
            params: { project_id: projectId },
          });
          data = Array.isArray(res.data) ? res.data : [];

          if (data.length === 0) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(`/api/chapters/${chapterObj.chapter_id}/tokens`, {
              params: { project_id: projectId },
            });
            data = Array.isArray(res2.data) ? res2.data : [];
          }
        } catch (err) {
          if (err.response?.status === 404) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(`/api/chapters/${chapterObj.chapter_id}/tokens`, {
              params: { project_id: projectId },
            });
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
          `${bookName}-${chapterNumber || t.chapter_number || 0}-${t.verse_number || i}`,
        verse_translated_text: t.verse_translated_text || t.translated_text || "",
      }));

      // Deduplicate here as well
      const uniqueTokens = merged.reduce((acc, t) => {
        const key = `${t.verse_id}-${t.token_text}`;
        if (!acc.map[key]) {
          acc.map[key] = true;
          acc.list.push(t);
        }
        return acc;
      }, { map: {}, list: [] }).list;

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
      // 1. Update verse token in DB
      const res = await api.patch(
        `/verse_tokens/manual-update/${tokenId}?project_id=${projectId}`,
        {
          translated_text: newText,   // body
        }
      );



      // 2. Update local tokens state
      setTokens((prev) =>
        prev.map((t) =>
          t.verse_token_id === tokenId ? { ...t, ...res.data.data } : t
        )
      );
      setServerDraft(prev => {
        if (!prev) return prev;
        // Optional: update the verse in the draft content if needed
        return prev.replace(/oldVerseText/, newText);
      });

      message.success("Saved the verse and updated the draft!");
    } catch (err) {
      console.error("Manual update error:", err);
      message.error("Failed to update manually");
    }
  };

  const handleTranslateAllChunks = async () => {
    if (selectedBook === "all") {
      message.info("Please select a specific book to translate.");
      return;
    }
    setTranslationAttempted(true);

    const key = "translating";
    message.loading({ key, content: "Translating verses…", duration: 0 });
    setLoadingTranslate(true);
    try {
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await api.post(
          `/verse_tokens/translate-chunk/${projectId}/${selectedBook}`,
          null,
          { params: { skip, limit: 10, chapter: selectedChapter || "" } }
        );
        const newTokens = (Array.isArray(res.data) ? res.data : []).map((t, i) => ({
          ...t,
          verse_token_id:
            t.verse_token_id ||
            t.id ||
            t.token_id ||
            `${selectedBook}-${t.chapter_number || selectedChapter || "all"}-${t.verse_number || i}-${skip}`,
          verse_translated_text: t.verse_translated_text || t.translated_text || "",
        }));

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

      message.success({ key, content: "All verses translated!" });
    } catch (err) {
      console.error("Translation error:", err);
      message.error({ key, content: `Error: ${err.message || "Failed"}` });
    }
    finally {
      setLoadingTranslate(false); // enable dropdown
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
  const handleTranslateChapter = async () => {
    if (selectedBook === "all" || !selectedChapter) {
      message.info("Please select a specific book and chapter to translate.");
      return;
    }
    setLoadingTranslate(true); 
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
        const batch = uniqueVerseNumbers.slice(i, i + batchSize);

        // Show placeholder while batch in progress
        setTokens(prev =>
          prev.map(tok =>
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
          selectedModel
        );

        if (newTokens?.length > 0) {
          setTokens(prev => {
            // build updated array (always new reference)
            const updated = prev.map(tok => {
              const match = newTokens.find(
                nt => nt.verse_number === tok.verse_number && nt.token_text === tok.token_text
              );
              return match
                ? {
                  ...tok,
                  verse_translated_text: match.verse_translated_text || match.translated_text || "",
                  lastUpdated: Date.now(),
                }
                : tok;
            });
            return [...updated]; // <-- ensures React sees a new array
          });
        }

        // let React paint updates
        await new Promise(r => setTimeout(r, 0));

        // Update progress
        const done = Math.min(i + batchSize, total);
        const percent = Math.round((done / total) * 100);
        message.loading({
          key,
          content: `Translating verses…  (${percent}%)`,
          duration: 0,
        });
      }

      message.success({ key, content: "Chapter translated successfully!" });

      // ✅ immediately refresh draft so UI shows translations without refresh
      // await updateServerDraft();

    } catch (err) {
      console.error("Translation error:", err);
      message.error({
        key: "translating",
        content: `Error: ${err.message || "Failed"}`,
      });
    }
    finally {
      setLoadingTranslate(false); // ✅ translation finished, dropdown enables
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
            console.log("Draft copied (fallback):", contentToCopy.slice(0, 100));
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
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
          Verse Translation ({project?.name})
        </h2>
        <Space>
          <Select
            value={selectedBook}
            onChange={(val) => setSelectedBook(val)}
            style={{ minWidth: 200 }}
          >
            <Option value="all">All Books</Option>
            {books.map((b) => (
              <Option key={b.book_id} value={b.book_name}>
                {b.book_name}
              </Option>
            ))}
          </Select>

          {selectedBook !== "all" && chapters.length > 0 && (
            <Space>
              {/* Prev Button */}
              <Button
                type="text"
                disabled={!selectedChapter || selectedChapter === 1 || activeTab === "draft"}
                onClick={() =>
                  setSelectedChapter((prev) => Math.max(1, prev - 1))
                }
              >
                ◀
              </Button>

              {/* Chapter Dropdown */}
              <Select
                value={selectedChapter}
                style={{ minWidth: 120 }}
                onChange={(val) => setSelectedChapter(val)}
                disabled={activeTab === "draft"}
              >
                {chapters.map((ch) => (
                  <Option key={ch.chapter_id} value={ch.chapter_number}>
                    Chapter {ch.chapter_number}
                  </Option>
                ))}
              </Select>

              {/* Next Button */}
              <Button
                type="text"
                disabled={!selectedChapter || selectedChapter === chapters.length || activeTab === "draft"}
                onClick={() =>
                  setSelectedChapter((prev) =>
                    Math.min(chapters.length, prev + 1)
                  )
                }
              >
                ▶
              </Button>
            </Space>
          )}
        </Space>

        <Progress
          percent={100} // always full width
          success={{
            percent:
              chapterStats.total === 0
                ? 0
                : Math.round((chapterStats.translated / chapterStats.total) * 100),
          }}
          format={() =>
            `${chapterStats.translated} / ${chapterStats.total} verses`
          }
          strokeColor="#d9d9d9" // always grey
          style={{ marginTop: 8, marginBottom: 8 }}
        />
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
      >

        {/* Editor */}

        <TabPane tab="Translation Editor" key="editor">
          <Row justify="end" align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Tooltip
                  title={
                    selectedModel ? (
                      <div style={{ textAlign: "left", fontSize: 12 }}>
                        {Object.entries(MODEL_INFO[selectedModel]).map(([key, val]) => (
                          <div key={key}>
                            <b>{key}:</b> {val}
                          </div>
                        ))}
                      </div>
                    ) : "Select a model to see info"
                  }
                  placement="right"
                  color="#f0f0f0"
                >
                  <Button
                    type="text"
                    icon={<InfoCircleOutlined style={{ fontSize: 18, color: "#2c8dfb" }} />}
                    disabled={!selectedModel} // disabled until a model is selected
                  />
                </Tooltip>
                <Select
                  placeholder="Select model"
                  style={{ width: 220 }}
                  value={selectedModel || undefined} // placeholder shows if null
                  onChange={(val) => setSelectedModel(val)}
                  disabled={loadingTranslate} // disabled during translation
                >
                  <Option value="nllb-600M">nllb-600M</Option>
                  <Option value="nllb_finetuned_eng_nzm">nllb_finetuned_eng_nzm</Option>
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
                  <Button
                    type="dashed"
                    icon={<ThunderboltOutlined />}
                    onClick={selectedChapter ? handleTranslateChapter : handleTranslateAllChunks}
                    disabled={
                      !selectedModel || selectedBook === "all" || !selectedChapter
                    }
                  >
                    Translate
                  </Button>
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
                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {"No content available, please select a book"}
                  </pre>
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
                                    new: newText,                 // current edit
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



                        {/* {translationAttempted && !t.verse_translated_text && (
                          <Typography.Text
                            type="danger"
                            style={{ fontSize: "14px" }}
                          >
                            Translation failed
                          </Typography.Text>
                        )}
  */}
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
                                          verse_translated_text: editedTokens[t.verse_token_id].old,
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
                  <p>Select a book to start translation</p>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Draft View" key="draft">
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
                      {rawBookContent}
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
                    <DownloadDraftButton
                      content={serverDraft}
                    />

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
                          const mergedTokens = tokens.map(t => {
                            const edited = editedTokens[t.verse_token_id];
                            return edited ? { ...t, verse_translated_text: edited.new } : t;
                          });

                          // 2️⃣ Call API to generate draft using latest translations
                          const draft = await generateDraftJson(projectId, selectedBook, mergedTokens);

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
                          value={editedDraft || serverDraft}
                          autoSize={{ minRows: 8, maxRows: 20 }}
                          style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                          onChange={(e) => setEditedDraft(e.target.value)}
                        />

                        {/* Save & Discard Buttons */}
                        {editedDraft !== null && editedDraft !== serverDraft && (
                          <Space>
                            <Button
                              type="primary"
                              icon={<SaveOutlined />}
                              onClick={async () => {
                                try {
                                  if (draftId) {
                                    // Save draft to backend
                                    const res = await saveDraft(draftId, editedDraft);
                                    setServerDraft(res.content);
                                    setEditedDraft(null);               // Reset edit mode

                                    message.success("Draft saved successfully!");
                                  } else {
                                    message.warning("No draftId found to save");
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
                                setEditedDraft(originalDraft); // discard edits
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
                          No translation draft available yet. Run translation to generate one.
                        </p>
                      </Card>
                    </Col>
                  )
                  }

                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default VerseTranslationPage;
