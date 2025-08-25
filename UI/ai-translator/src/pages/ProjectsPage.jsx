import React from "react";
import { Card, Typography, Button } from "antd";

const { Title, Paragraph } = Typography;

export default function ProjectsPage() {
  return (
    <div>
      <Title level={2}>Projects</Title>
      <Paragraph>
        This is the Projects page. You can list, create, and manage projects here.
      </Paragraph>
      
      <Card style={{ marginTop: 16 }}>
        <Title level={4}>Example Project</Title>
        <Paragraph>Description of your project goes here.</Paragraph>
        <Button type="primary">Open Project</Button>
      </Card>
    </div>
  );
}
