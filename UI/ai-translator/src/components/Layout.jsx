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
  ShareAltOutlined,
  CopyOutlined,
  DownloadOutlined,
  CloseOutlined,
  EditOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import LanguageSelect from "./LanguageSelect"; 

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function DefaultLayout() {
  const [sourceLang, setSourceLang] = useState(null);
  const [targetLang, setTargetLang] = useState(null);

  const sampleText = (
    <div style={{ lineHeight: "1.6" }}>
      <Text>
        <Text strong>1</Text>In the beginning God created the heavens and the
        earth. <Text strong>2</Text>Now the earth was formless and empty,
        darkness was over the surface of the deep, and the Spirit of God was
        hovering over the waters.
      </Text>
      <br />
      <br />
      <Text>
        <Text strong>3</Text>And God said, "Let there be light," and there was
        light. <Text strong>4</Text>God saw that the light was good, and he
        separated the light from the darkness. <Text strong>5</Text>God called
        the light "day," and the darkness he called "night." And there was
        evening, and there was morning—the first day.
      </Text>
      <br />
      <br />
      <Text>
        <Text strong>6</Text>And God said, "Let there be a vault between the
        waters to separate water from water."
      </Text>
    </div>
  );

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
                  <LanguageSelect
                    label="Source"
                    value={sourceLang}
                    onChange={setSourceLang}
                  />
                </Col>
                <Col>
                  <SwapOutlined style={{ fontSize: "16px", color: "#999" }} />
                </Col>
                <Col>
                  <LanguageSelect
                    label="Target"
                    value={targetLang}
                    onChange={setTargetLang}
                  />
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
                  <Button
                    onClick={() => {
                      console.log("Selected Source:", sourceLang);
                      console.log("Selected Target:", targetLang);
                    }}
                  >
                    Generate
                  </Button>
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
                    icon={<ShareAltOutlined />}
                    key="share"
                  />,
                ]}
              >
                {sampleText}
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
                {sampleText}
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}
