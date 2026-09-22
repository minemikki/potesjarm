import "./globals.css";

export const metadata = {
  title: "Potesjarm Studio",
  description: "Personlige hundeportretter laget med omtanke.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
