export function generateStaticParams() {
  // Return empty array so Next.js static export builds the dynamic templates ([id].html) 
  // without needing pre-rendered dynamic IDs at build time.
  return [];
}

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
