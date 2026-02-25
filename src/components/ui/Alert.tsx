interface IAlertProps {
  variant: 'error' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
  role?: string;
}

const variantClasses: Record<IAlertProps['variant'], string> = {
  error: 'bg-red-50 text-red-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
};

export function Alert({
  variant,
  children,
  className = '',
  role,
}: IAlertProps) {
  return (
    <div
      role={role}
      className={`p-3 rounded-lg text-sm ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
