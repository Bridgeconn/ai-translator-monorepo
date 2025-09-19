import React, { useEffect, useState } from 'react';
import {
  Typography,
  Row,
  Col,
  Card,
  Button,
  message,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import api from './api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [sources, setSources] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch all projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects/');
      setProjects(res.data.data);
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sources + languages for dropdowns
  const fetchSourcesAndLanguages = async () => {
    try {
      const [srcRes, langRes] = await Promise.all([
        api.get('/sources/'),
        api.get('/languages/'),
      ]);
      setSources(srcRes.data.data);
      setLanguages(langRes.data.data);
    } catch (err) {
      message.error("Failed to load sources/languages");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Open modal and load dropdown data
  const handleOpenModal = () => {
    fetchSourcesAndLanguages();
    setIsModalOpen(true);
  };

  // Create project
  const handleCreateProject = async (values) => {
    try {
      const res = await api.post('/projects/', values);
      message.success(res.data.message || 'Project created successfully');
      setIsModalOpen(false);
      form.resetFields();
      fetchProjects();
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.detail || 'Failed to create project');
    }
  };

  // Update project name (simplified)
  const handleUpdateProject = async (projectId, values) => {
    try {
      const res = await api.put(`/projects/${projectId}`, values);
      message.success(res.data.message || 'Project updated successfully');
      fetchProjects();
    } catch (error) {
      console.error(error);
      message.error('Failed to update project');
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    try {
      const res = await api.delete(`/projects/${projectId}`);
      message.success(res.data.message || 'Project deleted successfully');
      fetchProjects();
    } catch (error) {
      console.error(error);
      message.error('Failed to delete project');
    }
  };

  // Open translation page for this project
  const handleOpenProject = (projectId) => {
    navigate(`/projects/${projectId}/translate`);
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Projects</Title>
        <Button
          type="primary"
          style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
          onClick={handleOpenModal}
        >
          + New Project
        </Button>
      </Row>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col key={project.project_id} xs={24} md={12} lg={8}>
              <Card
                title={project.name}
                bordered
                style={{ borderRadius: '8px' }}
                actions={[
                  <Button
                    type="link"
                    onClick={() =>
                      handleUpdateProject(project.project_id, { name: project.name + ' (Updated)' })
                    }
                  >
                    Edit
                  </Button>,
                  <Popconfirm
                    title="Are you sure to delete this project?"
                    onConfirm={() => handleDeleteProject(project.project_id)}
                  >
                    <Button type="link" danger>
                      Delete
                    </Button>
                  </Popconfirm>,
                  <Button
                    type="link"
                    onClick={() => handleOpenProject(project.project_id)}
                  >
                    Open Translation
                  </Button>,
                ]}
              >
                <Text strong>Type: {project.translation_type}</Text>
                <br />
                <Text>Status: {project.status}</Text>
                <br />
                <Text type="secondary">
                  Progress: {project.completed_items}/{project.total_items}
                </Text>
              </Card>
            </Col>
          ))}

          {!loading && projects.length === 0 && (
            <Col span={24}>
              <Text type="secondary">No projects found. Create a new one!</Text>
            </Col>
          )}
        </Row>
      </Spin>

      {/* Create Project Modal */}
      <Modal
        title="Create Project"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProject}>
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter project name' }]}
          >
            <Input />
          </Form.Item>

          {/* Source dropdown */}
          <Form.Item
            name="source_id"
            label="Source"
            rules={[{ required: true, message: 'Please select a source' }]}
          >
            <Select placeholder="Select source">
              {sources.map((s) => (
                <Option key={s.source_id} value={s.source_id}>
                  {s.source_name || s.source_id}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/*  Target language dropdown */}
          <Form.Item
            name="target_language_id"
            label="Target Language"
            rules={[{ required: true, message: 'Please select target language' }]}
          >
            <Select placeholder="Select target language">
              {languages.map((l) => (
                <Option key={l.language_id} value={l.language_id}>
                  {l.language_name || l.language_id}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Translation type */}
          <Form.Item
            name="translation_type"
            label="Translation Type"
            rules={[{ required: true, message: 'Please select translation type' }]}
          >
            <Select>
              <Option value="verse">Verse</Option>
              <Option value="word">Word</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
            >
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
