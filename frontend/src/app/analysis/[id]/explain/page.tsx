import ExplainClient from "./ExplainClient";

export function generateStaticParams() {
  return [{ id: "baseline" }];
}

export default function ExplainPage() {
  return <ExplainClient />;
}
