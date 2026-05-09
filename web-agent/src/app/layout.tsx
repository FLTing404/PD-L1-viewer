import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "PD-L1 TPS Visual Analytics · ChinaVis",
  description:
    "Research prototype for multiscale PD-L1 tumor proportion score (TPS) analysis: whole-slide navigation, patch-level inference with spatial Hilbert ordering, cell-scale evidence, and optional LLM-assisted case reasoning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full font-sans antialiased"
    >
      <body className="h-full overflow-hidden bg-background text-foreground">
        <TooltipProvider delay={120}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
