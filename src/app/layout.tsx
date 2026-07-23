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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
  themeColor: "#f2a177",
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Capture the install prompt as early as possible so the in-app
            "Instalar app" button can trigger it even if the event fires
            before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__deferredInstallPrompt=e;window.dispatchEvent(new Event('pwa-installable'));});",
          }}
        />
      </head>
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
