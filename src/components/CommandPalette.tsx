import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Package, Home, Library, Heart, Bell, ShieldCheck, LogIn } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { useProducts } from "../lib/products-store";

/**
 * Global ⌘K / Ctrl+K command palette — jump to any product or page.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { products } = useProducts();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const top = useMemo(() => products.slice(0, 40), [products]);

  const go = (fn: () => void) => {
    setOpen(false);
    // Defer nav so the dialog can close cleanly first.
    setTimeout(fn, 0);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search the vault, jump anywhere…" />
      <CommandList>
        <CommandEmpty>Nothing here yet.</CommandEmpty>
        <CommandGroup heading="Jump to">
          <CommandItem onSelect={() => go(() => navigate({ to: "/" }))}>
            <Home className="mr-2 size-4" /> Home
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/dashboard" }))}>
            <Library className="mr-2 size-4" /> My Vault
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/wishlist" }))}>
            <Heart className="mr-2 size-4" /> Wishlist
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/requests" }))}>
            <Bell className="mr-2 size-4" /> Requests
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/tips" }))}>
            <Lightbulb className="mr-2 size-4" /> Tips &amp; tricks
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/auth" }))}>
            <LogIn className="mr-2 size-4" /> Sign in
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/admin" }))}>
            <ShieldCheck className="mr-2 size-4" /> Admin
          </CommandItem>
        </CommandGroup>
        {top.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Products">
              {top.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.code} ${p.tagline}`}
                  onSelect={() => go(() => navigate({ to: "/products/$id", params: { id: p.id } }))}
                >
                  <Package className="mr-2 size-4" />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Search className="size-3" /> Type to search
        </span>
        <span>↵ open · esc close</span>
      </div>
    </CommandDialog>
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}