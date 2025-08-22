// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DefaultLayout from "./components/Layout";
import HomePage from "./components/HomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home page */}
        <Route path="/" element={<HomePage />} />

        {/* App layout page */}
        <Route
          path="/app"
          element={
            <DefaultLayout>
              <div /> {/* placeholder, can later be dashboard or project list */}
            </DefaultLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
