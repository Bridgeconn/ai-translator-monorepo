import React, { useState, useEffect } from "react";
import { Layout, Card, Row, Col, Typography, Spin } from "antd";
import QuickActions from "./QuickActions";
import { FileTextOutlined, FolderOpenOutlined } from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [projectsResponse, sourcesResponse] = await Promise.all([
        fetch(import.meta.env.VITE_BACKEND_URL + '/projects/'),
        fetch(import.meta.env.VITE_BACKEND_URL + '/sources/')
      ]);

      if (projectsResponse.ok && sourcesResponse.ok) {
        const projectsData = await projectsResponse.json();
        const sourcesData = await sourcesResponse.json();

        setProjects(Array.isArray(projectsData) ? projectsData : projectsData.data || []);
        setSources(Array.isArray(sourcesData) ? sourcesData : sourcesData.data || []);
      } else {
        setProjects([]);
        setSources([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setProjects([]);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalProjects = projects.length;
  const totalSources = sources.length;

  const cardStyle = {
    borderRadius: 16,
    textAlign: "center",
    padding: "30px 20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    transition: "transform 0.3s, box-shadow 0.3s",
    cursor: "pointer",
    background: "#fff"
  };

  const iconStyle = (color) => ({
    fontSize: 48,
    background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.2) 100%)`,
    borderRadius: "50%",
    padding: 20,
    color: "#fff",
    marginBottom: 16,
    display: "inline-block"
  });

  return (
    <Content style={{ padding: "24px 36px", minHeight: "100vh", background: "#f0f2f5" }}>
      <Title level={2} style={{ marginBottom: 24 }}>📊 Dashboard</Title>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12}>
          <Card
            hoverable
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-8px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <FolderOpenOutlined style={iconStyle("#1890ff")} />
            <Text strong style={{ fontSize: 20, display: "block", marginBottom: 8 }}>Projects</Text>
            {loading ? <Spin size="large" /> : <Title level={2}>{totalProjects}</Title>}
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card
            hoverable
            style={cardStyle}
            bodyStyle={{ padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-8px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <FileTextOutlined style={iconStyle("#52c41a")} />
            <Text strong style={{ fontSize: 20, display: "block", marginBottom: 8 }}>Sources</Text>
            {loading ? <Spin size="large" /> : <Title level={2}>{totalSources}</Title>}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <QuickActions/>
      </Row>
    </Content>
  );
};

export default Dashboard;
