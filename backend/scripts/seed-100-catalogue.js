require('dotenv').config();
const db = require('../config/db');

const categoriesData = [
  { name: 'Five-Metal Jewellery', slug: 'five-metal-jewellery', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80', description: 'Sacred five-metal Panchaloha alloy jewellery crafted according to traditional Shilpa Shastra guidelines.' },
  { name: 'Traditional Jewellery', slug: 'traditional-jewellery', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', description: 'Timeless Indian heritage jewellery featuring auspicious motifs and royal craftsmanship.' },
  { name: 'Gold Jewellery', slug: 'gold-jewellery', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80', description: 'Exquisite 22K and 18K gold-finished fine jewellery with flawless polish and brilliant shine.' },
  { name: 'Rings', slug: 'rings', image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80', description: 'Handcrafted rings including Navaratna, spiritual emblems, solitaires, and band designs.' },
  { name: 'Necklaces', slug: 'necklaces', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80', description: 'Grand necklaces, delicate chokers, mango malas, and layered regal statement pieces.' },
  { name: 'Chains', slug: 'chains', image: 'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80', description: 'Sturdy and lightweight chains in rope, box, figaro, and traditional thali chain weaves.' },
  { name: 'Earrings', slug: 'earrings', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80', description: 'Classic jhumkas, chandbalis, studs, drop earrings, and festive temple ear ornaments.' },
  { name: 'Bangles', slug: 'bangles', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80', description: 'Traditional carved bangles, valayal sets, and broad bridal kada sets.' },
  { name: 'Bracelets', slug: 'bracelets', image: 'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80', description: 'Heavy and lightweight cuff bracelets, auspicious kadas, and flexible link designs.' },
  { name: 'Pendants', slug: 'pendants', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', description: 'Divine temple pendants, deity lockets, gemstone drops, and sacred symbols.' },
  { name: 'Bridal Jewellery', slug: 'bridal-jewellery', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80', description: 'Comprehensive South Indian and royal bridal sets for auspicious wedding ceremonies.' },
  { name: 'Daily Wear Jewellery', slug: 'daily-wear-jewellery', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80', description: 'Lightweight, durable, skin-friendly jewellery made for comfortable everyday elegance.' },
  { name: 'Temple Jewellery', slug: 'temple-jewellery', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80', description: 'Heritage temple jewellery depicting sacred architecture, deities, and floral carvings.' },
  { name: 'Antique-Finish Jewellery', slug: 'antique-finish-jewellery', image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80', description: 'Vintage matte finish jewellery with dark gold tones and antique Victorian grandeur.' }
];

// High quality curated jewellery photos from Unsplash
const curatedImages = [
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
  'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
  'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80',
  'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80',
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80',
  'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80',
  'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&q=80',
  'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=800&q=80',
  'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=800&q=80',
  'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80',
  'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80',
  'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&q=80'
];

// Helper to pick an image based on index
const getImage = (idx) => curatedImages[idx % curatedImages.length];

// Base catalogue blueprints (distinct products)
const rawProducts = [
  // 1. Five-Metal Jewellery
  { name: 'Five-Metal Sacred Navaratna Ring', category_slug: 'five-metal-jewellery', price: 2850, old_price: 3600, weight: 7.8, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Copper 80%, Brass 15%, Tin 3%, Silver 1%, Gold wash 1%', available_sizes: 'Size 12, Size 14, Size 16, Size 18, Size 20', badge: 'Best Seller', description: 'Authentic five-metal sacred Navaratna ring featuring nine astrological gemstones set in hand-cast Panchaloha alloy for divine harmony and positive cosmic energy.' },
  { name: 'Five-Metal Divine Vel Spiritual Ring', category_slug: 'five-metal-jewellery', price: 1650, old_price: 2200, weight: 5.4, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Copper 78%, Brass 16%, Tin 3%, Silver 1.5%, Gold wash 1.5%', available_sizes: 'Size 14, Size 16, Size 18, Size 20, Size 22', badge: 'Popular', description: 'Sacred Lord Murugan spear (Vel) emblem cast in genuine five-metal alloy, carefully micro-polished for daily comfortable wear.' },
  { name: 'Five-Metal Goddess Lakshmi Temple Pendant', category_slug: 'five-metal-jewellery', price: 2250, old_price: 2900, weight: 11.2, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Copper 82%, Brass 14%, Lead/Tin 2%, Silver 1%, Gold 1%', available_sizes: 'Standard (4.2 cm x 3.0 cm)', badge: 'Featured', description: 'Detailed relief carving of seated Goddess Sri Mahalakshmi in sacred Panchaloha metal, invoking blessings of prosperity and serenity.' },
  { name: 'Five-Metal Heavy Suriya Kappu Kada', category_slug: 'five-metal-jewellery', price: 3450, old_price: 4500, weight: 32.5, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Traditional Panchaloha: Copper 75%, Brass 18%, Iron 3%, Silver 2%, Gold 2%', available_sizes: '2.4, 2.6, 2.8, Adjustable Open Cuff', badge: 'Best Seller', description: 'Auspicious Sun Kada (Suriya Kappu) handcrafted in five sacred metals with ornate terminal carvings for physical vitality and spiritual well-being.' },
  { name: 'Five-Metal Lord Vinayagar Sacred Pendant', category_slug: 'five-metal-jewellery', price: 1850, old_price: 2400, weight: 9.6, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Copper 80%, Brass 15%, Tin 3%, Silver 1%, Gold 1%', available_sizes: 'Standard (3.5 cm x 2.4 cm)', badge: 'New Arrival', description: 'Divine Ganesha pendant in temple-grade Panchaloha alloy with intricate trunk and crown details, symbolizing new beginnings and wisdom.' },
  { name: 'Five-Metal Classic Snake Serpent Ring', category_slug: 'five-metal-jewellery', price: 1750, old_price: 2300, weight: 6.2, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Five-metal composition: Copper 80%, Brass 15%, Tin 2.5%, Silver 1.5%, Gold 1%', available_sizes: 'Size 12, Size 14, Size 16, Size 18', badge: 'Trending', description: 'Traditional coiled serpent design symbolizing protection and spiritual energy, cast in skin-friendly five-metal Panchaloha.' },
  { name: 'Five-Metal Omkara Spiritual Pendant', category_slug: 'five-metal-jewellery', price: 1550, old_price: 1990, weight: 8.1, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Copper 81%, Brass 14%, Tin 3%, Silver 1%, Gold 1%', available_sizes: 'Standard (3.0 cm x 2.2 cm)', badge: 'Featured', description: 'Sacred primordial Om symbol sculpted in genuine five-metal alloy, hand-finished to a lustrous satin gold glow.' },
  { name: 'Five-Metal Traditional Floral Kada Bangle', category_slug: 'five-metal-jewellery', price: 3850, old_price: 4950, weight: 34.0, material: 'Panchaloha Five-Metal Alloy', metal_composition: 'Copper 76%, Brass 18%, Tin 3%, Silver 1.5%, Gold 1.5%', available_sizes: '2.4, 2.6, 2.8', badge: 'Limited Edition', description: 'Handcrafted Panchaloha five-metal bangle adorned with classic lotus engravings and durable screw clasp.' },

  // 2. Traditional Jewellery
  { name: 'Heritage Peacock Mugappu Gold Chain', category_slug: 'traditional-jewellery', price: 4200, old_price: 5400, weight: 26.5, material: '22K Gold Finish Brass Alloy', metal_composition: 'Brass core with 2 Micron 22K Gold plating and ruby-green synthetic stones', available_sizes: '24 Inches, 28 Inches, 30 Inches', badge: 'Best Seller', description: 'Regal traditional Mugappu chain showcasing an exquisitely carved double peacock side brooch studded with kemp ruby stones.' },
  { name: 'Traditional South Indian Mango Mala Necklace', category_slug: 'traditional-jewellery', price: 6850, old_price: 8900, weight: 42.0, material: 'Temple Gold Finish Alloy', metal_composition: 'High-purity copper-brass alloy with 22K micron gold electroplating', available_sizes: 'Adjustable Dori Weave', badge: 'Trending', description: 'Classic Manga Malai necklace featuring cascading mango motifs inlaid with royal red kemp stones for wedding and temple festivities.' },
  { name: 'Royal Kasu Mala Lakshmi Coin Necklace', category_slug: 'traditional-jewellery', price: 7450, old_price: 9800, weight: 48.0, material: '22K Gold Plated Alloy', metal_composition: 'Copper alloy with 22K Yellow Gold polish and engraved Lakshmi coins', available_sizes: 'Standard Choker + Long Chain Combo', badge: 'Best Seller', description: 'Auspicious Kasu Malai featuring repetitive Goddess Lakshmi embossed gold medallions, an essential heritage piece in traditional Indian weddings.' },
  { name: 'Heritage Kemp Stone Choker Set with Earrings', category_slug: 'traditional-jewellery', price: 5400, old_price: 7200, weight: 38.5, material: 'Antique Gold Finish Copper', metal_composition: 'Solid copper base with 22K gold micro plating and synthetic kemp cabochons', available_sizes: 'Adjustable Silk Cord', badge: 'Featured', description: 'Traditional South Indian wedding choker decorated with deep ruby red and emerald green stones, accompanied by matching jhumka earrings.' },
  { name: 'Traditional Vanki Armlet Bajuband', category_slug: 'traditional-jewellery', price: 3850, old_price: 5100, weight: 28.0, material: 'Gold Plated Copper Alloy', metal_composition: 'Copper base with inverted V-shape temple carving and red potta stones', available_sizes: 'Adjustable Arm Size (Free Size)', badge: 'Popular', description: 'Classic inverted V-shaped bridal Vanki armlet adorned with peacock engravings and dangling pearl clusters.' },
  { name: 'Heritage Netthi Chutti Maang Tikka', category_slug: 'traditional-jewellery', price: 1650, old_price: 2200, weight: 14.2, material: 'Gold Plated Alloy', metal_composition: 'Copper alloy with micro gold plating and pearl droplets', available_sizes: 'Standard Length (14 cm)', badge: 'New Arrival', description: 'Grand forehead ornament adorned with radiant stones and pearl drops, crowning the traditional Indian bride with poise.' },
  { name: 'Traditional Mookuthi Nose Pin Clip-on', category_slug: 'traditional-jewellery', price: 750, old_price: 1100, weight: 2.1, material: 'Gold Finish Silver Alloy', metal_composition: 'Silver alloy with 22K gold foil and radiant white stone', available_sizes: 'Clip-on Non-Pierced / Pierced', badge: 'Best Seller', description: 'Auspicious South Indian nose ornament with a cluster of bright sparkling stones, available in comfortable clip-on style.' },
  { name: 'Heritage Guttapusalu Layered Pearl Necklace', category_slug: 'traditional-jewellery', price: 6200, old_price: 8200, weight: 52.0, material: 'Gold Plated Alloy with Pearls', metal_composition: 'Copper-brass alloy with 22K gold micron polish and freshwater seed pearl bunches', available_sizes: 'Adjustable Thread Back', badge: 'Trending', description: 'Opulent Andhra heritage Guttapusalu necklace fringed with dense clusters of seed pearls and vibrant ruby accents.' },

  // 3. Gold Jewellery
  { name: '22K Gold Finish Classic Figaro Chain', category_slug: 'gold-jewellery', price: 2950, old_price: 3800, weight: 18.5, material: '22K Gold Plated Brass', metal_composition: 'Premium brass core with 2 Micron 22K Yellow Gold electroplating', available_sizes: '20 Inches, 22 Inches, 24 Inches', badge: 'Best Seller', description: 'Sophisticated 3-in-1 Figaro link pattern chain engineered for high durability, smooth neck drape, and long-lasting golden luster.' },
  { name: 'Gold-Plated Floral Filigree Stud Earrings', category_slug: 'gold-jewellery', price: 1250, old_price: 1650, weight: 6.4, material: 'Gold Finish Copper Alloy', metal_composition: 'Hypoallergenic copper with 1 Micron 22K gold coating', available_sizes: 'Diameter 1.8 cm', badge: 'Popular', description: 'Intricate blooming flower filigree design studs suited for formal dinners, workplace sophistication, and family functions.' },
  { name: 'Classic 22K Gold Finish Sleek Plain Bangle Set', category_slug: 'gold-jewellery', price: 2650, old_price: 3500, weight: 24.0, material: '22K Gold Plated Alloy', metal_composition: 'High-density brass with 22K gold micro-dip finish', available_sizes: '2.4, 2.6, 2.8', badge: 'Trending', description: 'Pair of daily-wear sleek rounded gold-tone bangles with smooth inner comfort fitting and rich radiant finish.' },
  { name: 'Gold-Tone Majestic Solitaire Ring', category_slug: 'gold-jewellery', price: 1450, old_price: 1950, weight: 5.2, material: 'Gold Plated Alloy', metal_composition: 'Brass with 1.5 Micron 18K yellow gold polish and 2-carat zirconia crystal', available_sizes: 'Size 12, Size 14, Size 16, Size 18', badge: 'New Arrival', description: 'Dazzling 6-prong solitaire ring radiating clean diamond sparkle with a durable gold-tone band.' },
  { name: 'Royal Gold Finish Layered Rani Haar', category_slug: 'gold-jewellery', price: 8950, old_price: 11900, weight: 65.0, material: '22K Gold Finish Alloy', metal_composition: 'Triple-layer gold plated copper alloy with royal crest medallions', available_sizes: 'Long Necklace (32 Inches)', badge: 'Best Seller', description: 'Grand triple-strand Rani Haar with ornate side brooch clips, offering a majestic silhouette for celebratory gatherings.' },
  { name: 'Gold-Plated Sleek Tennis Bracelet', category_slug: 'gold-jewellery', price: 2150, old_price: 2800, weight: 12.0, material: '18K Gold Plated Brass', metal_composition: 'Brass with 18K Yellow Gold finish and continuous channel-set cubic zirconia', available_sizes: '7.0 Inches, 7.5 Inches, 8.0 Inches', badge: 'Featured', description: 'Timeless tennis bracelet featuring precision-set sparkling stones, secured with a sturdy safety box clasp.' },
  { name: 'Gold-Tone Traditional Thali Mangalsutra Chain', category_slug: 'gold-jewellery', price: 3100, old_price: 4100, weight: 22.5, material: '22K Gold Plated Brass', metal_composition: 'Brass alloy with 22K gold polish and genuine black onyx seed beads', available_sizes: '26 Inches, 28 Inches, 30 Inches', badge: 'Popular', description: 'Auspicious sacred mangalsutra chain interwoven with gold links and black protective beads for marital blessing.' },
  { name: 'Gold-Plated Embossed Broad Kada', category_slug: 'gold-jewellery', price: 3450, old_price: 4600, weight: 36.0, material: '22K Gold Plated Copper', metal_composition: 'Solid copper core with 22K gold micron layer and textured geometric stamping', available_sizes: '2.6, 2.8, Open-end Adjustable', badge: 'Limited Edition', description: 'Heavy statement gold-finish Kada featuring textured ridged borders and smooth rounded edges for executive wear.' },

  // 4. Rings
  { name: 'Royal Emerald Cut Gold-Plated Ring', category_slug: 'rings', price: 1550, old_price: 2100, weight: 6.8, material: '18K Gold Plated Brass', metal_composition: 'Brass with 18K Gold finish and simulated emerald gemstone', available_sizes: 'Size 14, Size 16, Size 18, Size 20', badge: 'Best Seller', description: 'Vibrant emerald-cut deep green center stone framed by sparkling halo stones on an opulent golden band.' },
  { name: 'Traditional Floral Cluster Cocktail Ring', category_slug: 'rings', price: 1850, old_price: 2450, weight: 8.5, material: '22K Gold Plated Alloy', metal_composition: 'Copper alloy with micro-prong set ruby stones and pearl rim', available_sizes: 'Adjustable Band (Fits Size 12-20)', badge: 'Trending', description: 'Grand oversized cocktail ring with blooming petals and a cluster of ruby-tone crystals for party wear.' },
  { name: 'Auspicious Tortoise Kurma Ring', category_slug: 'rings', price: 1450, old_price: 1950, weight: 5.6, material: 'Five-Metal / Gold Plated', metal_composition: 'Five-metal Panchaloha alloy base with gold micron polish', available_sizes: 'Size 14, Size 16, Size 18, Size 20', badge: 'Popular', description: 'Vastu-compliant Kurma (Tortoise) ring believed to attract stability, good fortune, and financial wealth.' },
  { name: 'Classic Gold-Tone Eternity Band Ring', category_slug: 'rings', price: 1150, old_price: 1550, weight: 4.2, material: '18K Gold Plated Stainless Alloy', metal_composition: 'Skin-friendly alloy with 18K gold PVD finish and continuous crystal channel', available_sizes: 'Size 12, Size 14, Size 16, Size 18', badge: 'New Arrival', description: 'Understated luxury eternity band designed for everyday stackable wear or sleek minimalist styling.' },
  { name: 'Peacock Motif Antique Engraved Ring', category_slug: 'rings', price: 1650, old_price: 2200, weight: 7.4, material: 'Antique Gold Finish Copper', metal_composition: 'Copper with antique matte polish and fine feather details', available_sizes: 'Size 14, Size 16, Size 18, Size 20', badge: 'Featured', description: 'Artisanal peacock motif engraved ring with antique oxidized gold detailing and subtle ruby eye stone.' },
  { name: 'Spiritual Trishul and Damru Men Ring', category_slug: 'rings', price: 1750, old_price: 2350, weight: 9.1, material: 'Five-Metal Alloy', metal_composition: 'Five-metal Panchaloha base with rugged sculpted Shiva emblems', available_sizes: 'Size 18, Size 20, Size 22, Size 24', badge: 'Best Seller', description: 'Bold and spiritual trident (Trishul) and Damru ring designed for men, crafted in auspicious temple alloy.' },
  { name: 'Solitaire Crown Princess Ring', category_slug: 'rings', price: 1350, old_price: 1800, weight: 4.8, material: 'Rose Gold Finish Brass', metal_composition: 'Brass with 18K Rose Gold electroplate and heart-cut zirconia', available_sizes: 'Size 12, Size 14, Size 16', badge: 'Trending', description: 'Delicate tiara crown band featuring a gleaming central stone, ideal for birthdays and anniversaries.' },
  { name: 'Twin Heart Interlocking Couple Ring', category_slug: 'rings', price: 1250, old_price: 1700, weight: 5.1, material: '22K Gold Finish Alloy', metal_composition: 'Hypoallergenic brass with dual heart intertwined silhouette', available_sizes: 'Adjustable Free Size', badge: 'Popular', description: 'Romantic intertwined dual heart design celebrating eternal bond, finished in smooth warm gold luster.' },

  // 5. Necklaces
  { name: 'Royal Temple Choker with Pearl Drops', category_slug: 'necklaces', price: 5850, old_price: 7800, weight: 44.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper alloy with antique 22K gold polish and natural shell pearl drops', available_sizes: 'Adjustable Velvet/Zari Cord', badge: 'Best Seller', description: 'Majestic temple choker adorned with seated Lakshmi iconography and dangling clusters of pure ivory pearls.' },
  { name: 'Bridal Kundan and Meenakari Choker Necklace', category_slug: 'necklaces', price: 7200, old_price: 9500, weight: 56.0, material: '22K Gold Plated Brass', metal_composition: 'Brass core with hand-set glass Kundan stones and back enamel Meenakari art', available_sizes: 'Adjustable Dori', badge: 'Featured', description: 'Exquisite bridal choker showcasing authentic Kundan stone setting with reverse traditional Meenakari enameling.' },
  { name: 'Minimalist Gold-Plated Bar Necklace', category_slug: 'necklaces', price: 1450, old_price: 1950, weight: 8.2, material: '18K Gold Plated Alloy', metal_composition: 'Brass with 18K Yellow Gold coating and micro pave crystals', available_sizes: '16 Inches + 2 Inch Extender', badge: 'New Arrival', description: 'Contemporary horizontal bar necklace tailored for office chic, layered chains, and everyday understated beauty.' },
  { name: 'Traditional Coin Choker with Ruby Accents', category_slug: 'necklaces', price: 4650, old_price: 6200, weight: 36.5, material: '22K Gold Plated Copper', metal_composition: 'Copper with embossed coins and synthetic kemp stones', available_sizes: 'Adjustable Silk Cord', badge: 'Trending', description: 'Compact Kasu coin collar choker hugging the neckline gracefully, highlighted by deep wine-red gemstones.' },
  { name: 'Grand Peacock Statement Festive Necklace', category_slug: 'necklaces', price: 6450, old_price: 8600, weight: 50.0, material: 'Antique Matte Gold Finish', metal_composition: 'Copper-brass alloy with multi-stone peacock plumage motifs', available_sizes: 'Standard Collar Length', badge: 'Popular', description: 'Opulent statement festive necklace depicting majestic dancing peacocks, created for grand receptions and cultural galas.' },
  { name: 'Floral Petal Y-Drop Gold Necklace', category_slug: 'necklaces', price: 3250, old_price: 4300, weight: 21.0, material: '22K Gold Finish Alloy', metal_composition: 'Brass alloy with 22K gold polish and cascading crystal drops', available_sizes: '18 Inches with 3 Inch Drop', badge: 'Featured', description: 'Flattering Y-shaped lariat necklace that accentuates deep necklines with subtle golden elegance and shimmer.' },
  { name: 'Antique Lakshmi Haram Long Necklace', category_slug: 'necklaces', price: 8400, old_price: 11200, weight: 68.0, material: 'Temple Gold Finish Copper', metal_composition: 'Solid copper base with 22K micro gold plating and temple stone embellishments', available_sizes: '28 Inches Long Haram', badge: 'Best Seller', description: 'Heavy traditional Haram reaching the chest line, showcasing divine deity sculpting and regal South Indian motifs.' },
  { name: 'Delicate Gold Pearl Strand Princess Necklace', category_slug: 'necklaces', price: 2350, old_price: 3100, weight: 16.5, material: 'Gold Plated Alloy with Pearls', metal_composition: 'Gold-finish chain interspersed with lustrous cream faux pearls', available_sizes: '18 Inches', badge: 'Trending', description: 'Sweet and graceful pearl strand necklace suitable for sarees, kurtis, and evening gowns alike.' },

  // 6. Chains
  { name: 'Classic Gold-Plated Rope Chain (4mm)', category_slug: 'chains', price: 2450, old_price: 3200, weight: 20.0, material: '22K Gold Plated Brass', metal_composition: 'High-density brass with 22K yellow gold electroplating', available_sizes: '20 Inches, 24 Inches, 26 Inches', badge: 'Best Seller', description: 'Sturdy diamond-cut twisted rope chain engineered to reflect light from every angle with supreme flexibility.' },
  { name: 'Traditional Flat Link Snake Chain', category_slug: 'chains', price: 2150, old_price: 2850, weight: 17.5, material: '22K Gold Plated Copper', metal_composition: 'Copper core with smooth interlocking snake scales and gold gloss', available_sizes: '18 Inches, 22 Inches, 24 Inches', badge: 'Popular', description: 'Smooth-as-silk flat snake chain that lays flat against the collarbone without snagging clothing or hair.' },
  { name: 'Heavy Curb Cuban Link Chain for Men', category_slug: 'chains', price: 3450, old_price: 4600, weight: 35.0, material: 'Gold Plated Stainless Brass', metal_composition: 'Brass with 18K gold micro-coating and beveled curb edges', available_sizes: '22 Inches, 24 Inches, 26 Inches', badge: 'Trending', description: 'Bold and masculine 6mm Cuban link chain featuring heavy gauge links and a secure lobster claw mechanism.' },
  { name: 'Delicate Box Chain with Spring Clasp', category_slug: 'chains', price: 1350, old_price: 1800, weight: 8.0, material: '18K Gold Plated Alloy', metal_composition: 'Brass with 18K yellow gold finish and four-sided square links', available_sizes: '16 Inches, 18 Inches, 20 Inches', badge: 'New Arrival', description: 'Minimalist geometric box chain ideal for hanging lightweight deity pendants, solitaires, and lockets.' },
  { name: 'Traditional Kolhapuri Saaj Motif Chain', category_slug: 'chains', price: 3850, old_price: 5100, weight: 29.0, material: 'Antique Gold Finish Alloy', metal_composition: 'Copper-brass alloy with 21 auspicious carved leaf charms', available_sizes: '24 Inches, 28 Inches', badge: 'Featured', description: 'Historic Saaj chain featuring sequential sacred emblems symbolizing nature, deities, and cosmic balance.' },
  { name: 'Spiritual Rudraksha Mala Gold Plated Chain', category_slug: 'chains', price: 2250, old_price: 3000, weight: 22.0, material: 'Gold Plated Brass with Rudraksha', metal_composition: 'Brass caps with 22K gold plating and natural 5-Mukhi Rudraksha beads', available_sizes: '26 Inches, 28 Inches (54 Beads)', badge: 'Best Seller', description: 'Spiritual prayer mala strung with authentic natural Rudraksha beads encased in gold-toned fluted caps.' },
  { name: 'Double Layered Wheat Spiga Chain', category_slug: 'chains', price: 2650, old_price: 3500, weight: 21.5, material: '22K Gold Plated Alloy', metal_composition: 'Braided four-strand teardrop links with 22K gold coating', available_sizes: '20 Inches, 24 Inches', badge: 'Trending', description: 'Durable wheat weave pattern offering high tensile strength and intricate textural detailing.' },
  { name: 'Traditional Jasmine Bud (Mullai Mottu) Chain', category_slug: 'chains', price: 3650, old_price: 4800, weight: 28.5, material: '22K Gold Plated Copper', metal_composition: 'Copper with delicate pointed jasmine bud motifs and gold dip', available_sizes: '22 Inches, 26 Inches', badge: 'Popular', description: 'Poetic South Indian chain inspired by fragrant jasmine blossoms, traditionally worn for temple festivities.' },

  // 7. Earrings
  { name: 'Grand Kemp Ruby Bell Jhumka Earrings', category_slug: 'earrings', price: 2450, old_price: 3300, weight: 22.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper alloy with antique gold plating, ruby kemp stones and pearl hangings', available_sizes: 'Height 5.5 cm x Width 2.8 cm', badge: 'Best Seller', description: 'Traditional bell-shaped jhumkas topped with peacock studs and trimmed with tinkling pearl seed droplets.' },
  { name: 'Classic Peacock Chandbali Festive Earrings', category_slug: 'earrings', price: 2250, old_price: 3000, weight: 19.5, material: '22K Gold Plated Alloy', metal_composition: 'Brass alloy with 22K gold polish, micro kundan stones and green beads', available_sizes: 'Height 6.0 cm x Width 4.0 cm', badge: 'Trending', description: 'Crescent moon silhouette earrings radiating royal Mughal and South Indian charm with dangling emerald-toned beads.' },
  { name: 'Minimalist 22K Gold-Plated Daily Studs', category_slug: 'earrings', price: 950, old_price: 1350, weight: 4.5, material: '22K Gold Plated Copper', metal_composition: 'Copper with 22K gold coating and central faceted cubic zirconia', available_sizes: 'Diameter 1.2 cm', badge: 'Popular', description: 'Clean, irritation-free everyday studs with secure push-back closures that pair seamlessly with any outfit.' },
  { name: 'Traditional Matte Finish Lakshmi Jhumkas', category_slug: 'earrings', price: 2850, old_price: 3800, weight: 26.0, material: 'Antique Gold Finish Copper', metal_composition: 'Solid copper base with Goddess Lakshmi stud and filigree dome', available_sizes: 'Height 6.2 cm', badge: 'Featured', description: 'Divine Goddess Lakshmi studs leading into deep fluted jhumka bells, finished in majestic antique temple patina.' },
  { name: 'Sparkling Teardrop Chandelier Earrings', category_slug: 'earrings', price: 1850, old_price: 2500, weight: 14.0, material: '18K Gold Plated Brass', metal_composition: 'Brass with 18K Yellow Gold finish and multi-tier pear cut crystals', available_sizes: 'Length 4.8 cm', badge: 'New Arrival', description: 'Glittering evening earrings designed to catch candlelight with graceful chandelier articulation and sparkle.' },
  { name: 'Traditional Ear Chain (Maattal) with Jhumka', category_slug: 'earrings', price: 3150, old_price: 4200, weight: 30.0, material: '22K Gold Plated Alloy', metal_composition: 'Copper-brass alloy with 3-strand pearl hair chain extension', available_sizes: 'Standard Ear-to-Hair Length', badge: 'Limited Edition', description: 'Complete festive set including ornate jhumkas and pearl-studded side chains that hook securely into bridal hair.' },
  { name: 'Floral Hoop Bali Earrings with Charms', category_slug: 'earrings', price: 1450, old_price: 1950, weight: 9.8, material: '22K Gold Plated Brass', metal_composition: 'Brass with 22K gold plating and suspended floral petal drops', available_sizes: 'Hoop Diameter 3.2 cm', badge: 'Trending', description: 'Lightweight everyday hoops enriched with dangling floral charms for a playful yet sophisticated feminine flair.' },
  { name: 'Contemporary Geometric Threader Earrings', category_slug: 'earrings', price: 1150, old_price: 1550, weight: 3.8, material: '18K Gold Plated Alloy', metal_composition: 'Hypoallergenic alloy with fine chain pull-through and bar drop', available_sizes: 'Total Length 9.0 cm', badge: 'New Arrival', description: 'Modern minimalist pull-through threaders providing fluid movement and contemporary architectural lines.' },

  // 8. Bangles
  { name: 'Classic 4-Piece Gold-Plated Bangle Set', category_slug: 'bangles', price: 3250, old_price: 4400, weight: 48.0, material: '22K Gold Plated Brass', metal_composition: 'Solid brass with 22K gold micro-layer and diamond-cut facets', available_sizes: '2.4, 2.6, 2.8', badge: 'Best Seller', description: 'Versatile four-piece bangle set featuring diamond-cut facets that catch the light with subtle rhythmic shimmer.' },
  { name: 'Traditional Temple Ruby Openable Kada Bangle', category_slug: 'bangles', price: 3850, old_price: 5200, weight: 38.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper alloy with antique gold plating and synthetic kemp stones', available_sizes: '2.4, 2.6, 2.8 with Side Screw Lock', badge: 'Trending', description: 'Heavy openable Kada with secure screw lock, intricately carved with floral vines and deep red cabochons.' },
  { name: 'Royal Peacock Embossed Bridal Kada Pair', category_slug: 'bangles', price: 4650, old_price: 6200, weight: 58.0, material: '22K Gold Finish Copper Alloy', metal_composition: 'Copper base with high-relief peacock stamping and golden luster', available_sizes: '2.4, 2.6, 2.8', badge: 'Featured', description: 'Pair of broad bridal kadas showcasing twin peacocks meeting at the crest, commanding admiration on wedding days.' },
  { name: 'Delicate Floral Thin Bangles (Set of 6)', category_slug: 'bangles', price: 2850, old_price: 3800, weight: 36.0, material: '22K Gold Plated Alloy', metal_composition: 'Brass core with etched floral scrollwork and smooth edges', available_sizes: '2.4, 2.6, 2.8', badge: 'Popular', description: 'Six slender textured bangles designed to be worn together as a musical stack or split across both wrists.' },
  { name: 'Antique Goddess Lakshmi Broad Kada', category_slug: 'bangles', price: 3950, old_price: 5300, weight: 42.0, material: 'Temple Finish Copper', metal_composition: 'Heavy copper core with seated Lakshmi relief and ruby accents', available_sizes: '2.6, 2.8', badge: 'Best Seller', description: 'Heritage broad Kada featuring central Lakshmi motif surrounded by classical South Indian temple archways.' },
  { name: 'Emerald and Ruby Dual-Tone Bangle Pair', category_slug: 'bangles', price: 3450, old_price: 4600, weight: 40.0, material: '22K Gold Plated Alloy', metal_composition: 'Brass with alternating ruby and emerald potta stones', available_sizes: '2.4, 2.6, 2.8', badge: 'Trending', description: 'Auspicious Navaratna-inspired color harmony with alternating red and green stones on polished gold channels.' },
  { name: 'Filigree Cutwork Gold-Tone Bridal Kada', category_slug: 'bangles', price: 3650, old_price: 4900, weight: 35.0, material: '18K Gold Plated Brass', metal_composition: 'Brass with lace-like pierced filigree and micro gold polish', available_sizes: '2.4, 2.6, 2.8', badge: 'New Arrival', description: 'Airy and breathable cutwork lace pattern bangle balancing broad visual volume with lightweight wearability.' },
  { name: 'Traditional Screwed Daily Kada for Women', category_slug: 'bangles', price: 2950, old_price: 3950, weight: 31.0, material: '22K Gold Plated Brass', metal_composition: 'Heavy brass with traditional screw pin clasp mechanism', available_sizes: '2.4, 2.6, 2.8', badge: 'Popular', description: 'Classic daily Kada with vintage screw pin fastener, built for durability and continuous everyday wear.' },

  // 9. Bracelets
  { name: 'Traditional Kada Bracelet with Tiger Claw Emblem', category_slug: 'bracelets', price: 2850, old_price: 3800, weight: 25.0, material: 'Five-Metal / Gold Plated', metal_composition: 'Five-metal Panchaloha alloy base with 22K gold coating', available_sizes: 'Free Size Open Cuff (Fits all wrists)', badge: 'Best Seller', description: 'Protective Pulunakham (Tiger Claw) motif bracelet representing courage, inner strength, and auspicious resilience.' },
  { name: 'Gold-Plated Charm Bracelet with Lucky Symbols', category_slug: 'bracelets', price: 1850, old_price: 2450, weight: 14.5, material: '18K Gold Plated Brass', metal_composition: 'Brass with 18K Yellow Gold finish and 7 symbolic charms', available_sizes: '7.5 Inches with 1.5 Inch Extender', badge: 'Trending', description: 'Charming link bracelet adorned with dangling auspicious icons including lotus, elephant, and om symbols.' },
  { name: 'Men Classic Figaro Bracelet in 22K Gold Tone', category_slug: 'bracelets', price: 1950, old_price: 2600, weight: 18.0, material: '22K Gold Plated Brass', metal_composition: 'Heavy gauge brass links with 2 Micron 22K Gold polish', available_sizes: '8.0 Inches, 8.5 Inches', badge: 'Popular', description: 'Handsome 7mm wide Figaro pattern men wrist bracelet with sturdy fold-over clasp and mirror polish.' },
  { name: 'Delicate Pearl and Crystal Tennis Bracelet', category_slug: 'bracelets', price: 1650, old_price: 2200, weight: 11.0, material: 'Gold Plated Alloy with Pearls', metal_composition: 'Alloy with alternating bezel-set crystals and seed pearls', available_sizes: '7.0 Inches + Extender', badge: 'New Arrival', description: 'Dainty and luminous wrist piece that adds timeless refinement to both western formalwear and traditional silks.' },
  { name: 'Heavy Royal Elephant Head Kada Bracelet', category_slug: 'bracelets', price: 3450, old_price: 4600, weight: 38.0, material: 'Antique Gold Finish Copper', metal_composition: 'Solid copper core with intricately carved twin elephant heads', available_sizes: 'Open Cuff Adjustable', badge: 'Featured', description: 'Majestic elephant heads (Gaja) facing each other at the cuff opening, symbolizing royal dignity and abundance.' },
  { name: 'Sleek Minimalist Gold Bangle Bracelet', category_slug: 'bracelets', price: 1450, old_price: 1950, weight: 9.5, material: '18K Gold Plated Stainless Alloy', metal_composition: 'Non-tarnish stainless alloy with 18K yellow gold ion plating', available_sizes: 'Standard Oval Contour (Fits 6.0 to 7.0 Inch wrists)', badge: 'Best Seller', description: 'Hinged oval bangle bracelet designed with an invisible snap clasp, ideal for all-day modern styling.' },
  { name: 'Lord Shiva Trishul Cuff Bracelet', category_slug: 'bracelets', price: 2250, old_price: 3000, weight: 24.0, material: 'Five-Metal Panchaloha Base', metal_composition: 'Panchaloha five-metal alloy with Rudraksha bead accents', available_sizes: 'Adjustable Open Cuff', badge: 'Popular', description: 'Spiritual cuff featuring trident and mini Rudraksha beads, hand-sculpted in authentic temple-grade metals.' },
  { name: 'Multi-Stone Floral Link Evening Bracelet', category_slug: 'bracelets', price: 2350, old_price: 3150, weight: 16.0, material: '22K Gold Plated Brass', metal_composition: 'Brass with precision-set red and white crystals in flower links', available_sizes: '7.25 Inches with Safety Lock', badge: 'Trending', description: 'Flexible articulating flower links that drape comfortably across the wrist, dazzling under banquet lights.' },

  // 10. Pendants
  { name: 'Lord Murugan Peacock Feather Gold Pendant', category_slug: 'pendants', price: 1650, old_price: 2200, weight: 7.8, material: '22K Gold Plated Brass', metal_composition: 'Brass with 22K gold polish and vibrant blue enamel accents', available_sizes: 'Standard (3.8 cm x 2.2 cm)', badge: 'Best Seller', description: 'Gracefully curved peacock feather with Lord Murugan sacred Vel motif, finished in glowing gold and royal enamel.' },
  { name: 'Goddess Lakshmi Lotus Throne Temple Pendant', category_slug: 'pendants', price: 2150, old_price: 2900, weight: 13.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper base with antique gold finish and ruby potta stones', available_sizes: 'Large (5.0 cm x 3.6 cm)', badge: 'Featured', description: 'Intricate temple relief of Goddess Lakshmi seated on a blooming lotus, flanked by divine celestial elephants.' },
  { name: 'Sacred Shiva Lingam and Nandi Pendant', category_slug: 'pendants', price: 1750, old_price: 2350, weight: 9.5, material: 'Five-Metal / Gold Plated', metal_composition: 'Panchaloha five-metal alloy core with gold micro plating', available_sizes: 'Medium (3.2 cm x 2.5 cm)', badge: 'Popular', description: 'Sacred emblem of Lord Shiva Lingam with devoted Nandi bull, meticulously hand-crafted for auspicious wear.' },
  { name: 'Astrological Navaratna Sun Gold Pendant', category_slug: 'pendants', price: 2350, old_price: 3100, weight: 11.5, material: '22K Gold Plated Copper', metal_composition: 'Copper with 9 calibrated planetary gemstones and sun rays', available_sizes: 'Diameter 3.5 cm', badge: 'Trending', description: 'Radiant solar disc set with nine astrological gemstones representing cosmic balance and celestial protection.' },
  { name: 'Classic Gold Heart Locket with Photo Slot', category_slug: 'pendants', price: 1450, old_price: 1950, weight: 8.0, material: '18K Gold Plated Brass', metal_composition: 'Brass with 18K yellow gold polish and opening hinge compartment', available_sizes: 'Standard (2.8 cm x 2.5 cm)', badge: 'New Arrival', description: 'Sentimental opening heart locket engraved with delicate florals, holding two keepsake photographs inside.' },
  { name: 'Hanuman Gada (Mace) Spiritual Pendant', category_slug: 'pendants', price: 1850, old_price: 2450, weight: 12.0, material: 'Five-Metal Alloy', metal_composition: 'Five-metal Panchaloha alloy base with 22K gold coating', available_sizes: 'Length 4.5 cm', badge: 'Best Seller', description: 'Powerful mace (Gada) of Lord Hanuman symbolizing supreme strength, fearless devotion, and protection.' },
  { name: 'Diamond-Cut Star of Light Gold Pendant', category_slug: 'pendants', price: 1250, old_price: 1700, weight: 5.5, material: '18K Gold Plated Alloy', metal_composition: 'Alloy with 18K gold coating and multi-facet diamond cut edge', available_sizes: 'Diameter 2.2 cm', badge: 'Popular', description: 'Gleaming eight-pointed celestial star catching and refracting light with contemporary diamond-cut faceting.' },
  { name: 'Traditional Peacock Drop Pendant with Pearl', category_slug: 'pendants', price: 1950, old_price: 2600, weight: 10.5, material: 'Antique Gold Finish Copper', metal_composition: 'Copper alloy with ruby cabochons and suspended natural pearl', available_sizes: 'Length 4.2 cm x Width 2.8 cm', badge: 'Trending', description: 'Ornate peacock silhouette with flared tail feathers holding a teardrop kemp gem and hanging pearl droplet.' },

  // 11. Bridal Jewellery
  { name: 'Grand Bridal Temple Heritage Jewellery Set', category_slug: 'bridal-jewellery', price: 14850, old_price: 19800, weight: 135.0, material: 'Temple Gold Finish Copper', metal_composition: 'Solid copper base with 22K antique gold polish, ruby-green stones, pearl drops (Includes Choker, Long Haram, Jhumkas, Maang Tikka)', available_sizes: 'Complete Bridal Set (Standard Fit)', badge: 'Best Seller', description: 'Comprehensive traditional South Indian bridal trousseau including grand Choker, long Kasu Haram, matching Jhumkas, and Maang Tikka.' },
  { name: 'Royal Rajputana Kundan Bridal Choker Set', category_slug: 'bridal-jewellery', price: 12450, old_price: 16500, weight: 110.0, material: '22K Gold Plated Brass', metal_composition: 'Brass with hand-set Kundan stones, emerald drops and reverse Meenakari enameling', available_sizes: 'Adjustable Velvet Cord', badge: 'Featured', description: 'Opulent multi-tiered Kundan choker paired with statement chandelier earrings and royal bridal forehead maang tikka.' },
  { name: 'Traditional South Indian Bridal Waist Belt (Oddiyanam)', category_slug: 'bridal-jewellery', price: 6850, old_price: 9200, weight: 85.0, material: 'Temple Finish Copper Alloy', metal_composition: 'Heavy copper base with Goddess Lakshmi arch and adjustable chain links', available_sizes: 'Waist 26 Inches to 40 Inches Adjustable', badge: 'Trending', description: 'Auspicious bridal Oddiyanam (Kamarbandh) designed with seated Lakshmi and peacocks to sculpt the bridal silk saree.' },
  { name: 'Heritage Kemp Bridal Vanki Armlet Pair', category_slug: 'bridal-jewellery', price: 4950, old_price: 6600, weight: 55.0, material: '22K Gold Plated Copper', metal_composition: 'Copper with inverted V-shape temple carving and twin peacock crest', available_sizes: 'Free Size Adjustable Pair', badge: 'Popular', description: 'Pair of handcrafted bridal armlets with flexible spring adjustment, essential for classical Bharatnatyam and Hindu brides.' },
  { name: 'Grand Bridal Maang Tikka and Mathapatti Set', category_slug: 'bridal-jewellery', price: 3450, old_price: 4600, weight: 38.0, material: '22K Gold Finish Alloy', metal_composition: 'Alloy with ruby-emerald kemp stones and side hair draping chains', available_sizes: 'Standard Head Dimension', badge: 'New Arrival', description: 'Majestic Mathapatti headband framing the hairline with pearls and gems, centering into an ornate Lakshmi tikka.' },
  { name: 'Bridal Haathphool Hand Harness Pair', category_slug: 'bridal-jewellery', price: 2950, old_price: 3950, weight: 32.0, material: 'Gold Plated Brass with Pearls', metal_composition: 'Brass with ring-to-wrist pearl chain connection and floral center', available_sizes: 'Adjustable Wrist & Ring Size', badge: 'Limited Edition', description: 'Delicate hand harness connecting ring to wrist with floral kundan medallions, highlighting mehndi-adorned hands.' },
  { name: 'Traditional Bridal Nath Nose Ring with Chain', category_slug: 'bridal-jewellery', price: 1450, old_price: 1950, weight: 9.0, material: '22K Gold Plated Alloy', metal_composition: 'Copper with ruby stones, pearl fringe and delicate hair attachment chain', available_sizes: 'Clip-on Non-Pierced (Ring Dia 3.5 cm)', badge: 'Best Seller', description: 'Regal bridal nose ring adorned with pearl tassels and a delicate link chain that pins gracefully behind the ear.' },
  { name: 'Bridal Anklet (Payal) Pair with Tinkling Bells', category_slug: 'bridal-jewellery', price: 2850, old_price: 3800, weight: 46.0, material: '22K Gold Plated Copper', metal_composition: 'Copper with heavy floral links and melodic golden ghungroo bells', available_sizes: 'Length 10.5 Inches Each', badge: 'Trending', description: 'Pair of melodic traditional bridal anklets crafting auspicious rhythmic sounds with every step of the bride.' },

  // 12. Daily Wear Jewellery
  { name: 'Lightweight Daily Wear Gold Chain', category_slug: 'daily-wear-jewellery', price: 1650, old_price: 2200, weight: 10.5, material: '22K Gold Plated Brass', metal_composition: 'Hypoallergenic brass with 22K gold coating, sweat-resistant polish', available_sizes: '18 Inches, 20 Inches, 22 Inches', badge: 'Best Seller', description: 'Feather-light, tangle-free daily wear chain crafted for effortless round-the-clock comfort and lasting shine.' },
  { name: 'Simple Everyday Gold Hoop Earrings', category_slug: 'daily-wear-jewellery', price: 850, old_price: 1200, weight: 3.5, material: '18K Gold Plated Alloy', metal_composition: 'Skin-friendly alloy with 18K yellow gold finish and secure click latch', available_sizes: 'Diameter 1.5 cm', badge: 'Popular', description: 'Classic lightweight small huggie hoops with smooth rounded edges that will not catch on scarves or pillows.' },
  { name: 'Dainty Solitaire Crystal Pendant with Chain', category_slug: 'daily-wear-jewellery', price: 1150, old_price: 1550, weight: 6.0, material: '18K Gold Plated Brass', metal_composition: 'Brass with 18K gold chain and 1-carat round brilliant crystal', available_sizes: '16 Inches + 2 Inch Extender', badge: 'Trending', description: 'Effortless single crystal floating necklace adding subtle glimmer to work shirts, casual tops, and kurtis.' },
  { name: 'Smooth Comfort-Fit Daily Band Ring', category_slug: 'daily-wear-jewellery', price: 950, old_price: 1300, weight: 4.0, material: '22K Gold Finish Stainless Alloy', metal_composition: 'Durable alloy with 22K gold PVD layer, waterproof and fade-proof', available_sizes: 'Size 12, Size 14, Size 16, Size 18, Size 20', badge: 'New Arrival', description: 'Classic dome-profile plain gold band engineered with rounded interior edges for maximum daily comfort.' },
  { name: 'Daily Wear Single Kada Bangle with Spring Lock', category_slug: 'daily-wear-jewellery', price: 1750, old_price: 2350, weight: 18.0, material: '22K Gold Plated Brass', metal_composition: 'Brass core with hard gold coating and seamless spring hinge', available_sizes: '2.4, 2.6, 2.8', badge: 'Featured', description: 'Sturdy single bangle designed for daily kitchen, office, and routine chores without losing its golden gloss.' },
  { name: 'Petite Floral Drop Everyday Earrings', category_slug: 'daily-wear-jewellery', price: 1050, old_price: 1450, weight: 4.8, material: '18K Gold Plated Alloy', metal_composition: 'Hypoallergenic alloy with micro zirconia crystal cluster', available_sizes: 'Length 2.2 cm', badge: 'Best Seller', description: 'Charming mini floral drops that sway gently with every head turn while remaining ultralight on earlobes.' },
  { name: 'Minimalist Black Bead Daily Mangalsutra', category_slug: 'daily-wear-jewellery', price: 1850, old_price: 2450, weight: 11.0, material: '22K Gold Plated Brass', metal_composition: 'Brass with 22K gold plating, authentic black spinel beads and dual gold cups', available_sizes: '18 Inches, 20 Inches', badge: 'Popular', description: 'Modern sleek mangalsutra tailored for the contemporary working woman, balancing sacred tradition with understated style.' },
  { name: 'Adjustable Sleek Cable Chain Bracelet', category_slug: 'daily-wear-jewellery', price: 1150, old_price: 1550, weight: 5.5, material: '18K Gold Plated Stainless Alloy', metal_composition: 'Stainless alloy with 18K yellow gold finish and bolo slider bead', available_sizes: 'Adjustable Bolo (Fits all wrists up to 8.5 Inches)', badge: 'Trending', description: 'Minimalist cable bracelet with smooth sliding bolo mechanism for a customized snug fit every time.' },

  // 13. Temple Jewellery
  { name: 'Sacred Temple Lakshmi Kasu Choker Necklace', category_slug: 'temple-jewellery', price: 5450, old_price: 7200, weight: 42.0, material: 'Temple Antique Gold Finish', metal_composition: 'Copper base with antique matte gold plating, ruby kemp stones and Lakshmi relief', available_sizes: 'Adjustable Traditional Zari Thread', badge: 'Best Seller', description: 'Authentic temple choker depicting Goddess Lakshmi seated within royal sanctum sanctorum arches, bordered by deep ruby stones.' },
  { name: 'Temple Architecture Carved Jhumkas', category_slug: 'temple-jewellery', price: 2650, old_price: 3500, weight: 24.5, material: 'Antique Gold Finish Copper', metal_composition: 'Copper with temple pillar carvings, emerald accents and pearl fringe', available_sizes: 'Height 5.8 cm', badge: 'Trending', description: 'Architectural ear ornaments inspired by South Indian temple mandapams, featuring fluted dome bells and rich patina.' },
  { name: 'Divine Nataraja Cosmic Dance Temple Pendant', category_slug: 'temple-jewellery', price: 2450, old_price: 3300, weight: 16.0, material: 'Panchaloha Five-Metal / Gold Plated', metal_composition: 'Five-metal Panchaloha base with 22K gold plating and ring of fire motif', available_sizes: 'Height 5.5 cm x Width 4.5 cm', badge: 'Featured', description: 'Sculptural masterpiece capturing Lord Shiva as Nataraja in the cosmic dance of creation and dissolution within a halo of flames.' },
  { name: 'Temple Heritage Kemp Stone Broad Kada', category_slug: 'temple-jewellery', price: 4150, old_price: 5500, weight: 45.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper-brass alloy with hand-cut kemp stones and screw lock', available_sizes: '2.4, 2.6, 2.8', badge: 'Popular', description: 'Exquisite broad cuff bangle echoing heritage temple art, encrusted with rich magenta and bottle green cabochons.' },
  { name: 'Temple Ganesha and Mooshika Wall Plaque Locket', category_slug: 'temple-jewellery', price: 2150, old_price: 2850, weight: 14.0, material: 'Antique Gold Finish Copper', metal_composition: 'Copper with high-relief Ganesha casting and matte gold polish', available_sizes: 'Standard (4.5 cm x 3.2 cm)', badge: 'New Arrival', description: 'Intricate temple relief of Lord Ganesha blessing devotees, framed by sacred South Indian temple arches.' },
  { name: 'Sacred Temple Kamakshi Deepam Pendant', category_slug: 'temple-jewellery', price: 1950, old_price: 2600, weight: 12.0, material: 'Five-Metal / Gold Plated', metal_composition: 'Panchaloha five-metal alloy core with auspicious oil lamp carving', available_sizes: 'Height 4.0 cm x Width 2.8 cm', badge: 'Trending', description: 'Auspicious lamp (Deepam) pendant symbolizing the eternal dispelling of darkness, ignorance, and adversity.' },
  { name: 'Temple Kemp Stone Floral Waist Belt (Kamarbandh)', category_slug: 'temple-jewellery', price: 6250, old_price: 8400, weight: 75.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper with cascading temple arches, ruby-green stones and bell clusters', available_sizes: 'Waist 28 to 42 Inches Adjustable', badge: 'Best Seller', description: 'Traditional South Indian waist chain highlighting the feminine silhouette over Kanchipuram silk sarees.' },
  { name: 'Temple Peacock and Floral Hair Plait Ornament (Jada Billai)', category_slug: 'temple-jewellery', price: 3450, old_price: 4600, weight: 38.0, material: '22K Gold Plated Alloy', metal_composition: 'Alloy with set of 9 graduated circular clips and ruby stones', available_sizes: 'Set of 9 Graduated Pieces', badge: 'Limited Edition', description: 'Classical nine-piece hair braid jewelry set worn down the central plait in classical dance recitals and weddings.' },

  // 14. Antique-Finish Jewellery
  { name: 'Antique Matte Gold Victorian Choker Set', category_slug: 'antique-finish-jewellery', price: 5650, old_price: 7500, weight: 48.0, material: 'Antique Matte Finish Copper', metal_composition: 'Copper alloy with antique oxidised gold treatment and uncut polki stones', available_sizes: 'Adjustable Silk Dori', badge: 'Best Seller', description: 'Victorian and royal Mughal fusion choker with dull vintage gold finish and soft-toned polki crystal setting.' },
  { name: 'Antique Matte Finish Long Floral Haram', category_slug: 'antique-finish-jewellery', price: 7850, old_price: 10500, weight: 62.0, material: 'Antique Gold Plated Copper', metal_composition: 'Solid copper with deep matte dark gold finish and ruby potta stones', available_sizes: '30 Inches Long Chain', badge: 'Featured', description: 'Heirloom long necklace featuring antique floral roundels and hanging pearl bunches, evoking royal palace grandeur.' },
  { name: 'Antique Gold-Tone Peacock Chandbali Earrings', category_slug: 'antique-finish-jewellery', price: 2150, old_price: 2900, weight: 18.0, material: 'Antique Finish Brass Alloy', metal_composition: 'Brass with antique matte treatment, emerald-ruby stones and pearl fringe', available_sizes: 'Height 5.5 cm', badge: 'Trending', description: 'Old-world crescent moon earrings radiating dark golden warmth, perfect for evening banquets and receptions.' },
  { name: 'Antique Carved Elephant Crest Broad Kada', category_slug: 'antique-finish-jewellery', price: 3850, old_price: 5100, weight: 42.0, material: 'Antique Finish Copper', metal_composition: 'Copper alloy with oxidized antique patina and openable screw pin', available_sizes: '2.4, 2.6, 2.8', badge: 'Popular', description: 'Heavy wrist cuff with sculpted royal elephant processions finished in vintage aged-gold patina.' },
  { name: 'Antique Matte Floral Brooch Hair Clip', category_slug: 'antique-finish-jewellery', price: 1450, old_price: 1950, weight: 16.0, material: 'Antique Gold Plated Alloy', metal_composition: 'Alloy with sturdy hair pin mechanism and kemp stone center', available_sizes: 'Width 6.5 cm', badge: 'New Arrival', description: 'Intricate floral hair brooch pinning gracefully into hair buns, sarees, and ceremonial dupattas.' },
  { name: 'Antique Coin and Mango Fusion Choker', category_slug: 'antique-finish-jewellery', price: 5150, old_price: 6900, weight: 40.0, material: 'Antique Temple Gold Finish', metal_composition: 'Copper with alternate Kasu coin and mango drops in matte gold', available_sizes: 'Adjustable Cord', badge: 'Best Seller', description: 'Creative blend of auspicious Kasu coins and traditional mango shapes with soft antique gold reflections.' },
  { name: 'Antique Finish Ruby Kemp Stone Ring', category_slug: 'antique-finish-jewellery', price: 1550, old_price: 2100, weight: 7.2, material: 'Antique Matte Copper', metal_composition: 'Copper alloy with central square ruby and filigree borders', available_sizes: 'Size 14, Size 16, Size 18, Size 20', badge: 'Trending', description: 'Vintage signet-style statement ring topped with a faceted red ruby gemstone and delicate side carvings.' },
  { name: 'Antique Victorian Filigree Drop Earrings', category_slug: 'antique-finish-jewellery', price: 1850, old_price: 2500, weight: 13.5, material: 'Antique Gold Finish Brass', metal_composition: 'Brass with matte vintage polish and dark oxidized recesses', available_sizes: 'Length 4.5 cm', badge: 'Popular', description: 'Graceful elongated teardrop earrings featuring open lace cutwork reminiscent of 19th-century royal heirlooms.' }
];

async function seed100Catalogue() {
  console.log('--- Starting Comprehensive 100+ Jewellery Catalogue Seeding ---');

  try {
    // 1. Clean existing categories and products to eliminate unwanted 'Iypponnu' and Tamil terms
    console.log('Cleaning old products and categories...');
    await db.query('DELETE FROM order_items WHERE product_id IN (SELECT id FROM products)');
    await db.query('DELETE FROM cart WHERE product_id IN (SELECT id FROM products)');
    await db.query('DELETE FROM wishlist WHERE product_id IN (SELECT id FROM products)');
    await db.query('DELETE FROM product_images');
    await db.query('DELETE FROM reviews WHERE product_id IN (SELECT id FROM products)');
    await db.query('DELETE FROM products');
    await db.query('DELETE FROM categories');

    // 2. Insert the 14 clean English categories
    console.log('Inserting 14 Clean English Categories...');
    const catMap = {};
    for (const cat of categoriesData) {
      const res = await db.query(
        'INSERT INTO categories (name, slug, image, description) VALUES (?, ?, ?, ?) RETURNING id',
        [cat.name, cat.slug, cat.image, cat.description]
      );
      catMap[cat.slug] = res.insertId || res[0]?.id;
    }
    console.log('✓ Categories inserted successfully:', Object.keys(catMap).length);

    // 3. Generate 105 distinct, high-quality products
    const finalProducts = [];
    let count = 0;

    // First add all 112 blueprint products across categories
    rawProducts.forEach((p, i) => {
      count++;
      const catId = catMap[p.category_slug] || catMap['traditional-jewellery'];
      const prefix = p.category_slug.substring(0, 3).toUpperCase();
      const sku = `DJ-${prefix}-${String(count).padStart(3, '0')}`;
      finalProducts.push({
        ...p,
        sku,
        category_id: catId,
        image: getImage(i),
        stock: 12 + ((i * 7) % 28),
        rating: 4.5 + (((i * 3) % 5) / 10)
      });
    });

    console.log(`Generated ${finalProducts.length} distinct jewellery items. Inserting into Supabase...`);

    for (let i = 0; i < finalProducts.length; i++) {
      const p = finalProducts[i];
      const res = await db.query(
        `INSERT INTO products (
          name, sku, category_id, material, purity, metal_composition,
          available_sizes, weight, price, old_price, stock, badge,
          description, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW()) RETURNING id`,
        [
          p.name,
          p.sku,
          p.category_id,
          p.material,
          p.material,
          p.metal_composition,
          p.available_sizes,
          p.weight,
          p.price,
          p.old_price,
          p.stock,
          p.badge,
          p.description
        ]
      );

      const prodId = res.insertId || res[0]?.id;

      // Add primary image and gallery images
      if (prodId) {
        await db.query(
          'INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, TRUE)',
          [prodId, p.image]
        );
        // Add secondary angle image
        const secImg = getImage((i + 3));
        await db.query(
          'INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, FALSE)',
          [prodId, secImg]
        );
      }
    }

    // 4. Update store settings to verify clean English and WhatsApp configuration
    await db.pool.query(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('store_name', 'Durgas Jewellery', NOW()) ON CONFLICT (key) DO UPDATE SET value = 'Durgas Jewellery', updated_at = NOW()"
    );
    await db.pool.query(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('whatsapp_number', '917448882444', NOW()) ON CONFLICT (key) DO UPDATE SET value = '917448882444', updated_at = NOW()"
    );
    await db.pool.query(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('delivery_charge', '0', NOW()) ON CONFLICT (key) DO UPDATE SET value = '0', updated_at = NOW()"
    );

    console.log(`✓ Successfully seeded ${finalProducts.length} authentic jewellery products across 14 English categories!`);
    console.log('✓ All legacy unwanted text removed.');
    console.log('✓ WhatsApp configuration locked to 917448882444.');

    db.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    db.close();
    process.exit(1);
  }
}

seed100Catalogue();
