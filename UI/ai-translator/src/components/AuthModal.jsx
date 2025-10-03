import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Typography,
  notification,
  Divider,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authAPI } from "./api";  // ⚠️ Check this path - might need ../api/api
import { useAuthModal } from "./AuthModalContext";

const { Text, Title } = Typography;

export default function AuthModal() {
  const navigate = useNavigate();
  const { isOpen, defaultView, close } = useAuthModal();
  const [isRegister, setIsRegister] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [notificationApi, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (isOpen) {
      setIsRegister(defaultView === "register");
    }
  }, [isOpen, defaultView]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      console.log("Attempting login with:", credentials);
      const result = await authAPI.login(credentials);
      console.log("Login result:", result);
      return result;
    },
    onSuccess: async (data) => {
      console.log("Login success:", data);
      localStorage.setItem("token", data.access_token);
      try {
        const user = await authAPI.getCurrentUser();
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("justLoggedIn", "true");
        
        setTimeout(() => {
          close();
          navigate("/quick-translation");
        }, 500);
      } catch (error) {
        console.error("Failed to get user details:", error);
        setTimeout(() => {
          close();
          navigate("/dashboard");
        }, 500);
      }
    },
    onError: (error) => {
      console.error("Full login error:", error);
      console.log("Error response:", error.response);
      console.log("Error data:", error.response?.data);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          "Invalid username or password";
      
      notificationApi.error({
        message: "Login Failed",
        description: errorMessage,
        placement: "top",
        duration: 5,
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData) => {
      console.log("Attempting registration with:", userData);
      const result = await authAPI.register(userData);
      console.log("Registration result:", result);
      return result;
    },
    onSuccess: () => {
      console.log("Registration success");
      notificationApi.success({
        message: "Registration Successful",
        description: "Please login to continue.",
        placement: "top",
      });
      registerForm.resetFields();
      setIsRegister(false);
    },
    onError: (error) => {
      console.error("Full registration error:", error);
      console.log("Error response:", error.response);
      console.log("Error data:", error.response?.data);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          "Registration failed";
      
      notificationApi.error({
        message: "Registration Failed",
        description: errorMessage,
        placement: "top",
        duration: 5,
      });
    },
  });

  const handleLogin = (values) => {
    console.log("handleLogin called with:", values);
    loginMutation.mutate(values);
    return false;
  };

  const handleRegister = (values) => {
    console.log("handleRegister called with:", values);
    registerMutation.mutate(values);
    return false;
  };

  const handleModalClose = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    setIsRegister(false);
    close();
  };

  const styles = {
    submitBtn: {
      background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
      border: "none",
      borderRadius: 8,
      height: 44,
      fontSize: 16,
      fontWeight: 600,
    },
    input: {
      height: 44,
      borderRadius: 8,
    },
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={isOpen}
        onCancel={handleModalClose}
        footer={null}
        width={460}
        centered
        destroyOnClose
        closeIcon={
          <span style={{ fontSize: 20, color: "rgba(0,0,0,0.45)" }}>×</span>
        }
      >
        {!isRegister ? (
          <div style={{ padding: "8px 0" }}>
            <Title
              level={2}
              style={{
                textAlign: "center",
                marginBottom: 32,
                fontWeight: 700,
                color: "rgba(0,0,0,0.88)",
              }}
            >
              Login
            </Title>

            <Form
              form={loginForm}
              onFinish={handleLogin}
              layout="vertical"
              requiredMark={false}
              preserve={false}
            >
              <Form.Item
                label="Username"
                name="username"
                rules={[
                  { required: true, message: "Please enter your username!" },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
                  placeholder="Username"
                  style={styles.input}
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Please enter your password!" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
                  placeholder="Enter your password"
                  style={styles.input}
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loginMutation.isPending}
                  style={styles.submitBtn}
                >
                  Login
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: "24px 0" }} />

            <div style={{ textAlign: "center" }}>
              <Text style={{ color: "rgba(0,0,0,0.65)" }}>
                Don't have an account?{" "}
              </Text>
              <a
                onClick={() => setIsRegister(true)}
                style={{
                  color: "#1890ff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign Up
              </a>
            </div>
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            <Title
              level={2}
              style={{
                textAlign: "center",
                marginBottom: 32,
                fontWeight: 700,
                color: "rgba(0,0,0,0.88)",
              }}
            >
              Register
            </Title>

            <Form
              form={registerForm}
              onFinish={handleRegister}
              layout="vertical"
              requiredMark={false}
              preserve={false}
            >
              <Form.Item
                label="Username"
                name="username"
                rules={[
                  { required: true, message: "Please enter a username!" },
                  {
                    pattern: /^[A-Za-z0-9_]+$/,
                    message:
                      "Username can only contain letters, numbers, and underscores!",
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
                  placeholder="Username"
                  style={styles.input}
                />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter your email!" },
                  { type: "email", message: "Please enter a valid email!" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
                  placeholder="your@email.com"
                  style={styles.input}
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Please enter a password!" },
                  {
                    min: 6,
                    message: "Password must be at least 6 characters!",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
                  placeholder="Enter your password"
                  style={styles.input}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={registerMutation.isPending}
                  style={styles.submitBtn}
                >
                  Register
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: "24px 0" }} />

            <div style={{ textAlign: "center" }}>
              <Text style={{ color: "rgba(0,0,0,0.65)" }}>
                Already have an account?{" "}
              </Text>
              <a
                onClick={() => setIsRegister(false)}
                style={{
                  color: "#1890ff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign In
              </a>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}