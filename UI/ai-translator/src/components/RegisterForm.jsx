import React from 'react';
import { Form, Input, Button, Card, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from './api';

const { Title, Text } = Typography;

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: () => {
      message.success('Registration successful! Please login.');
      form.resetFields();
      navigate('/login');
    },
    onError: (error) => {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      message.error(errorMessage);
    }
  });

  const handleRegister = (values) => {
    const { confirm_password, ...userData } = values; // remove confirm_password
    registerMutation.mutate(userData);
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
            Create Account
          </Title>
        </div>

        <Form form={form} onFinish={handleRegister} layout="vertical" size="large">
          <Form.Item
            name="full_name"
            rules={[{ required: true, message: 'Please enter your full name!' }]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please enter a username!' },
              { min: 3, message: 'Username must be at least 3 characters!' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter a password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={registerMutation.isPending}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
            >
              Create Account
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Space>
              <Text type="secondary">Already have an account?</Text>
              <Link to="/login" style={{ color: '#722ed1' }}>
                Sign In
              </Link>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
}
