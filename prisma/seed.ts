import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const email = process.env.ADMIN_EMAIL || "admin@shopnest.local";

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (!existing) {
    await prisma.adminUser.create({
      data: {
        username,
        email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`Created admin user: ${username}`);
  } else {
    console.log(`Admin user already exists: ${username}`);
  }

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const categorySeed = [
    { name: "Điện thoại", slug: "dien-thoai", icon: "phone", sortOrder: 1 },
    { name: "Laptop", slug: "laptop", icon: "laptop", sortOrder: 2 },
    { name: "Tai nghe", slug: "tai-nghe", icon: "headphones", sortOrder: 3 },
    { name: "Đồng hồ", slug: "dong-ho", icon: "watch", sortOrder: 4 },
    { name: "Túi xách", slug: "tui-xach", icon: "bag", sortOrder: 5 },
    { name: "Thời trang", slug: "thoi-trang", icon: "shirt", sortOrder: 6 },
    { name: "Gia dụng", slug: "gia-dung", icon: "home", sortOrder: 7 },
    { name: "Mỹ phẩm", slug: "my-pham", icon: "sparkles", sortOrder: 8 },
  ];

  const cats: Record<string, string> = {};
  for (const c of categorySeed) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, sortOrder: c.sortOrder },
      create: c,
    });
    cats[c.slug] = row.id;
  }

  const demoCount = await prisma.product.count({ where: { isDemo: true } });
  if (demoCount === 0) {
    const demos = [
      {
        name: "Túi tote canvas kem – phong cách tối giản",
        imageUrl: "/demo/tote.jpg",
        categoryId: cats["tui-xach"],
      },
      {
        name: "Tai nghe over-ear không dây màu walnut",
        imageUrl: "/demo/headphones.jpg",
        categoryId: cats["tai-nghe"],
      },
      {
        name: "Đồng hồ dây da tối giản",
        imageUrl: "/demo/watch.jpg",
        categoryId: cats["dong-ho"],
      },
      {
        name: "Bộ dưỡng da hũ kem và serum",
        imageUrl: "/demo/skincare.jpg",
        categoryId: cats["my-pham"],
      },
      {
        name: "Áo linen be xếp gọn",
        imageUrl: "/demo/fashion.jpg",
        categoryId: cats["thoi-trang"],
      },
      {
        name: "Bình gốm và cây để bàn",
        imageUrl: "/demo/home.jpg",
        categoryId: cats["gia-dung"],
      },
      {
        name: "Điện thoại màn hình lớn – bản demo",
        imageUrl: "/demo/phone.jpg",
        categoryId: cats["dien-thoai"],
      },
    ];

    for (const d of demos) {
      const url = `https://example.com/demo/${encodeURIComponent(d.name)}`;
      await prisma.product.create({
        data: {
          name: d.name,
          imageUrl: d.imageUrl,
          originalUrl: url,
          resolvedUrl: url,
          purchaseUrl: url,
          sourcePlatform: "generic",
          linkType: "direct",
          categoryId: d.categoryId,
          isDemo: true,
          extractStatus: "success",
          extractMessage: "demo",
        },
      });
    }
    console.log(`Seeded ${demos.length} demo products (isDemo=true).`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
