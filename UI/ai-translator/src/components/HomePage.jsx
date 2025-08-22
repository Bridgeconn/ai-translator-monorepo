import React from "react";
import { 
  Typography, 
  Button, 
  Space, 
  Row, 
  Col, 
  Card, 
  Divider,
  Flex
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  TranslationOutlined,
  RocketOutlined,
  EditOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  UserAddOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <TranslationOutlined />,
      title: "Smart Translation",
      description: "AI-powered translation that understands context and nuance"
    },
    {
      icon: <EditOutlined />,
      title: "Draft Editing", 
      description: "Refine and perfect your translations with built-in editing tools"
    },
    {
      icon: <ThunderboltOutlined />,
      title: "Instant Results",
      description: "Get your zero drafts generated in seconds, not minutes"
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
        position: "relative"
      }}
    >
      {/* Hero Section */}
      <Flex vertical align="center" style={{ paddingTop: "80px", paddingBottom: "60px" }}>
        
        {/* Logo and Brand */}
        <Space direction="vertical" align="center" size="large" style={{ marginBottom: "48px" }}>
          <div
            style={{
              width: "80px",
              height: "80px", 
              backgroundColor: "#722ed1",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(114, 46, 209, 0.4)",
            }}
          >
            <Text 
              style={{ 
                color: "white", 
                fontSize: "32px", 
                fontWeight: "bold",
                margin: 0 
              }}
            >
              文A
            </Text>
          </div>
          
          <Title 
            level={1} 
            style={{ 
              color: "white", 
              textAlign: "center",
              fontSize: "3.5rem",
              fontWeight: "700",
              margin: 0
            }}
          >
            Zero Draft Generator
          </Title>
        </Space>

        {/* Description */}
        <Paragraph
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: "1.25rem",
            textAlign: "center",
            maxWidth: "600px",
            marginBottom: "60px"
          }}
        >
          Transform your text into perfect translations instantly. Our AI-powered 
          platform makes draft generation effortless, accurate, and lightning-fast.
        </Paragraph>

        {/* Features */}
        <Row gutter={[32, 32]} style={{ maxWidth: "1000px", marginBottom: "80px" }}>
          {features.map((feature, index) => (
            <Col xs={24} md={8} key={index}>
              <Card
                hoverable
                style={{
                  height: "240px",
                  borderRadius: "16px",
                  border: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
                }}
                bodyStyle={{ 
                  height: "100%", 
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "32px 24px"
                }}
              >
                <Space direction="vertical" align="center" size="middle">
                  <div style={{ fontSize: "48px", color: "#722ed1" }}>
                    {feature.icon}
                  </div>
                  <Title level={4} style={{ margin: 0, color: "#1f2937" }}>
                    {feature.title}
                  </Title>
                  <Paragraph style={{ margin: 0, color: "#6b7280" }}>
                    {feature.description}
                  </Paragraph>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Flex>

      {/* CTA Section */}
      <Flex justify="center" style={{ paddingBottom: "80px" }}>
        <Card
          style={{
            width: "100%",
            maxWidth: "500px",
            borderRadius: "24px",
            border: "none", 
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            boxShadow: "0 20px 64px rgba(0,0,0,0.15)"
          }}
          bodyStyle={{ padding: "48px 32px" }}
        >
          <Space direction="vertical" align="center" size="large" style={{ width: "100%" }}>
            
            {/* Header */}
            <Space direction="vertical" align="center" size="middle">
              <RocketOutlined style={{ fontSize: "64px", color: "#722ed1" }} />
              <Title level={2} style={{ margin: 0, textAlign: "center", color: "#1f2937" }}>
                Ready to Get Started?
              </Title>
              <Paragraph 
                style={{ 
                  textAlign: "center", 
                  color: "#6b7280",
                  fontSize: "16px",
                  margin: 0
                }}
              >
                Join thousands of users who trust Zero Draft Generator 
                for their translation needs. Sign in to unlock the full power 
                of AI-driven draft generation.
              </Paragraph>
            </Space>

            <Divider />

            {/* Actions */}
            <Space direction="vertical" align="center" size="large">
              <Button
                type="primary"
                size="large"
                icon={<GlobalOutlined />}
                onClick={() => navigate("/login")}
                style={{
                  height: "56px",
                  fontSize: "16px",
                  fontWeight: "600",
                  borderRadius: "12px",
                  backgroundColor: "#722ed1",
                  borderColor: "#722ed1",
                  boxShadow: "0 4px 16px rgba(114, 46, 209, 0.3)",
                  paddingLeft: "32px",
                  paddingRight: "32px"
                }}
              >
                Sign In to Start
              </Button>
              
              <Space align="center">
                <Text style={{ color: "#6b7280" }}>Don't have an account?</Text>
                <Button
                  type="link"
                  icon={<UserAddOutlined />}
                  onClick={() => navigate("/register")}
                  style={{ 
                    color: "#722ed1", 
                    fontWeight: "600",
                    padding: 0
                  }}
                >
                  Create one here
                </Button>
              </Space>
            </Space>
          </Space>
        </Card>
      </Flex>
    </div>
  );
}