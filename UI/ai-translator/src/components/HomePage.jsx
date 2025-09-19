import React from "react";
import { Typography, Button, Space, Row, Col, Card, Flex } from "antd";
import { useNavigate } from "react-router-dom";
import {
  TranslationOutlined,
  EditOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  UserAddOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <TranslationOutlined />,
      title: "Smart Translation",
      description: "AI-powered translation that understands context and nuance",
    },
    {
      icon: <EditOutlined />,
      title: "Draft Editing",
      description:
        "Refine and perfect your translations with built-in editing tools",
    },
    {
      icon: <ThunderboltOutlined />,
      title: "Instant Results",
      description: "Get your zero drafts generated in seconds, not minutes",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* Hero Section */}
      <Flex
        vertical
        align="center"
        style={{ paddingTop: "80px", paddingBottom: "60px" }}
      >
        {/* Logo and Brand */}
        <Space
          direction="vertical"
          align="center"
          size="large"
          style={{ marginBottom: "48px" }}
        >
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
                margin: 0,
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
              margin: 0,
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
            marginBottom: "60px",
          }}
        >
          Transform your text into perfect translations instantly. Our
          AI-powered platform makes draft generation effortless, accurate, and
          lightning-fast.
        </Paragraph>

        {/* CTA Section */}
        <Space size="middle" style={{ marginBottom: "80px" }}>
          {/*Get Started box goes to /login */}
          <div
  onClick={() => navigate("/login")}
  style={{
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "12px 28px",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-3px)";
    e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  }}
>
  <Text
    style={{
      color: "#4285f4",
      fontSize: "16px",
      fontWeight: 600,
      margin: 0,
      transition: "color 0.3s ease",
    }}
  >
    Get Started
  </Text>
  <ArrowRightOutlined
    style={{
      color: "#4285f4",
      marginLeft: "10px",
      fontSize: "16px",
      transition: "transform 0.3s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(4px)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
  />
</div>


          {/*Renamed Sign In → Try Quick Translation, goes to /quick-translation */}
          <Button
            style={{
              backgroundColor: "transparent",
              border: "1px solid white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease", // smooth hover
            }}
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate("/quick-translation")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = "#1890ff"; // AntD primary blue
              e.currentTarget.style.borderColor = "#1890ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "white";
            }}
          >
            Try Quick Translation
          </Button>
        </Space>

        {/* Features */}
        <Row gutter={[32, 32]} style={{ maxWidth: "1000px" }}>
  {features.map((feature, index) => (
    <Col xs={24} md={8} key={index}>
      <Card
        hoverable
        style={{
          height: "260px",
          borderRadius: "20px",
          border: "none",
          background: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          transition: "all 0.4s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "32px 24px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-8px)";
          e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #722ed1, #9b5de5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
            color: "white",
            fontSize: "36px",
            transition: "all 0.3s ease",
          }}
        >
          {feature.icon}
        </div>
        <Title level={4} style={{ margin: 0, color: "white" }}>
          {feature.title}
        </Title>
        <Paragraph style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>
          {feature.description}
        </Paragraph>
      </Card>
    </Col>
  ))}
</Row>

      </Flex>
    </div>
  );
}
