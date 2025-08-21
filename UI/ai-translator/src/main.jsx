import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

//  Import React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

//  Create a Query Client instance
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/*  Wrap your App with QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
