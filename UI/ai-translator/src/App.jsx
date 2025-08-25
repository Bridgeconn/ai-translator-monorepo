import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import ZeroDraftGenerator from "./components/Projects";
import DefaultLayout from "./components/Layout";
import Dashboard from "./components/DashBoard";
import MainLayout from "./components/MainLayout";
import SourceList from "./components/SourceList";

const App = () => {
  return (
    <Router>
      <MainLayout style={{ minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-project" element={<ZeroDraftGenerator />} />
          <Route path="/create-source" element={<SourceList />} /> 
          <Route path="/quick-translation" element={<DefaultLayout />} />
        </Routes>
      </MainLayout>
    </Router>
  );
};

export default App;