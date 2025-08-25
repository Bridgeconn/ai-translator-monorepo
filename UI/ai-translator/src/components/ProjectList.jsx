import React, { useState } from "react";
import { Row, Col, Card, Typography, Spin, Popconfirm, Pagination } from "antd";
import {
  TranslationOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const ProjectList = ({
  projects,
  loading,
  onEdit,
  onDelete,
  extractLanguagesFromName,
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8; // how many cards per page

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin size="large" />
      </div>
    );
  }

  // calculate paginated projects
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  return (
    <>
      <Row gutter={[24, 24]}>
        {paginatedProjects.map((project) => (
          <Col xs={24} sm={12} md={8} lg={6} key={project.project_id}>
            <Card
              style={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                height: 200,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
              bodyStyle={{
                padding: 10,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 160,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <FolderOpenOutlined
                  style={{ fontSize: 24, color: "#667eea" }}
                />
              </div>

              <Title
                level={4}
                style={{
                  marginBottom: 8,
                  color: "#1f2937",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {project.name || "Untitled Project"}
              </Title>

              <Text
                style={{
                  fontSize: 14,
                  color: "#374151",
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                {(() => {
                  const languages = extractLanguagesFromName(project.name);
                  return `${languages.source_language} - ${languages.target_language}`;
                })()}
              </Text>

              <Text
                type="secondary"
                style={{ fontSize: 12, textTransform: "capitalize" }}
              >
                {project.translation_type} translation
              </Text>

              {/* Action icons at bottom */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  display: "flex",
                  gap: 10,
                }}
              >
                <FolderOpenOutlined
                  style={{
                    fontSize: 16,
                    color: "#52c41a",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    // Navigate to project details layout
                    navigate(`/projects/${project.project_id}`);
                  }}
                />
                <EditOutlined
                  style={{
                    fontSize: 16,
                    color: "#1890ff",
                    cursor: "pointer",
                  }}
                  onClick={() => onEdit(project)}
                />
                <Popconfirm
                  title="Delete Project"
                  description="Are you sure you want to delete this project? This action cannot be undone."
                  onConfirm={() => onDelete(project.project_id)}
                  okText="Yes, Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <DeleteOutlined
                    style={{
                      fontSize: 16,
                      color: "#ff4d4f",
                      cursor: "pointer",
                    }}
                  />
                </Popconfirm>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Pagination controls */}
      {projects.length > pageSize && (
        <div style={{ marginTop: 20, textAlign: "right" }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={projects.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      )}
    </>
  );
};

export default ProjectList;