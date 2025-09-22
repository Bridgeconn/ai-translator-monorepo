import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, notification, Modal } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from './api';

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
      localStorage.setItem('token', data.access_token);
      notificationApi.success({
        message: "Login Successful",
        description: "Welcome back! Redirecting...",
        placement: "top",
      });
      
      try {
        const user = await authAPI.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('justLoggedIn', 'true');


        navigate('/quick-translation');
      } catch (error) {
        console.error('Failed to get user details:', error);
        navigate('/dashboard');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      notificationApi.error({
        message: "Login Failed",
        description: error.response?.data?.detail || "Something went wrong",
        placement: "top",
      });
          }
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
      msgApi.success('If that email exists, a reset link has been sent.');
      setForgotOpen(false);
    }
  });

  const handleForgot = (values) => {
    forgotPasswordMutation.mutate(values.email);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        background: `
      radial-gradient(circle at top left, rgba(114,46,209,0.14) 0%, transparent 70%),
      radial-gradient(circle at bottom right, rgba(79,70,229,0.14) 0%, transparent 70%),
      repeating-linear-gradient(45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 10px, transparent 10px, transparent 20px),
      #f5f6fa
       `,

      }}
    >
      {/* Render contextHolder for notifications */}
      {contextHolder}

      <Card style={{ width: '100%', maxWidth: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" style={{ width: "100%" }} align="center">
          <Link to="/" style={{ display: "inline-block" }}>
            <div
              style={{
                backgroundColor: "rgb(44, 141, 251)", // updated to match home page
                backdropFilter: "blur(8px)",             // adds glassy effect like home page
                width: "50px",
                height: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                color: "white",
                fontSize: "20px",  // ⬅️ scaled down
                fontWeight: "bold", // ⬅️ add this
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(114, 46, 209, 0.25)", // lighter shadow since smaller
                transition: "transform 0.2s ease, background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.backgroundColor = "rgb(44, 141, 251)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.backgroundColor = "rgb(44, 141, 251)";
              }}
            >
              文A
            </div>
          </Link>
          <Title level={2} style={{ marginBottom: 0, color: "rgba(0, 0, 0, 0.88)" }}>
            Zero Draft Generator
          </Title>
        </Space>



        <Form onFinish={handleLogin} layout="vertical" size="large" style={{ marginTop: 20 }}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please enter your username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <a onClick={() => setForgotOpen(true)}>Forgot password?</a>
          </div>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
              style={{
                background: "rgb(44, 141, 251)", // gradient like Register
                border: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(1.05)"; // subtle hover glow
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              Sign In
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Space>
              <Text style={{ color: 'rgba(0, 0, 0, 0.70)' }}>Don't have an account?</Text>
              <Link
                to="/register"
                style={{
                  color: 'rgb(44,141, 251)',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgb(244, 67, 54)'; 
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgb(44,141, 251)';
                  e.currentTarget.style.textDecoration = 'none';
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
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={forgotPasswordMutation.isPending}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
          >
            Send reset link
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
