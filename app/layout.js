import "./globals.css";

export const metadata = {
  title: "Potesjarm — hundeliv er bedre sammen",
  description: "Lokalt hundecommunity med Signals, turvenner, sirkler, kart, streaks og challenges.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
