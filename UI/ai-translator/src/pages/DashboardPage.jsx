import React, { useState } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Spin,
  List,
  Tag,
  Modal,
} from "antd";
import QuickActions from "../components/QuickActions";
import { FileTextOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import api from "../components/api";
import { useNavigate } from "react-router-dom";

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ---------------- Modal State ----------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  /* ---------------- Queries ---------------- */
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || res.data;
    },
  });

  const { data: textDocProjects = [], isLoading: loadingTextDocs } = useQuery({
    queryKey: ["text-doc-projects"],
    queryFn: async () => {
      const res = await api.get("/api/project-text-documents/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || res.data;
    },
  });

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const res = await api.get("/sources/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || res.data; // don't strip fields here
    },
  });

  // In the dashboard, transform sources for display
  const sourcesForDashboard = sources.map((s) => ({
    id: s.source_id,
    name: `${s.language_name}`, // only language for dashboard
    type: "source",
    created_at: s.created_at,
  }));

  /* ---------------- Derived Data ---------------- */
  const normalProjects = projects.map((p) => ({
    id: p.project_id,
    name: p.name,
    type: "project",
    translation_type: p.translation_type || "normal",
    created_at: p.created_at,
  }));

  const textProjects = textDocProjects.map((p) => ({
    id: p.project_id,
    name: p.project_name,
    type: "project",
    translation_type: "text_document",
    created_at: p.created_at,
  }));

  const combinedProjects = [...normalProjects, ...textProjects];

  const loading = loadingProjects || loadingTextDocs || loadingSources;
  const totalProjects = combinedProjects.length;
  const totalSources = sources.length;

  // Combine recent activity: projects + sources (most recent first)
  const recentActivities = [...combinedProjects, ...sourcesForDashboard]
    .filter((item) => item.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  /* ---------------- Styles ---------------- */
  const cardStyle = {
    borderRadius: 16,
    textAlign: "center",
    padding: "26px 20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
    transition: "transform 0.18s, box-shadow 0.18s",
    cursor: "pointer",
    background: "#fff",
  };

  const iconStyle = (color) => ({
    fontSize: 40,
    background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.14) 100%)`,
    borderRadius: "50%",
    padding: 18,
    color: "#fff",
    marginBottom: 16,
    display: "inline-block",
  });

  const handleKeyNav = (path) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(path);
    }
  };

  const aboutContent = (
    <div
      style={{
        overflowY: "auto",
        scrollbarWidth: "none",
        maxHeight: "70vh",
        paddingRight: 8,
      }}
      className="hide-scroll"
    >
      <style>
        {`
          .hide-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <p style={{ marginBottom: 12 }}>
        <strong>AI MT</strong> empowers you to create precise, meaningful
        translations using advanced AI tools. It helps teams streamline their
        translation workflow while ensuring linguistic accuracy and consistency.
      </p>

      <p style={{ marginBottom: 12 }}>
        Designed for translators, linguists, and editors who rely on AI MT.
        It provides real-time translation assistance, smart text comparison,
        and efficient project tracking.
      </p>

      <div
        style={{
          borderTop: "1px solid #f0f0f0",
          margin: "16px 0",
        }}
      ></div>

      <div style={{ fontSize: 14, color: "rgba(0,0,0,0.65)" }}>
        <p style={{ marginBottom: 4 }}>
          <b>Current Version:</b> v1.0.0
        </p>
        <p style={{ marginBottom: 4 }}>
          <b>Release Date:</b> 24 Oct 2025
        </p>
        <p>
          <b>Status:</b> Stable Release 🚀
        </p>
      </div>
    </div>
  );

  return (
    <Content
      style={{
        padding: "24px",
        overflow: "hidden",
      }}
    >
      <Title level={2} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12}>
          <Card
            hoverable
            onClick={() => navigate("/projects")}
            onKeyDown={handleKeyNav("/projects")}
            role="button"
            tabIndex={0}
            aria-label="View projects"
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
          >
            <FolderOpenOutlined style={iconStyle("#1890ff")} />
            <Text
              strong
              style={{ fontSize: 20, display: "block", marginBottom: 8 }}
            >
              Projects
            </Text>
            {loading ? (
              <Spin size="large" />
            ) : (
              <Title level={2}>{totalProjects}</Title>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 16 }}>About Us</span>}
            onClick={openModal}
            hoverable
            styles={{
              body: {
                padding: "18px 22px",
                color: "#3b3b3b",
                lineHeight: 1.7,
                fontSize: 15,
                height: "100%",
                overflowY: "auto",
              },
            }}
            style={{
              borderRadius: 20,
              background: "linear-gradient(145deg, #ffffff, #f9fafc)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
              height: "100%",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                maxHeight: "170px",
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
              className="hide-scroll"
            >
              {aboutContent}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Actions + Recent Activity */}
      <Row gutter={[24, 24]}>
        {/* Quick Actions */}
        <Col xs={24} md={12}>
          <QuickActions />
        </Col>

        {/* Recent Activity */}
        <Col xs={24} md={12}>
          <Card
            title={<span style={{ fontWeight: 600 }}>🕑 Recent Activity</span>}
            style={{
              borderRadius: 20,
              background: "linear-gradient(145deg, #ffffff, #f9fafc)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
              height: "100%",
              overflow: "hidden",
            }}
            styles={{
              padding: "12px 20px",
              height: "calc(100% - 60px)",
              overflow: "auto",
            }}
          >
            <List
              itemLayout="horizontal"
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item
                  style={{
                    borderBottom: "1px dashed #eaeaea",
                    padding: "12px 0",
                    cursor: "default",
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      item.type === "project" ? (
                        <FolderOpenOutlined
                          style={{
                            fontSize: 20,
                            color: "#1890ff",
                            background: "#e6f4ff",
                            padding: 8,
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <FileTextOutlined
                          style={{
                            fontSize: 20,
                            color: "#52c41a",
                            background: "#f6ffed",
                            padding: 8,
                            borderRadius: "50%",
                          }}
                        />
                      )
                    }
                    title={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text strong style={{ fontSize: 15 }}>
                          {item.name}
                        </Text>
                        {item.type === "project" ? (
                          <Tag color="blue" style={{ borderRadius: 12 }}>
                            Project
                          </Tag>
                        ) : (
                          <Tag color="green" style={{ borderRadius: 12 }}>
                            Source
                          </Tag>
                        )}
                      </div>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "No timestamp available"}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* About Modal */}
      <Modal
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        centered
        width={600}
        title={<strong>About Us</strong>}
        bodyStyle={{
          maxHeight: "70vh",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
        className="about-modal"
      >
        {aboutContent}
      </Modal>

      <style>
        {`
          .about-modal .ant-modal-content {
            border-radius: 20px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          }
          .about-modal .ant-modal-body::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </Content>
  );
};

export default Dashboard;
