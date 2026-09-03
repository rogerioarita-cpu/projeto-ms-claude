"use client";

import { useState, type InputHTMLAttributes } from "react";

export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${className ?? ""} pr-16`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-navy hover:underline"
        tabIndex={-1}
      >
        {show ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
