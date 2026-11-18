import type { Metadata } from "next";
import { PREFS_KEY } from "@/lib/prefs";
import "./globals.css";

// O <title> fica na página, que o troca conforme o idioma; um title aqui seria reinserido pelo Next por cima dele.
export const metadata: Metadata = {
  description: "Comparação de textos local, sem enviar dados para fora.",
};

// Script inline no <head>: roda durante o parse do HTML, antes da primeira pintura e da hidratação,
// para aplicar tema e idioma salvos sem piscar. (O next/script "beforeInteractive" só executa inline depois que o JS do Next carrega.)
// Mantenha em sincronia com src/lib/prefs.ts.
const bootScript = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}")||{},d=document.documentElement,t=p.theme;
if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;
var l=p.lang==="pt"||p.lang==="en"?p.lang:navigator.language.toLowerCase().indexOf("pt")===0?"pt":"en";d.lang=l==="pt"?"pt-BR":"en"}
catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script id="theme" dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
