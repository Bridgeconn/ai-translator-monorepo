// import { Button, Dropdown, Menu } from "antd";
// import { DownloadOutlined } from "@ant-design/icons";

// export default function DownloadDraftButton() {
//   const handleDownload = (format) => {
//     // Connect to backend API later
//     alert(`Downloading draft as ${format}`);
//   };

//   const menu = (
//     <Menu>
//       <Menu.Item key="txt" onClick={() => handleDownload("txt")}>
//         Text (.txt)
//       </Menu.Item>
//       <Menu.Item key="docx" onClick={() => handleDownload("docx")}>
//         Docx (.docx)
//       </Menu.Item>
//       <Menu.Item key="pdf" onClick={() => handleDownload("pdf")}>
//         PDF (.pdf)
//       </Menu.Item>
//     </Menu>
//   );

//   return (
//     <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
//       <Button 
//         type="primary" 
//         icon={<DownloadOutlined />}
//         style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
//       >
//         Download Draft
//       </Button>
//     </Dropdown>
//   );
// }

import { Button, Dropdown, Menu } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";
import React from "react";

// Utility: recursively extract plain text from React nodes
function extractText(node) {
  if (typeof node === "string" || typeof node === "number") {
    return node.toString();
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join(" ");
  }
  if (React.isValidElement(node)) {
    return extractText(node.props.children);
  }
  return "";
}

export default function DownloadDraftButton({ style, content }) {
  const handleDownload = async (format) => {
    const text = extractText(content);

    if (format === "txt" || format === "usfm") {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      saveAs(blob, `draft.${format}`);
    }

    if (format === "pdf") {
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });
      const lines = doc.splitTextToSize(text, 500); // wrap text to page width
      doc.text(lines, 40, 50);
      doc.save("draft.pdf");
    }

    if (format === "docx") {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [new Paragraph(text)],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "draft.docx");
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="txt" onClick={() => handleDownload("txt")}>
        Text (.txt)
      </Menu.Item>
      <Menu.Item key="docx" onClick={() => handleDownload("docx")}>
        Docx (.docx)
      </Menu.Item>
      <Menu.Item key="pdf" onClick={() => handleDownload("pdf")}>
        PDF (.pdf)
      </Menu.Item>
      <Menu.Item key="usfm" onClick={() => handleDownload("usfm")}>
        USFM (.usfm)
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        style={{ backgroundColor: "#722ed1", borderColor: "#722ed1", ...style }}
      >
        Download Draft
      </Button>
    </Dropdown>
  );
}

