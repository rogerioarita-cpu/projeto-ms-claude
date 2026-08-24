export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm font-semibold text-navy ${className}`}>{children}</p>;
}
