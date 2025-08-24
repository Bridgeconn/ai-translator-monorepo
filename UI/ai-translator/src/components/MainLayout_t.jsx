// src/components/MainLayout.jsx
import React from "react";
import { Layout, Menu } from "antd";
import {
  FileTextOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider, Content, Header } = Layout;

const MainLayout = () => {
  const location = useLocation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            height: 64,
            margin: 16,
            background: "#722ed1",
            borderRadius: 8,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          文A
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: "/sources",
              icon: <FileTextOutlined />,
              label: <Link to="/sources">Source List</Link>,
            },
            
            {
              key: "/quick-translation",
              icon: <ThunderboltOutlined />,
              label: <Link to="/quick-translation">Quick Translation</Link>,
            },
          ]}
        />
      </Sider>

      {/* Content area */}
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h2 style={{ margin: 0 }}>Zero Draft Translator</h2>
        </Header>
        <Content style={{ margin: "24px", background: "#fff", padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
