import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import EmergencyBanner from "../components/EmergencyBanner";
import BreakingTicker from "../components/BreakingTicker";
import PushPrompt from "../components/PushPrompt";

export default function Layout({ children, ticker = true }) {
  return (
    <div className="App min-h-screen">
      <PushPrompt />
      <EmergencyBanner />
      <Header />
      <main className="max-w-7xl mx-auto px-4">
        {ticker && <div className="pt-4"><BreakingTicker /></div>}
        {children}
      </main>
      <Footer />
    </div>
  );
}
