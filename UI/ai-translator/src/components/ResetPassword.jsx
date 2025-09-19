import React from 'react';
import { Form, Input, Button, Card, Typography, notification, App } from 'antd';
import { LockOutlined, CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from './api';

const { Title } = Typography;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { message } = App.useApp();

  const openSuccess = (msg) => {
    notification.open({
      message: "Success 🎉",
      description: msg,
      icon: <CheckCircleTwoTone twoToneColor="#52c41a" />,
      placement: "topRight",
      duration: 6,
      style: { borderRadius: 12, background: "#f6ffed", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }
    });
  };

  const openError = (msg) => {
    notification.open({
      message: "Error",
      description: msg,
      icon: <CloseCircleTwoTone twoToneColor="#ff4d4f" />,
      placement: "topRight",
      duration: 3,
      style: { borderRadius: 12, background: "#fff1f0", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }
    });
  };

  const resetMutation = useMutation({
    mutationFn: authAPI.resetPassword,
    onSuccess: (data) => {
      message.success(data.message ||"Your password has been reset. Please login with your new password.");
      navigate("/login");
    },
    onError: (error) => {
      console.error("Reset error:", error);
      message.error(error.response?.data?.detail || "Password reset failed");
    }
  });

  const handleReset = (values) => {
    if (!token) {
      openError("Invalid or missing reset token.");
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