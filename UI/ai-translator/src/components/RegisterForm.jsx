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
  IdcardOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "./api";

const { Title, Text } = Typography;

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Add this line to create a context-aware message
  const [notificationApi, contextHolder] = notification.useNotification();

  const onFinish = async (values) => {
    setLoading(true);

    const result = await authAPI.register(values);

    if (result?.error) {
      // ✅ Use context-bound message
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
      }, 1000);    }

    setLoading(false);
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        position: "relative",               // allows layering
        // overflow: "hidden",                 // hides any overflowing shapes
        background: `
        radial-gradient(circle at top left, rgba(114,46,209,0.14) 0%, transparent 70%),
        radial-gradient(circle at bottom right, rgba(79,70,229,0.14) 0%, transparent 70%),
        repeating-linear-gradient(45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 10px, transparent 10px, transparent 20px),

        #f5f6fa
        `,

        padding: "20px",
      }}
    >
      {contextHolder}
      <Card
        style={{
          width: 400,
          padding: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          borderRadius: "12px",
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} align="center">
          <Link to="/" style={{ display: "inline-block" }}>
            <div
              style={{
                backgroundColor: "rgb(44, 141, 251)",
                backdropFilter: "blur(8px)",
                borderRadius: "12px",
                width: "50px",
                height: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(114, 46, 209, 0.25)",
                cursor: "pointer",
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
          <Title level={3} style={{ marginBottom: 0, color: "rgb(0, 0, 0, 0.85)" }}>
            Create Account
          </Title>
        </Space>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          {/* Full Name
          <Form.Item
            name="full_name"
            rules={[
              {
                pattern: /^[A-Za-z ]+$/,
                message: "Full name can only contain letters and spaces!",
              },
            ]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="Full Name (optional)" />
          </Form.Item> */}

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
          {/* <Form.Item
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
          </Form.Item> */}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                background: "rgb(44, 141, 251)",
                border: "none",
              }}
            >
              Create Account
            </Button>
          </Form.Item>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "6px",   // keeps a nice space between text and link
              marginTop: "8px", // optional, adds breathing room
            }}
          >
            <Text style={{ color: 'rgba(0, 0, 0, 0.70)' }}>Already have an account?</Text>
            <Link
              to="/login"
              style={{
                color: "rgb(44, 141, 251)",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgb(244, 67, 54)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgb(44, 141, 251)";
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              Sign In
            </Link>
          </div>


        </Form>
      </Card>
    </div>
  );
}
