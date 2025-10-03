import { useState } from "react";
import {
  Card,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tooltip,
} from "antd";
import {
  FolderAddOutlined,
  FileTextFilled,
  ThunderboltOutlined,
  PlusCircleOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import CreateProjectModal from "../components/CreateProject";
import LanguageSelect from "./LanguageSelect";

const { Text } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function QuickActions() {
  const [isProjectModalVisible, setIsProjectModalVisible] = useState(false);
  const [isSourceModalVisible, setIsSourceModalVisible] = useState(false);

  //  new: version modal state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  const [projectForm] = Form.useForm();
  const [sourceForm] = Form.useForm();
  const [versionForm] = Form.useForm(); //  new form for version

  const queryClient = useQueryClient();

  //  AntD v5 message hook
  const [msgApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState(""); // for Search bar


  /* -------- Queries -------- */
  const { data: languages = [] } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const res = await api.get("/languages/");
      return res.data.data || res.data;
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["versions"],
    queryFn: async () => {
      const res = await api.get("/versions/");
      return res.data.data || res.data;
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const res = await api.get("/sources/");
      return res.data.data || res.data;
    },
  });

  /* -------- Mutations -------- */
  const createSourceMutation = useMutation({
    mutationFn: (values) => api.post("/sources/", values),
    onSuccess: () => {
      queryClient.invalidateQueries(["sources"]);
      setIsSourceModalVisible(false);
      sourceForm.resetFields();
      msgApi.success("Source created successfully!");
    },
    onError: (err) => {
      console.error("Source creation failed:", err.response.data.detail);
      msgApi.error(err.response.data.detail);
    },
  });

  //  new mutation for versions
  const createVersionMutation = useMutation({
    mutationFn: (values) => api.post("/versions/", values),
    onSuccess: () => {
      queryClient.invalidateQueries(["versions"]);
      setIsVersionModalOpen(false);
      versionForm.resetFields();
      msgApi.success("✅ Version created successfully!");
    },
    onError: (err) => {
      console.error("Version creation failed:", err);
      msgApi.error(" Version creation failed!");
    },
  });

  const handleCreateProject = async (values) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + "/projects/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.project_name,
          source_id: values.source_id,
          target_language_id: values.target_language_id,
          translation_type: values.translation_type,
          selected_books: values.selected_books || [],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create project");
      }

      await res.json();
      setIsProjectModalVisible(false);
      projectForm.resetFields();
      queryClient.invalidateQueries(["projects"]);
      msgApi.success("✅ Project created successfully!");
    } catch (err) {
      console.error("Project create failed:", err);
      msgApi.error(" Project already exist with same source and target language!");
    }
  };

  return (
    <Card
      title="Quick Actions"
      style={{
        width: "100%",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        border: "none",
      }}
      styles={{ body: { padding: 20 }, title: { fontSize: 18, fontWeight: 600 } }}
    >
      {/*  Message contextHolder */}
      {contextHolder}
      <Text
        style={{
          display: "block",
          marginBottom: 20,
          color: "#262626",
        }}
      >
        Begin by adding a source file and creating a project. You can use Quick Translate for instant translations.
      </Text>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* <Tooltip title="A Source is folder that contains Bible books that you want to translate.">
          <Button
            type="primary"
            icon={<FileTextFilled />}
            size="large"
            block
            style={{
              borderRadius: 8,
              backgroundColor: "#50C878",
              borderColor: "#50C878",
            }}
            onClick={() => setIsSourceModalVisible(true)}
          >
            Add New Source <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Button>
        </Tooltip> */}


        <Tooltip title="A Project is where you link a source folder and target language to start translation of Bible books.">
          <Button
            type="primary"
            icon={<FolderAddOutlined />}
            size="large"
            block
            style={{
              borderRadius: 8,
              backgroundColor: "#4A90E2",
              borderColor: "#4A90E2",
            }}
            onClick={() => setIsProjectModalVisible(true)}
          >
            Create Project <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Button>
        </Tooltip>


        <Button
          type="default"
          icon={<ThunderboltOutlined />}
          size="large"
          block
          style={{ borderRadius: 8 }}
          onClick={() => (window.location.href = "/quick-translation")}
        >
          Quick Translate
        </Button>
      </Space>

      {/* Project Modal */}
      <CreateProjectModal
        isVisible={isProjectModalVisible}
        onCancel={() => setIsProjectModalVisible(false)}
        onSubmit={handleCreateProject}
        form={projectForm}
        sources={sources}
        languages={languages}
        versions={versions}
      />

      {/* ✅ Source Modal */}
      <Modal
        title="Create New Source"
        open={isSourceModalVisible}
        onCancel={() => setIsSourceModalVisible(false)}
        footer={null}
      >
        <Form
          form={sourceForm}
          layout="vertical"
          onFinish={(values) => createSourceMutation.mutate(values)}
        >
          <Form.Item
            label="Language"
            name="language_id"
            rules={[{ required: true, message: "Please select a language" }]}
            style={{ width: "100%" }}
          >
            <div className="full-width-select">
              <LanguageSelect
                label=""
                onChange={(langObj) => {
                  sourceForm.setFieldsValue({ language_id: langObj.language_id });

                }}
              />
            </div>
          </Form.Item>


          <Form.Item
            label={
              <Space>
                Version
                <PlusCircleOutlined
                  style={{ color: "#1890ff", cursor: "pointer" }}
                  onClick={() => setIsVersionModalOpen(true)} // open modal
                />
              </Space>
            }
            name="version_id"
            rules={[{ required: true, message: "Please select a version" }]}
          >
            <Select placeholder="Select a version" showSearch>
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

      {/*  Version Modal */}
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
    </Card>
  );
}
