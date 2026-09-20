import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PublicShell } from "@/components/public-shell";
import { Hero } from "@/components/hero";
import { FeatureBar } from "@/components/feature-bar";
import { Catalog } from "@/components/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const [settings, categories, products] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <PublicShell siteName={settings.siteName} footerNote={settings.footerNote}>
      <Hero
        title={settings.heroTitle}
        subtitle={settings.heroSubtitle}
        description={settings.heroDescription}
      />
      <FeatureBar />
      <Catalog
        initialProducts={products.map((p) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          purchaseUrl: p.purchaseUrl,
          category: p.category,
          isDemo: p.isDemo,
        }))}
        categories={categories}
        initialQuery={searchParams.q || ""}
        initialCategory={searchParams.category || "all"}
      />
    </PublicShell>
  );
}
