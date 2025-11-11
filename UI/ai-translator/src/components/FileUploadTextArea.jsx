import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as mammoth from "mammoth";

const FileUploadTextArea = forwardRef(({ isSource = true, value, onChange, onFileUpload }, ref) => {
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // File validation
  const validateTextFile = (file) => {
    const validExtensions = [".txt", ".text", ".docx"];
    const invalidExtensions = [".usfm"];
    const fileName = file.name.toLowerCase();
    if (invalidExtensions.some((ext) => fileName.endsWith(ext))) return false;
    return validExtensions.some((ext) => fileName.endsWith(ext));
  };

  const readFileContent = (file) =>
    new Promise((resolve, reject) => {
      if (file.name.toLowerCase().endsWith(".docx")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve(result.value);
          } catch (err) {
            reject(new Error("Failed to read Word document: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file, "UTF-8");
      }
    });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setError("");
    if (!file) return;
    if (!validateTextFile(file)) {
      setError("Please upload a valid .txt or .docx file");
      event.target.value = "";
      return;
    }
    try {
      const content = await readFileContent(file);
      if (onChange) onChange(content);
      if (onFileUpload) onFileUpload(content); // Notify parent about file upload
    } catch (err) {
      setError(err.message);
    }
    event.target.value = "";
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleTextChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  // Expose upload function to parent
  useImperativeHandle(ref, () => ({
    triggerUpload: handleUploadClick
  }));

  return (
    <div>
      <textarea
        value={value || ""}
        onChange={handleTextChange}
        placeholder={isSource ? "Enter your text here or upload a file..." : "Translation will appear here..."}
        style={{
          width: '100%',
          minHeight: '300px',
          border: 'none',
          resize: 'none',
          outline: 'none',
          color: '#374151',
          lineHeight: '1.6',
          fontSize: '14px',
          fontFamily: 'inherit',
          backgroundColor: 'transparent',
          padding: '0'
        }}
      />
      
      {isSource && (
        <>          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
            accept=".txt,.text,.docx"
          />
          
          {error && (
            <div style={{ color: 'red', marginTop: '8px', fontSize: '12px' }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default  FileUploadTextArea;
