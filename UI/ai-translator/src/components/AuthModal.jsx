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
import { authAPI } from "./api";
import { useAuthModal } from "./AuthModalContext";

const { Text, Title } = Typography;

export default function AuthModal() {
  const navigate = useNavigate();
  const { isOpen, defaultView, close } = useAuthModal();
  const [isRegister, setIsRegister] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [notificationApi, contextHolder] = notification.useNotification();
  const [isForgot, setIsForgot] = useState(false);
  const [forgotForm] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      setIsRegister(defaultView === "register");
    }
  }, [isOpen, defaultView]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const result = await authAPI.login(credentials);
      return result;
    },
    onSuccess: async (data) => {
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
        setTimeout(() => {
          close();
          navigate("/dashboard");
        }, 500);
      }
    },
    onError: (error) => {
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
      const result = await authAPI.register(userData);
      return result;
    },
    onSuccess: () => {
      notificationApi.success({
        message: "Registration Successful",
        description: "Please login to continue.",
        placement: "top",
      });
      registerForm.resetFields();
      setIsRegister(false);
    },
    onError: (error) => {
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
  const forgotPasswordMutation = useMutation({
    mutationFn: (email) => authAPI.forgotPassword(email),
    onSuccess: () => {
      notificationApi.info({
        message: "Password Reset",
        description: "If that email exists, a reset link has been sent.",
        placement: "top",
      });
      forgotForm.resetFields();
      setIsForgot(false);
      setIsRegister(false); 
    },
    onError: () => {
      notificationApi.info({
        message: "Password Reset",
        description: "If that email exists, a reset link has been sent.",
        placement: "top",
      });
      setIsForgot(false);
      setIsRegister(false);
    },
  });
  
  const handleLogin = async(values) => {
    await loginMutation.mutateAsync(values);
  };

  const handleRegister = async(values) => {
    await registerMutation.mutateAsync(values);
  };
  const handleForgot = (values) => {
    forgotPasswordMutation.mutate(values.email);
  };
  

  const handleModalClose = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    setIsRegister(false);
    setIsForgot(false);
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
        style={{
            backdropFilter: "blur(8px)", 
            backgroundColor: "rgba(0,0,0,0.3)", 
          }}
        closeIcon={
          <span style={{ fontSize: 20, color: "rgba(0,0,0,0.45)" }}>×</span>
        }
      >
        {isForgot ? (
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
              Forgot Password
            </Title>
  
            <Form
              form={forgotForm}
              layout="vertical"
              onFinish={handleForgot}
              requiredMark={false}
            >
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="you@example.com"
                  style={styles.input}
                />
              </Form.Item>
  
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={forgotPasswordMutation.isPending}
                  style={styles.submitBtn}
                >
                  Send Reset Link
                </Button>
              </Form.Item>
            </Form>
  
            <Divider style={{ margin: "24px 0" }} />
  
            <div style={{ textAlign: "center" }}>
              <Text style={{ color: "rgba(0,0,0,0.65)" }}>
                Remembered your password?{" "}
              </Text>
              <a
                onClick={() => setIsForgot(false)}
                style={{ color: "#1890ff", fontWeight: 600, cursor: "pointer" }}
              >
                Sign In
              </a>
            </div>
          </div>
        ) : !isRegister ? (
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
  
              {/* Forgot password link */}
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <a
                  onClick={() => setIsForgot(true)}
                  style={{ cursor: "pointer" }}
                >
                  Forgot password?
                </a>
              </div>
  
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