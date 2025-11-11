// // ProjectListPage.jsx
// import React, { useEffect, useState } from "react";
// import { Spin, message } from "antd";
// import ProjectList from "./ProjectList";
// import { projectsAPI, textDocumentAPI } from "./api"; // Adjust path if needed

// const ProjectListPage = () => {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Extract source/target languages from project name (if applicable)
//   const extractLanguagesFromName = (name) => {
//     if (!name) return { source_language: "-", target_language: "-" };
//     const parts = name.split("-");
//     return {
//       source_language: parts[0]?.trim() || "-",
//       target_language: parts[1]?.trim() || "-",
//     };
//   };

//   useEffect(() => {
//     const fetchAllProjects = async () => {
//       setLoading(true);
//       try {
//         const [normalProjects, textDocProjects] = await Promise.all([
//           projectsAPI.getAllProjects(),
//           textDocumentAPI.getAllProjects(true), // summaryOnly = true
//         ]);

//         // Normalize text document projects to match normal project structure
//         const formattedTextDocProjects = textDocProjects.map((p) => ({
//           project_id: p.project_id,
//           name: p.project_name,
//           translation_type: "text_document",
//         }));

//         // Merge both lists
//         const combinedProjects = [...normalProjects, ...formattedTextDocProjects];
//         setProjects(combinedProjects);
//       } catch (err) {
//         console.error(err);
//         message.error("Failed to fetch projects");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAllProjects();
//   }, []);

//   const handleEdit = (project) => {
//     message.info(`Edit project: ${project.name}`);
//   };

//   const handleDelete = async (projectId) => {
//     try {
//       const project = projects.find((p) => p.project_id === projectId);
//       if (!project) return;

//       if (project.translation_type === "text_document") {
//         await textDocumentAPI.deleteProject(projectId);
//       } else {
//         await projectsAPI.deleteProject(projectId);
//       }

//       setProjects(projects.filter((p) => p.project_id !== projectId));
//       message.success("Project deleted successfully");
//     } catch (err) {
//       console.error(err);
//       message.error("Failed to delete project");
//     }
//   };

//   return (
//     <ProjectList
//       projects={projects}
//       loading={loading}
//       onEdit={handleEdit}
//       onDelete={handleDelete}
//       extractLanguagesFromName={extractLanguagesFromName}
//     />
//   );
// };

// export default ProjectListPage;
