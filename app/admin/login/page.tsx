import { Login } from "@/components/portal";
export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Login portal="admin" />;
}
