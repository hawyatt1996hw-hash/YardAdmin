import "./globals.css";

export const metadata = {
  title: "YardClock Admin",
  description: "Fleetwide Digital admin panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}