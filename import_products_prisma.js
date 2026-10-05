/**
 * One-time Medicine & Opening Stock Importer (Node.js with Prisma ORM)
 * 
 * Usage:
 *   1. Ensure Prisma client is generated: `npx prisma generate`
 *   2. Run: `node import_products_prisma.js [path_to_csv]`
 *      (Defaults to ./products_list.csv)
 * 
 * Requirements:
 *   npm install @prisma/client csv-parser
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper: Extract loose tablet conversion factor from packing string
function parseConversion(packingStr) {
  if (!packingStr) return 10;
  const clean = packingStr.trim();
  
  // Format: 1*10, 1*15, 1*4
  const multMatch = clean.match(/(\d+)\s*\*\s*(\d+)/);
  if (multMatch) {
    const v1 = parseInt(multMatch[1], 10);
    const v2 = parseInt(multMatch[2], 10);
    return v1 === 1 ? v2 : (v2 === 1 ? v1 : v1 * v2);
  }
  
  // Format: 10'S, 15;S, 10S, 30's
  const sMatch = clean.match(/(\d+)\s*['"`]?\s*s\b/i);
  if (sMatch) return parseInt(sMatch[1], 10);
  
  // Pure numbers: "10", "15"
  const numMatch = clean.match(/^\s*(\d+)\s*$/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (val >= 1 && val <= 500) return val;
  }
  
  // Liquid / ointment containers
  if (/(ml|gm|g|ltr|kg)/i.test(clean)) return 1;
  return 10;
}

// Helper: Auto-detect product form from product name and packing
function detectProductType(name, packing) {
  const combined = `${name || ''} ${packing || ''}`.toUpperCase();
  if (/(SYP|SYRUP|SUSP|SUSPENSION|LIQ|LIQUID)/i.test(combined)) return 'SYRUP';
  if (/(INJ|AMP|VIAL|PFS)/i.test(combined)) return 'INJECTION';
  if (/(OINT|CREAM|GEL|LOTION)/i.test(combined)) return 'OINTMENT';
  if (/(DROP|DROPS|E\/D|E\/E)/i.test(combined)) return 'DROPS';
  if (/(CAP|CAPS|SOFTGEL|CAPSULE)/i.test(combined)) return 'CAPSULES';
  if (/(SOAP|SHAMPOO|WASH|FACEWASH|DIAPER|WIPES|MASK|NEEDLE|SYRINGE)/i.test(combined)) return 'GENERAL';
  return 'TABLETS';
}

async function main() {
  const csvFilePath = process.argv[2] || path.join(__dirname, 'backend', 'products_list.csv');
  const errorLogPath = path.join(__dirname, 'unimported_rows.log');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: CSV file not found at ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`Starting CSV import from: ${csvFilePath}`);

  // Fetch or fallback to active tenant & branch
  let tenant = await prisma.tenant.findFirst({
    where: { name: { contains: 'City Care', mode: 'insensitive' } }
  }).catch(() => null);

  if (!tenant) {
    tenant = await prisma.tenant.findFirst();
  }

  if (!tenant) {
    console.error('Error: No tenant found in database. Please seed or create a tenant first.');
    process.exit(1);
  }

  const branch = await prisma.branch.findFirst({
    where: { tenant_id: tenant.id }
  });

  const tenantId = tenant.id;
  const branchId = branch ? branch.id : null;
  console.log(`Target Tenant: ${tenant.name} (${tenantId}) | Branch: ${branchId || 'None'}`);

  const rows = [];
  const unimported = [];

  // 1. Read CSV stream
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Total rows read from CSV: ${rows.length.toLocaleString()}`);

  const placeholderExpiry = new Date('2027-12-31T00:00:00.000Z');
  const mfgDate = new Date('2024-01-01T00:00:00.000Z');

  let importedCount = 0;
  let batchCount = 0;
  let totalStockCount = 0;
  const BATCH_CHUNK_SIZE = 500;

  for (let i = 0; i < rows.length; i += BATCH_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + BATCH_CHUNK_SIZE);

    for (const row of chunk) {
      const code = (row['Code'] || '').trim();
      const name = (row['Product Name'] || '').trim();
      const packing = (row['Packing'] || '').trim();
      const stockRaw = (row['Stock'] || '0').trim();

      if (!name) {
        unimported.push({ row, reason: 'Missing Product Name' });
        continue;
      }

      let stockQty = 0;
      try {
        stockQty = Math.max(0, parseInt(parseFloat(stockRaw), 10) || 0);
      } catch (err) {
        unimported.push({ row, reason: `Invalid stock value: ${stockRaw}` });
        stockQty = 0;
      }

      const pType = detectProductType(name, packing);
      const conversion = parseConversion(packing);
      const unit = ['TABLETS', 'CAPSULES'].includes(pType) ? 'Strip' : (['SYRUP', 'DROPS'].includes(pType) ? 'Bottle' : 'Piece');

      try {
        // Create medicine and optionally initial batch
        const medicine = await prisma.medicine.create({
          data: {
            tenant_id: tenantId,
            code: code || null,
            brand_name: name,
            generic_name: name, // Default to brand_name if generic not specified
            packing: packing || '10" S',
            pack_size: packing || '10" S',
            unit: unit,
            product_type: pType,
            conversion: conversion,
            
            // Unspecified fields left blank/default
            manufacturer_id: null,
            drug_type: null,
            schedule_type: /TAB|CAP|SYP|INJ/i.test(name) ? 'SCHEDULE_H' : 'OTC',
            schedule_code: 'H',
            hsn_code: null,
            gst_rate: 12.0,
            mrp: 0.0,
            selling_price: 0.0,
            purchase_price: 0.0,
            is_active: true,

            // Nested opening stock batch creation if stock > 0
            ...(stockQty > 0 && branchId
              ? {
                  batches: {
                    create: {
                      tenant_id: tenantId,
                      branch_id: branchId,
                      batch_number: 'OPENING-STOCK',
                      mfg_date: mfgDate,
                      expiry_date: placeholderExpiry,
                      quantity_received: stockQty,
                      quantity_remaining: stockQty
                    }
                  }
                }
              : {})
          }
        });

        importedCount++;
        if (stockQty > 0) {
          batchCount++;
          totalStockCount += stockQty;
        }
      } catch (err) {
        unimported.push({ row, reason: err.message });
      }
    }

    const processed = Math.min(i + BATCH_CHUNK_SIZE, rows.length);
    console.log(`Processed ${processed.toLocaleString()} / ${rows.length.toLocaleString()} rows (Imported: ${importedCount.toLocaleString()})...`);
  }

  // 2. Write unimported log
  if (unimported.length > 0) {
    const logContent = unimported.map((u) => `${JSON.stringify(u.row)} | Reason: ${u.reason}`).join('\n');
    fs.writeFileSync(errorLogPath, logContent, 'utf-8');
    console.log(`\nUnimported rows logged to: ${errorLogPath}`);
  }

  console.log('\n================ PRISMA IMPORT SUMMARY ================');
  console.log(`Total CSV Rows       : ${rows.length.toLocaleString()}`);
  console.log(`Medicines Created    : ${importedCount.toLocaleString()}`);
  console.log(`Opening Stock Batches: ${batchCount.toLocaleString()}`);
  console.log(`Total Stock Units    : ${totalStockCount.toLocaleString()}`);
  console.log(`Failed / Skipped     : ${unimported.length.toLocaleString()}`);
  console.log('Status               : COMPLETED');
  console.log('=======================================================');
}

main()
  .catch((e) => {
    console.error('Import Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
