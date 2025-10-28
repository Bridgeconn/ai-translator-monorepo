import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Space, message, Alert } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import LanguageSelect from "./LanguageSelect";
import api from "../api";

const { Option } = Select;

// 🔹 Restriction mapping for special source languages
const FILTER_MAP = {
  Kukna: ["Gujarati"],       // Kukna source → only Gujarati target
  Kutchi: ["Gujarati"],      // Kutchi source → only Gujarati target
  Surjapuri: ["Hindi"],      // Surjapuri source → only Hindi target
  // English: ["Zeme Naga", "Nagamese"],
  Gujarati: ["Kachi Koli", "Kukna", "Kutchi"],
  // Hindi: ["Surjapuri"],
  Nagamese: ["English"],
}; 

const CreateProjectModal = ({
  isVisible,
  onCancel,
  onSubmit, // Parent handles project creation
  form,
  loading,
  sources,
  versions,
  languages,
  sourcesLoading,
  backendError,
}) => {
  // State for nested modals
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionForm] = Form.useForm();
  
  // 🔹 State to hold allowed target language list
  const [filteredTargetLangs, setFilteredTargetLangs] = useState([]);

  const queryClient = useQueryClient();
  const [msgApi, contextHolder] = message.useMessage();
  const [isCreateDisabled, setIsCreateDisabled] = useState(false);
  const [filteredSourceLangs, setFilteredSourceLangs] = useState([]);
  useEffect(() => {
    if (isVisible) {
      // 🧹 Reset form and dropdown filters every time modal opens
      form.resetFields();
      setFilteredSourceLangs([]);
      setFilteredTargetLangs([]);
      setIsCreateDisabled(false);
    }
  }, [isVisible]);
  /* -------- Helper: Update project name -------- */
  const updateProjectName = () => {
    const sourceLangId = form.getFieldValue("source_language_id");
    const targetLangId = form.getFieldValue("target_language_id");

    const sourceLang = languages?.find((l) => l.language_id === sourceLangId);
    const targetLang = languages?.find((l) => l.language_id === targetLangId);

    if (sourceLang && targetLang) {
      form.setFieldsValue({
        project_name: `${sourceLang.name} - ${targetLang.name}`,
      });
    } else if (sourceLang) {
      form.setFieldsValue({
        project_name: `${sourceLang.name} - [Target Language] Translation`,
      });
    }
  };

  /* -------- Handlers -------- */
  const handleSourceLanguageChange = (langObj) => {
    form.setFieldsValue({ source_language_id: langObj.language_id });
    updateProjectName();
    setIsCreateDisabled(false); // reset

  const restrictedLangs = ["Zeme Naga", "Kachi Koli"];
  const gujaratiLang = "Gujarati";

  // 🟥 Case 1: Block Zeme Naga or Kachi Koli
  if (restrictedLangs.includes(langObj.name)) {
    msgApi.error(`${langObj.name} to any other translation is not possible`);
    setFilteredTargetLangs([]); // clear targets
    form.setFieldsValue({ target_language_id: null });
    setIsCreateDisabled(true);
    return;
  }

  // 🟨 Case 2: Gujarati → show all target languages
  if (langObj.name === gujaratiLang) {
    setFilteredTargetLangs([]); // all
    return;
  }

  // 🟩 Case 3: Kukna, Kutchi, Kachi Koli → only Gujarati target
  if (["Kukna", "Kutchi", "Kachi Koli"].includes(langObj.name)) {
    setFilteredTargetLangs(["Gujarati"]);
    return;
  }
    // ✅ Apply filtering based on source language name
    if (FILTER_MAP[langObj.name]) {
      setFilteredTargetLangs(FILTER_MAP[langObj.name]);
    } else {
      setFilteredTargetLangs([]); // show all
    }
  
    // ✅ Reset target if invalid
    const currentTargetId = form.getFieldValue("target_language_id");
    const currentTarget = languages.find((l) => l.language_id === currentTargetId);
    if (
      currentTarget &&
      FILTER_MAP[langObj.name] &&
      !FILTER_MAP[langObj.name].includes(currentTarget.name)
    ) {
      form.setFieldsValue({ target_language_id: null });
    }
  }; 

  const handleTargetLanguageChange = (langObj) => {
    form.setFieldsValue({ target_language_id: langObj.language_id });
    updateProjectName();
  
    let allowedSources = [];
    let infoMsg = "";
    let shouldResetSource = false;
  
    switch (langObj.name) {
      case "Zeme Naga":
      case "Nagamese":
        allowedSources = ["English"];
        infoMsg = `Only English can be used as source for ${langObj.name} translation`;
        shouldResetSource = true;
        break;
  
      case "Kachi Koli":
      case "Kutchi":
      case "Kukna":
        allowedSources = ["Gujarati"];
        infoMsg = `Only Gujarati can be used as source for ${langObj.name} translation`;
        shouldResetSource = true;
        break;
  
      case "Surjapuri":
        allowedSources = ["Hindi"];
        infoMsg = "Only Hindi can be used as source for Surjapuri translation";
        shouldResetSource = true;
        break;
  
      default:
        allowedSources = [];
        shouldResetSource = false;
    }
  
    // ✅ Only reset if restricted target was selected
    if (shouldResetSource) {
      form.setFieldsValue({ source_language_id: null });
      setFilteredSourceLangs(allowedSources);
      if (infoMsg) msgApi.info(infoMsg);
    } else {
      setFilteredSourceLangs([]); // restore all options
    }
  };
  
  /* -------- Version Creation Mutation -------- */
  const createVersionMutation = useMutation({
    mutationFn: (values) => api.post("/versions/", values),
    onSuccess: async (res) => {
      const newVersion = res.data.data || res.data;
      
      msgApi.success("Version created successfully!");
      
      // Refetch versions list
      await queryClient.refetchQueries(["versions"]);
      
      setIsVersionModalOpen(false);
      versionForm.resetFields();

      if (newVersion?.version_id) {
        setTimeout(() => {
          form.setFieldsValue({ version_id: newVersion.version_id });
        }, 100);
      }
    },
    onError: (err) => {
      msgApi.error(err.response?.data?.detail || "Failed to create version");
    },
  });

  /* -------- Project Submission with Auto Source Creation -------- */
  const handleProjectSubmit = async (values) => {
    try {
      // 1️⃣ Get source and target language details
      const sourceLang = languages.find(l => l.language_id === values.source_language_id);
      const targetLang = languages.find(l => l.language_id === values.target_language_id);
      const version = versions.find(v => v.version_id === values.version_id);

      if (!sourceLang || !targetLang || !version) {
        msgApi.error("Missing required language or version information");
        return;
      }

      // 2️⃣ Create a dedicated source for this project
      const sourceName = `${sourceLang.name} - ${version.version_abbr} (${values.translation_type})`;
      
      // msgApi.loading({ content: "Creating dedicated source...", key: "creating", duration: 0 });
      
      const sourceResponse = await api.post("/sources/", {
        language_id: values.source_language_id,
        version_id: values.version_id,
        name: sourceName, // Optional: if your API accepts a custom name
      });

      const newSource = sourceResponse.data.data || sourceResponse.data;

      if (!newSource?.source_id) {
        throw new Error("Failed to get source_id from response");
      }

      // msgApi.success({ content: "Source created successfully!", key: "creating" });

      // 3️⃣ Prepare project payload
      let payload = {
        ...values,
        source_id: newSource.source_id, // Use the newly created source
      };

      // Handle text_document special case
      if (values.translation_type === "text_document") {
        payload = {
          ...payload,
          source_language: {
            code: sourceLang.code,
            name: sourceLang.name,
          },
          target_language: {
            code: targetLang.code,
            name: targetLang.name,
            script: targetLang.script || null,
          },
        };
      }

      // 4️⃣ Call parent's onSubmit with the payload
      onSubmit(payload);

    } catch (err) {
      console.error("Error creating project with source:", err);
      msgApi.error(err.response?.data?.detail || "Failed to create project");
    }
  };

  return (
    <>
      {contextHolder}

      {/* CSS override to force LanguageSelect full width */}
      <style>
        {`
          .full-width-select .ant-select {
            width: 100% !important;
          }
        `}
      </style>

      <Modal
        title="Create New Project"
        open={isVisible}
        onCancel={() => {
          // 🧹 Reset form and dropdown filters when modal closes
          form.resetFields();
          setFilteredSourceLangs([]);
          setFilteredTargetLangs([]);
          setIsCreateDisabled(false);
          onCancel(); // keep parent cancel behavior
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleProjectSubmit}
          style={{ marginTop: 16 }}
        >
          {/* General backend error banner */}
          {backendError && (
            <div style={{ marginBottom: 16, color: "red", fontWeight: 500 }}>
              {backendError}
            </div>
          )}

          {/* Hidden field for project_name */}
          <Form.Item name="project_name" style={{ display: "none" }}>
            <Input />
          </Form.Item>

          {/* Source Language Selection (NEW) */}
          <Form.Item
            label="Source Language"
            name="source_language_id"
            rules={[{ required: true, message: "Please select source language" }]}
            style={{ width: "100%" }}
          >
            <div className="full-width-select">
            <LanguageSelect
  label=""
  value={form.getFieldValue("source_language_id")}
  onChange={(language_id) => {
    const langObj = languages.find(l => l.language_id === language_id);
    form.setFieldsValue({ source_language_id: language_id });
    if (langObj) handleSourceLanguageChange(langObj);
  }}
  filterList={filteredSourceLangs}
/>

            </div>
          </Form.Item>
          {isCreateDisabled && (
  <Alert
    message="This source language cannot be used for translation."
    type="error"
    showIcon
    style={{ marginBottom: 12 }}
  />
)}
          {/* Version Selection with Add button */}
          <Form.Item
            label={
              <Space>
                Version
                <PlusCircleOutlined
                  style={{ color: "#1890ff", cursor: "pointer" }}
                  onClick={() => setIsVersionModalOpen(true)}
                />
              </Space>
            }
            name="version_id"
            rules={[{ required: true, message: "Please select a version" }]}
          >
            <Select 
              placeholder="Select a version" 
              showSearch
              style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.15)", borderRadius: "6px" }}
            >
              {versions?.map((ver) => (
                <Option key={ver.version_id} value={ver.version_id}>
                  {ver.version_name} ({ver.version_abbr})
                </Option>
              ))}
            </Select>
          </Form.Item>
          {/* Target Language */}
          <Form.Item
            label="Target Language"
            name="target_language_id"
            rules={[{ required: true, message: "Please select target language" }]}
            style={{ width: "100%" }}
          >
            <div className="full-width-select">
            <LanguageSelect
  label=""
  value={form.getFieldValue("target_language_id")}   // ✅ show current selection
  onChange={(langId) => {
    handleTargetLanguageChange(languages.find(l => l.language_id === langId));
  }}
  filterList={filteredTargetLangs}
/>

            </div>
          </Form.Item>

          {/* Translation Type */}
          <Form.Item
            label="Translation Type"
            name="translation_type"
            rules={[
              { required: true, message: "Please select translation type" },
            ]}
            style={{ width: "100%" }}
          >
            <Select placeholder="Select type" style={{ width: "100%", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", borderRadius: "6px" }}>
              <Option value="verse">Verse Translation</Option>
              <Option value="word">Word Translation</Option>
              <Option value="text_document">Text Document Translation</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}disabled={isCreateDisabled}>
                Create Project
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Version Creation Modal */}
      <Modal
        title="Add New Version"
        open={isVersionModalOpen}
        onCancel={() => {
          setIsVersionModalOpen(false);
          versionForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={versionForm}
          layout="vertical"
          onFinish={(values) => createVersionMutation.mutate(values)}
        >
          <Form.Item
            label="Version Name"
            name="version_name"
            rules={[{ required: true, message: "Please enter version name" }]}
          >
            <Input placeholder="Enter version name" />
          </Form.Item>
          <Form.Item
            label="Abbreviation"
            name="version_abbr"
            rules={[{ required: true, message: "Please enter abbreviation" }]}
          >
            <Input placeholder="Enter abbreviation" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createVersionMutation.isLoading}
            block
          >
            Create Version
          </Button>
        </Form>
      </Modal>
    </>
  );
};

export default CreateProjectModal;