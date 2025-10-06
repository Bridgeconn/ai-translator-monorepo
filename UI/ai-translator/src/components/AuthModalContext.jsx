import React, { createContext, useContext, useState } from "react";

const AuthModalContext = createContext();

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
};

export const AuthModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultView, setDefaultView] = useState("login"); // "login" or "register"

  const openLogin = () => {
    setDefaultView("login");
    setIsOpen(true);
  };

  const openRegister = () => {
    setDefaultView("register");
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        defaultView,
        openLogin,
        openRegister,
        close,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
};