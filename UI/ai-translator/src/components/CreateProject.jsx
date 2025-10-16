import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, Space, message } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import LanguageSelect from "./LanguageSelect";
import api from "../api";

const { Option } = Select;

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
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [sourceForm] = Form.useForm();
  const [versionForm] = Form.useForm();

  const queryClient = useQueryClient();
  const [msgApi, contextHolder] = message.useMessage();

  /* -------- Helper: Update project name -------- */
  const updateProjectName = () => {
    const selectedSourceId = form.getFieldValue("source_id");
    const targetLangId = form.getFieldValue("target_language_id");

    const selectedSource = sources.find(
      (s) => s.source_id === selectedSourceId
    );
    const targetLang = languages?.find((l) => l.language_id === targetLangId);

    if (selectedSource && targetLang) {
      form.setFieldsValue({
        project_name: `${selectedSource.language_name} - ${targetLang.name}`,
      });
    } else if (selectedSource) {
      form.setFieldsValue({
        project_name: `${selectedSource.language_name} - [Target Language] Translation`,
      });
    }
  };

  /* -------- Source Creation Mutation -------- */
  const createSourceMutation = useMutation({
    mutationFn: (values) => api.post("/sources/", values),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["sources"]);
      setIsSourceModalOpen(false);
      sourceForm.resetFields();

      const newSource = res.data.data || res.data;
      msgApi.success("Source created successfully!");

      if (newSource?.source_id) {
        form.setFieldsValue({ source_id: newSource.source_id });
        updateProjectName();
      }
    },
    onError: (err) => {
      msgApi.error(err.response?.data?.detail || "Failed to create source");
    },
  });

  /* -------- Version Creation Mutation -------- */
  const createVersionMutation = useMutation({
    mutationFn: (values) => api.post("/versions/", values),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["versions"]);
      setIsVersionModalOpen(false);
      versionForm.resetFields();

      const newVersion = res.data.data || res.data;
      msgApi.success("Version created successfully!");

      if (newVersion?.version_id) {
        sourceForm.setFieldsValue({ version_id: newVersion.version_id });
      }
    },
    onError: (err) => {
      msgApi.error(err.response?.data?.detail || "Failed to create version");
    },
  });

  /* -------- Handlers -------- */
  const handleSourceChange = (sourceId) => {
    form.setFieldsValue({ source_id: sourceId });
    updateProjectName();
    // ✅ Find selected source object
    const selectedSource = sources.find((s) => s.source_id === sourceId);
  
    // ✅ Apply filtering based on source language name
    if (selectedSource && FILTER_MAP[selectedSource.language_name]) {
      setFilteredTargetLangs(FILTER_MAP[selectedSource.language_name]);
    } else {
      setFilteredTargetLangs([]); // show all
    }
  
    // ✅ Reset target if invalid
    const currentTargetId = form.getFieldValue("target_language_id");
    const currentTarget = languages.find((l) => l.language_id === currentTargetId);
    if (
      currentTarget &&
      selectedSource &&
      FILTER_MAP[selectedSource.language_name] &&
      !FILTER_MAP[selectedSource.language_name].includes(currentTarget.name)
    ) {
      form.setFieldsValue({ target_language_id: null });
    }
  }; 

  const handleTargetLanguageChange = (langObj) => {
    form.setFieldsValue({ target_language_id: langObj.language_id });
    updateProjectName();
  };
// 🔹 Restriction mapping for special source languages
const FILTER_MAP = {
  "Zeme Naga": ["English"],
  "Nagamese": ["English"],
  "Kachi Koli": ["Gujarati"],
  "Surjapuri": ["Hindi"],
};
// 🔹 State to hold allowed target language list
const [filteredTargetLangs, setFilteredTargetLangs] = useState([]);
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
        onCancel={onCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            let payload = { ...values };

            if (values.translation_type === "text_document") {
              const sourceObj = sources.find(
                (s) => s.source_id === values.source_id
              );
              const targetLang = languages.find(
                (l) => l.language_id === values.target_language_id
              );

              payload = {
                ...values,
                source_language: sourceObj
                  ? {
                      code: sourceObj.language_code,
                      name: sourceObj.language_name,
                    }
                  : null,
                target_language: targetLang
                  ? {
                      code: targetLang.code,
                      name: targetLang.name,
                      script: targetLang.script || null,
                    }
                  : null,
              };
            }

            onSubmit(payload); // send to parent
          }}
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

          {/* Source Selection with Add button */}
          <Form.Item
            label="Source"
            name="source_id"
            rules={[{ required: true, message: "Please select a source" }]}
            style={{ width: "100%" }}
          >
            <Space.Compact style={{ width: "100%" }}>
              <Select
                placeholder="Select a source or add a new source"
                loading={sourcesLoading}
                style={{ width: "calc(100% - 32px)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", borderRadius: "6px" }}
                onChange={handleSourceChange}
              >
                {sources.map((source) => {
                  const versionObj = Array.isArray(versions)
                    ? versions.find((v) => v.version_id === source.version_id)
                    : null;
                  const versionAbbr = versionObj?.version_abbr || "";
                  return (
                    <Option key={source.source_id} value={source.source_id}>
                      {source.language_name}
                      {versionAbbr ? ` - ${versionAbbr}` : ""}
                    </Option>
                  );
                })}
              </Select>
              <Button
                type="default"
                style={{boxShadow: "0 1px 4px rgba(0,0,0,0.15)"}}
                icon={
                  <PlusCircleOutlined
                    style={{ color: "#1890ff", cursor: "pointer"}}
                  />
                }
                onClick={() => setIsSourceModalOpen(true)}
                title="Add New Source"
              />
            </Space.Compact>
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
      onChange={handleTargetLanguageChange}
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
              <Option value="text_document">text_document Translation</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Project
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Source Modal */}
      <Modal
        title="Create New Source"
        open={isSourceModalOpen}
        onCancel={() => {
          setIsSourceModalOpen(false);
          sourceForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={sourceForm}
          layout="vertical"
          onFinish={(values) => createSourceMutation.mutate(values)}
        >
          <Form.Item
            label="Language"
            name="language_id"
            rules={[{ required: true, message: "Please select a language" }]}
          >
            <Select
              placeholder="Select a language"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {languages?.map((lang) => (
                <Option key={lang.language_id} value={lang.language_id}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

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
            <Select placeholder="Select a version" showSearch>
              {versions?.map((ver) => (
                <Option key={ver.version_id} value={ver.version_id}>
                  {ver.version_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Optional" />
          </Form.Item> */}

          <Button
            type="primary"
            htmlType="submit"
            loading={createSourceMutation.isLoading}
            block
          >
            Create Source
          </Button>
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
