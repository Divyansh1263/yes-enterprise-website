-- =============================================================================
-- YES ENTERPRISES — Stage 4 Product Images Insertion
-- Inserts 13 approved photographic records for prod-17, prod-18, and prod-19
-- =============================================================================

-- prod-17 (Handled SS Feeding Bottle 250 ml)
INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, alt_text_hi, mime_type, file_size_bytes, is_primary, sort_order)
VALUES
  ('img-prod-17-1', 'prod-17', NULL, 'products/prod-17-handles-250ml-primary.jpeg', 'YE Stainless Steel Feeding Bottle with Handles 250 ml', 'YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल 250 ml', 'image/jpeg', 120531, 1, 1),
  ('img-prod-17-2', 'prod-17', NULL, 'products/prod-17-handles-250ml-brand-stamp.jpeg', 'YE SS 304 laser branding engraving detail', 'YE SS 304 लेजर ब्रांडिंग विवरण', 'image/jpeg', 99071, 0, 2),
  ('img-prod-17-3', 'prod-17', NULL, 'products/prod-17-handles-250ml-scale.jpeg', 'Embossed graduation measurement scale markings', 'उभरे हुए मापन चिह्न', 'image/jpeg', 96327, 0, 3);

-- prod-18 (YE Glass Sipper with Handle 250 ml)
INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, alt_text_hi, mime_type, file_size_bytes, is_primary, sort_order)
VALUES
  ('img-prod-18-1', 'prod-18', NULL, 'products/prod-18-glass-sipper-handle-250ml-primary.jpeg', 'YE Glass Sipper with Handle 250 ml turquoise star sleeve', 'YE हैंडल वाला ग्लास सिपर 250 ml फ़िरोज़ा स्टार स्लीव', 'image/jpeg', 105542, 1, 1),
  ('img-prod-18-2', 'prod-18', NULL, 'products/prod-18-glass-sipper-handle-250ml-box-front.jpeg', 'Glass Sipper packaging box front MRP 275', 'ग्लास सिपर बॉक्स फ्रंट MRP ₹275', 'image/jpeg', 124428, 0, 2),
  ('img-prod-18-3', 'prod-18', NULL, 'products/prod-18-glass-sipper-handle-250ml-box-side.jpeg', 'Glass Sipper packaging box side instructions', 'ग्लास सिपर बॉक्स साइड निर्देश', 'image/jpeg', 129398, 0, 3),
  ('img-prod-18-4', 'prod-18', NULL, 'products/prod-18-glass-sipper-handle-250ml-box-back.jpeg', 'Glass Sipper packaging box back barcode', 'ग्लास सिपर बॉक्स बैक बारकोड', 'image/jpeg', 117036, 0, 4);

-- prod-19 (YE Premium Contoured SS Feeding Bottle Family & Variants)
INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, alt_text_hi, mime_type, file_size_bytes, is_primary, sort_order)
VALUES
  ('img-prod-19-1', 'prod-19', NULL, 'products/prod-19-premium-ss-250ml-primary.jpeg', 'YE Premium Contoured SS Feeding Bottle Family', 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल फैमिली', 'image/jpeg', 132357, 1, 1),
  ('img-prod-19-2', 'prod-19', 'var-prod-19-200', 'products/prod-19-premium-ss-200ml-primary.jpeg', 'YE Premium SS Feeding Bottle 200 ml', 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल 200 ml', 'image/jpeg', 105627, 1, 2),
  ('img-prod-19-3', 'prod-19', 'var-prod-19-250', 'products/prod-19-premium-ss-250ml-box.jpeg', 'YE Premium SS Feeding Bottle 250 ml with box', 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल 250 ml बॉक्स के साथ', 'image/jpeg', 122417, 1, 3),
  ('img-prod-19-4', 'prod-19', 'var-prod-19-200', 'products/prod-19-premium-ss-200ml-open-box.jpeg', 'YE Premium SS Feeding Bottle 200 ml open cap with box', 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल 200 ml ओपन कैप', 'image/jpeg', 116910, 0, 4),
  ('img-prod-19-5', 'prod-19', 'var-prod-19-200', 'products/prod-19-premium-ss-200ml-assembled-box.jpeg', 'YE Premium SS Feeding Bottle 200 ml assembled standing', 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल 200 ml बॉक्स के साथ', 'image/jpeg', 130690, 0, 5),
  ('img-prod-19-6', 'prod-19', 'var-prod-19-200', 'products/prod-19-premium-ss-200ml-box-side.jpeg', 'YE Premium SS Feeding Bottle 200 ml box side barcode', 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल 200 ml बारकोड', 'image/jpeg', 125500, 0, 6);
