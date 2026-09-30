import { redirect } from "next/navigation";

// The sales page comes after the dashboard (Parry, 30 Sep). Until then the
// root goes to the dashboard preview.
export default function Home() {
  redirect("/dashboard");
}
