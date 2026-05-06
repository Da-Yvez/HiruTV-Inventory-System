import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SiteProvider } from "@/context/SiteContext";

export const metadata = {
  title: "Hiru TV Inventory System",
  description: "Professional IT Inventory Management System",
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  }
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
