import React from "react";
import { Modal, Typography } from "antd";

const { Text } = Typography;

const SuccessModal = ({ isVisible, message, onClose }) => {
  return (
    <Modal
      title="Success"
      open={isVisible}
      onOk={onClose}
      cancelButtonProps={{ style: { display: "none" } }}
      width={400}
    >
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }}>
          ✓
        </div>
        <Text style={{ fontSize: 16 }}>{message}</Text>
      </div>
    </Modal>
  );
};

export default SuccessModal;