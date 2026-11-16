/**
 * Verification test suite for YES ENTERPRISES Focused Admin Pricing Form Correction.
 * Tests all 6 user-specified scenarios + WhatsApp message formatting.
 */

import { validateProductInput, validateVariantInput } from '../functions/_shared/product-validation.js';
import { inrToPaise, paiseToInr } from '../src/utils/currency.js';
import { buildWhatsAppUrl } from '../src/lib/whatsapp.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- TEST SUITE: Focused Admin Pricing Form Correction ---\n');

// ── SCENARIO 1 ───────────────────────────────────────────────────────────────
console.log('Test Scenario 1: Single product with Crossed-out ₹240, Actual ₹85, MOQ 100');
{
  const input = {
    name: 'Test Bottle 250ml',
    category_id: 'cat-test',
    compare_at_price_paise: inrToPaise('240'), // 24000 paise = ₹240
    base_price_paise: inrToPaise('85'),        // 8500 paise = ₹85
    min_order_quantity: 100
  };

  const res = validateProductInput(input);
  assert(res.valid === true, 'Product input is valid');
  assert(res.data.compare_at_price_paise === 24000, 'Crossed-out price is 24000 paise (₹240)');
  assert(res.data.base_price_paise === 8500, 'Actual price is 8500 paise (₹85)');
  assert(res.data.min_order_quantity === 100, 'MOQ is 100 pcs');
  assert(res.data.expected_price_per_100_paise === 850000, 'Auto-calculated wholesale rate is 850000 paise (₹8,500)');
  assert(paiseToInr(res.data.expected_price_per_100_paise) === 8500, 'Wholesale rate in INR is ₹8,500');
}
console.log('');

// ── SCENARIO 2 ───────────────────────────────────────────────────────────────
console.log('Test Scenario 2: Single product price changed from ₹85 to ₹90');
{
  const input = {
    name: 'Test Bottle 250ml',
    category_id: 'cat-test',
    compare_at_price_paise: inrToPaise('240'),
    base_price_paise: inrToPaise('90'), // Updated price
    min_order_quantity: 100
  };

  const res = validateProductInput(input, true);
  assert(res.valid === true, 'Updated product input is valid');
  assert(res.data.base_price_paise === 9000, 'Actual price updated to 9000 paise (₹90)');
  assert(res.data.expected_price_per_100_paise === 900000, 'Auto-calculated wholesale rate immediately updates to 900000 paise (₹9,000)');
  assert(paiseToInr(res.data.expected_price_per_100_paise) === 9000, 'Wholesale rate in INR is ₹9,000');
}
console.log('');

// ── SCENARIO 3 ───────────────────────────────────────────────────────────────
console.log('Test Scenario 3: Validation: Crossed-out ₹80 and Actual ₹85 -> Must reject');
{
  const inputSimple = {
    name: 'Test Bottle Simple',
    category_id: 'cat-test',
    compare_at_price_paise: inrToPaise('80'), // 8000 paise
    base_price_paise: inrToPaise('85')        // 8500 paise (Crossed-out <= Actual)
  };

  const resSimple = validateProductInput(inputSimple);
  assert(resSimple.valid === false, 'Rejected simple product where crossed-out <= actual');
  assert(
    resSimple.error === 'Crossed-out price must be greater than actual price.',
    `Exact error message: "${resSimple.error}"`
  );

  const inputVariant = {
    title: 'Variant Red',
    title_hi: 'वेरिएंट लाल',
    compare_at_price_paise: inrToPaise('80'),
    price_paise: inrToPaise('85')
  };

  const resVariant = validateVariantInput(inputVariant);
  assert(resVariant.valid === false, 'Rejected variant where crossed-out <= actual');
  assert(
    resVariant.error === 'Crossed-out price must be greater than actual price.',
    `Variant exact error message: "${resVariant.error}"`
  );
}
console.log('');

// ── SCENARIO 4 ───────────────────────────────────────────────────────────────
console.log('Test Scenario 4: Variable product: Two variants (Red and Blue) calculate independently');
{
  const variantRed = {
    title: 'Red 250ml',
    title_hi: 'लाल 250ml',
    compare_at_price_paise: inrToPaise('240'),
    price_paise: inrToPaise('85'),
    min_order_quantity: 100
  };

  const variantBlue = {
    title: 'Blue 250ml',
    title_hi: 'नीला 250ml',
    compare_at_price_paise: inrToPaise('250'),
    price_paise: inrToPaise('95'),
    min_order_quantity: 50
  };

  const resRed = validateVariantInput(variantRed);
  const resBlue = validateVariantInput(variantBlue);

  assert(resRed.valid === true, 'Variant Red is valid');
  assert(resRed.data.expected_price_per_100_paise === 850000, 'Variant Red auto-calculates 850000 paise (₹8,500)');
  assert(paiseToInr(resRed.data.expected_price_per_100_paise) === 8500, 'Variant Red wholesale rate is ₹8,500');

  assert(resBlue.valid === true, 'Variant Blue is valid');
  assert(resBlue.data.expected_price_per_100_paise === 950000, 'Variant Blue auto-calculates 950000 paise (₹9,500)');
  assert(paiseToInr(resBlue.data.expected_price_per_100_paise) === 9500, 'Variant Blue wholesale rate is ₹9,500');

  // Verify full variable product validation
  const variableProduct = {
    name: 'Glass Feeding Bottle Family',
    category_id: 'cat-test',
    has_variants: true,
    variants: [variantRed, variantBlue]
  };

  const resProduct = validateProductInput(variableProduct);
  assert(resProduct.valid === true, 'Variable product validation passed');
  assert(resProduct.data.variants.length === 2, 'Two variants validated');
  assert(resProduct.data.base_price_paise === null, 'Variable product base_price_paise is null');
}
console.log('');

// ── SCENARIO 5 ───────────────────────────────────────────────────────────────
console.log('Test Scenario 5: Existing products: Saving without changes preserves existing data');
{
  const existingProduct = {
    id: 'prod-08',
    name: 'Glass Feeding Bottle — 250 ml (Red)',
    category_id: 'cat-feeding-bottles',
    base_price_paise: 24000,
    compare_at_price_paise: null,
    expected_price_per_100_paise: 850000,
    min_order_quantity: 100,
    has_variants: 0
  };

  // Simulating form submission with untouched initial values
  const untouchedInput = {
    name: existingProduct.name,
    category_id: existingProduct.category_id,
    base_price_paise: existingProduct.base_price_paise,
    compare_at_price_paise: existingProduct.compare_at_price_paise,
    expected_price_per_100_paise: existingProduct.expected_price_per_100_paise,
    min_order_quantity: existingProduct.min_order_quantity,
    has_variants: false
  };

  const res = validateProductInput(untouchedInput, true);
  assert(res.valid === true, 'Untouched product update is valid');
  assert(res.data.base_price_paise === 24000, 'Preserved base_price_paise: 24000');
  assert(res.data.compare_at_price_paise === null, 'Preserved compare_at_price_paise: null');
  assert(res.data.expected_price_per_100_paise === 850000, 'Preserved expected_price_per_100_paise: 850000');
  assert(res.data.min_order_quantity === 100, 'Preserved min_order_quantity: 100');
}
console.log('');

// ── SCENARIO 6 ───────────────────────────────────────────────────────────────
console.log('Test Scenario 6: Product with no crossed-out price -> Public display cleanly shows only actual price');
{
  const productNoCrossedOut = {
    name: 'Standard Bottle',
    category_id: 'cat-test',
    compare_at_price_paise: null, // No crossed-out price
    base_price_paise: inrToPaise('85'),
    min_order_quantity: null
  };

  const res = validateProductInput(productNoCrossedOut);
  assert(res.valid === true, 'Product without crossed-out price is valid');
  assert(res.data.compare_at_price_paise === null, 'Crossed-out price is null');
  assert(res.data.base_price_paise === 8500, 'Actual price is 8500 paise (₹85)');
  assert(res.data.expected_price_per_100_paise === 850000, 'Wholesale rate is 850000 paise (₹8,500)');

  // Public display logic simulation
  const displayCrossedOut = res.data.compare_at_price_paise != null && res.data.compare_at_price_paise > 0
    ? paiseToInr(res.data.compare_at_price_paise)
    : null;
  const displayActual = res.data.base_price_paise != null ? paiseToInr(res.data.base_price_paise) : null;

  assert(displayCrossedOut === null, 'Display crossed-out price is null (no strikethrough, no ₹0, no NaN)');
  assert(displayActual === 85, 'Display actual price is ₹85');
}
console.log('');

// ── WHATSAPP ENQUIRY TEST ────────────────────────────────────────────────────
console.log('Test WhatsApp Enquiry: Includes unit wholesale price, wholesale rate (100 pcs), and MOQ');
{
  const waUrlEn = buildWhatsAppUrl({
    productName: 'Glass Feeding Bottle 250ml',
    productUrl: 'https://yesenterprises.net.in/products/glass-feeding-bottle-250ml',
    quantity: 100,
    actualPrice: 85,
    wholesaleRate100: 8500,
    moq: 100,
    lang: 'en'
  });

  const decodedEn = decodeURIComponent(waUrlEn);
  assert(decodedEn.includes('• Wholesale Price: ₹85/pc'), 'English WhatsApp message includes Unit Wholesale Price');
  assert(decodedEn.includes('• Wholesale Rate (100 pcs): ₹8,500'), 'English WhatsApp message includes Wholesale Rate for 100 pcs');
  assert(decodedEn.includes('• Minimum Order Quantity (MOQ): 100 pcs'), 'English WhatsApp message includes MOQ');

  const waUrlHi = buildWhatsAppUrl({
    productName: 'ग्लास फीडिंग बॉटल 250ml',
    productUrl: 'https://yesenterprises.net.in/hi/products/glass-feeding-bottle-250ml',
    quantity: 100,
    actualPrice: 85,
    wholesaleRate100: 8500,
    moq: 100,
    lang: 'hi'
  });

  const decodedHi = decodeURIComponent(waUrlHi);
  assert(decodedHi.includes('• थोक मूल्य (प्रति पीस): ₹85'), 'Hindi WhatsApp message includes Unit Wholesale Price');
  assert(decodedHi.includes('• थोक दर (100 पीस): ₹8,500'), 'Hindi WhatsApp message includes Wholesale Rate for 100 pcs');
  assert(decodedHi.includes('• न्यूनतम ऑर्डर मात्रा (MOQ): 100 पीस'), 'Hindi WhatsApp message includes MOQ');
}
console.log('');

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`--- RESULTS: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All 6 Scenarios + WhatsApp formatting verified successfully!');
}
