import React, { useState, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  message,
  Popconfirm,
  Modal,
  Form,
  Select,
  Upload,
  Table,
} from "antd";
import {
  FileTextOutlined,
  GlobalOutlined,
  CalendarOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// --------- API Calls ----------
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

const createSource = async (values) => {
  return api.post("/sources/", values);
};

const createVersion = async (values) => {
  return api.post("/versions/", values);
};

const deleteSource = async (id) => {
  await api.delete(`/sources/${id}`);
  return id;
};

// --------- Main Component ----------
const SourcesListPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [activeSource, setActiveSource] = useState(null);

  const [form] = Form.useForm();
  const [versionForm] = Form.useForm();
  const [bookForm] = Form.useForm();

  // Queries
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

  // --------- Mutations ----------
  const createSourceMutation = useMutation({
    mutationFn: createSource,
    onSuccess: () => {
      message.success("✅ Source created successfully!");
      queryClient.invalidateQueries(["sources"]);
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 400 && detail) {
        // attach error to both language + version fields
        form.setFields([
          { name: "language_id", errors: [detail] },
          { name: "version_id", errors: [detail] },
        ]);
      } else {
        message.error("❌ Failed to create source");
      }
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: createVersion,
    onSuccess: (res) => {
      message.success("✅ Version created successfully!");
      queryClient.invalidateQueries(["versions"]);

      // set newly created version into the source form
      const newId = res.data.data.version_id;
      form.setFieldsValue({ version_id: newId });

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
          { name: "version_name", errors: ["Unexpected error creating version"] },
        ]);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      message.success("✅ Source deleted successfully!");
      queryClient.invalidateQueries(["sources"]);
    },
    onError: () => {
      message.error("Failed to delete source");
    },
  });

  // --------- Filter Sources ----------
  const filteredSources = useMemo(() => {
    if (!searchTerm) return sources;
    return sources.filter(
      (src) =>
        src.version_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        src.language_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sources, searchTerm]);

  // --------- Render ----------
  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Translation Sources</Title>
      <Text type="secondary">Manage your source content and versions</Text>

      {/* Top Bar */}
      <div style={{ margin: "20px 0", display: "flex", justifyContent: "space-between" }}>
        <Search
          placeholder="Search sources by name or language..."
          style={{ width: 400 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          + Add Source
        </Button>
      </div>

      {/* Card Grid */}
      <Row gutter={[24, 24]}>
        {filteredSources.map((source) => (
          <Col xs={24} md={12} lg={8} key={source.source_id}>
            <Card
  loading={isLoading}
  style={{ borderRadius: 8 }}
  styles={{ padding: "16px" }}
  actions={[
    <UploadOutlined
      key="upload"
      onClick={() => {
        setActiveSource(source);
        setIsBookModalOpen(true);
      }}
    />,
    <Popconfirm
      key="delete"
      title="Are you sure you want to delete this source?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteMutation.mutate(source.source_id)}
    >
      <DeleteOutlined style={{ color: "red" }} />
    </Popconfirm>,
  ]}
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
      <FileTextOutlined style={{ fontSize: 20, color: "#1890ff" }} />
    </div>

    {/* Content */}
    <div style={{ flex: 1 }}>
      {/* Language first */}
      <Text strong style={{ fontSize: 16 }}>
        {source.language_name}
      </Text>

      {/* Version below, muted */}
      <div style={{ marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {source.version_name}
        </Text>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
        <CalendarOutlined style={{ marginRight: 6, color: "#999" }} />
        <Text type="secondary">
          Created on {new Date(source.created_at).toLocaleDateString()}
        </Text>
      </div>
    </div>
  </Space>
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
      <Modal title="Create New Source" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
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
              placeholder="Search or select a language"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
              }
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
              placeholder="Search or select a version"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
              }
            >
              {versions.map((ver) => (
                <Option key={ver.version_id} value={ver.version_id}>
                  {ver.version_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Enter description (optional)" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createSourceMutation.isLoading}
              block
            >
              Create Source
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Version Modal */}
      <Modal title="Add New Version" open={isVersionModalOpen} onCancel={() => setIsVersionModalOpen(false)} footer={null}>
        <Form form={versionForm} layout="vertical" onFinish={createVersionMutation.mutate}>
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
            <Input placeholder="Enter abbreviation (short name)" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createVersionMutation.isLoading}
              block
            >
              Create Version
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Upload Books Modal */}
      <Modal
        title={`Manage Books for ${activeSource?.version_name || ""}`}
        open={isBookModalOpen}
        onCancel={() => setIsBookModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form
          form={bookForm}
          layout="vertical"
          onFinish={(values) => {
            const formData = new FormData();
            formData.append("file", values.file[0].originFileObj);
            api
              .post(`/books/upload_books/?source_id=${activeSource.source_id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              })
              .then(() => {
                message.success("✅ Book uploaded successfully!");
                queryClient.invalidateQueries(["books", activeSource.source_id]);
                bookForm.resetFields();
              })
              .catch((err) => {
                const detail = err.response?.data?.detail;
                if (detail) {
                  bookForm.setFields([{ name: "file", errors: [detail] }]);
                } else {
                  message.error("❌ Upload failed");
                }
              });
          }}
        >
          <Form.Item
            label="Upload USFM Book"
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e && e.fileList)}
            rules={[{ required: true, message: "Please select a USFM file" }]}
          >
            <Upload.Dragger maxCount={1} beforeUpload={() => false}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p>Click or drag USFM file to this area</p>
            </Upload.Dragger>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Upload Book
          </Button>
        </Form>

        {/* Book List */}
        <BooksList sourceId={activeSource?.source_id} />
      </Modal>
    </div>
  );
};

// --------- BooksList ----------
function BooksList({ sourceId }) {
  const queryClient = useQueryClient();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", sourceId],
    queryFn: async () => {
      try {
        const res = await api.get(`/books/by_source/${sourceId}`);
        return Array.isArray(res.data.data) ? res.data.data : res.data;
      } catch (err) {
        if (err.response?.status === 404) return [];
        throw err;
      }
    },
    enabled: !!sourceId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookId) => {
      await api.delete(`/books/${bookId}`);
    },
    onSuccess: () => {
      message.success("✅ Book deleted");
      queryClient.invalidateQueries(["books", sourceId]);
    },
    onError: () => {
      message.error("❌ Failed to delete book");
    },
  });

  return (
    <Table
      loading={isLoading}
      rowKey="book_id"
      columns={[
        { title: "Book Name", dataIndex: "book_name" },
        { title: "Book Code", dataIndex: "book_code" },
        { title: "Testament", dataIndex: "testament" },
        {
          title: "Actions",
          render: (book) => (
            <Popconfirm
              title="Delete this book?"
              onConfirm={() => deleteMutation.mutate(book.book_id)}
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ),
        },
      ]}
      dataSource={books}
      style={{ marginTop: 24 }}
    />
  );
}

export default SourcesListPage;
