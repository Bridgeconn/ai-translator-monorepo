import React, { useState } from "react";
import { Typography, Button, Space, Row, Col, Card } from "antd";
import { useNavigate } from "react-router-dom";
import {
  TranslationOutlined,
  EditOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useAuthModal } from "./AuthModalContext"; // ✅ Add this
const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const navigate = useNavigate();
  const { openLogin } = useAuthModal(); // ✅ Add this
  const features = [
    {
      icon: <TranslationOutlined style={{ fontSize: 28, color: "white" }} />,
      title: "Smart Translation",
      description: "AI-powered translation that understands context and nuance",
    },
    {
      icon: <EditOutlined style={{ fontSize: 28, color: "white" }} />,
      title: "Draft Editing",
      description:
        "Refine and perfect your translations with built-in editing tools",
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 28, color: "white" }} />,
      title: "Instant Results",
      description: "Get your zero drafts generated in seconds, not minutes",
    },
  ];

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f6f8fb",
      paddingTop: 94,
      display: "flex",
      justifyContent: "center",
    },
    container: {
      width: "100%",
      maxWidth: 1100,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    hero: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 32,
      marginBottom: 48,
    },
    brandBadge: {
      width: 88,
      height: 88,
      background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
      borderRadius: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 30px rgba(99,66,255,0.12)",
    },
    logoText: {
      color: "white",
      fontSize: 34,
      fontWeight: 800,
      margin: 0,
    },
    primaryBtn: {
      background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
      color: "#fff",
      fontWeight: 600,
      padding: "12px 24px",
      borderRadius: 10,
    },
    secondaryBtn: {
      background: "transparent",
      color: "rgba(5,49,98,0.9)",
      fontWeight: 600,
      padding: "12px 24px",
      borderRadius: 10,
    },
    card: {
      height: 260,
      borderRadius: 16,
      background: "#ffffff",
      border: "1px solid #eef2fb",
      boxShadow: "0 8px 24px rgba(17,24,39,0.04)",
      overflow: "hidden",
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: "50%",
      background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
      boxShadow: "0 8px 20px rgba(44,141,251,0.12)",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.brandBadge}>
            <Text style={styles.logoText}>文A</Text>
          </div>

          {/* ✅ Updated Title with version number */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <Title
              level={1}
              style={{
                margin: 0,
                fontSize: 46,
                fontWeight: 800,
              }}
            >
              AI MT
            </Title>
            <Text
              style={{
                fontSize: 14,
                color: "rgba(6,18,40,0.45)",
                fontWeight: 500,
              }}
            >
              v1.0.0
            </Text>
          </div>

          <Paragraph
            style={{
              color: "rgba(6,18,40,0.65)",
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 720,
              margin: 0,
              fontStyle: "italic",
            }}
          >
            Transform your Bible text into accurate translations instantly with
            AI-powered tools to preserve nuance, edit drafts, and generate
            polished translations faster.
          </Paragraph>

          <Space size="middle">
            <Button
              size="large"
              onClick={openLogin}
              style={styles.primaryBtn}
            >
              Get Started
            </Button>
            <Button
              size="large"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate("/quick-translation")}
              style={styles.secondaryBtn}
            >
              Try Quick Translation
            </Button>
          </Space>
        </section>

        {/* FEATURES */}
        <Row gutter={[24, 24]} style={{ width: "100%", marginTop: 24 }}>
          {features.map((feature, idx) => (
            <Col xs={24} sm={12} md={8} key={idx}>
              <Card
                style={styles.card}
                styles={{
                  body: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    padding: "28px 20px",
                    textAlign: "center",
                  },
                }}
              >
                <div style={styles.iconCircle}>{feature.icon}</div>
                <Title
                  level={4}
                  style={{
                    margin: "8px 0 10px 0",
                    color: "rgba(6,18,40,0.9)",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {feature.title}
                </Title>
                <Paragraph
                  style={{
                    margin: 0,
                    color: "rgba(6,18,40,0.65)",
                    textAlign: "center",
                  }}
                >
                  {feature.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
