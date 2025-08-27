import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  ReloadOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import api from "./api";
import DownloadDraftButton from "../components/DownloadDraftButton";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const VerseTranslationPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState("all");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyTranslated, setShowOnlyTranslated] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Target Language");
  const [rawBookContent, setRawBookContent] = useState("");
  const [isTokenized, setIsTokenized] = useState(false);
  const [chunkSkip, setChunkSkip] = useState(0);  
  const [skipCount, setSkipCount] = useState(0); 

  const fetchProjectDetails = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.data);
    } catch (err) {
      message.error("Failed to fetch project details");
    }
  };

  const fetchAvailableBooks = async (sourceId) => {
    try {
      const res = await api.get(`/books/by_source/${sourceId}`);
      setBooks(res.data.data.map((b) => b.book_name));
    } catch (err) {
      message.error("Failed to fetch books");
    }
  };

  const fetchRawBook = async (bookName) => {
    try {
      setLoading(true);
      const res = await api.get(`/books/by_source/${project?.source_id}`);
      const found = res.data.data.find((b) => b.book_name === bookName);
      if (found) {
        setRawBookContent(found.usfm_content);
      }
    } catch (err) {
      message.error("Failed to fetch raw book content");
    } finally {
      setLoading(false);
    }
  };

  const fetchTokens = async (book = selectedBook) => {
    try {
      setLoading(true);
      const res = await api.get(`/verse_tokens/by-project/${projectId}`, {
        params: { book_name: book === "all" ? "" : book },
      });
  
      const fetched = res.data;
      const merged = fetched.map((f) => ({
        ...f,
        verse_translated_text: f.verse_translated_text || "", 
      }));
  
      setTokens(merged);
      setIsTokenized(merged.length > 0);
  
      if (merged.length > 0 && merged[0].target_language_name) {
        setTargetLanguage(merged[0].target_language_name);
      }
      return merged;
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to fetch tokens");
      return [];
    } finally {
      setLoading(false);
    }
  };
  

  const generateTokens = async () => {
    try {
      setLoading(true);
      const res = await api.post(
        `/verse_tokens/generate-verse-tokens/${projectId}?book_name=${selectedBook === "all" ? "" : selectedBook}`
      );
      message.success(res.data.message);
      fetchTokens();
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to generate tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateChunk = async () => {
    try {
      setLoading(true);
  
      const res = await api.post(
        `/verse_tokens/translate-chunk/${projectId}/${selectedBook}`,
        null,
        { params: { skip: chunkSkip, limit: 10 } }
      );
  
      console.log("New chunk response:", res.data);
      const newTokens = res.data;
  
      setTokens((prev) =>
        prev.map((tok) => {
          const updated = newTokens.find(
            (nt) => nt.verse_token_id === tok.verse_token_id
          );
          return updated ? { ...tok, ...updated } : tok;
        })
      );
  
      message.success("Translated next 10 verses!");
      setChunkSkip(chunkSkip + 10);
    } catch (err) {
      console.error("Chunk translation error:", err);
      message.error(err.response?.data?.detail || "Chunk translation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateAllChunks = async () => {
    try {
      setLoading(true);
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await api.post(
          `/verse_tokens/translate-chunk/${projectId}/${selectedBook}`,
          null,
          { params: { skip, limit: 10 } }
        );

        const newTokens = res.data;
        console.log(`Translated ${newTokens.length} verses (skip=${skip})`);

        setTokens((prev) =>
          prev.map((tok) => {
            const updated = newTokens.find(
              (nt) => nt.verse_token_id === tok.verse_token_id
            );
            return updated ? { ...tok, ...updated } : tok;
          })
        );

        if (newTokens.length < 10) {
          hasMore = false; 
        } else {
          skip += 10;
        }
      }

      message.success("All verses translated!");
    } catch (err) {
      console.error("Full translation error:", err);
      message.error(err.response?.data?.detail || "Failed to translate all verses");
    } finally {
      setLoading(false);
    }
  };
    
  const handleManualUpdate = async (tokenId, newText) => {
    try {
      const res = await api.patch(`/verse_tokens/manual-update/${tokenId}`, {
        translated_text: newText,
      });
      setTokens((prev) =>
        prev.map((t) =>
          t.verse_token_id === tokenId ? res.data.data : t
        )
      );
      message.success("Saved the Translated Verses!");
    } catch (err) {
      message.error("Failed to update manually");
    }
  };

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
    } catch (err) {
      message.error("Failed to copy draft");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchProjectDetails();
    };
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (project?.source_id) {
      fetchAvailableBooks(project.source_id);
    }
  }, [project]);

  useEffect(() => {
    if (selectedBook !== "all") {
      fetchRawBook(selectedBook);
      setIsTokenized(false);  
      setTokens([]);          
      setSkipCount(0);
    }
  }, [selectedBook]);
  

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
      </Breadcrumb>

      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Row justify="space-between" align="middle">
          <Title level={3}>Verse Translation</Title>
          <Select
            value={selectedBook}
            onChange={(val) => setSelectedBook(val)}
            style={{ minWidth: 200 }}
          >
            <Option value="all">All Books</Option>
            {books.map((b) => (
              <Option key={b} value={b}>
                {b}
              </Option>
            ))}
          </Select>
        </Row>
        {project && (
          <Text>
            Source: {project.source_language_name} | Target: {project.target_language_name}
          </Text>
        )}

        <Progress percent={progress} style={{ marginTop: 8, marginBottom: 8 }} />
      </Space>

      <Tabs defaultActiveKey="editor">
        {/* Editor Tab */}
        <TabPane tab="Translation Editor" key="editor">
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={generateTokens}
              loading={loading}
            >
              Generate Tokens
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchTokens()}
              loading={loading}
            >
              Refresh Tokens
            </Button>
            <DownloadDraftButton content={draftContent} />
            <Button icon={<CopyOutlined />} onClick={copyDraft}>
              Copy Draft
            </Button>
          </Space>

          {loading ? (
            <Spin size="large" />
          ) : (
            <Row gutter={16}>
              {/* Source Panel */}
              <Col span={12}>
                <Card
                  title="Source"
                  style={{ maxHeight: "70vh", overflowY: "scroll" }}
                >
                  {isTokenized ? (
                    tokens.map((t) => (
                      <div
                        key={t.verse_token_id}
                        style={{
                          borderBottom: "1px solid #f0f0f0",
                          padding: "8px 0",
                        }}
                      >
                        <Text strong>{t.book_name}</Text>
                        <p>{t.token_text}</p>
                      </div>
                    ))
                  ) : (
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {rawBookContent || "No content available"}
                    </pre>
                  )}
                </Card>
              </Col>

              {/* Target Panel */}
              <Col span={12}>
                <Card
                  title={targetLanguage}
                  style={{ maxHeight: "70vh", overflowY: "scroll" }}
                >
                  {isTokenized ? (
                    <>
                      <Space style={{ marginBottom: 12 }}>
                        <Button
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          onClick={handleTranslateChunk}
                          loading={loading}
                          disabled={selectedBook === "all"}
                        >
                          Translate Next 10
                        </Button>

                        <Button
                          type="dashed"
                          icon={<ThunderboltOutlined />}
                          onClick={handleTranslateAllChunks}
                          loading={loading}
                          disabled={selectedBook === "all"}
                        >
                          Translate ALL
                        </Button>
                      </Space>

                      {tokens.map((t) => (
                        <div
                          key={t.verse_token_id}
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: "8px 0",
                          }}
                        >
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
                                handleManualUpdate(
                                  t.verse_token_id,
                                  t.verse_translated_text
                                )
                              }
                            >
                              Save
                            </Button>
                          </Space>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p>Select “Generate Tokens” to start translation</p>
                  )}
                </Card>
              </Col>
            </Row>
          )}
        </TabPane>

        {/* Draft Tab */}
        <TabPane tab="Draft View" key="draft">
          <Card
            title={
              <Space>
                <span>Translation Draft</span>
                <Switch
                  checked={showOnlyTranslated}
                  onChange={setShowOnlyTranslated}
                  checkedChildren="Only Translated"
                  unCheckedChildren="All"
                />
              </Space>
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
                      {t.verse_translated_text || "[Untranslated]"}
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
