interface IStatColumnProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function StatColumn({
  label,
  children,
  className = '',
}: IStatColumnProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="text-xs text-white/60 mb-1">{label}</div>
      {children}
    </div>
  );
}
