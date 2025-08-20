import { Button, Dropdown, Menu } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

export default function DownloadDraftButton() {
  const handleDownload = (format) => {
    // Connect to backend API later
    alert(`Downloading draft as ${format}`);
  };

  const menu = (
    <Menu>
      <Menu.Item key="txt" onClick={() => handleDownload("txt")}>
        Text (.txt)
      </Menu.Item>
      <Menu.Item key="docx" onClick={() => handleDownload("docx")}>
        Docx (.docx)
      </Menu.Item>
      <Menu.Item key="pdf" onClick={() => handleDownload("pdf")}>
        PDF (.pdf)
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
      <Button 
        type="primary" 
        icon={<DownloadOutlined />}
        style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
      >
        Download Draft
      </Button>
    </Dropdown>
  );
}
