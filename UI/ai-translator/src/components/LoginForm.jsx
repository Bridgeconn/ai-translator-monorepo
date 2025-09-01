import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, message, Modal } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from './api';

const { Title, Text } = Typography;

export default function LoginForm() {
  const navigate = useNavigate();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotForm] = Form.useForm();

  // ---- Message API for antd v5 ----
  const [msgApi, contextHolder] = message.useMessage();

  // ---- Login mutation ----
  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: async (data) => {
      localStorage.setItem('token', data.access_token);
      msgApi.success('Login successful!');

      try {
        const user = await authAPI.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/quick-translation');
      } catch (error) {
        console.error('Failed to get user details:', error);
        navigate('/dashboard');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      msgApi.error(error.response?.data?.detail || 'Login failed');
    }
  });

  const handleLogin = (values) => {
    loginMutation.mutate(values);
  };

  // ---- Forgot password mutation ----
  const forgotPasswordMutation = useMutation({
    mutationFn: authAPI.forgotPassword,
    onSuccess: () => {
      msgApi.success('If that email exists, a reset link has been sent.');
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
      padding: '20px'
    }}>
      {/* Render message contextHolder for notifications */}
      {contextHolder}

      <Card style={{ width: '100%', maxWidth: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            backgroundColor: '#722ed1',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 24,
            margin: '0 auto 16px'
          }}>
            文A
          </div>
          <Title level={2} style={{ margin: 0, color: '#722ed1' }}>
            Zero Draft Generator
          </Title>
        </div>

        <Form onFinish={handleLogin} layout="vertical" size="large">
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
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
            >
              Sign In
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Space>
              <Text type="secondary">Don't have an account?</Text>
              <Link to="/register" style={{ color: '#722ed1' }}>
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
