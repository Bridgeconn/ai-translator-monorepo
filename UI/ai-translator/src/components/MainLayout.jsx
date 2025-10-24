import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { authAPI } from "../api";
import {
  Layout,
  Avatar,
  Dropdown,
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

import { Tooltip } from "antd"; //  add this at the top with other imports
import { useAuthModal } from "./AuthModalContext"; // add at top of MainLayout

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { notification } = App.useApp();
  const [showWelcome, setShowWelcome] = useState(false);
  const { openLogin } = useAuthModal(); // inside your component

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
    onClick={onMenuClick} // 👈 attach the handler
    items={[
      { key: "/dashboard", label: "Dashboard" },
      { key: "/projects", label: "Projects" },
      // { key: "/sources", label: "Sources" },
      { key: "/quick-translation", label: "Quick Translation" },
    ]}
  />;
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      notification.success({
        message: "Success",
        description: "Logged out successfully",
      });
      navigate("/");
    } catch (error) {
      notification.error({
        message: "Error",
        description: "Logout failed",
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const handlePasswordReset = async () => {
    if (!currentPassword) {
      notification.error({
        message: "Error",
        description: "Please enter your current password",
      });
      return;
    }
    if (!newPassword) {
      notification.error({
        message: "Error",
        description: "Please enter a new password",
      });
      return;
    }
    if (newPassword.length < 6) {
      notification.error({
        message: "Error",
        description: "New password must be at least 6 characters",
      });
      return;
    }

    try {
      await authAPI.updateUser(user.user_id, {
        current_password: currentPassword,
        password: newPassword,
      });
      notification.success({
        message: "Success",
        description: "Password updated successfully",
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      //navigate("/login");
    } catch (error) {
      console.error(error);
      notification.error({
        message: "Error",
        description: "Failed to update password",
      });
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
          onClick: () => openLogin(), // 👈 open modal
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
    // { key: "/sources", icon: <FileTextOutlined />, label: "Sources" },
    { key: "/projects", icon: <FolderOutlined />, label: "Projects" },
    {
      key: "/quick-translation",
      icon: <ThunderboltOutlined />,
      label: "Quick Translation",
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (!token && protectedPaths.includes(key)) {
      openLogin(); //  force login before opening
      return;
    }
    navigate(key);
  };

  const selectedKey = location.pathname;
  useEffect(() => {
    // Show welcome notification only once after login
    const justLoggedIn = localStorage.getItem("justLoggedIn");

    if (justLoggedIn && !showWelcome) {
      notification.success({
        message: `Welcome, ${user.username || "User"}!`,
        description: "Glad to see you back.",
        placement: "topRight",
      });
      setShowWelcome(true);
      localStorage.removeItem("justLoggedIn"); // prevent showing again
    }
  }, [user, showWelcome, notification]);

  return location.pathname === "/" ? (
    <HomePage /> // render full-page gradient directly
  ) : (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        width={100}
        style={{
          background: "#fff",
          // borderRight: "25px solid #f0f0f0",
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
          {/* <Link to="/dashboard" style={{ display: "inline-block" }}> */}
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "rgb(44, 141, 251)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
              // cursor: "pointer", // show clickable
              transition: "transform 0.2s ease, background-color 0.2s ease",
            }}
          >
            文A
          </div>
          {/* </Link> */}
        </div>

        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          items={navigationItems.map((item) => {
            const isSelected = selectedKey === item.key;
            const words = item.label.split(" ");
            const isLongLabel = words.length > 1;

            return {
              key: item.key,
              icon: (
                // <Tooltip title={item.label} placement="right">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#7085fa" : "#8c8c8c",
                      // height: "100%",
                    }}
                  >
                    {/* Icon */}
                    <div style={{ fontSize: "14px", marginBottom: "6px", marginLeft:'10px', color: isSelected ? "#7085fa" : "black" }}>
                      {item.icon}
                    </div>

                    {/* Label — show neatly in 1 or 2 lines */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? "#7085fa" : "#555",
                        lineHeight: "14px",
                        textAlign: "center",
                        maxWidth: "100px",
                        wordWrap: "break-word",
                        whiteSpace: "normal",
                      }}
                    >
                      {words.map((w, i) => (
                        <span key={i} style={{marginLeft:'10px'}}>
                          {w}
                          {i !== words.length - 1 && <br />}{" "}
                          {/* 👈 only add line break between words */}
                        </span>
                      ))}
                    </div>
                  </div>
                // </Tooltip>
              ),
              label: null, // disable AntD's default label
              style: {
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                margin: "4px",
                borderLeft: isSelected
                  ? "2px solid #7085fa"
                  : "2px solid transparent",
                backgroundColor: isSelected
                  ? "rgba(139,92,246,0.12)"
                  : "transparent",
                transition: "all 0.2s ease",
              },
            };
          })}
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
              AI MT
            </Text>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Avatar
                icon={<UserOutlined />}
                style={{
                  cursor: "pointer",
                  backgroundColor: "rgb(44, 141, 251)",
                  color: "white",
                }}
                size="default"
              />
            </Dropdown>
            <Text
              style={{
                fontSize: "12px",
                marginTop: "4px",
                color: "rgb(0, 2, 0, 0.88)",
              }}
            >
              {user.username || "User"}
            </Text>
          </div>
        </Header>

        <Content
          style={{
            marginTop: location.pathname === "/" ? 0 : 64, // only offset for other pages
            padding: location.pathname === "/" ? 0 : 44,
            background: location.pathname === "/" ? "transparent" : "#f5f5f5",
            minHeight: "92vh",
          }}
        >
          <Outlet />
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