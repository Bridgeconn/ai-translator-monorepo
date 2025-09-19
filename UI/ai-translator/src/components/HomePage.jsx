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
      width: "100%",
      background: "#f8f9fb",
      // to prevent overlap with header if needed
      boxSizing: "border-box",
      padding: "40px 24px"    
    }}
    >
      {/* Hero Section */}
      <Flex
        vertical
        align="center"
        style={{ paddingTop: "40px", paddingBottom: "40px"
        }}
      >
        {/* Logo and Brand */}
        <Space
          direction="vertical"
          align="center"
          size="large"
          style={{ marginBottom: "24px" }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: "rgb(44 141 251)",
              backdropFilter: "blur(8px)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(114, 46, 209, 0.25)"
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
              fontSize: "50px",
              fontWeight: 700,
              background: "linear-gradient(90deg, rgb(0 0 0 / 90%), rgb(2 0 8 / 90%)) text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Zero Draft Generator
          </Title>
        </Space>

        {/* Description */}
        <Paragraph
          style={{
            color: "rgb(0 3 10)", // gray-600
            fontSize: "1.1rem",
            lineHeight: "1.8",
            textAlign: "center",
            maxWidth: "640px",
          }}
        >
          Transform your Bible text into accurate translations instantly with AI-powered tools.
        </Paragraph>

{/* CTA Section */}
<Space size="middle" style={{ marginBottom: "40px" }}>
  {/* The new 'Get Started' button with solid background */}
  <Button
    size="large"
    onClick={() => navigate("/login")}
    style={{
      background: "#cad7f0",
      border: "none",
      color: "rgba(47,5,98,0.85)",
      fontWeight: 500,
      padding: "12px 24px",
      borderRadius: "8px",
      transition: "all 0.2s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
      e.currentTarget.style.color = "rgb(49 135 255 / 85%)";
      e.currentTarget.style.transform = "scale(1.05)";

    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "#cad7f0";
      e.currentTarget.style.color = "rgba(47,5,98,0.85)";
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    Get Started <ArrowRightOutlined />
  </Button>

  {/* The new 'Try Quick Translation' button with transparent background */}
  <Button
    size="large"
    icon={<ThunderboltOutlined />}
    onClick={() => navigate("/quick-translation")}
    style={{
      background: "#cad7f0",
      border: "none",
      color: "rgba(47,5,98,0.85)",
      fontWeight: 500,
      padding: "12px 24px",
      borderRadius: "8px",
      transition: "all 0.2s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
      e.currentTarget.style.color = "rgb(49 135 255 / 85%)";
      e.currentTarget.style.transform = "scale(1.05)";

    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "#cad7f0";
      e.currentTarget.style.color = "rgba(49, 135, 255, 0.85)";
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    Try Quick Translation
  </Button>
</Space>
      

        {/* Features */}
        <Row gutter={[32, 32]} style={{ maxWidth: "1000px",marginTop: "100px"   }}>
  {features.map((feature, index) => (
    <Col xs={24} md={8} key={index}>
      <Card
        style={{
          height: "240px",
          borderRadius: "16px",
          background: "##ffffff",          // solid white cards
          border: "1px solid #f0f0f0",    // subtle outline
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)", // softer shadow
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "32px 24px",
          transition: "transform 0.2s ease"
        }}
        
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgb(44 141 251)",
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
        <Title level={4} style={{ margin: 0, color: "rgb(5 49 98 / 85%)"}}>
          {feature.title}
        </Title>
        <Paragraph style={{ margin: 0, color: "rgb(0 3 10)"}}>
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
