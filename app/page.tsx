import Dashboard from "@/components/dashboard";
import { DEFAULT_DATA } from "@/lib/default-data";

export default function Page() {
  return <Dashboard initialData={DEFAULT_DATA} />;
}
