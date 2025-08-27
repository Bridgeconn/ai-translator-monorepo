import React, { useState } from "react";
import { authAPI } from "./api";
import { useNavigate } from "react-router-dom";
import {
  Layout, Button, Select, Row, Col, Card,
  Typography, Space, Avatar, Dropdown
} from "antd";
import {
  SwapOutlined, ShareAltOutlined, CloseOutlined,
  EditOutlined, UserOutlined
} from "@ant-design/icons";
import DownloadDraftButton from "./DownloadDraftButton";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function DefaultLayout() {
  const [sourceText, setSourceText] = useState("Input text appears here...");
  const [targetText, setTargetText] = useState("Translation appears here...");
  const [isTargetEdited, setIsTargetEdited] = useState(false);
  const navigate = useNavigate();

  // Copy / Paste
  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      alert("✅ Copied!");
    } catch (err) {
      console.error("Copy failed:", err);
      alert("❌ Copy failed!");
    }
  }; 
  const handlePaste = async (setter) => {
    try {
      const clipText = await navigator.clipboard.readText();
      setter(clipText);
      alert("📥 Pasted!");
    } catch (err) {
      console.error("Paste failed:", err);
      alert("❌ Paste failed!");
    }
  };
  // Sync Source → Target
  const handleSourceChange = (e) => {
    const newText = e.target.value;
    setSourceText(newText);
    if (!isTargetEdited) setTargetText(newText);
  };
  const handleTargetChange = (e) => {
    setTargetText(e.target.value);
    setIsTargetEdited(true);
  };
  const handleClearAll = () => {
    setSourceText(""); setTargetText(""); setIsTargetEdited(false);
    alert("🗑️ All text cleared!");
  };

  // Logout
  const handleLogout = async () => {
    await authAPI.logout();
    navigate("/");
  };

  const userMenuItems = [
    { key: "1", label: "Profile" },
    { key: "2", label: "Settings" },
    { key: "3", label: "Logout", onClick: handleLogout },
  ];

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Header */}
      <Header style={{
        backgroundColor: "white", borderBottom: "1px solid #d9d9d9",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", backgroundColor: "#722ed1",
            borderRadius: "4px", display: "flex", alignItems: "center",
            justifyContent: "center", color: "white", fontWeight: "bold",
            fontSize: "14px"
          }}>文A</div>
          <Title level={3} style={{ margin: 0, color: "#000" }}>Zero Draft Generator</Title>
        </div>
        <Space>
          <Text>{user?.full_name || user?.username || "User"}</Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
            <Avatar icon={<UserOutlined />} style={{ cursor: "pointer" }} />
          </Dropdown>
        </Space>
      </Header>

      {/* Content */}
      <Content style={{ padding: "0 24px" }}>
        {/* ... keep your controls + panels exactly as you had ... */}
        {/* Target Panel example */}
        <Card
          title="Target"
          extra={<Button type="text" icon={<EditOutlined />} style={{ color: "#999" }} />}
          style={{ border: "1px solid #d9d9d9", borderRadius: "0" }}
          actions={[
            <Button type="text" key="copy" onClick={() => handleCopy(targetText)}>📋</Button>,
            <DownloadDraftButton content={targetText} key="download" />,
          ]}
        >
          <textarea
            value={targetText}
            onChange={handleTargetChange}
            style={{ width: "100%", minHeight: "300px", border: "none", outline: "none" }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
