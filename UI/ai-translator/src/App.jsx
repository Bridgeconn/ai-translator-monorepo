import Header from "./components/Header";
import Controls from "./components/Controls";
import PanelContainer from "./components/PanelContainer";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Header />
        <Controls />
        <PanelContainer />
      </div>
    </div>
  );
}

export default App;
