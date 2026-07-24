import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { routes } from "./rr-router";
import { Toaster } from "@/components/ui/sonner";
import { RequirementsProvider, RequirementsDrawer } from "@/components/requirements";

const queryClient = new QueryClient();
type AppRouter = ReturnType<typeof createBrowserRouter>;

export default function App() {
  const [router, setRouter] = useState<AppRouter | null>(null);
  useEffect(() => {
    setRouter(createBrowserRouter(routes));
  }, []);

  if (!router) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RequirementsProvider>
        <RouterProvider router={router} />
        <RequirementsDrawer />
      </RequirementsProvider>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
