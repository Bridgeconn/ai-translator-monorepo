import React, { useEffect } from "react";
import { Modal, Form, Input, Select, Button, Space } from "antd";

const { Option } = Select;

const EditProjectModal = ({
  isVisible,
  onCancel,
  onSubmit,
  form,
  loading,
  editingProject, // Add this prop
}) => {
  // Use useEffect to populate form when modal opens or editingProject changes
  useEffect(() => {
    if (isVisible && editingProject) {
      form.setFieldsValue({
        project_name: editingProject.name,
        translation_type: editingProject.translation_type,
      });
    }
  }, [isVisible, editingProject, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isVisible) {
      form.resetFields();
    }
  }, [isVisible, form]);

  return (
    <Modal
      title="Edit Project"
      open={isVisible}
      onCancel={onCancel}
      footer={null}
      width={500}
      destroyOnClose={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        style={{ marginTop: 16 }}
        preserve={false}
        initialValues={{
          project_name: editingProject?.name || "",
          translation_type: editingProject?.translation_type || "",
        }}
      >
        <Form.Item
          label="Project Name"
          name="project_name"
          rules={[
            { required: true, message: "Please enter project name" },
            { min: 1, message: "Project name cannot be empty" }
          ]}
        >
          <Input placeholder="Enter project name" />
        </Form.Item>

        <Form.Item
          label="Translation Type"
          name="translation_type"
          rules={[
            { required: true, message: "Please select translation type" },
          ]}
        >
          <Select placeholder="Select type">
            <Option value="verse">Verse Translation</Option>
            <Option value="word">Word Translation</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Project
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditProjectModal;