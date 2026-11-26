import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Login from "./pages/login";
import NotFound from "./pages/not_found";
import Home from "./pages/home";
import Layout from "@/components/global/layout";
import OrdersOverview from "./pages/orders/overview";
import { SidebarProvider } from "@/components/ui/sidebar";
import authenticator from "./auth/authenticator";
import { useState } from "react";
import Admin from "./pages/settings/admin";
import Phase from "./pages/settings/phase";
import Tables from "./pages/settings/tables";
import Tickets from "./pages/settings/tickets";
import TicketsDesign from "./pages/designs/tickets";
import OrdersDetails from "./pages/orders/details";
import SeatsStatus from "./pages/orders/seats-status";
import Styling from "./pages/settings/styling";
import Data from "./pages/settings/data";
import Schedule from "./pages/settings/schedule";
import Queue from "./pages/settings/queue";
import AiSettings from "./pages/settings/ai";
import BankProcessing from "./pages/settings/bank";
import Students from "./pages/settings/students";
import ShopProducts from "./pages/settings/shop-products";
import StripeSettings from "./pages/settings/stripe";
import MailSender from "./pages/mail-sender";
import MailSettings from "./pages/settings/mail";
import Backup from "./pages/settings/backup";
import { PhaseProvider } from "./context/PhaseContext";
import Nav from "./components/global/nav";

const queryClient = new QueryClient();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  authenticator.isAuthenticated().then((isAuthenticated) => {
    setIsLoading(false);
    setIsAuthenticated(isAuthenticated);
  });

  if (isLoading) {
    console.log("Loading...");
    return <div>Laden...</div>;
  }

  if (isAuthenticated) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <PhaseProvider>
            <SidebarProvider>
              <Nav />
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/orders/overview" element={<OrdersOverview />} />
                  <Route
                    path="/orders/details/:id"
                    element={<OrdersDetails />}
                  />
                  <Route
                    path="/orders/seats-status"
                    element={<SeatsStatus />}
                  />
                  <Route path="/settings/admin" element={<Admin />} />
                  <Route path="/settings/phases" element={<Phase />} />
                  <Route path="/settings/tables" element={<Tables />} />
                  <Route path="/settings/tickets" element={<Tickets />} />
                  <Route path="/designs/tickets" element={<TicketsDesign />} />
                  <Route path="/settings/styling" element={<Styling />} />
                  <Route path="/settings/data" element={<Data />} />
                  <Route path="/settings/schedule" element={<Schedule />} />
                  <Route path="/settings/queue" element={<Queue />} />
                  <Route path="/settings/ai" element={<AiSettings />} />
                  <Route path="/settings/bank" element={<BankProcessing />} />
                  <Route path="/settings/students" element={<Students />} />
                  <Route path="/settings/shop" element={<ShopProducts />} />
                  <Route path="/settings/stripe" element={<StripeSettings />} />
                  <Route path="/settings/mail-server" element={<MailSettings />} />
                  <Route path="/mail-sender" element={<MailSender />} />
                  <Route path="/settings/backup" element={<Backup />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </SidebarProvider>
          </PhaseProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return <Login />;
}
