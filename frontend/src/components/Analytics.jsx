import { useEffect } from "react";
import { api } from "../lib/api";

// Injects GA4 (with anonymize_ip) or a privacy-first (cookieless) tracker
// based on the backend ANALYTICS_MODE environment toggle.
export default function Analytics() {
  useEffect(() => {
    api.get("/settings").then(({ data }) => {
      if (document.getElementById("ew-analytics")) return;
      if (data.analytics_mode === "ga4" && data.ga_id) {
        const g = document.createElement("script");
        g.async = true;
        g.id = "ew-analytics";
        g.src = `https://www.googletagmanager.com/gtag/js?id=${data.ga_id}`;
        document.head.appendChild(g);
        const inline = document.createElement("script");
        inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${data.ga_id}',{anonymize_ip:true});`;
        document.head.appendChild(inline);
      } else {
        // Privacy-first, cookie-free tracker (Plausible-style, GDPR compliant, no consent banner)
        const p = document.createElement("script");
        p.defer = true;
        p.id = "ew-analytics";
        p.setAttribute("data-domain", window.location.hostname);
        p.src = "https://plausible.io/js/script.js";
        document.head.appendChild(p);
      }
    }).catch(() => {});
  }, []);
  return null;
}
