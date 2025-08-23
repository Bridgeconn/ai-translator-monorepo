import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from './api';
import { 
  Layout, 
  Avatar,
  Dropdown,
  message,
  Typography,
  Menu,
  Modal,
  Input
} from 'antd';
import { 
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  FileTextOutlined,
  FolderOutlined,
  ThunderboltOutlined,
  KeyOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");

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
    if (!newPassword) {
      message.error("Please enter a new password");
      return;
    }

    try {
      await authAPI.updateUser(user.user_id, { password: newPassword });
      message.success("Password updated successfully. Please log in again.");

      // ✅ Auto logout after reset
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    } catch (error) {
      console.error(error);
      message.error("Failed to update password");
    } finally {
      setPasswordModalVisible(false);
      setNewPassword("");
    }
  };

  const userMenuItems = [
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
  ];

  // Navigation items for sidebar
  const navigationItems = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: 'Documents',
    },
    {
      key: '/projects',
      icon: <FolderOutlined />,
      label: 'Projects',
    },
    {
      key: '/ai-tools',
      icon: <ThunderboltOutlined />,
      label: 'AI Tools',
    }
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // Get current selected key based on pathname
  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        width={80}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 100
        }}
      >
        {/* Logo */}
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#8b5cf6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
             文A
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            background: 'transparent'
          }}
          items={navigationItems.map(item => ({
            key: item.key,
            icon: <div style={{ 
              fontSize: '20px', 
              color: selectedKey === item.key ? '#8b5cf6' : '#8c8c8c',
              display: 'flex',
              justifyContent: 'center'
            }}>
              {item.icon}
            </div>,
            style: {
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '8px 0',
              borderRadius: '8px'
            }
          }))}
        />
      </Sider>

      {/* Main Layout */}
      <Layout style={{ marginLeft: 80 }}>
        {/* Header */}
        <Header style={{ 
          backgroundColor: 'white', 
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          right: 0,
          left: 80,
          zIndex: 99,
          height: '64px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text strong style={{ fontSize: '18px', color: '#262626' }}>
            Zero Draft Generator
            </Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Text style={{ color: "#8c8c8c", fontSize: '14px' }}>
              {user.full_name || user.username || "Apple John"}
            </Text>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
              <Avatar 
                icon={<UserOutlined />} 
                style={{ 
                  cursor: "pointer", 
                  backgroundColor: '#f0f0f0',
                  color: '#8c8c8c'
                }} 
                size="default"
              />
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ 
          marginTop: 64,
          padding: '24px',
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 64px)'
        }}>
          {children}
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
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Modal>
    </Layout>
  );
}
