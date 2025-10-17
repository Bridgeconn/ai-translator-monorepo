import React from "react";
import { Modal, Typography } from "antd";

const { Text } = Typography;

const SuccessModal = ({ isVisible, message, onClose }) => {
  return (
    <Modal
      title="Success"
      open={isVisible}
      onOk={onClose}
      onCancel={onClose} // ✅ makes the ❌ and outside click work
      closable={true}    // ✅ shows the X icon
      maskClosable={true} // ✅ allow closing by clicking outside
      cancelButtonProps={{ style: { display: "none" } }}
      width={250}
    >
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: 30, color: "#52c41a", marginBottom: 6 }}>
          ✓
        </div>
        <Text style={{ fontSize: 16 }}>{message}</Text>
      </div>
    </Modal>
  );
};

export default SuccessModal;