import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Spin,
  Popconfirm,
  Pagination,
  Button,
} from "antd";
import { DeleteOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const ProjectList = ({
  projects = [],
  loading = false,
  onDelete,
  extractLanguagesFromName,
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8; // cards per page

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin size="large" />
      </div>
    );
  }

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = projects.slice(startIndex, startIndex + pageSize);

  const handleCardClick = (project) => {
    const type = (project.translation_type || "").toLowerCase();
    if (type === "word") {
      navigate(`/projects/${project.project_id}/word-translation`, {
        state: { project },
      });
    } else if (type === "verse") {
      navigate(`/projects/${project.project_id}/translate`, {
        state: { project },
      });
    } else {
      navigate(`/projects/${project.project_id}/text-translation`, {
        state: { project },
      });
    }
  };

  return (
    <>
      <Row gutter={[24, 24]}>
        {paginatedProjects.map((project) => {
          const langs = extractLanguagesFromName(project.name || "") || {
            source_language: "Source",
            target_language: "Target",
          };

          return (
            <Col xs={24} sm={12} md={8} lg={6} key={project.project_id} >
              <Card
                onClick={() => handleCardClick(project)}
                hoverable
                style={{
                  borderRadius: 10,
                  border: "1px solid #e6e8eb",
                  cursor: "pointer",
                  transition: "transform 0.14s ease, box-shadow 0.14s ease",
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                }}
                bodyStyle={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {/* Top row: icon + title */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "linear-gradient(135deg,#EAF2FF,#DCE9FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2c8dfb",
                      flexShrink: 0,
                    }}
                  >
                    <FolderOpenOutlined
                      style={{ fontSize: 18, color: "#2c8dfb" }}
                    />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {project.name ||
                        `${langs.source_language} - ${langs.target_language}`}
                    </Text>
                    
                    <div>
                    {/* subtitle just below title */}
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, textTransform: "capitalize" }}
                    >
                      {project.translation_type} translation
                    </Text>
                    </div>
                  </div>
                </div>

                {/* spacer to push delete action to bottom */}
                <div style={{ flex: 1 }} />

                {/* Bottom row: delete button aligned right */}
                <div
                  style={{ display: "flex", justifyContent: "flex-end" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Popconfirm
                    title="Delete Project"
                    description="Are you sure you want to delete this project? This action cannot be undone."
                    onConfirm={() => onDelete && onDelete(project.project_id)}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined style={{ color: "#ff4d4f" }} />}
                      style={{ padding: "4px 8px" }}
                    />
                  </Popconfirm>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Pagination */}
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
