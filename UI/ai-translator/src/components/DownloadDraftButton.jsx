import { Button, Dropdown } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import React from "react";

// Utility: extract text while preserving line breaks
function extractLines(node) {
  if (typeof node === "string") return node;
  if (!node) return "";
  if (Array.isArray(node)) {
    return node.map(extractLines).join("");
  }
  if (React.isValidElement(node)) {
    if (node.type === "br") return "\n"; // preserve <br />
    return extractLines(node.props.children);
  }
  return "";
}

export default function DownloadDraftButton({ style, content, disabled = false }) {
  const rawText = extractLines(content);
  const hasContent = rawText && rawText.trim().length > 0; // added

  const handleDownload = async (format) => {
    if (disabled || !hasContent) return; // block download if disabled OR no content


    const rawText = extractLines(content);

    const lines = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (format === "txt" || format === "usfm") {
      const blob = new Blob([lines.join("\n\n")], {
        type: "text/plain;charset=utf-8",
      });
      saveAs(blob, `draft.${format}`);
    }


    if (format === "docx") {
      const paragraphs = lines.map(
        (line) =>
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun(line)],
          })
      );

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "draft.docx");
    }
  };

  const menu = {
    items: [
      { key: "txt", label: "Text (.txt)", onClick: () => handleDownload("txt") },
      { key: "docx", label: "Docx (.docx)", onClick: () => handleDownload("docx") },
      { key: "usfm", label: "USFM (.usfm)", onClick: () => handleDownload("usfm") },
    ],
  };

  return (
    <Dropdown menu={menu} placement="bottomRight" trigger={["click"]} disabled={disabled}>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        // style={{  borderColor: "#722ed1", ...style }}
        disabled={disabled || !hasContent} //  disable button UI
      >

      </Button>
    </Dropdown>
  );
}