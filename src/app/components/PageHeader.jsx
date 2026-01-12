export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div className= "sm:pl-5">
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}