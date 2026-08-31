"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "./types";

export function LeadCombobox({
  leads,
  value,
  onChange,
  required,
  placeholder = "Digite para buscar o lead...",
}: {
  leads: Lead[];
  value: string;
  onChange: (leadId: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const selected = leads.find((l) => l.id === value) ?? null;
  const [query, setQuery] = useState(selected?.companyName ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantém o texto do input sincronizado quando o valor muda por fora (ex.: reset do form).
  useEffect(() => {
    setQuery(selected?.companyName ?? "");
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && selected.companyName.toLowerCase() === q)) return leads;
    return leads.filter((l) => l.companyName.toLowerCase().includes(q));
  }, [leads, query, selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Se o usuário fechar sem escolher nada compatível com o texto digitado, volta ao valor selecionado.
        setQuery(selected?.companyName ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  function selectLead(l: Lead) {
    onChange(l.id);
    setQuery(l.companyName);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = filtered[highlight];
      if (chosen) selectLead(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected?.companyName ?? "");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        required={required}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
          // Enquanto o texto não corresponder exatamente a um lead da lista,
          // não há lead válido selecionado (evita enviar um leadId desatualizado).
          if (value) onChange("");
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white text-sm shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted">Nenhum lead encontrado.</div>
          ) : (
            filtered.map((l, idx) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectLead(l)}
                className={`block w-full px-3 py-2 text-left ${
                  idx === highlight ? "bg-navy/5" : "hover:bg-gray-50"
                } ${l.id === value ? "font-medium text-navy" : ""}`}
              >
                {l.companyName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
