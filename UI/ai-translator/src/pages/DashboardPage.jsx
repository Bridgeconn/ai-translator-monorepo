import React, { useState, useEffect } from "react";
import { Layout, Card, Row, Col, Typography, Spin } from "antd";
import QuickActions from "../components/QuickActions";
import {
  FileTextOutlined,
  FolderOpenOutlined
} from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch all projects and sources
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Replace these API calls with your actual endpoints
      const [projectsResponse, sourcesResponse] = await Promise.all([
        fetch(import.meta.env.VITE_BACKEND_URL + '/projects/'),  // Replace with your get all projects endpoint
        fetch(import.meta.env.VITE_BACKEND_URL + '/sources/')    // Replace with your get all sources endpoint
      ]);

      if (projectsResponse.ok && sourcesResponse.ok) {
        const projectsData = await projectsResponse.json();
        const sourcesData = await sourcesResponse.json();
        
        // Handle different response structures
        setProjects(Array.isArray(projectsData) ? projectsData : projectsData.data || []);
        setSources(Array.isArray(sourcesData) ? sourcesData : sourcesData.data || []);
      } else {
        console.error('Failed to fetch dashboard data');
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

  // Fetch data when component mounts
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate counts from the fetched data
  const totalProjects = projects.length;
  const totalSources = sources.length;

  return (
    <Content style={{ padding: 24 }}>
      <Title level={2}>Dashboard</Title>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12}>
          <Card hoverable style={{ borderRadius: 12 }}>
            <FolderOpenOutlined
              style={{ fontSize: 32, color: "#1890ff", marginBottom: 12 }}
            />
            <Text strong style={{ fontSize: "20px" }}>  Projects</Text>
            {loading ? (
              <Spin size="small" style={{ marginLeft: 8 }} />
            ) : (
              <Title level={3}>{totalProjects}</Title>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card hoverable style={{ borderRadius: 12 }}>
            <FileTextOutlined
              style={{ fontSize: 32, color: "#52c41a", marginBottom: 12 }}
            />
            <Text strong style={{ fontSize: "20px" }}> Sources</Text>
            {loading ? (
              <Spin size="small" style={{ marginLeft: 8 }} />
            ) : (
              <Title level={3}>{totalSources}</Title>
            )}
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