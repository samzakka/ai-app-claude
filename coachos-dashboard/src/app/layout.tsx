import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CoachOS",
  description: "Coach dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <Sidebar />
          <main
            style={{
              marginLeft: "200px",
              flex: 1,
              overflowY: "auto",
              background: "#f9fafb",
              minHeight: "100vh",
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
