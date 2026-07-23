import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estantería Ordenada — Puzle de ordenar relajante",
  description:
    "Un puzle de ordenar estanterías relajante. Mueve productos entre estantes, junta tres iguales y ordena todo el mueble antes de que se acabe el tiempo.",
  applicationName: "Estantería Ordenada",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Estantería Ordenada",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "Estantería Ordenada — Puzle de ordenar relajante",
    description: "Mueve productos entre estantes, junta tres iguales y ordena el mueble.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#b98a5e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
