import { Header } from "./header";
import { Footer } from "./footer";

export function PublicShell({
  siteName,
  footerNote,
  children,
}: {
  siteName: string;
  footerNote?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={siteName} />
      <main className="flex-1">{children}</main>
      <Footer siteName={siteName} footerNote={footerNote} />
    </div>
  );
}
