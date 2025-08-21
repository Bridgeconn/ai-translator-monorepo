// components/HomePage.jsx
import React from "react";
import { Typography, Button, Space, Card } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5",
        padding: "24px",
      }}
    >
      <Card
        style={{
          maxWidth: 600,
          textAlign: "center",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <Title level={2}>🚀 Welcome to Zero Draft Generator</Title>
        <Paragraph>
          Generate and edit translations easily with our tool.  
          Choose your source and target language, paste your text,  
          and create drafts instantly.
        </Paragraph>

        <Space style={{ marginTop: "20px" }}>
          <Button
            type="primary"
            size="large"
            onClick={() => navigate("/app")}
          >
            Get Started
          </Button>
        </Space>
      </Card>
    </div>
  );
}
