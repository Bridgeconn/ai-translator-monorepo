import React, { useState, useEffect } from "react";
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
  // ✅ useEffect must be declared before any return
  useEffect(() => {
    const maxPage = Math.ceil(projects.length / pageSize) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [projects.length, currentPage]);

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
      <Row gutter={[20, 20]}>
        {paginatedProjects.map((project) => {
          const langs = extractLanguagesFromName(project.name || "") || {
            source_language: "Source",
            target_language: "Target",
          };

          return (
            <Col xs={24} sm={12} md={8} lg={6} key={project.project_id}>
              <Card
                hoverable
                style={{
                  position: "relative",
                  borderRadius: 10,
                  border: "1px solid #e6e8eb",
                  cursor: "pointer",
                  minHeight: 108,
                  padding: 0,
                  overflow: "hidden",
                }}
                bodyStyle={{ padding: 14 }}
              >
                {/* CONTENT (below overlay visually) */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1, // keep content underneath the overlay
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  {/* Top row: icon + title */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
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
                      <Text
                        strong
                        style={{
                          fontSize: 17,
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {project.name ||
                          `${langs.source_language} - ${langs.target_language}`}
                      </Text>

                      <Text
                        type="secondary"
                        style={{ fontSize: 12, display: "block", marginTop: 6 }}
                      >
                        {project.translation_type
                          ? `${project.translation_type} translation`
                          : ""}
                      </Text>
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />
                </div>

                {/* FULL-CARD CLICKABLE OVERLAY (on top of content) */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Open project ${project.name || ""}`}
                  onClick={() => handleCardClick(project)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick(project);
                    }
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2, // higher than content so it receives clicks
                    background: "transparent",
                    cursor: "pointer", // shows it's clickable
                  }}
                />

                {/* ACTIONS: placed above overlay so they capture clicks */}
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: 12,
                    zIndex: 3, // higher than overlay so action buttons remain clickable
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
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
                      aria-label={`Delete ${project.name || "project"}`}
                      icon={
                        <DeleteOutlined
                          style={{ color: "#ff4d4f", fontSize: 16 }}
                        />
                      }
                      style={{ padding: 6 }}
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
