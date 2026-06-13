import AnalysisClient from "./AnalysisClient";

export function generateStaticParams() {
  return [{ id: "baseline" }];
}

export default function AnalysisPage() {
  return <AnalysisClient />;
}
