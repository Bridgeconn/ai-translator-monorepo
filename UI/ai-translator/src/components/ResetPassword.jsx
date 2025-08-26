import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from './api';

const { Title } = Typography;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const resetMutation = useMutation({
    mutationFn: authAPI.resetPassword,
    onSuccess: () => {
      message.success("Password reset successful! Please login.");
      navigate("/login");
    },
    onError: (error) => {
      console.error("Reset error:", error);
      message.error(error.response?.data?.detail || "Password reset failed");
    }
  });

  const handleReset = (values) => {
    if (!token) {
      message.error("Invalid or missing token");
      return;
    }
    resetMutation.mutate({
      token,
      new_password: values.password,
      confirm_password: values.confirm,
    });
  };


  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      backgroundColor: "#f0f2f5",
      padding: 20
    }}>
      <Card style={{ width: "100%", maxWidth: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title level={2} style={{ color: "#722ed1" }}>Reset Password</Title>
        </div>

        <Form layout="vertical" size="large" onFinish={handleReset}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[{ required: true, message: "Please enter a new password" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="New password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match!"));
                }
              })
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={resetMutation.isPending}
            style={{ backgroundColor: "#722ed1", borderColor: "#722ed1" }}
          >
            Reset Password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
