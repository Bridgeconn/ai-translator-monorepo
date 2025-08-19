import EditorPanel from "./EditorPanel";

export default function PanelContainer() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <EditorPanel placeholder="Enter text here..." showClose />
      <EditorPanel placeholder="Translated output..." />
    </div>
  );
}
