import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function ImageInput({
  value,
  onChange,
  folder = "misc",
  placeholder = "https://… or upload below",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8 MB)");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, TEN_YEARS);
      if (signErr) throw signErr;
      onChange(data.signedUrl);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input flex-1"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg bg-foreground/5 px-2 text-muted hover:text-foreground"
            aria-label="Clear image"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-foreground/5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {busy ? "Uploading…" : "Upload image"}
        </button>
        {value && (
          <img
            src={value}
            alt="Preview"
            className="size-12 rounded-lg border border-border object-cover"
            onError={(e) => ((e.currentTarget.style.opacity = "0.3"))}
          />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}