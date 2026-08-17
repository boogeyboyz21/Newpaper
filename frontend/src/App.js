import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, StaffRoute } from "@/components/Guards";
import Analytics from "@/components/Analytics";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Article from "@/pages/Article";
import Search from "@/pages/Search";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Plans from "@/pages/Plans";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import Forbidden from "@/pages/Forbidden";
import Page from "@/pages/Page";
import Contact from "@/pages/Contact";
import Advertise from "@/pages/Advertise";
import Author from "@/pages/Author";

const STAFF = ["reporter", "editor", "administrator"];

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <Analytics />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/news/:id" element={<Article />} />
            <Route path="/search" element={<Search />} />
            <Route path="/page/:slug" element={<Page />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="/author/:id" element={<Author />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/admin" element={<StaffRoute roles={STAFF}><Admin /></StaffRoute>} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
