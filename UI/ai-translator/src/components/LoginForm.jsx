import React from 'react';
import { Form, Input, Button, Card, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from './api';

const { Title, Text } = Typography;

export default function LoginForm() {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: async (data) => {
      localStorage.setItem('token', data.access_token);
      message.success('Login successful!');
      
      // Get user details and navigate
      try {
        const user = await authAPI.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to get user details:', error);
        navigate('/dashboard'); // Navigate anyway
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      message.error(error.response?.data?.detail || 'Login failed');
    }
  });

  const handleLogin = (values) => {
    loginMutation.mutate(values);
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
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

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
    </div>
  );
}