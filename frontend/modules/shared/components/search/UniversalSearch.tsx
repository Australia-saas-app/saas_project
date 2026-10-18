"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";
import {
  getSuggestions,
  SEARCH_CATEGORY_LABELS,
  type SearchResultItem,
} from "@/src/shared/lib/universal-search";

type UniversalSearchProps = {
  variant?: "header" | "hero" | "page";
  autoFocus?: boolean;
  initialQuery?: string;
  className?: string;
};

export default function UniversalSearch({
  variant = "header",
  autoFocus = false,
  initialQuery = "",
  className = "",
}: UniversalSearchProps) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSuggestions(getSuggestions(query, 8));
    }, 120);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goSearch = (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) {
      router.push("/search");
      return;
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const isHeader = variant === "header";
  const size =
    variant === "hero"
      ? "h-14 rounded-xl text-base"
      : variant === "page"
        ? "h-12 rounded-xl text-sm"
        : "h-10 rounded-full text-sm";

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goSearch();
        }}
        className={`flex items-center border border-border bg-background transition-shadow focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 ${
          isHeader ? "gap-1.5 py-1 pl-4 pr-1" : "gap-2 px-3 shadow-sm"
        } ${size}`}
      >
        {!isHeader && <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={isHeader ? "Search" : "Ask anything or search products, jobs, services..."}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && (suggestions.length > 0 || query.trim().length > 0)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isHeader ? (
          <button
            type="submit"
            aria-label="Search"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:brightness-110"
          >
            <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs md:text-sm font-semibold text-white transition hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Search className="h-4 w-4" />
            <span className="hidden xs:inline">Search</span>
          </button>
        )}
      </form>

      {open && query.trim().length > 0 && (
        <div
          id={listId}
          className="absolute z-[70] mt-2 w-full overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Universal results across products, services, jobs, courses & more
            </span>
          </div>
          {suggestions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No quick matches. Press Enter to search everywhere.
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto py-1">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/60"
                  >
                    <span className="mt-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {SEARCH_CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => goSearch()}
            className="flex w-full items-center justify-between border-t border-border bg-muted/30 px-4 py-3 text-left text-sm font-semibold text-blue-600 hover:bg-muted/50"
          >
            Search all for “{query.trim()}”
            <span className="text-xs font-medium text-muted-foreground">Enter ↵</span>
          </button>
        </div>
      )}
    </div>
  );
}
