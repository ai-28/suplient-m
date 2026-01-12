export const ProcessStep = ({
  number,
  title,
  description,
  icon: Icon,
  isLast = false,
}) => {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative z-10">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute top-10 left-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
          {number}
        </div>
      </div>
      {!isLast && (
        <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent -z-0" />
      )}
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
};
