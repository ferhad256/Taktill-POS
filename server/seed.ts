import crypto from "crypto";
import { db } from "./db";
import {
  businesses,
  cashiers,
  products,
  saleItems,
  sales,
  users,
} from "./db/schema";
import { hashPassword } from "./lib/auth";
import bcrypt from "bcryptjs";

const BUSINESS_ID = "biz-0001";

interface ProductSeed {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  costPrice: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

const productSeeds: ProductSeed[] = [
  { name: "Milk 1L", sku: "BEV-001", category: "Beverages", unitPrice: "3500", costPrice: "2800", stockQuantity: 48, lowStockThreshold: 10 },
  { name: "Bread Loaf", sku: "BAK-001", category: "Bakery", unitPrice: "4500", costPrice: "3500", stockQuantity: 30, lowStockThreshold: 8 },
  { name: "Sugar 2kg", sku: "GRO-001", category: "Groceries", unitPrice: "9000", costPrice: "7500", stockQuantity: 22, lowStockThreshold: 6 },
  { name: "Cooking Oil 1L", sku: "GRO-002", category: "Groceries", unitPrice: "8500", costPrice: "7000", stockQuantity: 4, lowStockThreshold: 5 },
  { name: "Rice 5kg", sku: "GRO-003", category: "Groceries", unitPrice: "22000", costPrice: "18000", stockQuantity: 15, lowStockThreshold: 5 },
  { name: "Soda 500ml", sku: "BEV-002", category: "Beverages", unitPrice: "2000", costPrice: "1400", stockQuantity: 120, lowStockThreshold: 24 },
  { name: "Mineral Water 1.5L", sku: "BEV-003", category: "Beverages", unitPrice: "1800", costPrice: "1200", stockQuantity: 90, lowStockThreshold: 20 },
  { name: "Laundry Soap", sku: "HOM-001", category: "Household", unitPrice: "3000", costPrice: "2200", stockQuantity: 3, lowStockThreshold: 6 },
  { name: "Toothpaste", sku: "PER-001", category: "Personal Care", unitPrice: "5500", costPrice: "4000", stockQuantity: 40, lowStockThreshold: 10 },
  { name: "Biscuits Pack", sku: "SNK-001", category: "Snacks", unitPrice: "2500", costPrice: "1800", stockQuantity: 65, lowStockThreshold: 15 },
  { name: "Tea Leaves 250g", sku: "BEV-004", category: "Beverages", unitPrice: "6000", costPrice: "4500", stockQuantity: 18, lowStockThreshold: 6 },
  { name: "Salt 1kg", sku: "GRO-004", category: "Groceries", unitPrice: "2200", costPrice: "1500", stockQuantity: 50, lowStockThreshold: 10 },
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select().from(businesses);
  if (existing.length > 0) return;

  const now = new Date();

  await db.insert(businesses).values({
    id: BUSINESS_ID,
    name: "Kampala Mart",
    address: "Plot 12, Kira Road, Kampala, Uganda",
    phone: "+256 700 000 000",
    logoUrl: null,
    currency: "UGX",
    createdAt: now,
  });

  await db.insert(users).values([
    {
      id: "usr-owner",
      businessId: BUSINESS_ID,
      name: "Amina Owusu",
      email: "owner@taktill.app",
      password: hashPassword("owner1234"),
      role: "owner",
    },
    {
      id: "usr-manager",
      businessId: BUSINESS_ID,
      name: "David Mukasa",
      email: "manager@taktill.app",
      password: hashPassword("manager1234"),
      role: "manager",
    },
  ] as any);

  await db.insert(cashiers).values([
    {
      id: "csh-1",
      businessId: BUSINESS_ID,
      name: "Brenda Nakato",
      pinHash: bcrypt.hashSync("1234", 12),
      isActive: true,
      createdAt: now,
    },
    {
      id: "csh-2",
      businessId: BUSINESS_ID,
      name: "Joseph Okello",
      pinHash: bcrypt.hashSync("5678", 12),
      isActive: true,
      createdAt: now,
    },
  ] as any);

  const productRows: any[] = productSeeds.map((p, i) => ({
    id: `prd-${String(i + 1).padStart(3, "0")}`,
    businessId: BUSINESS_ID,
    name: p.name,
    sku: p.sku,
    barcode: null,
    category: p.category,
    unitPrice: Number(p.unitPrice).toFixed(2),
    costPrice: Number(p.costPrice).toFixed(2),
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  await db.insert(products).values(productRows);

  // Two sample sales for today so reports/dashboard aren't empty.
  const today = new Date();
  const at = (h: number, m: number) => {
    const dt = new Date(today);
    dt.setHours(h, m, 0, 0);
    return dt;
  };
  const prefix = today.toISOString().slice(0, 10).replace(/-/g, "");

  await db.insert(sales).values([
    {
      id: "sal-1",
      businessId: BUSINESS_ID,
      cashierId: "csh-1",
      cashierName: "Brenda Nakato",
      receiptNumber: `${prefix}-0001`,
      subtotal: "11500.00",
      totalDiscount: "0.00",
      grandTotal: "11500.00",
      paymentMethod: "cash",
      notes: null,
      createdAt: at(9, 15),
    },
    {
      id: "sal-2",
      businessId: BUSINESS_ID,
      cashierId: "csh-2",
      cashierName: "Joseph Okello",
      receiptNumber: `${prefix}-0002`,
      subtotal: "31000.00",
      totalDiscount: "1550.00",
      grandTotal: "29450.00",
      paymentMethod: "cash",
      notes: null,
      createdAt: at(11, 40),
    },
  ] as any);

  await db.insert(saleItems).values([
    { id: "si-1", saleId: "sal-1", productId: "prd-001", productName: "Milk 1L", productSku: "BEV-001", quantity: 2, unitPrice: "3500.00", discountType: null, discountValue: null, discountAmount: "0.00", lineTotal: "7000.00" },
    { id: "si-2", saleId: "sal-1", productId: "prd-002", productName: "Bread Loaf", productSku: "BAK-001", quantity: 1, unitPrice: "4500.00", discountType: null, discountValue: null, discountAmount: "0.00", lineTotal: "4500.00" },
    { id: "si-3", saleId: "sal-2", productId: "prd-005", productName: "Rice 5kg", productSku: "GRO-003", quantity: 1, unitPrice: "22000.00", discountType: null, discountValue: null, discountAmount: "0.00", lineTotal: "22000.00" },
    { id: "si-4", saleId: "sal-2", productId: "prd-003", productName: "Sugar 2kg", productSku: "GRO-001", quantity: 1, unitPrice: "9000.00", discountType: null, discountValue: null, discountAmount: "0.00", lineTotal: "9000.00" },
  ]);

  console.log("[seed] Database seeded with sample data.");
}
