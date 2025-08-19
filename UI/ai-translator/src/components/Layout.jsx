import React, { useState } from "react";
import {
  Layout,
  Button,
  Select,
  Row,
  Col,
  Card,
  Typography,
  Space,
  Avatar,
  message,
} from "antd";
import {
  SwapOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  CloseOutlined,
  EditOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function DefaultLayout() {
  const [sourceText, setSourceText] = useState("Input text appears here...");
  const [targetText, setTargetText] = useState("Translation appears here...");
  const [isTargetEdited, setIsTargetEdited] = useState(false);

  // Copy function// Copy function
const handleCopy = (content) => {
  try {
    navigator.clipboard.writeText(content);
    alert("✅ Copied!");
  } catch (err) {
    console.error("Failed to copy: ", err);
    alert("❌ Copy failed!");
  }
};

// Paste function
const handlePaste = async (setContent) => {
  try {
    const clipText = await navigator.clipboard.readText();
    setContent(clipText);
    alert("📥 Pasted!");
  } catch (err) {
    console.error("Failed to paste: ", err);
    alert("❌ Paste failed!");
  }
};


  // Sync Source -> Target until Target is manually edited
  const handleSourceChange = (e) => {
    const newText = e.target.value;
    setSourceText(newText);
    if (!isTargetEdited) {
      setTargetText(newText);
    }
  };

  const handleTargetChange = (e) => {
    setTargetText(e.target.value);
    setIsTargetEdited(true);
  };

  const handleClearAll = () => {
    setSourceText("");
    setTargetText("");
    setIsTargetEdited(false); // reset manual edit flag
    alert("🗑️ All text cleared!");
  };
  

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Header */}
      <Header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #d9d9d9",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#722ed1",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            文A
          </div>
          <Title level={3} style={{ margin: 0, color: "#000" }}>
            Zero Draft Generator
          </Title>
        </div>
        <Space>
          <Text>John Doe</Text>
          <Avatar icon={<UserOutlined />} />
        </Space>
      </Header>

      <Content style={{ padding: "0 24px" }}>
        {/* Controls Row */}
        <div
          style={{
            padding: "16px 0",
            borderBottom: "1px solid #d9d9d9",
          }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            {/* Left - Tabs */}
            <Col xs={24} sm={8} md={6}>
              <Space.Compact>
                <Button>Text</Button>
                <Button
                  type="primary"
                  style={{
                    backgroundColor: "#ffc0cb",
                    borderColor: "#ffc0cb",
                    color: "#000",
                  }}
                >
                  Bible
                </Button>
              </Space.Compact>
            </Col>

            {/* Center - Language Selection */}
            <Col xs={24} sm={8} md={12}>
              <Row justify="center" align="middle" gutter={16} wrap>
                <Col>
                  <Space>
                    <Text strong>Source</Text>
                    <Select defaultValue="english" style={{ width: 120 }}>
                      <Option value="english">English</Option>
                      <Option value="spanish">Spanish</Option>
                      <Option value="french">French</Option>
                    </Select>
                  </Space>
                </Col>
                <Col>
                  <SwapOutlined style={{ fontSize: "16px", color: "#999" }} />
                </Col>
                <Col>
                  <Space>
                    <Text strong>Target</Text>
                    <Select defaultValue="malayalam" style={{ width: 120 }}>
                      <Option value="malayalam">Malayalam</Option>
                      <Option value="hindi">Hindi</Option>
                      <Option value="tamil">Tamil</Option>
                    </Select>
                  </Space>
                </Col>
              </Row>
            </Col>

            {/* Right - Action Buttons */}
            <Col xs={24} sm={8} md={6}>
              <Row justify="end" gutter={8}>
                <Col>
                  <Select
                    defaultValue="verse"
                    style={{
                      width: 100,
                      backgroundColor: "#ffc0cb",
                    }}
                  >
                    <Option value="verse">Verse</Option>
                    <Option value="chapter">Word</Option>
                  </Select>
                </Col>
                <Col>
                  <Button>Generate</Button>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        {/* Editor Panels */}
        <div style={{ padding: "24px 0" }}>
          <Row gutter={24}>
            {/* Source Panel */}
            <Col xs={24} xl={12}>
              <Card
                title="Source"
                extra={
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    style={{ color: "#ff7a00" }}
                    onClick={handleClearAll} 
                  />
                }
                style={{
                  border: "1px solid #d9d9d9",
                  borderRadius: "0",
                }}
                actions={[
                  <Button
                    type="text"
                    key="paste"
                    onClick={() => handlePaste(setSourceText)}
                  >
                    📥
                  </Button>,
                  <Button
                    type="text"
                    key="copy"
                    onClick={() => handleCopy(sourceText)}
                  >
                    📋
                  </Button>,
                  <Button type="text" icon={<ShareAltOutlined />} key="share" />,
                ]}
              >
                <textarea
                  value={sourceText}
                  onChange={handleSourceChange}
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    border: "none",
                    outline: "none",
                  }}
                />
              </Card>
            </Col>

            {/* Target Panel */}
            <Col xs={24} xl={12}>
              <Card
                title="Target"
                extra={
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    style={{ color: "#999" }}
                  />
                }
                style={{
                  border: "1px solid #d9d9d9",
                  borderRadius: "0",
                }}
                actions={[
                  <Button
                    type="text"
                    key="copy"
                    onClick={() => handleCopy(targetText)}
                  >
                    📋
                  </Button>,
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    key="download"
                  />,
                ]}
              >
                <textarea
                  value={targetText}
                  onChange={handleTargetChange}
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    border: "none",
                    outline: "none",
                  }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}
