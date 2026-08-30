"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Client } from "./types";

export function ClientCombobox({
  clients,
  value,
  onChange,
  required,
  placeholder = "Digite para buscar o cliente...",
}: {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const selected = clients.find((c) => c.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantém o texto do input sincronizado quando o valor muda por fora (ex.: reset do form).
  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && selected.name.toLowerCase() === q)) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query, selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Se o usuário fechar sem escolher nada compatível com o texto digitado, volta ao valor selecionado.
        setQuery(selected?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  function selectClient(c: Client) {
    onChange(c.id);
    setQuery(c.name);
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
      if (chosen) selectClient(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected?.name ?? "");
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
          // Enquanto o texto não corresponder exatamente a um cliente da lista,
          // não há cliente válido selecionado (evita enviar um clientId desatualizado).
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
            <div className="px-3 py-2 text-muted">Nenhum cliente encontrado.</div>
          ) : (
            filtered.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectClient(c)}
                className={`block w-full px-3 py-2 text-left ${
                  idx === highlight ? "bg-navy/5" : "hover:bg-gray-50"
                } ${c.id === value ? "font-medium text-navy" : ""}`}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
