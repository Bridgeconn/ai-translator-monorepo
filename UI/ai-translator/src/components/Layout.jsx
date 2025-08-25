import { useState, useRef } from "react";
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
} from "antd";
import {
  SwapOutlined,
  CopyOutlined,
  DownloadOutlined,
  CloseOutlined,
  EditOutlined,
  UserOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import FileUploadTextArea from "./FileUploadTextArea";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function DefaultLayout() {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const sourceRef = useRef(null);

  const handleFileUpload = (content) => {
    setSourceText(content);
    setTargetText(content); // Copy to target panel as well
  };

  const handleSourceChange = (content) => {
    setSourceText(content);
    setTargetText(content); // Sync target with source changes
  };

  const handleClearContent = () => {
    setSourceText("");
    setTargetText("");
  };

  const handleUploadClick = () => {
    sourceRef.current?.triggerUpload();
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Header */}
      

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
                <Button
                  type="primary"
                  style={{
                    backgroundColor: "#ffc0cb",
                    borderColor: "#ffc0cb",
                    color: "#000",
                  }}
                >
                  Text
                </Button>
                <Button>Bible</Button>
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
                    onClick={handleClearContent}
                  />
                }
                style={{
                  border: "1px solid #d9d9d9",
                  borderRadius: "0",
                  header: {
                    backgroundColor: "#f5f5f5",
                    borderBottom: "1px solid #d9d9d9",
                  },
                  body: {
                    minHeight: "300px",
                    padding: "16px",
                  },
                }}
                actions={[
                  <Button
                    type="text"
                    icon={<UploadOutlined />}
                    key="upload"
                    onClick={handleUploadClick}
                  />,
                ]}
              >
                <FileUploadTextArea
                  ref={sourceRef}
                  isSource={true}
                  value={sourceText}
                  onChange={handleSourceChange}
                  onFileUpload={handleFileUpload}
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
                  body: { minHeight: "300px", padding: "16px" },
                  header: {
                    backgroundColor: "#f5f5f5",
                    borderBottom: "1px solid #d9d9d9",
                  },
                }}
                actions={[
                  <Button type="text" icon={<CopyOutlined />} key="copy1" />,
                  <Button type="text" icon={<CopyOutlined />} key="copy2" />,
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    key="download"
                  />,
                ]}
              >
                <FileUploadTextArea
                  isSource={false}
                  value={targetText}
                  onChange={setTargetText}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}
