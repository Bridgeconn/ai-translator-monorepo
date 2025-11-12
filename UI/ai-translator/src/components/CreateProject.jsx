import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Space, message, Alert } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import LanguageSelect from "./LanguageSelect";
import api from "../api";

const { Option } = Select;
const FILTER_MAP = {
  Kukna: ["Gujarati"],
  Kutchi: ["Gujarati"],
  Surjapuri: ["Hindi"],
  Gujarati: ["Kachi Koli", "Kukna", "Kutchi"],
  Nagamese: ["English"],
};

const CreateProjectModal = ({
  isVisible,
  onCancel,
  onSubmit,
  form,
  loading,
  versions,
  languages,
  backendError,
}) => {
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionForm] = Form.useForm();
  const [filteredTargetLangs, setFilteredTargetLangs] = useState([]);
  const queryClient = useQueryClient();
  const [msgApi, contextHolder] = message.useMessage();
  const [filteredSourceLangs, setFilteredSourceLangs] = useState([]);
  // ✅ Only use state for language selection
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  useEffect(() => {
    if (isVisible) {
      // Reset everything when modal opens
      form.resetFields();
      setFilteredSourceLangs([]);
      setFilteredTargetLangs([]);
      setSelectedSource(null);
      setSelectedTarget(null);
    }
  }, [isVisible, form]);

  /* -------- Helper: Update project name -------- */
  const updateProjectName = (source, target) => {
    if (source && target) {
      form.setFieldsValue({
        project_name: `${source.name} - ${target.name}`,
      });
    } else if (source) {
      form.setFieldsValue({
        project_name: `${source.name} - [Target Language] Translation`,
      });
    }
  };

  /* -------- Helper: Check if pair is valid -------- */
  const isValidPair = (source, target) => {
    if (!source || !target) return true; // Not enough info to validate
    if (source.language_id === target.language_id) return false;

    const restrictedSources = ["Zeme Naga", "Kachi Koli"];
    if (restrictedSources.includes(source.name)) return false;

    // Check target restrictions
    switch (target.name) {
      case "Zeme Naga":
      case "Nagamese":
        return source.name === "English";
      
      case "Kachi Koli":
      case "Kutchi":
      case "Kukna":
        return source.name === "Gujarati";
      
      case "Surjapuri":
        return source.name === "Hindi";
      
      default:
        // Check if source has restrictions
        if (["Kukna", "Kutchi", "Kachi Koli"].includes(source.name)) {
          return target.name === "Gujarati";
        }
        if (FILTER_MAP[source.name]) {
          return FILTER_MAP[source.name].includes(target.name);
        }
        return true;
    }
  };

  /* -------- Check if button should be disabled -------- */
  const shouldDisableButton = () => {
    // Disable if either is not selected
    if (!selectedSource || !selectedTarget) return true;
    
    // Disable if pair is invalid
    return !isValidPair(selectedSource, selectedTarget);
  };
  const handleSourceLanguageChange = (langObj) => {
    console.log("Source changed:", langObj);
    
    if (!langObj) {
      // User cleared source
      setSelectedSource(null);
      setFilteredTargetLangs([]);
      setFilteredSourceLangs([]);
      updateProjectName(null, selectedTarget);
      return;
    }
    // Update state
    setSelectedSource(langObj);

    const restrictedLangs = ["Zeme Naga", "Kachi Koli"];
    const gujaratiLang = "Gujarati";

    // Case 1: Restricted source - show error immediately
    if (restrictedLangs.includes(langObj.name)) {
      msgApi.error(`${langObj.name} to any other translation is not possible`);
      setFilteredTargetLangs([]);
      setSelectedTarget(null);
      updateProjectName(langObj, null);
      return;
    }

    // Check if current target is still valid
    if (selectedTarget) {
      const pairIsValid = isValidPair(langObj, selectedTarget);
      if (!pairIsValid) {
        setSelectedTarget(null);
        msgApi.warning(`${selectedTarget.name} is not a valid target for ${langObj.name}`);
      }
    }

    // Apply filtering for target languages
    if (langObj.name === gujaratiLang) {
      setFilteredTargetLangs([]);
    } else if (["Kukna", "Kutchi", "Kachi Koli"].includes(langObj.name)) {
      setFilteredTargetLangs(["Gujarati"]);
    } else if (FILTER_MAP[langObj.name]) {
      setFilteredTargetLangs(FILTER_MAP[langObj.name]);
    } else {
      setFilteredTargetLangs([]);
    }
    updateProjectName(langObj, selectedTarget);
  };

  const handleTargetLanguageChange = (langObj) => {
    if (!langObj) {
      // User cleared target
      setSelectedTarget(null);
      setFilteredSourceLangs([]);
      updateProjectName(selectedSource, null);
      return;
    }

    // Prevent selecting same language on both sides
    if (selectedSource && selectedSource.language_id === langObj.language_id) {
      msgApi.warning("Source and Target languages cannot be the same.");
      return;
    }

    // Update state
    setSelectedTarget(langObj);

    let allowedSources = [];
    let infoMsg = "";
    let shouldClearSource = false;

    switch (langObj.name) {
      case "Zeme Naga":
      case "Nagamese":
        allowedSources = ["English"];
        infoMsg = `Only English can be used as source for ${langObj.name} translation`;
        shouldClearSource = selectedSource && !allowedSources.includes(selectedSource.name);
        break;

      case "Kachi Koli":
      case "Kutchi":
      case "Kukna":
        allowedSources = ["Gujarati"];
        infoMsg = `Only Gujarati can be used as source for ${langObj.name} translation`;
        shouldClearSource = selectedSource && !allowedSources.includes(selectedSource.name);
        break;

      case "Surjapuri":
        allowedSources = ["Hindi"];
        infoMsg = "Only Hindi can be used as source for Surjapuri translation";
        shouldClearSource = selectedSource && !allowedSources.includes(selectedSource.name);
        break;

      default:
        allowedSources = [];
    }

    setFilteredSourceLangs(allowedSources);

    // Reset invalid source when restriction applies
    if (shouldClearSource) {
      setSelectedSource(null);
      msgApi.warning(`Current source language (${selectedSource.name}) is not compatible with ${langObj.name}. Please select ${allowedSources.join(' or ')}.`);
    } else if (allowedSources.length > 0) {
      msgApi.info(infoMsg);
    }
    updateProjectName(selectedSource, langObj);
  };

  /* -------- Version Creation Mutation -------- */
  const createVersionMutation = useMutation({
    mutationFn: (values) => api.post("/versions/", values),
    onSuccess: async (res) => {
      const newVersion = res.data.data || res.data;
      msgApi.success("Version created successfully!");
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

  const handleProjectSubmit = async (values) => {
    try {
      // ✅ Final validation using state
      if (!selectedSource || !selectedTarget) {
        msgApi.error("Please select both source and target languages");
        return;
      }

      if (!isValidPair(selectedSource, selectedTarget)) {
        msgApi.error("Invalid language pair selected");
        return;
      }

      const version = versions.find(v => v.version_id === values.version_id);
      if (!version) {
        msgApi.error("Missing version information");
        return;
      }

      // Use state values for API call
      const sourceName = `${selectedSource.name} - ${version.version_abbr} (${values.translation_type})`;
      const sourceResponse = await api.post("/sources/", {
        language_id: selectedSource.language_id,
        version_id: values.version_id,
        name: sourceName,
      });

      const newSource = sourceResponse.data.data || sourceResponse.data;

      if (!newSource?.source_id) {
        throw new Error("Failed to get source_id from response");
      }

      let payload = {
        ...values,
        source_id: newSource.source_id,
        source_language_id: selectedSource.language_id,
        target_language_id: selectedTarget.language_id,
      };

      if (values.translation_type === "text_document") {
        payload = {
          ...payload,
          source_language: {
            code: selectedSource.code,
            name: selectedSource.name,
          },
          target_language: {
            code: selectedTarget.code,
            name: selectedTarget.name,
            script: selectedTarget.script || null,
          },
        };
      }

      onSubmit(payload);

    } catch (err) {
      console.error("Error creating project with source:", err);
      msgApi.error(err.response?.data?.detail || "Failed to create project");
    }
  };

  return (
    <>
      {contextHolder}

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
          form.resetFields();
          setFilteredSourceLangs([]);
          setFilteredTargetLangs([]);
          setSelectedSource(null);
          setSelectedTarget(null);
          onCancel();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={() => handleProjectSubmit(form.getFieldsValue(true))}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="source_language_id" hidden>
  <Input />
</Form.Item>
<Form.Item name="target_language_id" hidden>
  <Input />
</Form.Item>
          {backendError && (
            <div style={{ marginBottom: 16, color: "red", fontWeight: 500 }}>
              {backendError}
            </div>
          )}

          <Form.Item name="project_name" style={{ display: "none" }}>
            <Input />
          </Form.Item>

          {/* Source Language Selection */}
          <Form.Item
            label="Source Language"
            rules={[{ required: true, message: "Please select source language" }]}
            style={{ width: "100%" }}
          >
            <div className="full-width-select">
              <LanguageSelect
                key={filteredSourceLangs.join(",") || "all-source"}
                label=""
                value={selectedSource}
                allowClear
                onChange={handleSourceLanguageChange}
                filterList={filteredSourceLangs}
              />
            </div>
          </Form.Item>

          {/* ✅ Only show alert when BOTH are selected AND invalid */}
          {selectedSource && selectedTarget && !isValidPair(selectedSource, selectedTarget) && (
            <Alert
              message="This language pair is not valid for translation."
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Version Selection */}
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
            rules={[{ required: true, message: "Please select target language" }]}
            style={{ width: "100%" }}
          >
            <div className="full-width-select">
              <LanguageSelect
                key={filteredTargetLangs.join(",") || "all-target"}
                label=""
                value={selectedTarget}
                allowClear
                onChange={handleTargetLanguageChange}
                filterList={filteredTargetLangs}
              />
            </div>
          </Form.Item>

          <Form.Item
            label="Translation Type"
            name="translation_type"
            rules={[{ required: true, message: "Please select translation type" }]}
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
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                disabled={shouldDisableButton()}
              >
                Create Project
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

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