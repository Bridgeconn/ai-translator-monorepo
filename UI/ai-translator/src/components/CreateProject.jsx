import React from "react";
import { Modal, Form, Input, Select, Button, Space } from "antd";
import LanguageSelect from "./LanguageSelect";

const { Option } = Select;

const CreateProjectModal = ({
  isVisible,
  onCancel,
  onSubmit,
  form,
  loading,
  sources,
  versions,
  sourcesLoading,
  backendError, // <- general backend error
}) => {
  return (
    <>
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
          onFinish={onSubmit}
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

          <Form.Item
            label="Source"
            name="source_id"
            rules={[{ required: true, message: "Please select a source" }]}
            style={{ width: "100%" }}
          >
            <Select
              placeholder="Select source"
              loading={sourcesLoading}
              onChange={(sourceId) => {
                const selectedSource = sources.find(
                  (s) => s.source_id === sourceId
                );
                const targetLangId = form.getFieldValue("target_language_id");
                if (selectedSource && targetLangId) {
                  form.setFieldsValue({
                    project_name: `${selectedSource.language_name} - [Target Language] Translation`,
                  });
                }
              }}
              style={{ width: "100%" }}
            >
              {sources.map((source) => {
                const versionObj = Array.isArray(versions)
                  ? versions.find((v) => v.version_id === source.version_id)
                  : null;
                const versionAbbr = versionObj?.version_abbr || "";
                return (
                  <Option key={source.source_id} value={source.source_id}>
                    {source.language_name} {versionAbbr ? ` - ${versionAbbr}` : ""}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            label="Target Language"
            name="target_language_id"
            rules={[{ required: true, message: "Please select target language" }]}
            style={{ width: "100%" }}
          >
            <div className="full-width-select">
              <LanguageSelect
                label=""
                onChange={(langObj) => {
                  form.setFieldsValue({ target_language_id: langObj.language_id });
                  const selectedSourceId = form.getFieldValue("source_id");
                  const selectedSource = sources.find(
                    (s) => s.source_id === selectedSourceId
                  );
                  if (selectedSource && langObj) {
                    form.setFieldsValue({
                      project_name: `${selectedSource.language_name} - ${langObj.name} Translation`,
                    });
                  }
                }}
              />
            </div>
          </Form.Item>

          <Form.Item
            label="Translation Type"
            name="translation_type"
            rules={[
              { required: true, message: "Please select translation type" },
            ]}
            style={{ width: "100%" }}
          >
            <Select placeholder="Select type" style={{ width: "100%" }}>
              <Option value="verse">Verse Translation</Option>
              <Option value="word">Word Translation</Option>
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
    </>
  );
};

export default CreateProjectModal;
