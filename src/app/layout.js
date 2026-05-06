import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SiteProvider } from "@/context/SiteContext";

export const metadata = {
  title: "IT Management Interface",
  description: "Professional IT Inventory Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#F0F5F5] text-[#212529]`}>
        <AuthProvider>
          <SiteProvider>
            {children}
          </SiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
