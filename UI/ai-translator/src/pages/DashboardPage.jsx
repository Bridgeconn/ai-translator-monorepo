import React from "react";
import { Layout, Card, Row, Col, Typography, Spin, List, Tag } from "antd";
import QuickActions from "../components/QuickActions";
import { FileTextOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import api from "../components/api";

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const token = localStorage.getItem("token");

  /* ---------------- Queries ---------------- */
  const {
    data: projects = [],
    isLoading: loadingProjects,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || res.data;
    },
  });

  const {
    data: textDocProjects = [],
    isLoading: loadingTextDocs,
  } = useQuery({
    queryKey: ["text-doc-projects"],
    queryFn: async () => {
      const res = await api.get("/text-doc-projects/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || res.data;
    },
  });

  const {
    data: sources = [],
    isLoading: loadingSources,
  } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const res = await api.get("/sources/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const srcs = res.data.data || res.data;
      return srcs.map((s) => ({
        id: s.source_id,
        name: s.language_name + " " + s.version_name,
        type: "source",
        created_at: s.created_at,
      }));
    },
  });

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

  // ✅ Combine recent activity: projects + sources
  const recentActivities = [...combinedProjects, ...sources]
    .filter((item) => item.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  /* ---------------- Styles ---------------- */
  const cardStyle = {
    borderRadius: 16,
    textAlign: "center",
    padding: "30px 20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    transition: "transform 0.3s, box-shadow 0.3s",
    cursor: "pointer",
    background: "#fff",
  };

  const iconStyle = (color) => ({
    fontSize: 48,
    background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.2) 100%)`,
    borderRadius: "50%",
    padding: 20,
    color: "#fff",
    marginBottom: 16,
    display: "inline-block",
  });

  /* ---------------- Render ---------------- */
  return (
    <Content
      style={{
        padding: "24px 36px",
        minHeight: "calc(100vh - 64px)",
        background: "#f0f2f5",
        overflow: "hidden",
      }}
    >
      <Title level={2} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12}>
          <Card hoverable style={cardStyle} styles={{ body: { padding: 0 } }}>
            <FolderOpenOutlined style={iconStyle("#1890ff")} />
            <Text strong style={{ fontSize: 20, display: "block", marginBottom: 8 }}>
              Projects
            </Text>
            {loading ? <Spin size="large" /> : <Title level={2}>{totalProjects}</Title>}
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card hoverable style={cardStyle} styles={{ body: { padding: 0 } }}>
            <FileTextOutlined style={iconStyle("#52c41a")} />
            <Text strong style={{ fontSize: 20, display: "block", marginBottom: 8 }}>
              Sources
            </Text>
            {loading ? <Spin size="large" /> : <Title level={2}>{totalSources}</Title>}
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
            variant="outlined"
            style={{
              borderRadius: 20,
              background: "linear-gradient(145deg, #ffffff, #f9fafc)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              height: "100%",
              overflow: "hidden",
            }}
            styles={{
              body: {
                padding: "16px 20px",
                height: "calc(100% - 60px)",
                overflow: "hidden",
              },
            }}
          >
            <List
              itemLayout="horizontal"
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item
                  style={{
                    borderBottom: "1px dashed #eaeaea",
                    padding: "14px 0",
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Text strong style={{ fontSize: 16 }}>{item.name}</Text>
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
    </Content>
  );
};

export default Dashboard;
