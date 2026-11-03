import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carebridge | Healthcare, made easier",
  description: "A calmer way for clinics to coordinate patient care.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
