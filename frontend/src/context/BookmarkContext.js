import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const BookmarkContext = createContext();

export function BookmarkProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (user && user !== false) {
      api.get("/bookmarks/ids").then(({ data }) => setIds(data)).catch(() => {});
    } else {
      setIds([]);
    }
  }, [user]);

  const toggle = async (articleId) => {
    if (!user || user === false) {
      toast.error("Log in to bookmark articles");
      return;
    }
    try {
      const { data } = await api.post(`/bookmarks/${articleId}`);
      setIds((prev) => (data.bookmarked ? [...prev, articleId] : prev.filter((x) => x !== articleId)));
      toast.success(data.bookmarked ? "Saved to bookmarks" : "Removed bookmark");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <BookmarkContext.Provider value={{ ids, has: (id) => ids.includes(id), toggle }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export const useBookmarks = () => useContext(BookmarkContext);
