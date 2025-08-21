import { Button, Dropdown } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { jsPDF } from "jspdf";
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

export default function DownloadDraftButton({ style, content }) {
  const handleDownload = async (format) => {
    const rawText = extractLines(content);

    // Split into lines/verses
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

    if (format === "pdf") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      let y = 50;
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, 500);
        doc.text(wrapped, 40, y);
        y += wrapped.length * 20 + 10; // spacing between verses
      });
      doc.save("draft.pdf");
    }

    if (format === "docx") {
      const paragraphs = lines.map(
        (line) =>
          new Paragraph({
            spacing: { after: 200 }, // ~10pt spacing after each verse
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

  //AntD v5 menu format
  const menu = {
    items: [
      {
        key: "txt",
        label: "Text (.txt)",
        onClick: () => handleDownload("txt"),
      },
      {
        key: "docx",
        label: "Docx (.docx)",
        onClick: () => handleDownload("docx"),
      },
      {
        key: "pdf",
        label: "PDF (.pdf)",
        onClick: () => handleDownload("pdf"),
      },
      {
        key: "usfm",
        label: "USFM (.usfm)",
        onClick: () => handleDownload("usfm"),
      },
    ],
  };

  return (
    <Dropdown menu={menu} placement="bottomRight" trigger={["click"]}>
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
