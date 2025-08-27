import { Card, Button, Space } from "antd";
import { FolderAddOutlined, FileTextOutlined, ThunderboltOutlined, FileTextFilled } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card title="+ Quick Actions" style={{ width: 650, borderRadius: 10 }}>
      <p style={{ marginBottom: 16 }}>Get started with common tasks</p>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Button
          type="default"
          icon={<FileTextFilled />}
          size="large"
          block
          onClick={() => navigate("/create-source")}
        >
          Add New Source
        </Button>
        <Button
          type="default"
          icon={<FolderAddOutlined />}
          size="large"
          block
       
          onClick={() => navigate("/create-project")}
        >
          Create Project
        </Button>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          size="large"
          block
          style={{ background: "#4fc3f7"  }}
          onClick={() => navigate("/quick-translation")}
        >
 
          Quick Translate
        </Button>
      </Space>
    </Card>
  );
};

export default QuickActions;
// # borderColor: "#4fc3f7"