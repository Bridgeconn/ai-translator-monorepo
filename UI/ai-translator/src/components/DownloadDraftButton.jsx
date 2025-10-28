import { Button, Dropdown, Tooltip } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import React from "react";

function extractLines(node) {
  if (typeof node === "string") return node;
  if (!node) return "";
  if (Array.isArray(node)) {
    return node.map(extractLines).join("");
  }
  if (React.isValidElement(node)) {
    if (node.type === "br") return "\n";
    return extractLines(node.props.children);
  }
  return "";
}

export default function DownloadDraftButton({ content, disabled = false, targetLanguage, sourceLanguage, bookName,
  chapterNumber = null, translationType = "book", uploadedFileName
}) {
  const rawText = extractLines(content);
  const hasContent = rawText && rawText.trim().length > 0;

  const handleDownload = async (format) => {
    if (disabled || !hasContent) return;


    const rawText = extractLines(content);

    const lines = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const getLangCode = (lang, fallback) => {
      if (!lang) return fallback;
      if (typeof lang === "string") return lang.slice(0, 3).toLowerCase();
      if (typeof lang === "object" && lang.name)
        return lang.name.slice(0, 3).toLowerCase();
      return fallback;
    };

    const src = getLangCode(sourceLanguage, "src");
    const tgt = getLangCode(targetLanguage, "tgt");

    targetLanguage?.slice(0, 3).toLowerCase() || "tgt";
    let baseName = "";

    if (translationType === "verse") {
      const book = (bookName || "book").replace(/\s+/g, "_");
      const chapterPart = chapterNumber ? `_Ch${chapterNumber}` : "";
      baseName = `${src}_${tgt}_${book}${chapterPart}`;
    } else if (translationType === "book") {
      const book =
        typeof bookName === "string"
          ? bookName.replace(/\s+/g, "_")
          : bookName?.name?.replace(/\s+/g, "_") || "book";
      baseName = `${src}_${tgt}_${book}`;
    } else if (translationType === "text" || translationType === "quick") {
      const cleanFile = (uploadedFileName
        ? uploadedFileName.replace(/\.[^/.]+$/, "")
        : "document"
      ).replace(/\s+/g, "_");
      baseName = `${src}_${tgt}_${cleanFile}`;
    } else {
      baseName = `${src}_${tgt}`;
    }

    const finalFileName = `${baseName}.${format}`;


    if (format === "txt" || format === "usfm") {
      const blob = new Blob([lines.join("\n\n")], {
        type: "text/plain;charset=utf-8",
      });
      saveAs(blob, finalFileName);
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
      saveAs(blob, finalFileName);
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
      <Tooltip title="Download" color="#fff" styles={{ body: { color: "#000" } }}>

        <Button
          icon={<DownloadOutlined />}
          disabled={disabled || !hasContent}
        >

        </Button>
      </Tooltip>
    </Dropdown>
  );
}