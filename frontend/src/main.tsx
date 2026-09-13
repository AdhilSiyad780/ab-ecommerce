import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// Everything fetched through this client is cached by key. Coming back to
// a page within staleTime shows cached data instantly (no spinner, no
// re-fetch) — that's what fixes the "reloads every time I navigate back"
// problem. Data older than staleTime refetches silently in the background.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // catalog/apartment/slot data is treated as fresh for 5 min
      gcTime: 30 * 60 * 1000,     // keep cached data around for 30 min even if unused
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
