// src/components/MainLayout.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { authAPI } from "../api";
import {
  Layout,
  Avatar,
  Dropdown,
  message,
  Typography,
  Menu,
  Modal,
  Input,
  App,
} from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  FileTextOutlined,
  FolderOutlined,
  ThunderboltOutlined,
  KeyOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { message } = App.useApp();
// inside MainLayout.jsx
const token = localStorage.getItem("token");
const protectedPaths = ["/dashboard", "/projects", "/sources"];

const onMenuClick = ({ key }) => {
  if (!token && protectedPaths.includes(key)) {
    navigate("/login");
    return;
  }
  navigate(key);
};
<Menu
  theme="dark"
  mode="inline"
  onClick={onMenuClick}   // 👈 attach the handler
  items={[
    { key: "/dashboard", label: "Dashboard" },
    { key: "/projects", label: "Projects" },
    { key: "/sources", label: "Sources" },
    { key: "/quick-translation", label: "Quick Translation" }
  ]}
/>
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      message.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      message.error("Logout failed");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const handlePasswordReset = async () => {
    if (!currentPassword) {
      message.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      message.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      message.error("New password must be at least 6 characters");
      return;
    }

    try {
      await authAPI.updateUser(user.user_id, { 
        current_password: currentPassword, 
        password: newPassword 
      });
      message.success("Password updated successfully");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      //navigate("/login");
    } catch (error) {
      console.error(error);
      message.error("Failed to update password");
    } finally {
      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
    }
  };
const userMenuItems = token
? [
    {
      key: "resetPassword",
      label: "Reset Password",
      icon: <KeyOutlined />,
      onClick: () => setPasswordModalVisible(true),
    },
    {
      key: "signout",
      label: "Sign Out",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]
: [
    {
      key: "login",
      label: "Login",
      icon: <UserOutlined />,
      onClick: () => navigate("/login"),
    },
    {
      key: "home",
      label: "Back to Home",
      icon: <HomeOutlined />,
      onClick: () => navigate("/"),
    },
  ];
    const navigationItems = [
      { key: "/dashboard", icon: <HomeOutlined />, label: "Dashboard" },
      { key: "/sources", icon: <FileTextOutlined />, label: "Sources" },
      { key: "/projects", icon: <FolderOutlined />, label: "Projects" },
      { key: "/quick-translation", icon: <ThunderboltOutlined />, label: "Quick Translation" },
    ];
    
  
    const handleMenuClick = ({ key }) => {
      if (!token && protectedPaths.includes(key)) {
        navigate("/login"); //  force login before opening
        return;
      }
      navigate(key);
    };

  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        width={80}
        style={{
          background: "#fff",
          borderRight: "1px solid #f0f0f0",
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 0,
          zIndex: 100,
        }}
      >
       {/* Logo */}
<div
  style={{
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: "1px solid #f0f0f0",
  }}
>
  <Link to="/dashboard" style={{ display: "inline-block" }}>
    <div
      style={{
        width: "40px",
        height: "40px",
        backgroundColor: "#8b5cf6",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: "14px",
        cursor: "pointer", // show clickable
        transition: "transform 0.2s ease, background-color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.backgroundColor = "#6d28d9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.backgroundColor = "#8b5cf6";
      }}
    >
      文A
    </div>
  </Link>
        </div>

        {/* Nav icons */}
        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          style={{ border: "none", background: "transparent" }}
          items={navigationItems.map((item) => ({
            key: item.key,
            icon: (
              <div
                style={{
                  fontSize: "20px",
                  color: selectedKey === item.key ? "#8b5cf6" : "#8c8c8c",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </div>
            ),
            style: {
              height: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "8px 0",
              borderRadius: "8px",
              backgroundColor:
                selectedKey === item.key ? "rgba(139,92,246,0.1)" : "transparent",
            },
          }))}
        />
      </Sider>

      <Layout style={{ marginLeft: 80 }}>
        <Header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #f0f0f0",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "fixed",
            top: 0,
            right: 0,
            left: 80,
            zIndex: 99,
            height: "64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Text strong style={{ fontSize: "18px", color: "#262626" }}>
              Zero Draft Generator
            </Text>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
              <Avatar
                icon={<UserOutlined />}
                style={{
                  cursor: "pointer",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                }}
                size="default"
              />
            </Dropdown>
            <Text style={{ fontSize: "12px", marginTop: "4px", color: "#722ed1" }}>
              {user.full_name || user.username || "User"}
            </Text>
          </div>
        </Header>

        <Content
          style={{
            marginTop: 64,
            padding: "24px",
            background: "#f5f5f5",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          <Outlet /> {/* ✅ This renders nested pages */}
        </Content>
      </Layout>

      {/* Reset Password Modal */}
      <Modal
        title="Reset Password"
        open={passwordModalVisible}
        onOk={handlePasswordReset}
        onCancel={() => setPasswordModalVisible(false)}
        okText="Update Password"
      >
        <Input.Password
          placeholder="Enter current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={{ marginBottom: "12px" }}
        />
        <Input.Password
          placeholder="Enter new password (min 6 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Modal>
    </Layout>
  );
}