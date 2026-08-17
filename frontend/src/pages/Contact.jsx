import React, { useState } from "react";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import { toast } from "sonner";

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/contact", f); setSent(true); toast.success("Message sent"); }
    catch { toast.error("Failed to send"); }
  };
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cls = "w-full card-2 pill px-4 py-2.5 text-sm bg-transparent outline-none text-ink";
  return (
    <Layout ticker={false}>
      <div className="py-12 max-w-lg mx-auto" data-testid="contact-page">
        <h1 className="font-serif-display font-black text-4xl text-center">Contact Us</h1>
        <p className="text-ink-soft text-center mt-2 text-sm">Questions, tips or feedback? Send us a note.</p>
        {sent ? (
          <div className="card p-8 mt-6 text-center" data-testid="contact-success">
            <p className="font-serif-display text-2xl">Thank you!</p>
            <p className="text-ink-soft text-sm mt-2">We've received your message and will reply soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 mt-6 space-y-3">
            <input data-testid="contact-name" required placeholder="Your name" value={f.name} onChange={upd("name")} className={cls} />
            <input data-testid="contact-email" required type="email" placeholder="Email" value={f.email} onChange={upd("email")} className={cls} />
            <textarea data-testid="contact-message" required rows={5} placeholder="Your message" value={f.message} onChange={upd("message")} className="w-full card-2 rounded-2xl px-4 py-2.5 text-sm bg-transparent outline-none text-ink" />
            <button data-testid="contact-submit" className="btn-gold pill w-full py-3 font-bold uppercase tracking-wider text-sm">Send Message</button>
          </form>
        )}
      </div>
    </Layout>
  );
}
