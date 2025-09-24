import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  notification,
  Modal,
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authAPI } from "./api";

const { Title, Text } = Typography;

export default function LoginForm() {
  const navigate = useNavigate();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotForm] = Form.useForm();

  // ---- Notification API for antd v5 ----
  const [notificationApi, contextHolder] = notification.useNotification();

  // ---- Login mutation ----
  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: async (data) => {
      localStorage.setItem("token", data.access_token);
      notificationApi.success({
        message: "Login Successful",
        description: "Welcome back! Redirecting...",
        placement: "top",
      });

      try {
        const user = await authAPI.getCurrentUser();
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("justLoggedIn", "true");

        navigate("/quick-translation");
      } catch (error) {
        console.error("Failed to get user details:", error);
        navigate("/dashboard");
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      notificationApi.error({
        message: "Login Failed",
        description: error.response?.data?.detail || "Something went wrong",
        placement: "top",
      });
    },
  });

  const handleLogin = (values) => {
    loginMutation.mutate(values);
  };

  // ---- Forgot password mutation ----
  const forgotPasswordMutation = useMutation({
    mutationFn: authAPI.forgotPassword,
    onSuccess: () => {
      notificationApi.info({
        message: "Password Reset",
        description: "If that email exists, a reset link has been sent.",
        placement: "top",
      });
      forgotForm.resetFields();
      setForgotOpen(false);
    },
    onError: () => {
      // Still show success to prevent email enumeration
      msgApi.success("If that email exists, a reset link has been sent.");
      setForgotOpen(false);
    },
  });

  const handleForgot = (values) => {
    forgotPasswordMutation.mutate(values.email);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        background: "#f6f8fb",
      }}
    >
      {/* Render contextHolder for notifications */}
      {contextHolder}

      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(17,24,39,0.06)",
          border: "1px solid #eef2fb",
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} align="center">
          <Link to="/" style={{ display: "inline-block" }}>
            <div
              style={{
                background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
                width: 56,
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                color: "white",
                fontSize: 20,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 30px rgba(99,66,255,0.12)",
                transition: "transform 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              文A
            </div>
          </Link>
          <Title level={3} style={{ marginBottom: 0, color: "rgba(6,18,40,0.9)" }}>
            Login
          </Title>
        </Space>

        <Form
          onFinish={handleLogin}
          layout="vertical"
          size="large"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please enter your username!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <a onClick={() => setForgotOpen(true)}>Forgot password?</a>
          </div>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
              style={{
                background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
                border: "none",
                transition: "all 0.2s ease",
                borderRadius: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(1.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              Sign In
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Space>
              <Text style={{ color: "rgba(6,18,40,0.65)" }}>
                Don't have an account?
              </Text>
              <Link
                to="/register"
                style={{
                  color: "rgb(44,141,251)",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "rgb(244, 67, 54)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgb(44,141, 251)";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                Sign Up
              </Link>
            </Space>
          </div>
        </Form>
      </Card>

      {/* Forgot password modal */}
      <Modal
        title="Forgot Password"
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={null}
      >
        <Form form={forgotForm} layout="vertical" onFinish={handleForgot}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={forgotPasswordMutation.isPending}
            style={{
              background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
              border: "none",
            }}
          >
            Send reset link
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
