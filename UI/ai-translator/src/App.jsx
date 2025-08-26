// // App.jsx
// import React from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import DefaultLayout from "./components/Layout";
// import HomePage from "./components/HomePage";

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         {/* Home page */}
//         <Route path="/" element={<HomePage />} />

//         {/* App layout page */}
//         <Route
//           path="/app"
//           element={
//             <DefaultLayout>
//               <div /> {/* placeholder, can later be dashboard or project list */}
//             </DefaultLayout>
//           }
//         />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MainLayout from "./components/MainLayout";

// Wrapper for protected routes
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<HomePage />} />

        {/* Auth pages */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />

        {/* Dashboard layout with nested routes */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        ></Route>
        
      </Routes>
    </Router>
  );
}
