import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Typography,
  message,
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

import DownloadDraftButton from "../components/DownloadDraftButton";

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
  const [targetLanguage, setTargetLanguage] = useState("Target Language");
  const [rawBookContent, setRawBookContent] = useState("");

const [loadingSource, setLoadingSource] = useState(false);   // fetching tokens/raw
const [loadingTranslate, setLoadingTranslate] = useState(false); // translation only


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
      // Project-level view (no generation)
      setLoadingSource(true);
      try {
        const res = await api.get(`/verse_tokens/by-project/${projectId}`, {
          params: { book_name: "", chapter: "" },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        const merged = data.map((t) => ({
          ...t,
          verse_translated_text: t.verse_translated_text || t.translated_text || "",
        }));
        setTokens(merged);
        
        setIsTokenized(merged.length > 0);
        if (merged.length > 0 && merged[0].target_language_name) {
          setTargetLanguage(merged[0].target_language_name);
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

    setLoadingSource(true);
    try {
      let data = [];

      // If a chapter is chosen → use the chapter-specific endpoint first
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
            `/api/chapters/${chapterObj.chapter_id}/tokens`
          );
          data = Array.isArray(res.data) ? res.data : [];
          if (data.length === 0) {
            // no tokens → generate at book level then refetch chapter
            await ensureBookTokens(bookName);
            const res2 = await api.get(
              `/api/chapters/${chapterObj.chapter_id}/tokens`
            );
            data = Array.isArray(res2.data) ? res2.data : [];
          }
        } catch (err) {
          if (err.response?.status === 404) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(
              `/api/chapters/${chapterObj.chapter_id}/tokens`
            );
            data = Array.isArray(res2.data) ? res2.data : [];
          } else {
            throw err;
          }
        }
      } else {
        // No chapter → fetch by (project, book)
        try {
          const res = await api.get(`/verse_tokens/by-project/${projectId}`, {
            params: { book_name: bookName, chapter: "" },
          });
          data = Array.isArray(res.data) ? res.data : [];
          if (data.length === 0) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(
              `/verse_tokens/by-project/${projectId}`,
              {
                params: { book_name: bookName, chapter: "" },
              }
            );
            data = Array.isArray(res2.data) ? res2.data : [];
          }
        } catch (err) {
          if (err.response?.status === 404) {
            await ensureBookTokens(bookName);
            const res2 = await api.get(
              `/verse_tokens/by-project/${projectId}`,
              {
                params: { book_name: bookName, chapter: "" },
              }
            );
            data = Array.isArray(res2.data) ? res2.data : [];
          } else {
            throw err;
          }
        }
      }

      const merged = data.map((t) => ({
        ...t,
        verse_translated_text: t.verse_translated_text || t.translated_text || "",
      }));

      setTokens(merged);
      setIsTokenized(merged.length > 0);
      if (merged.length > 0 && merged[0].target_language_name) {
        setTargetLanguage(merged[0].target_language_name);
      }

      if (merged.length === 0) {
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
      const res = await api.patch(`/verse_tokens/manual-update/${tokenId}`, {
        translated_text: newText,
      });
      setTokens((prev) =>
        prev.map((t) => (t.verse_token_id === tokenId ? res.data.data : t))
      );
      message.success("Saved the Translated Verses!");
    } catch {
      message.error("Failed to update manually");
    }
  };

  // ---------- Translate All (kept) ----------
  const handleTranslateAllChunks = async () => {
    if (selectedBook === "all") {
      message.info("Please select a specific book to translate.");
      return;
    }
    try {
      setLoadingTranslate(true);
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await api.post(
          `/verse_tokens/translate-chunk/${projectId}/${selectedBook}`,
          null,
          { params: { skip, limit: 10, chapter: selectedChapter || "" } }
        );
        const newTokens = Array.isArray(res.data) ? res.data : [];

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

      message.success("All verses translated!");
    } catch {
      message.error("Failed to translate all verses");
    } finally {
      setLoadingTranslate(false);
    }
  };

  // chapter Translate---------------------------------
  const handleTranslateChapter = async () => {
    if (selectedBook === "all" || !selectedChapter) {
      message.info("Please select a specific book and chapter to translate.");
      return;
    }
  
    try {
      setLoadingTranslate(true);
      const newTokens = await translateChapter(projectId, selectedBook, selectedChapter);
  
      // normalize translated_text → verse_translated_text
      const merged = newTokens.map((t) => ({
        ...t,
        verse_translated_text: t.verse_translated_text || t.translated_text || "",
      }));
  
      setTokens(merged);

       //  replace, not merge
  
      message.success("Chapter translated successfully!");
    } catch (err) {
      console.error(err);
      message.error("Failed to translate this chapter");
    } finally {
      setLoadingTranslate(false);
    }
  };
  
  

  // ---------- Progress / Draft ----------
  const progress = useMemo(() => {
    if (!tokens || tokens.length === 0) return 0;
    const translated = tokens.filter((t) => t.verse_translated_text).length;
    return Math.round((translated / tokens.length) * 100);
  }, [tokens]);

  const draftContent = tokens
    .filter((t) => t.verse_translated_text)
    .map((t) => t.verse_translated_text)
    .join("\n\n");

  const filteredTokens = showOnlyTranslated
    ? tokens.filter((t) => t.verse_translated_text)
    : tokens;

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draftContent);
      message.success("Draft copied to clipboard");
    } catch {
      message.error("Failed to copy draft");
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
          setSelectedChapter(1); // default to first chapter
        });
      }
      setTokens([]);
      setIsTokenized(false);
      fetchRawBook(selectedBook);
      fetchTokensForSelection(selectedBook, null);
    } else {
      setSelectedChapter(null);
      setTokens([]);
      setIsTokenized(false);
      setRawBookContent("");
    }
  }, [selectedBook]);

  useEffect(() => {
    // When a chapter is picked, fetch/generate only that chapter's tokens
    if (selectedBook !== "all" && selectedChapter) {
      fetchTokensForSelection(selectedBook, selectedChapter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter]);

  // ---------- UI ----------
  return (
    <div style={{ padding: 20 }}>
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
        <Title level={3}>Verse Translation</Title>
        {project && (
          <Text>
            Source: {project.source_language_name} | Target:{" "}
            {project.target_language_name}
          </Text>
        )}

        {/* Book + Chapter Selectors */}
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
      disabled={!selectedChapter || selectedChapter === 1}
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
      disabled={!selectedChapter || selectedChapter === chapters.length}
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
          percent={progress}
          style={{ marginTop: 8, marginBottom: 8 }}
        />
      </Space>

      <Tabs defaultActiveKey="editor">
        {/* Editor */}
        <TabPane tab="Translation Editor" key="editor">
  <div
    style={{
      display: "flex",
      maxHeight: "70vh",
      overflowY: "auto",
    }}
    ref={(el) => {
      if (!el) return;
      // Sync scroll between both children
      const [src, tgt] = el.querySelectorAll(".scroll-sync");
      if (src && tgt) {
        src.onscroll = () => {
          tgt.scrollTop = src.scrollTop;
        };
        tgt.onscroll = () => {
          src.scrollTop = tgt.scrollTop;
        };
      }
    }}
  >
    {/* Source */}
    <div className="scroll-sync" style={{ flex: 1, paddingRight: 8 }}>
      <Card
        title={<span>Source</span>}
        bodyStyle={{ padding: 12 }}
        bordered
      >
        {loadingSource ? (
          <Spin size="large" />
        ) : isTokenized ? (
          <>
            {tokens.length > 0 && (
              <Text strong style={{ display: "block", marginBottom: 12 }}>
                {tokens[0].book_name}
              </Text>
            )}
            {tokens.map((t, index) => (
              <div
                key={t.verse_token_id}
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  padding: "8px 0",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <Text strong style={{ minWidth: 30, textAlign: "right" }}>
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
    </div>

    {/* Target */}
    <div className="scroll-sync" style={{ flex: 1, paddingLeft: 8 }}>
      <Card
        title={
          <Row justify="space-between" align="middle">
            <span>{targetLanguage}</span>
            <Button
              type="dashed"
              icon={<ThunderboltOutlined />}
              onClick={selectedChapter ? handleTranslateChapter : handleTranslateAllChunks}
              disabled={selectedBook === "all"}
            >
              Translate
            </Button>
          </Row>
        }
        bodyStyle={{ padding: 12 }}
        bordered
      >
        {loadingTranslate ? (
          <Spin size="large" />
        ) : isTokenized ? (
          tokens.map((t, index) => (
            <div
              key={t.verse_token_id}
              style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}
            >
              <Text strong style={{ display: "block", marginBottom: 4 }}>
                Verse {index + 1}
              </Text>
              <Input.TextArea
                rows={3}
                value={t.verse_translated_text}
                placeholder="[No translation yet]"
                onChange={(e) =>
                  setTokens((prev) =>
                    prev.map((tok) =>
                      tok.verse_token_id === t.verse_token_id
                        ? { ...tok, verse_translated_text: e.target.value }
                        : tok
                    )
                  )
                }
              />
              <Space style={{ marginTop: 6 }}>
                <Button
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() =>
                    handleManualUpdate(t.verse_token_id, t.verse_translated_text)
                  }
                >
                  Save
                </Button>
              </Space>
            </div>
          ))
        ) : (
          <p>Select a book to start translation</p>
        )}
      </Card>
    </div>
  </div>
</TabPane>

        {/* Draft */}
        <TabPane tab="Draft View" key="draft">
          <Card
            title={
              <Row justify="space-between" align="middle">
                <Space>
                  <span>Translation Draft</span>
                  <Switch
                    checked={showOnlyTranslated}
                    onChange={setShowOnlyTranslated}
                    checkedChildren="Only Translated"
                    unCheckedChildren="All"
                  />
                </Space>
                <Space>
                  <DownloadDraftButton content={draftContent} />
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={copyDraft}
                  >
                    Copy
                  </Button>
                </Space>
              </Row>
            }
            style={{ marginTop: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  title="Source"
                  style={{ maxHeight: "70vh", overflowY: "scroll" }}
                >
                  {filteredTokens.map((t) => (
                    <p key={t.verse_token_id}>{t.token_text}</p>
                  ))}
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title={targetLanguage}
                  style={{ maxHeight: "70vh", overflowY: "scroll" }}
                >
                  {filteredTokens.map((t) => (
                    <p key={t.verse_token_id}>
                      {t.verse_translated_text || ""}
                    </p>
                  ))}
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default VerseTranslationPage;