import React, { useState, useMemo, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Input,
  Popconfirm,
  Modal,
  Form,
  Select,
  Tag,
  Divider,
  App,
  Spin,
} from "antd";
import {
  FileTextOutlined,
  CalendarOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  CloseOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

/* ---------------- API helpers ---------------- */
const fetchSources = async () => {
  const res = await api.get("/sources/");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};
const fetchLanguages = async () => {
  const res = await api.get("/languages/");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};
const fetchVersions = async () => {
  const res = await api.get("/versions/");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};
const createSource = async (values) => api.post("/sources/", values);
const createVersion = async (values) => api.post("/versions/", values);
const deleteSource = async (id) => {
  await api.delete(`/sources/${id}`);
  return id;
};
const updateSource = async ({ source_id, values }) =>
  api.put(`/sources/${source_id}`, values);

/* ---------------- Floating Upload Summary ---------------- */
function UploadProgressModal({ visible, uploading = [], uploaded = [], skipped = [], total = 0, onClose }) {
  if (!visible) return null;

  const isComplete = uploaded.length + skipped.length === total;

  return (
    <Modal
      open={visible}
      title="Book upload status"
      footer={null}
      closable={isComplete}
      onCancel={isComplete ? onClose : undefined}
      maskClosable={false}
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
          <Text type="secondary">⚠️ Skipped (already exists) ({skipped.length}):</Text>
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
function SuccessToast({ visible, onClose, messageText }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        top: 100,
        zIndex: 9999,
        maxWidth: 300,
      }}
    >
      <Card
        size="small"
        title="✅ Success"
        extra={
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        }
        style={{
          borderRadius: 12,
          boxShadow: "0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
        }}
      >
        <p>{messageText}</p>
        <div style={{ textAlign: "right" }}>
          <Button type="primary" size="small" onClick={onClose}>
            OK
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function SourcesListPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [activeSource, setActiveSource] = useState(null);

  // Upload summary toast state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState({ uploaded: [], skipped: [] });

  // Forms
  const [form] = Form.useForm();
  const [versionForm] = Form.useForm();

  // Hidden input for QUICK upload (card icon)
  const hiddenQuickInputRef = useRef(null);
  const quickSourceIdRef = useRef(null);
  const { message } = App.useApp();

const [uploadProgressOpen, setUploadProgressOpen] = useState(false);
const [uploadingBooks, setUploadingBooks] = useState([]);
const [uploadedBooks, setUploadedBooks] = useState([]);
const [skippedBooks, setSkippedBooks] = useState([]);
const [totalBooks, setTotalBooks] = useState(0);

  /* --------- Queries --------- */
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
    onError: () => message.error("Failed to fetch sources"),
  });
  const { data: languages = [] } = useQuery({
    queryKey: ["languages"],
    queryFn: fetchLanguages,
  });
  const { data: versions = [] } = useQuery({
    queryKey: ["versions"],
    queryFn: fetchVersions,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editSource, setEditSource] = useState(null);
  const [editSuccessOpen, setEditSuccessOpen] = useState(false);
  const [createSuccessOpen, setCreateSuccessOpen] = useState(false);

  /* --------- Mutations --------- */
  const createSourceMutation = useMutation({
    mutationFn: createSource,
    onSuccess: () => {
      queryClient.invalidateQueries(["sources"]);
      setIsModalOpen(false);
      form.resetFields();
      setCreateSuccessOpen(true); // ✅ show popup
    },
    onError: () => {
      message.error(" Failed to create, source already exists");
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: createVersion,
    onSuccess: (res) => {
      message.success(" Version created successfully!");
      queryClient.invalidateQueries(["versions"]);
      const newId = res.data?.data?.version_id;
      if (newId) form.setFieldsValue({ version_id: newId });
      setIsVersionModalOpen(false);
      versionForm.resetFields();
    },
    onError: (err) => {
      if (err.response?.status === 409 && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (detail.toLowerCase().includes("abbreviation")) {
          versionForm.setFields([{ name: "version_abbr", errors: [detail] }]);
        } else if (detail.toLowerCase().includes("name")) {
          versionForm.setFields([{ name: "version_name", errors: [detail] }]);
        }
      } else {
        versionForm.setFields([
          {
            name: "version_name",
            errors: ["Unexpected error creating version"],
          },
        ]);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      message.success("Source deleted successfully!");
      queryClient.invalidateQueries(["sources"]);
    },
    onError: () => message.error("Failed to delete source"),
  });
  const updateSourceMutation = useMutation({
    mutationFn: updateSource,
    onSuccess: () => {
      queryClient.invalidateQueries(["sources"]);
      setIsEditModalOpen(false);
      editForm.resetFields();
      setEditSuccessOpen(true); // show popup
    },

    onError: () => message.error(" Failed to update source"),
  });

  /* --------- Upload utils --------- */
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

  const showUploadSummary = (uploaded = [], skipped = []) => {
    setSummaryData({ uploaded, skipped });
    setSummaryOpen(true);
  };

  const uploadBooksForSource = async (sourceId, files) => {
    if (!sourceId || !files?.length) return { uploaded: [], skipped: [] };
  
    const existing = await getExistingBooks(sourceId);
    const existingCodes = new Set((existing || []).map((b) => b.book_code));
    const uploaded = [];
    const skipped = [];
  
    // Initialize modal tracking
    setTotalBooks(files.length);
    setUploadingBooks([]);   // start empty
    setUploadedBooks([]);
    setSkippedBooks([]);
    setUploadProgressOpen(true);
  
    for (const file of files) {
      const code = await guessUSFMCode(file);
  
      // Mark as uploading (by code)
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
        // Remove from uploading
        setUploadingBooks((prev) => prev.filter((c) => c !== code));
      }
    }
  
    return { uploaded, skipped };
  };

  /* --------- Quick Upload (icon on card) --------- */
  const openQuickPickerForSource = (source) => {
    quickSourceIdRef.current = source?.source_id || null;
    if (hiddenQuickInputRef.current) {
      hiddenQuickInputRef.current.value = "";
      hiddenQuickInputRef.current.click();
    }
  };

  const onQuickFilesChosen = async (e) => {
    const sourceId = quickSourceIdRef.current;
    const files = Array.from(e.target.files || []);
    if (!sourceId || !files.length) return;
  
    await uploadBooksForSource(sourceId, files);
    queryClient.invalidateQueries(["books", sourceId]);
    
    // Remove the old showUploadSummary call
    // showUploadSummary(uploaded, skipped); // DELETE THIS LINE
  };

  /* --------- Filtered list --------- */
  const filteredSources = useMemo(() => {
    if (!searchTerm) return sources;
    const q = searchTerm.toLowerCase();
    return (sources || []).filter(
      (src) =>
        (src.version_name || "").toLowerCase().includes(q) ||
        (src.language_name || "").toLowerCase().includes(q)
    );
  }, [sources, searchTerm]);

  /* ---------------- Render ---------------- */
  return (
    <div style={{ padding: 24 }}>
      {/* Floating upload summary */}
      <UploadProgressModal
  visible={uploadProgressOpen}
  uploading={uploadingBooks}
  uploaded={uploadedBooks}
  skipped={skippedBooks}
  total={totalBooks}
  onClose={() => setUploadProgressOpen(false)}
/>
      <SuccessToast
        visible={editSuccessOpen}
        onClose={() => setEditSuccessOpen(false)}
        messageText="Source updated successfully."
      />

      <SuccessToast
        visible={createSuccessOpen}
        onClose={() => setCreateSuccessOpen(false)}
        messageText="Source created successfully."
      />

      <Title level={2}>Translation Sources</Title>
      <Text type="secondary">Manage your source content and versions</Text>

      {/* Hidden input for QUICK upload */}
      <input
        type="file"
        ref={hiddenQuickInputRef}
        style={{ display: "none" }}
        multiple
        accept=".usfm"
        onChange={onQuickFilesChosen}
      />

      {/* Top Bar */}
      <div
        style={{
          margin: "20px 0",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Search
          placeholder="Search sources..."
          style={{ width: 400 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          + Add Source
        </Button>
      </div>

      {/* Cards */}
      <Row gutter={[24, 24]}>
        {filteredSources.map((source) => (
          <Col xs={24} md={12} lg={8} key={source.source_id}>
            <Card
              hoverable
              loading={isLoading}
              style={{ borderRadius: 8 }}
              onClick={() => {
                setActiveSource(source);
                setIsBookModalOpen(true);
              }}
            >
              <Space align="start" size="middle" style={{ width: "100%" }}>
                <div
                  style={{
                    backgroundColor: "#f0f5ff",
                    borderRadius: 8,
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileTextOutlined
                    style={{ fontSize: 20, color: "#1890ff" }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16 }}>
                    {source.language_name}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {source.version_name}
                    </Text>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: 6,
                    }}
                  >
                    <CalendarOutlined
                      style={{ marginRight: 6, color: "#999" }}
                    />
                    <Text type="secondary">
                      Created on{" "}
                      {new Date(source.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              </Space>

              {/* Action icons aligned at bottom-right */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 12,
                  gap: 16,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <UploadOutlined
                  style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }}
                  title="Quick Upload"
                  onClick={() => openQuickPickerForSource(source)}
                />
                <EditOutlined
                  style={{ fontSize: 18, color: "#555", cursor: "pointer" }}
                  title="Edit Source"
                  onClick={() => {
                    setEditSource(source);
                    editForm.setFieldsValue({
                      version_name: source.version_name,
                      version_abbreviation: source.version_abbreviation,
                      language_id: source.language_id,
                      description: source.description,
                    });
                    setIsEditModalOpen(true);
                  }}
                />

                <Popconfirm
                  title="Delete this source?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => deleteMutation.mutate(source.source_id)}
                >
                  <DeleteOutlined
                    style={{ fontSize: 18, color: "red", cursor: "pointer" }}
                    title="Delete Source"
                  />
                </Popconfirm>
              </div>
            </Card>
          </Col>
        ))}
        {!isLoading && filteredSources.length === 0 && (
          <Col span={24} style={{ textAlign: "center", marginTop: 40 }}>
            <Text type="secondary">No sources found matching your search.</Text>
          </Col>
        )}
      </Row>

      {/* Create Source Modal */}
      <Modal
        title="Create New Source"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createSourceMutation.mutate(values)}
        >
          <Form.Item
            label="Language"
            name="language_id"
            rules={[{ required: true, message: "Please select a language" }]}
          >
            <Select
              placeholder="Select a language"
              showSearch
              optionFilterProp="children"
            >
              {languages.map((lang) => (
                <Option key={lang.language_id} value={lang.language_id}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <Space>
                Version
                <PlusCircleOutlined
                  style={{ color: "#1890ff", cursor: "pointer" }}
                  onClick={() => setIsVersionModalOpen(true)}
                />
              </Space>
            }
            name="version_id"
            rules={[{ required: true, message: "Please select a version" }]}
          >
            <Select
              placeholder="Select a version"
              showSearch
              optionFilterProp="children"
            >
              {versions.map((ver) => (
                <Option key={ver.version_id} value={ver.version_id}>
                  {ver.version_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Optional" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={createSourceMutation.isLoading}
            block
          >
            Create Source
          </Button>
        </Form>
      </Modal>

      {/* Create Version Modal */}
      <Modal
        title="Add New Version"
        open={isVersionModalOpen}
        onCancel={() => setIsVersionModalOpen(false)}
        footer={null}
      >
        <Form
          form={versionForm}
          layout="vertical"
          onFinish={createVersionMutation.mutate}
        >
          <Form.Item
            label="Version Name"
            name="version_name"
            rules={[{ required: true, message: "Please enter version name" }]}
          >
            <Input placeholder="Enter version name" />
          </Form.Item>
          <Form.Item
            label="Abbreviation"
            name="version_abbr"
            rules={[{ required: true, message: "Please enter abbreviation" }]}
          >
            <Input placeholder="Enter abbreviation" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createVersionMutation.isLoading}
            block
          >
            Create Version
          </Button>
        </Form>
      </Modal>
      {/* Edit Source Modal */}
      <Modal
        title="Edit Source"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) =>
            updateSourceMutation.mutate({
              source_id: editSource.source_id,
              values,
            })
          }
        >
          <Form.Item label="Language" name="language_id">
            <Select
              placeholder="Select a language"
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {languages.map((lang) => (
                <Option key={lang.language_id} value={lang.language_id}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Removed Version Select field */}

          <Form.Item label="Version Name" name="version_name">
            <Input placeholder="(leave blank if unchanged)" />
          </Form.Item>

          <Form.Item label="Abbreviation" name="version_abbreviation">
            <Input placeholder="(leave blank if unchanged)" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="(leave blank if unchanged)" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={updateSourceMutation.isLoading}
            block
          >
            Update Source
          </Button>
        </Form>
      </Modal>

      {/* Book Modal */}
      <Modal
        title={`Manage Books for ${activeSource?.version_name || ""}`}
        open={isBookModalOpen}
        onCancel={() => setIsBookModalOpen(false)}
        footer={null}
        width={820}
      >
        {activeSource && (
          <BookGrid
            sourceId={activeSource.source_id}
            uploadBooksForSource={uploadBooksForSource}
            showUploadSummary={showUploadSummary}
          />
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Book Grid ---------------- */
function BookGrid({ sourceId, uploadBooksForSource, showUploadSummary }) {
  const queryClient = useQueryClient();
  const hiddenInputRef = useRef(null);
  const { message } = App.useApp();

  const { data: books = [] } = useQuery({
    queryKey: ["books", sourceId],
    queryFn: async () => {
      try {
        const res = await api.get(`/books/by_source/${sourceId}`);
        return Array.isArray(res.data?.data) ? res.data.data : res.data || [];
      } catch (err) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    enabled: !!sourceId,
  });

  const uploadedMap = new Map((books || []).map((b) => [b.book_code, b]));

  const handleDeleteBook = async (book) => {
    try {
      await api.delete(`/books/${book.book_id}`);
      message.success(`book with book code ${book.book_code} deleted successfully`);
      queryClient.invalidateQueries(["books", sourceId]);
    } catch {
      message.error(" Failed to delete book");
    }
  };

  const onModalFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const { uploaded, skipped } = await uploadBooksForSource(sourceId, files);
    queryClient.invalidateQueries(["books", sourceId]);
    showUploadSummary(uploaded, skipped);

    e.target.value = "";
  };

  const OT = [
    "GEN",
    "EXO",
    "LEV",
    "NUM",
    "DEU",
    "JOS",
    "JDG",
    "RUT",
    "1SA",
    "2SA",
    "1KI",
    "2KI",
    "1CH",
    "2CH",
    "EZR",
    "NEH",
    "EST",
    "JOB",
    "PSA",
    "PRO",
    "ECC",
    "SNG",
    "ISA",
    "JER",
    "LAM",
    "EZK",
    "DAN",
    "HOS",
    "JOL",
    "AMO",
    "OBA",
    "JON",
    "MIC",
    "NAM",
    "HAB",
    "ZEP",
    "HAG",
    "ZEC",
    "MAL",
  ];
  const NT = [
    "MAT",
    "MRK",
    "LUK",
    "JHN",
    "ACT",
    "ROM",
    "1CO",
    "2CO",
    "GAL",
    "EPH",
    "PHP",
    "COL",
    "1TH",
    "2TH",
    "1TI",
    "2TI",
    "TIT",
    "PHM",
    "HEB",
    "JAS",
    "1PE",
    "2PE",
    "1JN",
    "2JN",
    "3JN",
    "JUD",
    "REV",
  ];

  const renderGroup = (label, list) => (
    <>
      <Title level={4}>{label}</Title>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(11,1fr)",
          gap: 6,
        }}
      >
        {list.map((code) => {
          const uploaded = uploadedMap.has(code);
          const book = uploadedMap.get(code);
          return (
            <Popconfirm
              key={code}
              title={`Delete ${code}?`}
              onConfirm={() => uploaded && handleDeleteBook(book)}
              disabled={!uploaded}
            >
              <Button
                size="small"
                style={{
                  backgroundColor: uploaded ? "lightgreen" : "#ffcccc",
                  border: "1px solid #ccc",
                }}
              >
                {code}
              </Button>
            </Popconfirm>
          );
        })}
      </div>
    </>
  );

  return (
    <div>
      {renderGroup("Old Testament", OT)}
      {renderGroup("New Testament", NT)}

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <input
          type="file"
          ref={hiddenInputRef}
          style={{ display: "none" }}
          multiple
          accept=".usfm"
          onChange={onModalFilesChosen}
        />
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => hiddenInputRef.current?.click()}
        >
          Upload Books
        </Button>
      </div>
    </div>
  );
}
