import "./globals.css";
import "./v2.css";
import "./soul.css";
import "./soul-live.css";
import "./coldstart-live.css";
import "./visual-polish.css";
import "./shell-polish.css";
import "./landing.css";

export const metadata = {
  metadataBase: new URL("https://potesjarm.no"),
  title: "Potesjarm – hundeliv er bedre sammen",
  description: "Lokalt hundefellesskap: finn turvenner, bli med på treff, bygg streaks og bli kjent med hundefolka i byen din.",
  applicationName: "Potesjarm",
  openGraph: {
    title: "Potesjarm – hundeliv er bedre sammen",
    description: "Lokalt hundefellesskap: finn turvenner, bli med på treff, bygg streaks og bli kjent med hundefolka i byen din.",
    url: "https://potesjarm.no",
    siteName: "Potesjarm",
    locale: "nb_NO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Potesjarm – hundeliv er bedre sammen",
    description: "Lokalt hundefellesskap: finn turvenner, bli med på treff og bli kjent med hundefolka i byen din.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1f66",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nb">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;600;700;800;900&family=Caveat:wght@600;700&display=swap"
        />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
