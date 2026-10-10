import { Login } from "@/components/portal";
export const metadata = {
  title: "Campus sign in",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Login portal="campus" />;
}
