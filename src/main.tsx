import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { router } from "./router";
import { AnalyticsSync } from "./components/Analytics";
import { MockProvider } from "./components/MockProvider";
import { Toaster } from "./components/shadcn/sonner";
import { TooltipProvider } from "./components/shadcn/tooltip";
import { initAnalytics } from "./lib/analytics";
import { initSession } from "./lib/session-persist";
import "./fonts.css";
import "./styles.css";

initAnalytics();
initSession();

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MockProvider>
        <TooltipProvider>
          <AnalyticsSync />
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </MockProvider>
    </QueryClientProvider>
  </StrictMode>,
);
