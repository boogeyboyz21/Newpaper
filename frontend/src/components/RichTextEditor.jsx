import React, { useRef, useEffect } from "react";
import { api, API } from "../lib/api";
import { Bold, Italic, Heading, Quote, List, Link2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function RichTextEditor({ value, onChange }) {
  const ref = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line
  }, []);

  const emit = () => onChange(ref.current.innerHTML);
  const cmd = (c, v = null) => { document.execCommand(c, false, v); ref.current.focus(); emit(); };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (url) cmd("createLink", url);
  };

  const pickImage = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/staff/media", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const abs = `${API.replace(/\/api$/, "")}${data.url}`;
      cmd("insertImage", abs);
    } catch {
      toast.error("Image upload failed");
    }
    e.target.value = "";
  };

  const Btn = ({ onClick, icon: Icon, label }) => (
    <button type="button" onClick={onClick} title={label} data-testid={`rte-${label}`}
      className="p-2 card-2 pill hover:bg-green hover:text-white" style={{ transitionProperty: "background-color,color" }}>
      <Icon size={15} />
    </button>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-[var(--line)] surface-2">
        <Btn onClick={() => cmd("bold")} icon={Bold} label="bold" />
        <Btn onClick={() => cmd("italic")} icon={Italic} label="italic" />
        <Btn onClick={() => cmd("formatBlock", "<h2>")} icon={Heading} label="heading" />
        <Btn onClick={() => cmd("formatBlock", "<blockquote>")} icon={Quote} label="quote" />
        <Btn onClick={() => cmd("insertUnorderedList")} icon={List} label="list" />
        <Btn onClick={addLink} icon={Link2} label="link" />
        <Btn onClick={pickImage} icon={ImageIcon} label="image" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid="rte-image-input" />
      </div>
      <div ref={ref} contentEditable data-testid="rte-editor" onInput={emit}
        className="article-html p-4 min-h-[220px] outline-none text-ink"
        style={{ maxHeight: 400, overflowY: "auto" }} />
    </div>
  );
}
