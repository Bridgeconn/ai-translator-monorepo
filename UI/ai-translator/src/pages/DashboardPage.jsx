// src/pages/DashboardPage.jsx
import React from "react";
import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  return (
    <div style={{ padding: "24px" }}>
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Title level={3}>Welcome to the Dashboard</Title>
        <Paragraph>
          You have successfully logged in 🎉
        </Paragraph>
        <Paragraph type="secondary">
          From here you can navigate to <b>Documents</b>, <b>Projects</b>, or try out the <b>AI Tools</b> using the sidebar.
        </Paragraph>
      </Card>
    </div>
  );
}
