import ClientLayout from "@/app/components/ClientLayout";

export default function ClientPagesLayout({ children }) {
  return (
    <div className="w-full h-full">
      <ClientLayout>{children}</ClientLayout>
    </div>
  );
}
