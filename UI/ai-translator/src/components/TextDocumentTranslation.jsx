import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Select,
  Card,
  Input,
  Typography,
  Spin,
  Button,
  message,
  Breadcrumb,
  Tooltip,
  App,
  Upload,
} from "antd";
import { EditOutlined, CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams, Link } from "react-router-dom";
import { textDocumentAPI } from "./api.js";
import DownloadDraftButton from "./DownloadDraftButton";

const { Option } = Select;
const { TextArea } = Input;
const { Text: TypographyText } = Typography;


export default function TextDocumentTranslation() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { message } = App.useApp();

  // ------------------ Fetch Project + Files ------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const proj = await textDocumentAPI.getProjectById(projectId);
        setProject(proj);
        setProjectFiles(proj.files || []);
      } catch (err) {
        console.error(err);
        message.error("Failed to load project files");
      }
    };
    if (projectId) fetchData();
  }, [projectId]);

  // ------------------ Handle File Selection ------------------
  const handleFileChange = (fileId) => {
    const file = projectFiles.find((f) => f.id === fileId);
    if (!file) return;
    setSelectedFile(file);
    setSourceText(file.source_text || "");
    setTargetText(file.target_text || "");
    setIsEdited(false);
  };

  // ------------------ Draft Editing ------------------
  const handleDraftChange = (e) => {
    setTargetText(e.target.value);
    setIsEdited(true);
  };

  const handleSaveDraft = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      await textDocumentAPI.updateFile(projectId, selectedFile.id, {
        target_text: targetText,
      });
      message.success("Translation saved!");
      setIsEdited(false);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      message.error("Failed to save translation");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardDraft = () => {
    setTargetText(selectedFile?.target_text || "");
    setIsEdited(false);
    setIsEditing(false);
    message.info("Reverted to saved translation");
  };

  if (!project) return <Spin />;

  return (
    <div
      style={{
        padding: "24px",
        position: "relative",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 32px 16px 32px",
          backgroundColor: "#f9f9fb",
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Breadcrumb
          items={[
            {
              title: (
                <Link to="/projects" style={{ color: "#2c8dfb", fontWeight: 500 }}>
                  Projects
                </Link>
              ),
            },
            { title: <span style={{ fontWeight: 500 }}>{project?.project_name}</span> },
          ]}
          style={{ marginBottom: 8, fontSize: 14 }}
        />
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "#1f2937" }}>
          {project?.project_name} - Document Translation
        </h2>
      </div>

{/* File Selector with Upload Button */}
<div style={{ marginBottom: 12 }}>
<TypographyText strong style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
  Select File
</TypographyText>

  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Select
      placeholder="Select a file"
      style={{ width: 200 }}
      onChange={handleFileChange}
      value={selectedFile?.id || undefined} // avoid null warning
    >
      {projectFiles.map((f) => (
        <Option key={f.id} value={f.id}>
          {f.file_name}
        </Option>
      ))}
    </Select>

    {/* Plus Icon for uploading a new file */}
    <Upload  
  showUploadList={false}
  accept=".docx,.pdf,.txt,.usfm" 
  beforeUpload={(file) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/usfm', 'text/usfm'];
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.usfm'];

    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      message.error(`${file.name} is not a supported file type`);
      return Upload.LIST_IGNORE; // prevents upload
    }
    return true; // allow upload
  }}
  customRequest={async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadedFile = await textDocumentAPI.uploadFile(projectId, formData);

      setProjectFiles((prev) => [...prev, uploadedFile]);
      setSelectedFile(uploadedFile);
      setSourceText(uploadedFile.source_text || "");
      setTargetText(uploadedFile.target_text || "");

      message.success(`${file.name} uploaded successfully!`);
      onSuccess(null, file);
    } catch (err) {
      console.error(err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Unknown error';
      message.error(`${errorMsg}`);
      onError(err);
    }
    
  }}
>
  <Button icon={<PlusOutlined />}
  title="add a new file"
  style={{ 
    marginLeft: 8,
  //backgroundColor: 'rgb(44, 141, 251)',
 borderColor: 'rgb(44, 141, 251)',
  }} />
</Upload>


  </div>
</div>



      {/* Translation Editor */}
      {selectedFile && (
        <Card title="Translation Editor" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Row gutter={16} style={{ flex: 1 }}>
            {/* Source */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <h3>Source</h3>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 10, borderRadius: 4 }}>
                {sourceText}
              </pre>
            </Col>

            {/* Target */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Target</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {!isEditing ? (
                    <>
                      <Tooltip title="Copy translation" color="#fff" style={{ color: "#000" }}>
                        <Button
                          type="default"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(targetText || "");
                            message.success("Copied to clipboard!");
                          }}
                          size="middle"
                        />
                      </Tooltip>

                      <DownloadDraftButton content={targetText} />

                      <Tooltip title="Edit draft" color="#fff" style={{ color: "#000" }}>
                        <Button
                          type="default"
                          icon={<EditOutlined />}
                          onClick={() => setIsEditing(true)}
                          size="middle"
                        />
                      </Tooltip>
                    </>
                  ) : (
                    <div>
                      <Button type="primary" onClick={handleSaveDraft} style={{ marginRight: 8 }} size="small" loading={loading}>
                        Save
                      </Button>
                      <Button size="small" onClick={handleDiscardDraft}>
                        Discard
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <TextArea
                rows={20}
                value={targetText}
                onChange={handleDraftChange}
                readOnly={!isEditing}
                style={{ marginTop: 8, backgroundColor: isEdited ? "#fffbe6" : "transparent" }}
              />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}
