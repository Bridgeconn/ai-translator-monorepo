import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Card,
  Space,
  notification,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "./api";

const { Title, Text } = Typography;

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // context-aware notification
  const [notificationApi, contextHolder] = notification.useNotification();

  const onFinish = async (values) => {
    setLoading(true);

    const result = await authAPI.register(values);

    if (result?.error) {
      notificationApi.error({
        message: "Registration Failed",
        description: result.error,
        placement: "top",
      });
    } else {
      notificationApi.success({
        message: "Registration Successful",
        description: "Please login to continue.",
        placement: "top",
      });
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    }

    setLoading(false);
  };

  const styles = {
    page: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      padding: "20px",
      background: "#f6f8fb", // same as homepage/login
    },
    card: {
      width: "100%",
      maxWidth: 420,
      // padding: 20,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(17,24,39,0.06)",
      border: "1px solid #eef2fb",
    },
    badge: {
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
      boxShadow: "0 8px 30px rgba(99,66,255,0.12)",
      cursor: "pointer",
      transition: "transform 0.18s ease",
    },
    submitBtn: {
      background: "linear-gradient(135deg,#2C8DFB,#6C63FF)",
      border: "none",
      borderRadius: 10,
    },
  };

  return (
    <div style={styles.page}>
      {contextHolder}

      <Card style={styles.card}>
        <Space direction="vertical" style={{ width: "100%" }} align="center">
          <Link to="/" style={{ display: "inline-block" }}>
            <div
              style={styles.badge}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              文A
            </div>
          </Link>

          <Title level={3} style={{ marginBottom: 0, color: "rgba(6,18,40,0.9)" }}>
            Register
          </Title>
        </Space>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          style={{ marginTop: 20 }}
        >
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
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="Username"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="Email"
            />
          </Form.Item>

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
              size="large"
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={styles.submitBtn}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              Register
            </Button>
          </Form.Item>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            <Text style={{ color: "rgba(6,18,40,0.65)" }}>Already have an account?</Text>
            <Link
              to="/login"
              style={{
                color: "rgb(44, 141, 251)",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgb(244, 67, 54)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgb(44, 141, 251)")}
            >
              Sign In
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
