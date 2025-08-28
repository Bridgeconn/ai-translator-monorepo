import { Card, Button, Space, Typography } from "antd";
import { FolderAddOutlined, FileTextOutlined, ThunderboltOutlined, FileTextFilled } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card
      title="+ Quick Actions"
      style={{
        width: 650,
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        border: "none",
      }}
      headStyle={{ fontSize: 18, fontWeight: 600 }}
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
        Get started with common tasks
      </Text>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Button
          type="default"
          icon={<FileTextFilled />}
          size="large"
          block
          style={{ borderRadius: 8 }}
          onClick={() => navigate("/Sources")}
        >
          Add New Source
        </Button>

        <Button
          type="default"
          icon={<FolderAddOutlined />}
          size="large"
          block
          style={{ borderRadius: 8 }}
          onClick={() => navigate("/projects")}
        >
          Create Project
        </Button>

        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          size="large"
          block
          style={{
            borderRadius: 8,
            background: "linear-gradient(90deg, #4fc3f7 0%, #0288d1 100%)",
            borderColor: "#0288d1",
            fontWeight: 500,
          }}
          onClick={() => navigate("/quick-translation")}
        >
          Quick Translate
        </Button>
      </Space>
    </Card>
  );
};

export default QuickActions;
