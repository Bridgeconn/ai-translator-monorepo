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
} from "antd";
import { EditOutlined, CopyOutlined } from "@ant-design/icons";
import { useParams, Link } from "react-router-dom";
import { textDocumentAPI } from "./api.js";
import DownloadDraftButton from "./DownloadDraftButton";


const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

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
  const handleFileChange = async (fileId) => {
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
      setIsEditing(false); // exit edit mode after save
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
    setIsEditing(false); // exit edit mode
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

      {/* File Selector */}
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
          Select File
        </Text>
        <Select
          placeholder="Select a file"
          style={{ width: 200 }}
          onChange={handleFileChange}
          value={selectedFile?.id}
        >
          {projectFiles.map((f) => (
            <Option key={f.id} value={f.id}>
              {f.file_name}
            </Option>
          ))}
        </Select>
      </div>

      {selectedFile && (
        <Card
          title="Translation Editor"
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Row gutter={16} style={{ flex: 1 }}>
            {/* Source */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <h3>Source</h3>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#f5f5f5",
                  padding: 10,
                  borderRadius: 4,
                }}
              >
                {sourceText}
              </pre>
            </Col>

            {/* Target */}

            {/* Target */}
            <Col span={12} style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Target</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {!isEditing ? (
                    <>
                      {/* Copy Button */}
                      <Tooltip
                        title="Copy translation"
                        color="#fff"
                        style={{ color: "#000" }}
                      >
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

                      <DownloadDraftButton
                        content={targetText}
                      //disabled={loading || !targetText}
                      />

                      {/* Edit Button */}
                      <Tooltip
                        title="Edit draft"
                        color="#fff"
                        style={{ color: "#000" }}
                      >
                        <Button
                          type="default"
                          icon={<EditOutlined />}
                          onClick={() => setIsEditing(true)}
                          size="middle"
                        />
                      </Tooltip>
                    </>
                  ) : (
                    // Show Save + Discard when editing
                    <div>
                      <Button
                        type="primary"
                        onClick={handleSaveDraft}
                        style={{ marginRight: 8 }}
                        size="small"
                        loading={loading}
                      >
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
                style={{
                  marginTop: 8,
                  backgroundColor: isEdited ? "#fffbe6" : "transparent",
                }}
              />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}
