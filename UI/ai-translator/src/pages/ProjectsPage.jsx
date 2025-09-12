import React, { useEffect, useState } from "react";
import { Input, Button, Typography, Form,App } from "antd";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import ProjectList from "../components/ProjectList";
import CreateProjectModal from "../components/CreateProject";
import SuccessModal from "../components/SuccessModal";
import { projectsAPI, textDocumentAPI } from "../components/api";

const { Title, Text } = Typography;
const { Search } = Input;

const ZeroDraftGenerator = () => {
  const [allProjects, setAllProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // -------------------------
  // React Query: fetch sources
  // -------------------------
  const { data: sources = [], isLoading: sourcesLoading, refetch: refetchSources } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + "/sources/", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // -------------------------
  // React Query: fetch languages
  // -------------------------
  const { data: languages = [], isLoading: languagesLoading, refetch: refetchLanguages } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + "/languages/", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch languages");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // -------------------------
  // React Query: fetch versions
  // -------------------------
  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["versions"],
    queryFn: async () => {
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + "/versions/");
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      return data.data || [];
    },
  });

  // -------------------------
  // Fetch all projects
  // -------------------------
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [normalResult, textDocResult] = await Promise.allSettled([
        projectsAPI.getAllProjects(),
        textDocumentAPI.getAllProjects(true),
      ]);
  
      const normalProjects =
        normalResult.status === "fulfilled" ? normalResult.value : [];
  
      const textDocProjects =
        textDocResult.status === "fulfilled" ? textDocResult.value : [];
  
      const formattedTextDocProjects = textDocProjects.map((p) => ({
        project_id: p.project_id,
        name: p.project_name,
        translation_type: "text_document",
      }));
  
      const combinedProjects = [...normalProjects, ...formattedTextDocProjects];
  
      setAllProjects(combinedProjects);
      setFilteredProjects(combinedProjects);
    } catch (err) {
      console.error("Fetch projects error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  
  useEffect(() => {
    fetchProjects();
    refetchSources();
    refetchLanguages();
    refetchVersions();
  }, []);

  // -------------------------
  // Extract languages from project name
  // -------------------------
  const extractLanguagesFromName = (projectName) => {
    if (!projectName) return { source_language: "-", target_language: "-" };
    const parts = projectName.split("-");
    return {
      source_language: parts[0]?.trim() || "-",
      target_language: parts[1]?.trim() || "-",
    };
  };

  // -------------------------
  // Filter projects based on search
  // -------------------------
  useEffect(() => {
    if (!searchText) {
      setFilteredProjects(allProjects);
    } else {
      setFilteredProjects(
        allProjects.filter((p) => {
          const { source_language, target_language } = extractLanguagesFromName(p.name);
          return (
            p.name.toLowerCase().includes(searchText.toLowerCase()) ||
            source_language.toLowerCase().includes(searchText.toLowerCase()) ||
            target_language.toLowerCase().includes(searchText.toLowerCase())
          );
        })
      );
    }
  }, [searchText, allProjects]);

  // -------------------------
  // Handlers
  // -------------------------
  const showCreateModal = () => setIsCreateModalVisible(true);
  const handleCancel = () => {
    setIsCreateModalVisible(false);
    setBackendError("");
    form.resetFields();
  };

  const handleCreateProject = async (values) => {
    setLoading(true);
    setBackendError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + "/projects/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.project_name,
          source_id: values.source_id,
          target_language_id: values.target_language_id,
          translation_type: values.translation_type,
          selected_books: values.selected_books || [],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create project");
      }

      const result = await res.json();
      const newProject = {
        project_id: result.data.project_id,
        name: values.project_name,
        translation_type: values.translation_type,
      };
      setAllProjects((prev) => [...prev, newProject]);
      setFilteredProjects((prev) => [...prev, newProject]);
      setSuccessMessage("Project created successfully!");
      setSuccessModalVisible(true);
      handleCancel();
    } catch (err) {
      setBackendError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    setLoading(true);
    try {
      const project = allProjects.find((p) => p.project_id === projectId);
      if (!project) return;

      if (project.translation_type === "text_document") {
        await textDocumentAPI.deleteProject(projectId);
      } else {
        await projectsAPI.deleteProject(projectId);
      }

      setAllProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      setFilteredProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      setSuccessMessage("Project deleted successfully!");
      setSuccessModalVisible(true);
    } catch (err) {
      console.error(err);
      message.error("Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Translation Projects</Title>
          <Text>Manage your translation workflows and track progress</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>
          New Project
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <Search
          placeholder="Search projects by name or languages..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* Project List */}
      <ProjectList
        projects={filteredProjects}
        loading={loading}
        onDelete={handleDeleteProject}
        extractLanguagesFromName={extractLanguagesFromName}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isVisible={isCreateModalVisible}
        onCancel={handleCancel}
        onSubmit={handleCreateProject}
        form={form}
        loading={loading}
        backendError={backendError}
        sources={sources}
        languages={languages}
        versions={versions}
      />

      {/* Success Modal */}
      <SuccessModal
        isVisible={successModalVisible}
        message={successMessage}
        onClose={() => setSuccessModalVisible(false)}
      />
    </div>
  );
};

export default ZeroDraftGenerator;
