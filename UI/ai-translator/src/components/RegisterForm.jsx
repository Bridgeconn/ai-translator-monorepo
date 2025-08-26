import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Card,
  Space,
  message,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "./api";

const { Title } = Typography;

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await authAPI.register(values);
      message.success("Registration successful! Please login.");
      navigate("/login");
    } catch (error) {
      message.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f6fa",
      }}
    >
      <Card
        style={{
          width: 400,
          padding: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          borderRadius: "12px",
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} align="center">
          <div
            style={{
              backgroundColor: "#722ed1",
              borderRadius: "8px",
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
            }}
          >
            文A
          </div>
          <Title level={3} style={{ marginBottom: 0, color: "#722ed1" }}>
            Create Account
          </Title>
        </Space>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          {/* Full Name */}
          <Form.Item
            name="full_name"
            rules={[
              { required: true, message: "Please enter your full name!" },
              {
                pattern: /^[A-Za-z ]+$/,
                message: "Full name can only contain letters and spaces!",
              },
              {
                validator(_, value) {
                  if (!value || value.trim().length === 0) {
                    return Promise.reject(
                      new Error("Full name cannot be empty or spaces only!")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="Full Name" />
          </Form.Item>

          {/* Username */}
          <Form.Item
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
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          {/* Email */}
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          {/* Password */}
          <Form.Item
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
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          {/* Confirm Password */}
          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Passwords do not match!")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                background: "linear-gradient(90deg, #722ed1, #b37feb)",
                border: "none",
              }}
            >
              Create Account
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
