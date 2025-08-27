import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Typography,
  Form,
  message,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import CreateProjectModal from "./CreateProject";
import EditProjectModal from "./EditProject";
import ProjectList from "./ProjectList";
import SuccessModal from "./SuccessModal";
// Remove this import since MainLayout should be handled by routing
// import MainLayout from "./MainLayout";

const { Title, Text } = Typography;
const { Search } = Input;

const ZeroDraftGenerator = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  // const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  // const [editingProject, setEditingProject] = useState(null);
  // const [editForm] = Form.useForm();
  const [form] = Form.useForm();
  const [backendError, setBackendError] = useState("");

  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [allProjects, setAllProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchText, setSearchText] = useState("");

  // React Query: fetch sources
  const { data: sources = [], isLoading: sourcesLoading, refetch: refetchSources } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/sources/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // React Query: fetch languages
  const { data: languages = [], isLoading: languagesLoading, refetch: refetchLanguages } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/languages/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch languages");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // React Query: fetch versions
  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["versions"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/versions/");
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      return data.data || [];
    },
  });

  // Extract source and target languages from project name
  const extractLanguagesFromName = (projectName) => {
    if (!projectName)
      return { source_language: "Unknown", target_language: "Unknown" };
    const match = projectName.match(/^(.+?)\s*-\s*(.+?)\s+Translation$/i);
    if (match) {
      return {
        source_language: match[1].trim(),
        target_language: match[2].trim(),
      };
    }
    const parts = projectName.split(" - ");
    if (parts.length >= 2) {
      const source = parts[0].trim();
      const targetPart = parts[1].trim();
      const target = targetPart.replace(/\s+Translation$/i, "").trim();
      return { source_language: source, target_language: target };
    }
    return { source_language: "Unknown", target_language: "Unknown" };
  };

  // React Query: fetch existing projects with refetch capability
  const { refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/projects/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setAllProjects(data.data || []);
      setFilteredProjects(data.data || []);
      return data.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Add useEffect to refetch data when component mounts/remounts
  useEffect(() => {
    console.log("ZeroDraftGenerator component mounted/updated");
    // Force refetch of all data when component loads
    refetchProjects();
    refetchSources();
    refetchLanguages();
    refetchVersions();
  }, [refetchProjects, refetchSources, refetchLanguages, refetchVersions]);

  // Filter projects whenever search text changes
  useEffect(() => {
    if (!searchText) {
      setFilteredProjects(allProjects);
    } else {
      setFilteredProjects(
        allProjects.filter((project) => {
          const { source_language, target_language } =
            extractLanguagesFromName(project.name);
          return (
            project.name.toLowerCase().includes(searchText.toLowerCase()) ||
            source_language.toLowerCase().includes(searchText.toLowerCase()) ||
            target_language.toLowerCase().includes(searchText.toLowerCase())
          );
        })
      );
    }
  }, [searchText, allProjects]);

  // Modal handlers
  const showCreateModal = () => setIsCreateModalVisible(true);
  const handleCancel = () => {
    setIsCreateModalVisible(false);
    setBackendError("");
    form.resetFields();
  };

  // Edit modal handlers
  // const showEditModal = (project) => {
  //   setEditingProject(project);
  //   editForm.setFieldsValue({
  //     project_name: project.name,
  //     translation_type: project.translation_type,
  //   });
  //   setIsEditModalVisible(true);
  // };

  // const handleEditCancel = () => {
  //   setIsEditModalVisible(false);
  //   setEditingProject(null);
  //   editForm.resetFields();
  // };

const handleCreateProject = async (values) => {
  setLoading(true);
  setBackendError(""); // clear previous errors

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:8000/projects/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: values.project_name,
        source_id: values.source_id,
        target_language_id: values.target_language_id,
        translation_type: values.translation_type,
        selected_books: values.selected_books || [],
      }),
    });

    if (response.ok) {
      const result = await response.json();
      setSuccessMessage("Project created successfully!");
      setSuccessModalVisible(true);
      setIsCreateModalVisible(false);
      form.resetFields();

      const newProject = {
        project_id: result.data.project_id,
        name: values.project_name,
        translation_type: values.translation_type,
      };
      setAllProjects((prev) => [...prev, newProject]);
    } else {
      const errorData = await response.json();
      if (
        errorData &&
        typeof errorData.detail === "string" &&
        errorData.detail.includes("already exists")
      ) {
        setBackendError(
          "A project with this configuration already exists. Please choose a different name or configuration."
        );
      } else {
        setBackendError(errorData?.detail || "Failed to create project");
      }
    }
  // eslint-disable-next-line no-unused-vars
  } catch (error) {
    setBackendError("Network error. Please check your connection.");
  } finally {
    setLoading(false);
  }
};



  // const handleEditProject = async (values) => {
  //   setLoading(true);
  //   try {
  //     const token = localStorage.getItem("token");
  //     const response = await fetch(
  //       `http://localhost:8000/projects/${editingProject.project_id}`,
  //       {
  //         method: "PUT",
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           name: values.project_name,
  //           translation_type: values.translation_type,
  //         }),
  //       }
  //     );

  //     if (response.ok) {
  //       setSuccessMessage("Project updated successfully!");
  //       setSuccessModalVisible(true);
  //       setIsEditModalVisible(false);
  //       setEditingProject(null);
  //       editForm.resetFields();

  //       // Update the project in the local state
  //       setAllProjects((prev) =>
  //         prev.map((project) =>
  //           project.project_id === editingProject.project_id
  //             ? {
  //                 ...project,
  //                 name: values.project_name,
  //                 translation_type: values.translation_type,
  //               }
  //             : project
  //         )
  //       );
  //     } else {
  //       const errorData = await response.json();
  //       message.error(errorData.detail || "Failed to update project");
  //     }
  //   } catch (error) {
  //     console.error("Error updating project:", error);
  //     message.error(
  //       "Network error occurred. Please check your connection and try again."
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleDeleteProject = async (projectId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8000/projects/${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setSuccessMessage("Project deleted successfully!");
        setSuccessModalVisible(true);

        setAllProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || "Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      message.error(
        "Network error occurred. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

 return (
    <div
      style={{
        backgroundColor: "#f8f9fa",
        padding: "24px 40px",
        height: "calc(100vh - 64px)", // Subtract header height
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Page Header */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexShrink: 0,
        }}
      >
        <div>
          <Title
            level={2}
            style={{
              margin: 0,
              marginBottom: 8,
              color: "#262626",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            Translation Projects
          </Title>
          <Text style={{ color: "#8c8c8c", fontSize: 14 }}>
            Manage your translation workflows and track progress
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={showCreateModal}
          style={{
            borderRadius: 8,
            height: 40,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          New Project
        </Button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 32 }}>
        <Search
          placeholder="Search projects by name or languages..."
          prefix={<SearchOutlined style={{ color: "#bfbfbf", fontSize: 16 }} />}
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            borderRadius: 8,
            height: 48,
            fontSize: 14,
          }}
        />
      </div>

      {/* Project List Component */}
      <ProjectList
        projects={filteredProjects}
        loading={allProjects.length === 0}
        // onEdit={showEditModal}
        onDelete={handleDeleteProject}
        extractLanguagesFromName={extractLanguagesFromName}
      />

      {/* Modals */}
      <CreateProjectModal
        isVisible={isCreateModalVisible}
        onCancel={handleCancel}
        onSubmit={handleCreateProject}
        form={form}
        loading={loading}
        sources={sources}
        languages={languages}
        versions={versions}
        sourcesLoading={sourcesLoading}
        languagesLoading={languagesLoading}
        backendError={backendError}
      />

      {/* <EditProjectModal
        isVisible={isEditModalVisible}
        onCancel={handleEditCancel}
        onSubmit={handleEditProject}
        form={editForm}
        loading={loading}
        editingProject={editingProject}
      /> */}

      <SuccessModal
        isVisible={successModalVisible}
        message={successMessage}
        onClose={() => setSuccessModalVisible(false)}
      />
    </div>
  );
};

export default ZeroDraftGenerator;