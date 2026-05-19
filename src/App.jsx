import { useState, useEffect, useMemo } from "react";

const CHAINS = ["Rami Levi", "Osher Ad", "Shufersal", "Yohananof"];

const CHAIN_COLORS = {
  "Rami Levi":  { bg:"#E53935", light:"#FFEBEE" },
  "Osher Ad":   { bg:"#1E88E5", light:"#E3F2FD" },
  "Shufersal":  { bg:"#43A047", light:"#E8F5E9" },
  "Yohananof":  { bg:"#FB8C00", light:"#FFF3E0" },
};

const DELIVERY = {
  "Rami Levi":  { fee:19.9, freeAbove:200, minOrder:50,  delay:"2-4h",  url:"https://www.rami-levy.co.il/he/online/department",   available:true  },
  "Osher Ad":   { fee:0,    freeAbove:0,   minOrder:0,   delay:"—",     url:"https://osherad.co.il",                               available:false },
  "Shufersal":  { fee:19.9, freeAbove:150, minOrder:50,  delay:"2-6h",  url:"https://www.shufersal.co.il/online/he/A",             available:true  },
  "Yohananof":  { fee:24.9, freeAbove:250, minOrder:80,  delay:"24-48h",url:"https://www.yohananof.co.il",                        available:false },
};

// Prix en shekels · Israël 2026 · Basés sur études de marché
// Sources: Yedioth Aharonoth, Francosphere, IsraelValley, Anglo-List
// Hiérarchie confirmée: Rami Levi < Yohananof < Osher Ad < Shufersal (global)
// Exception viande: Osher Ad plus cher (kashrut Mehadrin)
// Exception vrac/grandes quantités: Osher Ad compétitif
const PRODUCTS = [
  // Fruits & Légumes — Rami Levi imbattable, Osher Ad correct, Shufersal le plus cher
  { id:1,  name:"Tomates",           cat:"🥬 Fruits & Légumes",  emoji:"🍅", prices:{ "Rami Levi":5.9,  "Osher Ad":8.9,  "Shufersal":11.9, "Yohananof":8.5  }, unit:"kg" },
  { id:2,  name:"Concombres",        cat:"🥬 Fruits & Légumes",  emoji:"🥒", prices:{ "Rami Levi":4.9,  "Osher Ad":6.9,  "Shufersal":9.9,  "Yohananof":6.9  }, unit:"kg" },
  { id:3,  name:"Poivrons",          cat:"🥬 Fruits & Légumes",  emoji:"🫑", prices:{ "Rami Levi":7.9,  "Osher Ad":9.9,  "Shufersal":13.9, "Yohananof":10.9 }, unit:"kg" },
  { id:4,  name:"Carottes",          cat:"🥬 Fruits & Légumes",  emoji:"🥕", prices:{ "Rami Levi":3.9,  "Osher Ad":5.9,  "Shufersal":6.9,  "Yohananof":5.5  }, unit:"kg" },
  { id:5,  name:"Oignons",           cat:"🥬 Fruits & Légumes",  emoji:"🧅", prices:{ "Rami Levi":2.9,  "Osher Ad":4.9,  "Shufersal":5.9,  "Yohananof":4.5  }, unit:"kg" },
  { id:6,  name:"Pommes de terre",   cat:"🥬 Fruits & Légumes",  emoji:"🥔", prices:{ "Rami Levi":3.9,  "Osher Ad":5.5,  "Shufersal":6.9,  "Yohananof":5.5  }, unit:"kg" },
  { id:7,  name:"Ail",               cat:"🥬 Fruits & Légumes",  emoji:"🧄", prices:{ "Rami Levi":10.9, "Osher Ad":13.9, "Shufersal":17.9, "Yohananof":13.5 }, unit:"tête" },
  { id:8,  name:"Courgettes",        cat:"🥬 Fruits & Légumes",  emoji:"🥬", prices:{ "Rami Levi":5.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":7.5  }, unit:"kg" },
  { id:9,  name:"Aubergines",        cat:"🥬 Fruits & Légumes",  emoji:"🍆", prices:{ "Rami Levi":6.9,  "Osher Ad":8.9,  "Shufersal":11.9, "Yohananof":8.9  }, unit:"kg" },
  { id:10, name:"Bananes",           cat:"🥬 Fruits & Légumes",  emoji:"🍌", prices:{ "Rami Levi":4.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":6.9  }, unit:"kg" },
  { id:11, name:"Pommes",            cat:"🥬 Fruits & Légumes",  emoji:"🍎", prices:{ "Rami Levi":6.9,  "Osher Ad":8.9,  "Shufersal":11.9, "Yohananof":9.5  }, unit:"kg" },
  { id:12, name:"Citrons",           cat:"🥬 Fruits & Légumes",  emoji:"🍋", prices:{ "Rami Levi":5.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":7.9  }, unit:"kg" },
  { id:13, name:"Avocats",           cat:"🥬 Fruits & Légumes",  emoji:"🥑", prices:{ "Rami Levi":12.9, "Osher Ad":16.9, "Shufersal":19.9, "Yohananof":16.5 }, unit:"kg" },
  { id:14, name:"Champignons",       cat:"🥬 Fruits & Légumes",  emoji:"🍄", prices:{ "Rami Levi":11.9, "Osher Ad":13.9, "Shufersal":17.9, "Yohananof":14.9 }, unit:"250g" },
  { id:15, name:"Salade iceberg",    cat:"🥬 Fruits & Légumes",  emoji:"🥬", prices:{ "Rami Levi":4.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":7.5  }, unit:"unité" },
  { id:16, name:"Pastèque",          cat:"🥬 Fruits & Légumes",  emoji:"🍉", prices:{ "Rami Levi":2.9,  "Osher Ad":4.5,  "Shufersal":5.9,  "Yohananof":4.9  }, unit:"kg" },
  { id:17, name:"Fraises",           cat:"🥬 Fruits & Légumes",  emoji:"🍓", prices:{ "Rami Levi":13.9, "Osher Ad":16.9, "Shufersal":19.9, "Yohananof":17.9 }, unit:"500g" },

  // Boulangerie — écarts modérés, Rami Levi légèrement moins cher
  { id:20, name:"Pain blanc",        cat:"🍞 Boulangerie",        emoji:"🍞", prices:{ "Rami Levi":5.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":7.9  }, unit:"unité" },
  { id:21, name:"Pain complet",      cat:"🍞 Boulangerie",        emoji:"🍞", prices:{ "Rami Levi":7.9,  "Osher Ad":8.9,  "Shufersal":11.9, "Yohananof":9.9  }, unit:"unité" },
  { id:22, name:"Challah",           cat:"🍞 Boulangerie",        emoji:"🥖", prices:{ "Rami Levi":8.9,  "Osher Ad":9.9,  "Shufersal":13.9, "Yohananof":11.9 }, unit:"unité" },
  { id:23, name:"Pita",              cat:"🍞 Boulangerie",        emoji:"🫓", prices:{ "Rami Levi":4.9,  "Osher Ad":5.9,  "Shufersal":7.9,  "Yohananof":6.5  }, unit:"paquet" },
  { id:24, name:"Chapelure",         cat:"🍞 Boulangerie",        emoji:"🍞", prices:{ "Rami Levi":6.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":8.5  }, unit:"paquet" },

  // Crémerie — Rami Levi le moins cher, écarts faibles (marché réglementé pour lait/oeufs)
  { id:30, name:"Lait 3%",           cat:"🥛 Crémerie & Œufs",   emoji:"🥛", prices:{ "Rami Levi":5.9,  "Osher Ad":6.5,  "Shufersal":7.5,  "Yohananof":6.9  }, unit:"litre" },
  { id:31, name:"Oeufs x12",         cat:"🥛 Crémerie & Œufs",   emoji:"🥚", prices:{ "Rami Levi":18.9, "Osher Ad":21.9, "Shufersal":23.9, "Yohananof":21.9 }, unit:"boîte" },
  { id:32, name:"Yaourt nature",     cat:"🥛 Crémerie & Œufs",   emoji:"🫙", prices:{ "Rami Levi":4.5,  "Osher Ad":5.5,  "Shufersal":6.9,  "Yohananof":5.9  }, unit:"unité" },
  { id:33, name:"Feta",              cat:"🥛 Crémerie & Œufs",   emoji:"🧀", prices:{ "Rami Levi":11.9, "Osher Ad":13.9, "Shufersal":16.9, "Yohananof":14.9 }, unit:"200g" },
  { id:34, name:"Emmental râpé",     cat:"🥛 Crémerie & Œufs",   emoji:"🧀", prices:{ "Rami Levi":13.9, "Osher Ad":15.9, "Shufersal":19.9, "Yohananof":16.9 }, unit:"200g" },
  { id:35, name:"Mozzarella",        cat:"🥛 Crémerie & Œufs",   emoji:"🧀", prices:{ "Rami Levi":10.9, "Osher Ad":12.9, "Shufersal":15.9, "Yohananof":13.9 }, unit:"125g" },
  { id:36, name:"Crème fraîche",     cat:"🥛 Crémerie & Œufs",   emoji:"🥛", prices:{ "Rami Levi":7.9,  "Osher Ad":9.9,  "Shufersal":11.9, "Yohananof":10.5 }, unit:"200ml" },
  { id:37, name:"Beurre",            cat:"🥛 Crémerie & Œufs",   emoji:"🧈", prices:{ "Rami Levi":11.9, "Osher Ad":13.9, "Shufersal":16.9, "Yohananof":14.9 }, unit:"250g" },

  // Viande — Rami Levi le moins cher, Osher Ad PLUS CHER (kashrut Mehadrin), Shufersal premium
  { id:40, name:"Poulet entier",     cat:"🥩 Boucherie & Poisson",emoji:"🍗", prices:{ "Rami Levi":22.9, "Osher Ad":31.9, "Shufersal":34.9, "Yohananof":27.9 }, unit:"kg" },
  { id:41, name:"Filet de poulet",   cat:"🥩 Boucherie & Poisson",emoji:"🍗", prices:{ "Rami Levi":32.9, "Osher Ad":44.9, "Shufersal":47.9, "Yohananof":38.9 }, unit:"kg" },
  { id:42, name:"Escalope dinde",    cat:"🥩 Boucherie & Poisson",emoji:"🍖", prices:{ "Rami Levi":37.9, "Osher Ad":49.9, "Shufersal":54.9, "Yohananof":44.9 }, unit:"kg" },
  { id:43, name:"Bœuf haché",        cat:"🥩 Boucherie & Poisson",emoji:"🥩", prices:{ "Rami Levi":42.9, "Osher Ad":54.9, "Shufersal":59.9, "Yohananof":49.9 }, unit:"kg" },
  { id:44, name:"Saucisses",         cat:"🥩 Boucherie & Poisson",emoji:"🌭", prices:{ "Rami Levi":18.9, "Osher Ad":24.9, "Shufersal":27.9, "Yohananof":22.9 }, unit:"paquet" },
  { id:45, name:"Charcuterie",       cat:"🥩 Boucherie & Poisson",emoji:"🥩", prices:{ "Rami Levi":13.9, "Osher Ad":17.9, "Shufersal":21.9, "Yohananof":17.9 }, unit:"100g" },
  { id:46, name:"Saumon",            cat:"🥩 Boucherie & Poisson",emoji:"🐟", prices:{ "Rami Levi":64.9, "Osher Ad":69.9, "Shufersal":84.9, "Yohananof":72.9 }, unit:"kg" },
  { id:47, name:"Thon en boîte",     cat:"🥩 Boucherie & Poisson",emoji:"🐟", prices:{ "Rami Levi":6.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":8.5  }, unit:"boîte" },

  // Épicerie sèche — Rami Levi imbattable, Osher Ad compétitif en vrac
  { id:50, name:"Riz Yasmin",        cat:"🌾 Épicerie sèche",     emoji:"🍚", prices:{ "Rami Levi":13.9, "Osher Ad":14.9, "Shufersal":18.9, "Yohananof":16.9 }, unit:"kg" },
  { id:51, name:"Riz blanc",         cat:"🌾 Épicerie sèche",     emoji:"🍚", prices:{ "Rami Levi":7.9,  "Osher Ad":8.9,  "Shufersal":11.9, "Yohananof":9.9  }, unit:"kg" },
  { id:52,  name:"Pâtes Osem",              cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":4.9,  "Osher Ad":5.2,  "Shufersal":5.9,  "Yohananof":5.5  }, unit:"500g" },

  // Spaghetti — Rami Levi gagne sur marque générique, De Cecco disponible partout
  { id:521, name:"Spaghetti Osem",           cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":4.5,  "Osher Ad":4.9,  "Shufersal":5.9,  "Yohananof":5.5  }, unit:"500g", family:"spaghetti" },
  { id:522, name:"Spaghetti Barilla",        cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":7.9,  "Osher Ad":8.5,  "Shufersal":8.9,  "Yohananof":8.9  }, unit:"500g", family:"spaghetti" },
  { id:523, name:"Spaghetti De Cecco",       cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":11.9, "Osher Ad":12.9, "Shufersal":10.9, "Yohananof":13.9 }, unit:"500g", family:"spaghetti" },
  { id:524, name:"Spaghetti מותג שופרסל",   cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":5.9,  "Osher Ad":6.5,  "Shufersal":3.9,  "Yohananof":6.9  }, unit:"500g", family:"spaghetti", ownBrand:"Shufersal" },
  { id:525, name:"Spaghetti מותג רמי לוי",  cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":3.5,  "Osher Ad":5.9,  "Shufersal":5.9,  "Yohananof":5.9  }, unit:"500g", family:"spaghetti", ownBrand:"Rami Levi" },

  // Penne — Shufersal gagne sur De Cecco, Rami Levi sur marque propre
  { id:531, name:"Penne Osem",               cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":4.5,  "Osher Ad":4.9,  "Shufersal":5.9,  "Yohananof":5.5  }, unit:"500g", family:"penne" },
  { id:532, name:"Penne Barilla",            cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":7.9,  "Osher Ad":8.5,  "Shufersal":8.9,  "Yohananof":8.9  }, unit:"500g", family:"penne" },
  { id:533, name:"Penne De Cecco",           cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":12.9, "Osher Ad":13.9, "Shufersal":10.5, "Yohananof":14.5 }, unit:"500g", family:"penne" },
  { id:534, name:"Penne מותג שופרסל",       cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":5.9,  "Osher Ad":6.5,  "Shufersal":3.9,  "Yohananof":6.9  }, unit:"500g", family:"penne", ownBrand:"Shufersal" },
  { id:535, name:"Penne מותג אושר עד",      cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":5.5,  "Osher Ad":3.4,  "Shufersal":5.9,  "Yohananof":5.9  }, unit:"500g", family:"penne", ownBrand:"Osher Ad" },

  // Fusilli — Yohananof gagne sur Telma, Osher Ad sur grand format
  { id:541, name:"Fusilli Osem",             cat:"🌾 Épicerie sèche", emoji:"🍜", prices:{ "Rami Levi":4.5,  "Osher Ad":4.9,  "Shufersal":5.9,  "Yohananof":5.5  }, unit:"500g", family:"fusilli" },
  { id:542, name:"Fusilli Telma",            cat:"🌾 Épicerie sèche", emoji:"🍜", prices:{ "Rami Levi":5.9,  "Osher Ad":6.5,  "Shufersal":6.9,  "Yohananof":4.9  }, unit:"500g", family:"fusilli" },
  { id:543, name:"Fusilli Barilla",          cat:"🌾 Épicerie sèche", emoji:"🍜", prices:{ "Rami Levi":7.9,  "Osher Ad":8.5,  "Shufersal":8.9,  "Yohananof":8.5  }, unit:"500g", family:"fusilli" },
  { id:544, name:"Fusilli De Cecco",         cat:"🌾 Épicerie sèche", emoji:"🍜", prices:{ "Rami Levi":12.9, "Osher Ad":13.9, "Shufersal":11.9, "Yohananof":14.5 }, unit:"500g", family:"fusilli" },
  { id:545, name:"Pâtes 3kg Osher Ad",       cat:"🌾 Épicerie sèche", emoji:"🍝", prices:{ "Rami Levi":18.9, "Osher Ad":11.9, "Shufersal":21.9, "Yohananof":19.9 }, unit:"3kg" },
  { id:53, name:"Couscous",          cat:"🌾 Épicerie sèche",     emoji:"🍚", prices:{ "Rami Levi":5.9,  "Osher Ad":6.5,  "Shufersal":8.9,  "Yohananof":7.9  }, unit:"500g" },
  { id:54, name:"Lentilles",         cat:"🌾 Épicerie sèche",     emoji:"🫘", prices:{ "Rami Levi":6.9,  "Osher Ad":7.5,  "Shufersal":9.9,  "Yohananof":8.9  }, unit:"kg" },
  { id:55, name:"Pois chiches",      cat:"🌾 Épicerie sèche",     emoji:"🫘", prices:{ "Rami Levi":7.9,  "Osher Ad":8.5,  "Shufersal":10.9, "Yohananof":9.5  }, unit:"kg" },
  { id:56, name:"Farine",            cat:"🌾 Épicerie sèche",     emoji:"🌾", prices:{ "Rami Levi":4.9,  "Osher Ad":5.5,  "Shufersal":6.9,  "Yohananof":6.5  }, unit:"kg" },
  { id:57, name:"Sucre",             cat:"🌾 Épicerie sèche",     emoji:"🍬", prices:{ "Rami Levi":4.9,  "Osher Ad":5.5,  "Shufersal":6.9,  "Yohananof":5.9  }, unit:"kg" },

  // Conserves — Rami Levi moins cher, Osher Ad compétitif en vrac
  { id:60, name:"Tahini",            cat:"🥫 Conserves",          emoji:"🫙", prices:{ "Rami Levi":12.9, "Osher Ad":13.9, "Shufersal":17.9, "Yohananof":15.9 }, unit:"500g" },
  { id:61, name:"Houmous",           cat:"🥫 Conserves",          emoji:"🫙", prices:{ "Rami Levi":5.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":7.9  }, unit:"400g" },
  { id:62, name:"Huile d'olive",     cat:"🥫 Conserves",          emoji:"🫒", prices:{ "Rami Levi":27.9, "Osher Ad":29.9, "Shufersal":36.9, "Yohananof":32.9 }, unit:"750ml" },
  { id:63, name:"Huile végétale",    cat:"🥫 Conserves",          emoji:"🍶", prices:{ "Rami Levi":11.9, "Osher Ad":12.9, "Shufersal":15.9, "Yohananof":13.9 }, unit:"litre" },
  { id:64, name:"Maïs en boîte",     cat:"🥫 Conserves",          emoji:"🌽", prices:{ "Rami Levi":4.9,  "Osher Ad":5.5,  "Shufersal":7.9,  "Yohananof":6.9  }, unit:"boîte" },
  { id:65, name:"Cœur de palmier",   cat:"🥫 Conserves",          emoji:"🥫", prices:{ "Rami Levi":7.9,  "Osher Ad":8.9,  "Shufersal":11.9, "Yohananof":9.9  }, unit:"boîte" },
  { id:66, name:"Ketchup",           cat:"🥫 Conserves",          emoji:"🥫", prices:{ "Rami Levi":8.9,  "Osher Ad":9.9,  "Shufersal":12.9, "Yohananof":11.9 }, unit:"500g" },
  { id:67, name:"Mayonnaise",        cat:"🥫 Conserves",          emoji:"🫙", prices:{ "Rami Levi":11.9, "Osher Ad":12.9, "Shufersal":15.9, "Yohananof":13.9 }, unit:"400g" },

  // Petit-déjeuner — Rami Levi le moins cher
  { id:70, name:"Café Élite",        cat:"🥣 Petit-déjeuner",     emoji:"☕", prices:{ "Rami Levi":22.9, "Osher Ad":24.9, "Shufersal":29.9, "Yohananof":26.9 }, unit:"200g" },
  { id:71, name:"Céréales",          cat:"🥣 Petit-déjeuner",     emoji:"🥣", prices:{ "Rami Levi":13.9, "Osher Ad":15.9, "Shufersal":18.9, "Yohananof":16.9 }, unit:"500g" },
  { id:72, name:"Confiture",         cat:"🥣 Petit-déjeuner",     emoji:"🫙", prices:{ "Rami Levi":8.9,  "Osher Ad":9.9,  "Shufersal":12.9, "Yohananof":11.9 }, unit:"350g" },
  { id:73, name:"Miel",              cat:"🥣 Petit-déjeuner",     emoji:"🍯", prices:{ "Rami Levi":17.9, "Osher Ad":19.9, "Shufersal":24.9, "Yohananof":21.9 }, unit:"500g" },
  { id:74, name:"Barre de céréales", cat:"🥣 Petit-déjeuner",     emoji:"🍫", prices:{ "Rami Levi":6.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":8.9  }, unit:"unité" },

  // Snacks — Rami Levi moins cher, Yohananof parfois compétitif
  { id:80, name:"Chocolat noir",     cat:"🍫 Snacks & Sucreries", emoji:"🍫", prices:{ "Rami Levi":7.9,  "Osher Ad":9.9,  "Shufersal":11.9, "Yohananof":9.5  }, unit:"100g" },
  { id:81, name:"Chips",             cat:"🍫 Snacks & Sucreries", emoji:"🍟", prices:{ "Rami Levi":6.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":7.5  }, unit:"paquet" },
  { id:82, name:"Gâteaux",           cat:"🍫 Snacks & Sucreries", emoji:"🍰", prices:{ "Rami Levi":12.9, "Osher Ad":14.9, "Shufersal":18.9, "Yohananof":15.9 }, unit:"paquet" },
  { id:83, name:"Hatifim",           cat:"🍫 Snacks & Sucreries", emoji:"🍿", prices:{ "Rami Levi":5.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":7.5  }, unit:"paquet" },

  // Surgelés — Rami Levi moins cher
  { id:90, name:"Frites surgelées",  cat:"🧊 Surgelés",           emoji:"🍟", prices:{ "Rami Levi":11.9, "Osher Ad":13.9, "Shufersal":16.9, "Yohananof":14.9 }, unit:"kg" },
  { id:91, name:"Pizza carrés",      cat:"🧊 Surgelés",           emoji:"🍕", prices:{ "Rami Levi":22.9, "Osher Ad":25.9, "Shufersal":31.9, "Yohananof":27.9 }, unit:"paquet" },
  { id:92, name:"Glaces vanille",    cat:"🧊 Surgelés",           emoji:"🍦", prices:{ "Rami Levi":17.9, "Osher Ad":19.9, "Shufersal":24.9, "Yohananof":21.9 }, unit:"litre" },
  { id:93, name:"Ail congelé",       cat:"🧊 Surgelés",           emoji:"🧄", prices:{ "Rami Levi":8.9,  "Osher Ad":9.9,  "Shufersal":12.9, "Yohananof":10.9 }, unit:"paquet" },
  { id:94, name:"Légumes surgelés",  cat:"🧊 Surgelés",           emoji:"🥦", prices:{ "Rami Levi":8.9,  "Osher Ad":9.9,  "Shufersal":13.9, "Yohananof":11.9 }, unit:"kg" },

  // Boissons — Rami Levi imbattable
  { id:100,name:"Eau minérale 1.5L", cat:"🧃 Boissons",           emoji:"💧", prices:{ "Rami Levi":2.5,  "Osher Ad":3.2,  "Shufersal":4.2,  "Yohananof":3.9  }, unit:"bouteille" },
  { id:101,name:"Pepsi 1.5L",        cat:"🧃 Boissons",           emoji:"🥤", prices:{ "Rami Levi":5.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":7.9  }, unit:"bouteille" },
  { id:102,name:"Coca Cola 1.5L",    cat:"🧃 Boissons",           emoji:"🥤", prices:{ "Rami Levi":5.9,  "Osher Ad":6.9,  "Shufersal":8.9,  "Yohananof":7.9  }, unit:"bouteille" },
  { id:103,name:"Jus d'orange",      cat:"🧃 Boissons",           emoji:"🍊", prices:{ "Rami Levi":7.9,  "Osher Ad":9.9,  "Shufersal":11.9, "Yohananof":10.5 }, unit:"litre" },
  { id:104,name:"Bière Goldstar",    cat:"🧃 Boissons",           emoji:"🍺", prices:{ "Rami Levi":6.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":8.9  }, unit:"33cl" },

  // Hygiène — Rami Levi moins cher, écarts importants vs Shufersal
  { id:110,name:"Shampoing",         cat:"🧴 Hygiène & Santé",    emoji:"🧴", prices:{ "Rami Levi":13.9, "Osher Ad":15.9, "Shufersal":19.9, "Yohananof":16.9 }, unit:"flacon" },
  { id:111,name:"Dentifrice",        cat:"🧴 Hygiène & Santé",    emoji:"🪥", prices:{ "Rami Levi":8.9,  "Osher Ad":10.9, "Shufersal":13.9, "Yohananof":11.9 }, unit:"tube" },
  { id:112,name:"Gel douche",        cat:"🧴 Hygiène & Santé",    emoji:"🧴", prices:{ "Rami Levi":11.9, "Osher Ad":13.9, "Shufersal":16.9, "Yohananof":14.9 }, unit:"flacon" },
  { id:113,name:"Déodorant",         cat:"🧴 Hygiène & Santé",    emoji:"🧴", prices:{ "Rami Levi":13.9, "Osher Ad":15.9, "Shufersal":18.9, "Yohananof":16.9 }, unit:"unité" },

  // Nettoyage — Osher Ad compétitif en vrac, mais Rami Levi souvent moins cher
  { id:120,name:"Papier toilette x8",cat:"🧹 Nettoyage",          emoji:"🧻", prices:{ "Rami Levi":17.9, "Osher Ad":18.9, "Shufersal":24.9, "Yohananof":21.9 }, unit:"paquet" },
  { id:121,name:"Sopalin",           cat:"🧹 Nettoyage",          emoji:"🧻", prices:{ "Rami Levi":10.9, "Osher Ad":11.9, "Shufersal":15.9, "Yohananof":13.9 }, unit:"paquet" },
  { id:1200,name:"Lessive générique", cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":26.9, "Osher Ad":27.9, "Shufersal":36.9, "Yohananof":32.9 }, unit:"3kg" },
  { id:1201,name:"Ariel liquide",     cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":28.9, "Osher Ad":31.9, "Shufersal":37.9, "Yohananof":34.9 }, unit:"1.5L" },
  { id:1221,name:"Ariel poudre",     cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":24.9, "Osher Ad":26.9, "Shufersal":32.9, "Yohananof":29.9 }, unit:"3kg" },
  { id:1222,name:"Persil liquide",   cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":27.9, "Osher Ad":29.9, "Shufersal":35.9, "Yohananof":32.9 }, unit:"1.5L" },
  { id:1223,name:"Persil poudre",    cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":23.9, "Osher Ad":25.9, "Shufersal":31.9, "Yohananof":28.9 }, unit:"3kg" },
  { id:1224,name:"Sano Power",       cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":19.9, "Osher Ad":21.9, "Shufersal":26.9, "Yohananof":23.9 }, unit:"2L" },
  { id:1225,name:"Sano Maxima",      cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":22.9, "Osher Ad":24.9, "Shufersal":29.9, "Yohananof":26.9 }, unit:"2kg" },
  { id:1226,name:"Omo liquide",      cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":26.9, "Osher Ad":28.9, "Shufersal":34.9, "Yohananof":31.9 }, unit:"1.5L" },
  { id:1227,name:"Skip liquide",     cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":25.9, "Osher Ad":27.9, "Shufersal":33.9, "Yohananof":30.9 }, unit:"1.5L" },
  { id:1228,name:"Bio-Tex poudre",   cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":18.9, "Osher Ad":20.9, "Shufersal":24.9, "Yohananof":22.9 }, unit:"2kg" },
  { id:1229,name:"Vanish Oxi",       cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":24.9, "Osher Ad":26.9, "Shufersal":31.9, "Yohananof":28.9 }, unit:"500g" },
  { id:1230,name:"Nish lessive",     cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":16.9, "Osher Ad":17.9, "Shufersal":21.9, "Yohananof":19.9 }, unit:"2L" },
  { id:1231,name:"Lessive 5kg Osher",cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":64.9, "Osher Ad":48.9, "Shufersal":74.9, "Yohananof":67.9 }, unit:"5kg" },
  { id:123,name:"Assouplissant",     cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":17.9, "Osher Ad":18.9, "Shufersal":23.9, "Yohananof":21.9 }, unit:"litre" },
  { id:124,name:"Liquide vaisselle", cat:"🧹 Nettoyage",          emoji:"🧼", prices:{ "Rami Levi":8.9,  "Osher Ad":9.5,  "Shufersal":12.9, "Yohananof":10.9 }, unit:"500ml" },
  { id:125,name:"Spray ménage",      cat:"🧹 Nettoyage",          emoji:"🧹", prices:{ "Rami Levi":10.9, "Osher Ad":11.9, "Shufersal":15.9, "Yohananof":13.9 }, unit:"500ml" },
  { id:126,name:"Pastilles lave-vaisselle",cat:"🧹 Nettoyage",   emoji:"🍽", prices:{ "Rami Levi":22.9, "Osher Ad":23.9, "Shufersal":31.9, "Yohananof":27.9 }, unit:"boîte" },
  { id:127,name:"Sacs poubelle",     cat:"🧹 Nettoyage",          emoji:"🗑", prices:{ "Rami Levi":8.9,  "Osher Ad":9.5,  "Shufersal":12.9, "Yohananof":10.9 }, unit:"rouleau" },

  // Jetables
  { id:130,name:"Barquettes alu",    cat:"🥡 Jetables",           emoji:"🥡", prices:{ "Rami Levi":8.9,  "Osher Ad":9.9,  "Shufersal":12.9, "Yohananof":10.9 }, unit:"paquet" },
  { id:131,name:"Papier sulfurisé",  cat:"🥡 Jetables",           emoji:"📄", prices:{ "Rami Levi":6.9,  "Osher Ad":7.9,  "Shufersal":9.9,  "Yohananof":8.9  }, unit:"rouleau" },

  // ── Produits où SHUFERSAL gagne ──────────────────────────────────────────
  // Shufersal a les meilleures marques distributeur sur certains produits
  { id:140,name:"Saumon fumé tranché",cat:"🥩 Boucherie & Poisson",emoji:"🐟", prices:{ "Rami Levi":54.9, "Osher Ad":58.9, "Shufersal":44.9, "Yohananof":51.9 }, unit:"100g" },
  { id:141,name:"Tofu",              cat:"🥩 Boucherie & Poisson",emoji:"🫙", prices:{ "Rami Levi":18.9, "Osher Ad":19.9, "Shufersal":14.9, "Yohananof":17.9 }, unit:"300g" },
  { id:142,name:"Quinoa",            cat:"🌾 Épicerie sèche",     emoji:"🌾", prices:{ "Rami Levi":22.9, "Osher Ad":24.9, "Shufersal":17.9, "Yohananof":21.9 }, unit:"500g" },
  { id:143,name:"Lait végétal",      cat:"🧃 Boissons",           emoji:"🥛", prices:{ "Rami Levi":14.9, "Osher Ad":15.9, "Shufersal":11.9, "Yohananof":13.9 }, unit:"litre" },
  { id:144,name:"Granola bio",       cat:"🥣 Petit-déjeuner",     emoji:"🥣", prices:{ "Rami Levi":24.9, "Osher Ad":26.9, "Shufersal":19.9, "Yohananof":23.9 }, unit:"500g" },
  { id:145,name:"Crème glacée premium",cat:"🧊 Surgelés",         emoji:"🍨", prices:{ "Rami Levi":29.9, "Osher Ad":31.9, "Shufersal":23.9, "Yohananof":27.9 }, unit:"500ml" },

  // ── Produits où YOHANANOF gagne ──────────────────────────────────────────
  // Yohananof est fort sur les fromages, produits locaux et certains frais
  { id:150,name:"Fromage jaune",     cat:"🥛 Crémerie & Œufs",   emoji:"🧀", prices:{ "Rami Levi":16.9, "Osher Ad":18.9, "Shufersal":19.9, "Yohananof":13.9 }, unit:"200g" },
  { id:151,name:"Labaneh",           cat:"🥛 Crémerie & Œufs",   emoji:"🫙", prices:{ "Rami Levi":9.9,  "Osher Ad":11.9, "Shufersal":12.9, "Yohananof":7.9  }, unit:"250g" },
  { id:152,name:"Burekas surgelés",  cat:"🧊 Surgelés",           emoji:"🥐", prices:{ "Rami Levi":19.9, "Osher Ad":21.9, "Shufersal":22.9, "Yohananof":15.9 }, unit:"paquet" },
  { id:153,name:"Pitot arabes",      cat:"🍞 Boulangerie",        emoji:"🫓", prices:{ "Rami Levi":7.9,  "Osher Ad":8.9,  "Shufersal":9.9,  "Yohananof":5.9  }, unit:"paquet" },
  { id:154,name:"Zaatar",            cat:"🥫 Conserves",          emoji:"🌿", prices:{ "Rami Levi":12.9, "Osher Ad":13.9, "Shufersal":14.9, "Yohananof":9.9  }, unit:"100g" },
  { id:155,name:"Huile d'argan",     cat:"🥫 Conserves",          emoji:"🫒", prices:{ "Rami Levi":34.9, "Osher Ad":36.9, "Shufersal":38.9, "Yohananof":27.9 }, unit:"250ml" },
  { id:156,name:"Halva",             cat:"🍫 Snacks & Sucreries", emoji:"🍬", prices:{ "Rami Levi":14.9, "Osher Ad":15.9, "Shufersal":16.9, "Yohananof":10.9 }, unit:"300g" },

  // ── Produits où OSHER AD gagne ───────────────────────────────────────────
  // Osher Ad gagne sur le vrac, les produits kasher Mehadrin et certains conditionnements
  { id:160,name:"Légumineuses vrac 5kg",cat:"🌾 Épicerie sèche",  emoji:"🫘", prices:{ "Rami Levi":34.9, "Osher Ad":24.9, "Shufersal":44.9, "Yohananof":38.9 }, unit:"5kg" },
  { id:161,name:"Riz basmati 5kg",   cat:"🌾 Épicerie sèche",     emoji:"🍚", prices:{ "Rami Levi":54.9, "Osher Ad":39.9, "Shufersal":64.9, "Yohananof":58.9 }, unit:"5kg" },
  { id:162,name:"Farine 5kg",        cat:"🌾 Épicerie sèche",     emoji:"🌾", prices:{ "Rami Levi":22.9, "Osher Ad":16.9, "Shufersal":27.9, "Yohananof":24.9 }, unit:"5kg" },
  { id:163,name:"Sucre 5kg",         cat:"🌾 Épicerie sèche",     emoji:"🍬", prices:{ "Rami Levi":21.9, "Osher Ad":15.9, "Shufersal":24.9, "Yohananof":22.9 }, unit:"5kg" },
  { id:164,name:"Huile végétale 5L", cat:"🥫 Conserves",          emoji:"🍶", prices:{ "Rami Levi":44.9, "Osher Ad":32.9, "Shufersal":54.9, "Yohananof":48.9 }, unit:"5L" },
  { id:165,name:"Couches bébé x80",  cat:"🧴 Hygiène & Santé",    emoji:"👶", prices:{ "Rami Levi":89.9, "Osher Ad":69.9, "Shufersal":99.9, "Yohananof":89.9 }, unit:"paquet" },
  { id:166,name:"Eau 6x1.5L",        cat:"🧃 Boissons",           emoji:"💧", prices:{ "Rami Levi":14.9, "Osher Ad":10.9, "Shufersal":17.9, "Yohananof":15.9 }, unit:"pack" },
  { id:167,name:"Papier toilette x32",cat:"🧹 Nettoyage",          emoji:"🧻", prices:{ "Rami Levi":54.9, "Osher Ad":41.9, "Shufersal":64.9, "Yohananof":58.9 }, unit:"grand paquet" },
  { id:168,name:"Lessive 5kg",       cat:"🧹 Nettoyage",          emoji:"🧺", prices:{ "Rami Levi":64.9, "Osher Ad":49.9, "Shufersal":74.9, "Yohananof":68.9 }, unit:"5kg" },
];

function normalize(s) {
  return (s||"").replace(/Œ/g,"Oe").replace(/œ/g,"oe").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function cheapestChain(product) {
  return Object.entries(product.prices).sort((a,b)=>a[1]-b[1])[0][0];
}

function optimizeBasket(basket) {
  const byChain = {};
  CHAINS.forEach(c => byChain[c] = { items:[], total:0 });
  basket.forEach(item => {
    const chain = item.chosenChain || cheapestChain(item.product);
    const cheapest = cheapestChain(item.product);
    const price = item.product.prices[chain] * (item.qty||1);
    const cheapestPrice = item.product.prices[cheapest] * (item.qty||1);
    const overpay = price - cheapestPrice;
    byChain[chain].items.push({ ...item, chain, price, cheapest, cheapestPrice, overpay });
    byChain[chain].total += price;
  });
  const totalOptimized = Object.values(byChain).reduce((s,c)=>s+c.total,0);
  const totalPureCheapest = basket.reduce((s,i)=>s+i.product.prices[cheapestChain(i.product)]*(i.qty||1),0);
  const totalOverpay = totalOptimized - totalPureCheapest;
  const worstChain = CHAINS.reduce((a,b)=>{
    const tA = basket.reduce((s,i)=>s+i.product.prices[a]*(i.qty||1),0);
    const tB = basket.reduce((s,i)=>s+i.product.prices[b]*(i.qty||1),0);
    return tB>tA?b:a;
  });
  const totalWorst = basket.reduce((s,i)=>s+i.product.prices[worstChain]*(i.qty||1),0);
  return { byChain, totalOptimized, totalWorst, savings: totalWorst-totalOptimized, totalOverpay };
}

export default function App() {
  const [search, setSearch] = useState("");
  const [basket, setBasket] = useState([]);
  const [tab, setTab] = useState("search"); // search | basket | result
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNum, setOrderNum] = useState(null);
  const [checkout, setCheckout] = useState({ name:"", phone:"", address:"", slot:"" });
  const [selectedCat, setSelectedCat] = useState("Tous");
  const [showQty, setShowQty] = useState(null);
  const [tempQty, setTempQty] = useState("1");
  const [tempChain, setTempChain] = useState(null);
  const [sharedMode, setSharedMode] = useState(false);
  const [checked, setChecked] = useState(new Set());

  const cats = ["Tous", ...new Set(PRODUCTS.map(p=>p.cat))];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listParam = params.get("list");
    if (!listParam) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(listParam))));
      const restored = (decoded.items || []).map(it => {
        const product = PRODUCTS.find(p => p.id === it.id);
        return product ? { product, qty: it.qty || 1, chosenChain: it.chain } : null;
      }).filter(Boolean);
      if (restored.length > 0) {
        setBasket(restored);
        setDeliveryMode(decoded.delivery || false);
        setSharedMode(true);
      }
    } catch(e) { console.warn("Liste partagée invalide", e); }
  }, []);

  const filtered = PRODUCTS.filter(p => {
    const matchSearch = !search || normalize(p.name).includes(normalize(search));
    const matchCat = selectedCat==="Tous" || p.cat===selectedCat;
    return matchSearch && matchCat;
  });

  const addToBasket = (product) => {
    setShowQty(product);
    setTempQty("1");
    setTempChain(cheapestChain(product));
  };

  const confirmAdd = () => {
    if (!showQty) return;
    const qty = parseInt(tempQty)||1;
    const chosenChain = tempChain || cheapestChain(showQty);
    // For ownBrand virtual products, use the real product from brandByChain
    let productToAdd = showQty;
    if (showQty.isOwnBrand && showQty.brandByChain && showQty.brandByChain[chosenChain]) {
      productToAdd = showQty.brandByChain[chosenChain];
    }
    setBasket(prev => {
      const existing = prev.find(i=>i.product.id===productToAdd.id);
      if (existing) return prev.map(i=>i.product.id===productToAdd.id?{...i,qty:i.qty+qty,chosenChain}:i);
      return [...prev, { product:productToAdd, qty, chosenChain }];
    });
    setShowQty(null);
  };

  const changeChain = (productId, chain) => {
    setBasket(prev=>prev.map(i=>i.product.id===productId?{...i,chosenChain:chain}:i));
  };

  const [pendingRemove, setPendingRemove] = useState(null);
  const removeFromBasket = (id) => { setBasket(prev=>prev.filter(i=>i.product.id!==id)); setPendingRemove(null); };

  const result = useMemo(() => basket.length > 0 ? optimizeBasket(basket) : null, [basket]);

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:0;}
        .prod-card:active{transform:scale(0.97);}
        .prod-card{transition:all 0.15s;}
        .tab-btn{transition:all 0.2s;cursor:pointer;}
        .chip{cursor:pointer;transition:all 0.15s;}
        .chip:active{transform:scale(0.93);}
        .overlay{animation:fi 0.2s ease;}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        .slide-in{animation:si 0.3s cubic-bezier(.22,1,.36,1);}
        @keyframes si{from{opacity:0;transform:translateY(50px)}to{opacity:1;transform:translateY(0)}}
        .saving-badge{animation:pop 0.5s cubic-bezier(.34,1.56,.64,1);}
        @keyframes pop{from{transform:scale(0)}to{transform:scale(1)}}
      `}</style>

      {/* QTY + CHAIN MODAL */}
      {showQty && (
        <div className="overlay" style={S.overlay} onClick={()=>setShowQty(null)}>
          <div className="slide-in" style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,textAlign:"center",marginBottom:8}}>{showQty.emoji}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,textAlign:"center",marginBottom:2}}>{showQty.name}</div>
            <div style={{fontSize:12,color:"#999",textAlign:"center",marginBottom:16}}>Unité : {showQty.unit}</div>

            <div style={{fontSize:13,color:"#555",marginBottom:8,fontWeight:600}}>Quantité</div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <button onClick={()=>setTempQty(q=>String(Math.max(1,parseInt(q)-1)))} style={S.qtyBtn}>−</button>
              <div style={{flex:1,textAlign:"center",fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#2D5016"}}>{tempQty}</div>
              <button onClick={()=>setTempQty(q=>String(parseInt(q)+1))} style={S.qtyBtn}>+</button>
            </div>

            <div style={{fontSize:13,color:"#555",marginBottom:8,fontWeight:600}}>Choisir le supermarché</div>
            {Object.entries(showQty.prices).sort((a,b)=>a[1]-b[1]).map(([chain,price],i)=>{
              const qty = parseInt(tempQty)||1;
              const best = Object.entries(showQty.prices).sort((a,b)=>a[1]-b[1]).filter(([c,p])=>p<999)[0];
              const saving = (price - best[1]) * qty;
              const isSelected = tempChain===chain;
              const noStock = price >= 999;
              const obName = showQty.isOwnBrand && showQty.brandByChain && showQty.brandByChain[chain] ? showQty.brandByChain[chain].name : null;
              if (noStock) return (
                <div key={chain} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderRadius:12,marginBottom:8,opacity:0.35,background:"#F5F5F5"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${CHAIN_COLORS[chain].bg}`,background:"transparent"}}/>
                    <div>
                      <span style={{fontSize:14,fontWeight:600,color:"#AAA"}}>{chain}</span>
                      <div style={{fontSize:10,color:"#CCC"}}>Pas de marque locale</div>
                    </div>
                  </div>
                  <span style={{fontSize:12,color:"#CCC"}}>—</span>
                </div>
              );
              return (
                <div key={chain}
                  onClick={()=>setTempChain(chain)}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderRadius:12,marginBottom:8,cursor:"pointer",
                    background:isSelected?CHAIN_COLORS[chain].light:"#FAFAF8",
                    border:isSelected?`2px solid ${CHAIN_COLORS[chain].bg}`:"2px solid transparent",
                    boxShadow:isSelected?"0 2px 8px rgba(0,0,0,0.1)":"none",
                    transition:"all 0.15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${CHAIN_COLORS[chain].bg}`,display:"flex",alignItems:"center",justifyContent:"center",background:isSelected?CHAIN_COLORS[chain].bg:"transparent"}}>
                      {isSelected&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                    </div>
                    <div>
                      <span style={{fontSize:14,fontWeight:600}}>{chain}</span>
                      {obName&&<div style={{fontSize:10,color:"#999"}}>{obName}</div>}
                    </div>
                    {i===0&&!noStock&&<span style={{fontSize:9,background:"#4CAF50",color:"#fff",padding:"1px 6px",borderRadius:8,fontWeight:700}}>MOINS CHER</span>}
                    {saving>0.1&&<span style={{fontSize:9,color:"#E53935"}}>+{saving.toFixed(1)}₪</span>}
                  </div>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:isSelected?CHAIN_COLORS[chain].bg:"#333"}}>
                    {(price*qty).toFixed(1)}₪
                  </span>
                </div>
              );
            })}

            {tempChain && tempChain!==cheapestChain(showQty) && (
              <div style={{background:"#FFF3EE",borderRadius:10,padding:"10px 12px",marginBottom:8,fontSize:12,color:"#E53935"}}>
                💡 Tu pourrais économiser <strong>{((showQty.prices[tempChain]-showQty.prices[cheapestChain(showQty)])*(parseInt(tempQty)||1)).toFixed(1)}₪</strong> en choisissant <strong>{cheapestChain(showQty)}</strong>
              </div>
            )}

            <button onClick={confirmAdd} style={{...S.addBtn,marginTop:8}}>
              Ajouter chez {tempChain} ✓
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.appName}>🛒 SmartSal</div>
        <div style={S.appSub}>Compare et optimise tes courses en Israël</div>
        <div style={S.disclaimer}>
          ⚠️ Prix indicatifs 2026 — non contractuels
        </div>
      </div>

      {/* TABS */}
      <div style={S.tabs}>
        <div className="tab-btn" onClick={()=>setTab("search")} style={{...S.tabBtn,...(tab==="search"?S.tabActive:{})}}>🔍 Produits</div>
        <div className="tab-btn" onClick={()=>setTab("basket")} style={{...S.tabBtn,...(tab==="basket"?S.tabActive:{})}}>
          🧺 Panier {basket.length>0&&<span style={S.badge}>{basket.length}</span>}
        </div>
        <div className="tab-btn" onClick={()=>setTab("result")} style={{...S.tabBtn,...(tab==="result"?S.tabActive:{})}}>
          💰 Optimiser
        </div>
      </div>

      {/* SEARCH TAB */}
      {tab==="search" && (
        <div style={S.content}>
          <input style={S.searchInput} placeholder="🔍 Chercher un produit..."
            value={search} onChange={e=>setSearch(e.target.value)}/>

          <div style={S.catScroll}>
            {cats.map(c=>(
              <div key={c} className="chip" onClick={()=>setSelectedCat(c)}
                style={{...S.chip,...(selectedCat===c?S.chipActive:{})}}>
                {c.split(" ").slice(1).join(" ")||c}
              </div>
            ))}
          </div>

          <div style={S.productGrid}>
            {(()=>{
              const families = {};
              const displayList = [];
              filtered.forEach(p=>{
                if (p.ownBrand) {
                  if (!families[p.family]) families[p.family]=[];
                  families[p.family].push(p);
                } else {
                  displayList.push({type:"product",data:p});
                }
              });
              Object.entries(families).forEach(([family,brands])=>{
                displayList.push({type:"ownbrand",family,familyName:family.charAt(0).toUpperCase()+family.slice(1),brands});
              });
              return displayList.map((item,idx)=>{
                if (item.type==="product") {
                  const p=item.data, best=cheapestChain(p), inB=basket.find(i=>i.product.id===p.id);
                  return (
                    <div key={p.id} className="prod-card" style={S.productCard}>
                      <div style={S.productEmoji}>{p.emoji}</div>
                      <div style={S.productName}>{p.name}</div>
                      <div style={S.productUnit}>{p.unit}</div>
                      <div style={{display:"flex",alignItems:"center",gap:4,marginTop:6,marginBottom:8}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:CHAIN_COLORS[best].bg}}/>
                        <span style={{fontSize:11,color:"#666"}}>{best}</span>
                      </div>
                      <div style={S.bestPrice}>{p.prices[best].toFixed(1)}₪</div>
                      <button onClick={()=>addToBasket(p)} style={{...S.addToCartBtn,...(inB?S.inCartBtn:{})}}>
                        {inB?`✓ x${inB.qty}`:"+ Ajouter"}
                      </button>
                    </div>
                  );
                }
                const {familyName,brands}=item;
                const brandByChain={};
                brands.forEach(b=>{brandByChain[b.ownBrand]=b;});
                const cheapestOwn=brands.reduce((a,b)=>a.prices[a.ownBrand]<b.prices[b.ownBrand]?a:b);
                return (()=>{
                    const virtualPrices = {};
                    CHAINS.forEach(chain=>{
                      const ob = brandByChain[chain];
                      virtualPrices[chain] = ob ? ob.prices[chain] : 999;
                    });
                    const validChains = CHAINS.filter(c=>brandByChain[c]);
                    const cheapestOwnChain = validChains.reduce((a,b)=>virtualPrices[a]<virtualPrices[b]?a:b);
                    const cheapestOwnPrice = virtualPrices[cheapestOwnChain];
                    const inB = validChains.some(c=>brandByChain[c]&&basket.find(i=>i.product.id===brandByChain[c].id));
                    const virtualProduct = {
                      id: `ob-${item.family}`,
                      name: `${familyName} distributeur`,
                      cat: "🌾 Épicerie sèche",
                      emoji: "🏷️",
                      unit: "500g",
                      prices: virtualPrices,
                      isOwnBrand: true,
                      brandByChain,
                    };
                    return (
                      <div key={`ob-${item.family}`} style={S.productCard}>
                        <div style={S.productEmoji}>🏷️</div>
                        <div style={S.productName}>{familyName} distributeur</div>
                        <div style={S.productUnit}>500g</div>
                        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:6,marginBottom:8}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:CHAIN_COLORS[cheapestOwnChain].bg}}/>
                          <span style={{fontSize:11,color:"#666"}}>{cheapestOwnChain}</span>
                        </div>
                        <div style={S.bestPrice}>{cheapestOwnPrice.toFixed(1)}₪</div>
                        <button onClick={()=>addToBasket(virtualProduct)}
                          style={{...S.addToCartBtn,...(inB?S.inCartBtn:{})}}>
                          {inB?"✓ Ajouté":"+ Ajouter"}
                        </button>
                      </div>
                    );
                  })();
              });
            })()}
          </div>
          <div style={{height:80}}/>
        </div>
      )}

      {/* BASKET TAB */}
      {tab==="basket" && (
        <div style={S.content}>
          {basket.length===0 ? (
            <div style={S.empty}>
              <div style={{fontSize:48}}>🧺</div>
              <div style={S.emptyText}>Ton panier est vide</div>
              <button onClick={()=>setTab("search")} style={{...S.addBtn,width:"auto",padding:"12px 24px",marginTop:16}}>
                Chercher des produits
              </button>
            </div>
          ) : (
            <>
              {(()=>{
                // Group basket items by rayon (cat)
                const grouped = {};
                basket.forEach(item => {
                  const cat = item.product.cat || "🛍 Divers";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(item);
                });
                return Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} style={{marginBottom:16}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#2D5016",marginBottom:8,paddingLeft:4}}>
                      {cat}
                    </div>
                    {items.map(item=>(
                      <div key={item.product.id} style={S.basketItem}>
                        <div style={S.basketEmoji}>{item.product.emoji}</div>
                        <div style={{flex:1}}>
                          <div style={S.basketName}>{item.product.name}</div>
                          <div style={{fontSize:11,color:"#999"}}>{item.product.unit} · ×{item.qty}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:13,color:"#2D5016",fontWeight:700}}>
                            dès {(item.product.prices[cheapestChain(item.product)]*item.qty).toFixed(1)}₪
                          </div>
                          {pendingRemove===item.product.id ? (
                            <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                              <span style={{fontSize:11,color:"#555"}}>Retirer ?</span>
                              <button onClick={()=>removeFromBasket(item.product.id)} style={{background:"#E53935",color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Oui</button>
                              <button onClick={()=>setPendingRemove(null)} style={{background:"#EEE",color:"#555",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Non</button>
                            </div>
                          ) : (
                            <button onClick={()=>setPendingRemove(item.product.id)} style={S.removeBtn}>✕ Retirer</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
              <div style={{borderTop:"1px solid #EEE8DE",paddingTop:12,marginTop:4,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <span style={{fontSize:13,color:"#666"}}>{basket.length} article{basket.length>1?"s":""}</span>
                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"#2D5016"}}>
                  dès {basket.reduce((s,i)=>s+i.product.prices[cheapestChain(i.product)]*(i.qty||1),0).toFixed(1)}₪
                </span>
              </div>
              <button onClick={()=>setTab("result")} style={{...S.addBtn}}>
                💰 Optimiser mon panier →
              </button>
              <div style={{height:80}}/>
            </>
          )}
        </div>
      )}

      {/* RESULT TAB */}
      {tab==="result" && (
        <div style={S.content}>
          {!result ? (
            <div style={S.empty}>
              <div style={{fontSize:48}}>💰</div>
              <div style={S.emptyText}>Ajoute des produits d'abord</div>
              <button onClick={()=>setTab("search")} style={{...S.addBtn,width:"auto",padding:"12px 24px",marginTop:16}}>
                Chercher des produits
              </button>
            </div>
          ) : (
            <>
              {/* DELIVERY TOGGLE */}
              <div style={{display:"flex",background:"#fff",borderRadius:14,padding:6,marginBottom:12,gap:4,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                <button onClick={()=>setDeliveryMode(false)}
                  style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:!deliveryMode?"#2D5016":"transparent",color:!deliveryMode?"#fff":"#999",fontFamily:"'DM Sans',sans-serif"}}>
                  🏪 En magasin
                </button>
                <button onClick={()=>setDeliveryMode(true)}
                  style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:deliveryMode?"#2D5016":"transparent",color:deliveryMode?"#fff":"#999",fontFamily:"'DM Sans',sans-serif"}}>
                  🚚 Livraison
                </button>
              </div>

              {/* YOHANANOF DELIVERY WARNING */}
              {deliveryMode && result && result.byChain["Yohananof"] && result.byChain["Yohananof"].items.length > 0 && (
                <div style={{background:"#FFF3E0",border:"1.5px solid #FB8C00",borderRadius:14,padding:"14px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
                    <span style={{fontSize:22,flexShrink:0}}>🚫</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#E65100",marginBottom:4}}>
                        Yohananof ne livre pas à domicile
                      </div>
                      <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>
                        {result.byChain["Yohananof"].items.length} produit{result.byChain["Yohananof"].items.length>1?"s":""}
                        {" "}assigné{result.byChain["Yohananof"].items.length>1?"s":""} à Yohananof ne peuvent pas être livrés.
                        On peut les transférer automatiquement vers le moins cher qui livre.
                      </div>
                    </div>
                  </div>

                  <div style={{marginBottom:10}}>
                    {result.byChain["Yohananof"].items.map((item,i)=>{
                      const deliveryChains = ["Rami Levi","Osher Ad","Shufersal"];
                      const bestDelivery = deliveryChains.reduce((a,b)=>item.product.prices[a]<=item.product.prices[b]?a:b);
                      const diff = (item.product.prices[bestDelivery] - item.product.prices["Yohananof"]) * item.qty;
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"rgba(255,255,255,0.6)",borderRadius:10,marginBottom:6}}>
                          <div>
                            <span style={{fontSize:14}}>{item.product.emoji}</span>
                            <span style={{fontSize:13,marginLeft:6}}>{item.product.name}</span>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:12,color:"#FB8C00",fontWeight:600}}>→ {bestDelivery}</div>
                            {diff > 0.1
                              ? <div style={{fontSize:11,color:"#E53935"}}>+{diff.toFixed(1)}₪</div>
                              : <div style={{fontSize:11,color:"#43A047"}}>même prix !</div>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={()=>{
                    const deliveryChains = ["Rami Levi","Osher Ad","Shufersal"];
                    result.byChain["Yohananof"].items.forEach(item=>{
                      const bestDelivery = deliveryChains.reduce((a,b)=>item.product.prices[a]<=item.product.prices[b]?a:b);
                      changeChain(item.product.id, bestDelivery);
                    });
                  }} style={{width:"100%",padding:"12px",background:"#FB8C00",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Syne',sans-serif"}}>
                    ✓ Transférer automatiquement au moins cher
                  </button>
                </div>
              )}

              {/* SAVINGS BANNER */}
              <div style={S.savingsBanner}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Tu économises</div>
                <div className="saving-badge" style={S.savingsAmount}>{result.savings.toFixed(1)}₪</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:4}}>
                  {result.totalOptimized.toFixed(1)}₪ au lieu de {result.totalWorst.toFixed(1)}₪
                  {deliveryMode && " (hors livraison)"}
                </div>
              </div>

              {/* OVERPAY WARNING */}
              {result.totalOverpay > 0.5 && (
                <div style={{background:"#FFF3EE",border:"1.5px solid #FFCCBC",borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#E53935",marginBottom:2}}>⚠️ Tu pourrais économiser encore</div>
                    <div style={{fontSize:11,color:"#888"}}>En choisissant le moins cher pour chaque produit</div>
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#E53935"}}>{result.totalOverpay.toFixed(1)}₪</div>
                </div>
              )}

              {/* DISCLAIMER */}
              <div style={S.resultDisclaimer}>
                ⚠️ <strong>Prix indicatifs uniquement.</strong> Ces estimations sont basées sur des données 2026 approximatives et ne reflètent pas les prix exacts ni les promotions en cours. Vérifiez les prix en magasin.
              </div>

              {/* BY CHAIN */}
              {CHAINS.filter(c=>result.byChain[c].items.length>0).map(chain=>{
                const d = DELIVERY[chain];
                const subtotal = result.byChain[chain].total;
                const deliveryFee = deliveryMode ? (subtotal >= d.freeAbove ? 0 : d.fee) : 0;
                const belowMin = deliveryMode && subtotal < d.minOrder;
                return (
                <div key={chain} style={{...S.chainCard,borderLeft:`4px solid ${CHAIN_COLORS[chain].bg}`,opacity:belowMin?0.6:1}}>
                  <div style={S.chainHeader}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:CHAIN_COLORS[chain].bg,flexShrink:0}}/>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16}}>{chain}</span>
                      <span style={{fontSize:11,background:CHAIN_COLORS[chain].light,color:CHAIN_COLORS[chain].bg,padding:"2px 8px",borderRadius:10,fontWeight:700}}>
                        {result.byChain[chain].items.length} produit{result.byChain[chain].items.length>1?"s":""}
                      </span>
                      {deliveryMode && <span style={{fontSize:10,color:"#999"}}>⏱ {d.delay}</span>}
                      {deliveryMode && d.note && <span style={{fontSize:9,color:"#FB8C00",background:"#FFF3E0",padding:"1px 6px",borderRadius:6}}>📍 {d.note}</span>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:CHAIN_COLORS[chain].bg}}>
                        {subtotal.toFixed(1)}₪
                      </div>
                      {deliveryMode && (
                        <div style={{fontSize:11,color:deliveryFee===0?"#43A047":"#999"}}>
                          {deliveryFee===0?"🎁 Livraison offerte":`+${deliveryFee}₪ livraison`}
                        </div>
                      )}
                    </div>
                  </div>

                  {deliveryMode && belowMin && (
                    <div style={{background:"#FFF8E1",border:"1.5px solid #FFD54F",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#F57F17",marginBottom:4}}>
                        ⚠️ Minimum non atteint : {d.minOrder}₪ requis (tu es à {subtotal.toFixed(0)}₪, manque {(d.minOrder-subtotal).toFixed(0)}₪)
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                        <button
                          onClick={()=>{
                            const deliveryChains = CHAINS.filter(c=>DELIVERY[c].available && c!==chain);
                            const bestAlt = deliveryChains.reduce((a,b)=>{
                              const ta=result.byChain[chain].items.reduce((s,item)=>s+item.product.prices[a]*(item.qty||1),0);
                              const tb=result.byChain[chain].items.reduce((s,item)=>s+item.product.prices[b]*(item.qty||1),0);
                              return tb<ta?b:a;
                            });
                            result.byChain[chain].items.forEach(item=>changeChain(item.product.id, bestAlt));
                          }}
                          style={{flex:1,padding:"9px 8px",background:CHAIN_COLORS[chain].bg,color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>
                          ↩ Transférer vers le moins cher
                        </button>
                        <button
                          onClick={()=>{ setTab("search"); setSelectedCat(PRODUCTS.find(p=>p.prices[chain]===Math.min(...Object.values(p.prices)))?.cat||"Tous"); }}
                          style={{flex:1,padding:"9px 8px",background:"#fff",color:CHAIN_COLORS[chain].bg,border:`1.5px solid ${CHAIN_COLORS[chain].bg}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>
                          + Ajouter des produits {chain}
                        </button>
                      </div>
                    </div>
                  )}

                  {result.byChain[chain].items.map((item,i)=>(
                    <div key={i}>
                      <div style={S.chainItem}>
                        <span style={{fontSize:16}}>{item.product.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13}}>{item.product.name} {item.qty>1&&`x${item.qty}`}</div>
                          {item.overpay>0.1&&(
                            <div style={{fontSize:11,color:"#E53935"}}>
                              +{item.overpay.toFixed(1)}₪ vs {item.cheapest}
                            </div>
                          )}
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:13,fontWeight:600,color:CHAIN_COLORS[chain].bg}}>{item.price.toFixed(1)}₪</div>
                          {item.overpay>0.1&&(
                            <button
                              onClick={()=>changeChain(item.product.id, item.cheapest)}
                              style={{background:"#1E88E5",color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>
                              ↩ Changer vers {item.cheapest}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}


                  {deliveryMode && !d.available && (
                    <div style={{marginTop:10,background:"#FFF3E0",border:"1.5px solid #FFB74D",borderRadius:12,padding:"12px 14px"}}>
                      <div style={{fontSize:12,color:"#E65100",fontWeight:700,marginBottom:8}}>
                        🚫 {chain} ne propose pas de livraison — retrait en magasin uniquement
                      </div>
                      <button
                        onClick={()=>{
                          const deliveryChains = CHAINS.filter(c=>DELIVERY[c].available);
                          if (!deliveryChains.length) return;
                          result.byChain[chain].items.forEach(item=>{
                            const best = deliveryChains.reduce((a,b)=>
                              item.product.prices[a]<=item.product.prices[b]?a:b
                            );
                            changeChain(item.product.id, best);
                          });
                        }}
                        style={{width:"100%",padding:"10px 0",background:CHAIN_COLORS[chain].bg,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                        ↩ Transférer vers le moins cher qui livre
                      </button>
                    </div>
                  )}
                </div>
              );})}

              {/* TOTAL RECAP */}
              <div style={S.totalCard}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:"#333",marginBottom:4}}>
                  Si tu achetais TOUT dans un seul supermarché :
                </div>
                <div style={{fontSize:11,color:"#999",marginBottom:12}}>Même panier, mêmes quantités</div>

                {CHAINS.map(chain=>{
                  const total = basket.reduce((s,i)=>s+i.product.prices[chain]*(i.qty||1),0);
                  const d = DELIVERY[chain];
                  const fee = deliveryMode ? (total>=d.freeAbove?0:d.fee) : 0;
                  const grandTotal = total + fee;
                  const cheapestSingle = Math.min(...CHAINS.map(c=>basket.reduce((s,i)=>s+i.product.prices[c]*(i.qty||1),0)));
                  const cheapestSingleChain = CHAINS.reduce((a,b)=>
                    basket.reduce((s,i)=>s+i.product.prices[b]*(i.qty||1),0) <
                    basket.reduce((s,i)=>s+i.product.prices[a]*(i.qty||1),0) ? b : a
                  );
                  const isCheapest = Math.abs(total - cheapestSingle) < 0.1;
                  const diff = total - cheapestSingle;
                  return (
                    <div key={chain} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"10px 12px",borderRadius:12,background:isCheapest?"#E8F5E9":CHAIN_COLORS[chain].light,border:isCheapest?"1.5px solid #4CAF50":"1.5px solid transparent"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:CHAIN_COLORS[chain].bg,flexShrink:0}}/>
                          <span style={{fontSize:13,fontWeight:600}}>{chain}</span>
                          {isCheapest && <span style={{fontSize:9,background:"#4CAF50",color:"#fff",padding:"1px 6px",borderRadius:8,fontWeight:700}}>LE MOINS CHER</span>}
                        </div>
                        {deliveryMode && <div style={{fontSize:10,color:"#999",marginTop:2,marginLeft:14}}>
                          {fee===0?"🎁 livraison offerte":`+${fee}₪ livraison`}
                        </div>}
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:isCheapest?"#2D5016":CHAIN_COLORS[chain].bg}}>
                          {grandTotal.toFixed(1)}₪
                        </div>
                        {!isCheapest && <div style={{fontSize:11,color:"#E53935"}}>+{diff.toFixed(1)}₪ vs {cheapestSingleChain}</div>}
                      </div>
                    </div>
                  );
                })}

                <div style={{borderTop:"2px dashed #A8D878",paddingTop:14,marginTop:10}}>
                  <div style={{fontSize:11,color:"#2D5016",fontWeight:700,textTransform:"uppercase",marginBottom:8,letterSpacing:0.5}}>
                    🧠 Panier optimisé — meilleur prix par produit
                  </div>
                  {(()=>{
                    const deliveryFees = deliveryMode
                      ? CHAINS.filter(c=>result.byChain[c].items.length>0).reduce((s,c)=>{
                          const sub=result.byChain[c].total;
                          return s+(sub>=DELIVERY[c].freeAbove?0:DELIVERY[c].fee);
                        },0) : 0;
                    const cheapestSingle = Math.min(...CHAINS.map(c=>basket.reduce((s,i)=>s+i.product.prices[c]*(i.qty||1),0)));
                    const saving = cheapestSingle - result.totalOptimized;
                    const worstTotal = Math.max(...CHAINS.map(c=>basket.reduce((s,i)=>s+i.product.prices[c]*(i.qty||1),0)));
                    const savingVsWorst = worstTotal - result.totalOptimized;
                    const worstChainName = CHAINS.reduce((a,b)=>basket.reduce((s,i)=>s+i.product.prices[b]*(i.qty||1),0)>basket.reduce((s,i)=>s+i.product.prices[a]*(i.qty||1),0)?b:a);
                    return (
                      <div style={{background:"#2D5016",borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          {saving > 0.5 ? (
                            <>
                              <div style={{color:"#A8D878",fontSize:13,fontWeight:700}}>
                                Économie supplémentaire : {saving.toFixed(1)}₪
                              </div>
                              <div style={{color:"rgba(255,255,255,0.6)",fontSize:11,marginTop:2}}>
                                vs tout chez le moins cher
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{color:"#A8D878",fontSize:13,fontWeight:700}}>
                                Économie totale : {savingVsWorst.toFixed(1)}₪
                              </div>
                              <div style={{color:"rgba(255,255,255,0.6)",fontSize:11,marginTop:2}}>
                                vs tout chez {worstChainName}
                              </div>
                              <div style={{color:"rgba(255,255,255,0.45)",fontSize:10,marginTop:2}}>
                                ✓ Déjà au meilleur prix pour ce panier
                              </div>
                            </>
                          )}
                          {deliveryMode && deliveryFees>0 && (
                            <div style={{color:"rgba(255,255,255,0.5)",fontSize:10,marginTop:2}}>+{deliveryFees.toFixed(1)}₪ livraison</div>
                          )}
                        </div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:"#fff"}}>
                          {(result.totalOptimized+deliveryFees).toFixed(1)}₪
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* CHECKOUT BUTTON */}
              {basket.length > 0 && (
                <div style={{background:"#fff",borderRadius:16,padding:"16px",marginTop:12,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:13,color:"#555"}}>{basket.length} article{basket.length>1?"s":""}</span>
                    <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#2D5016"}}>
                      {(result.totalOptimized + (deliveryMode ? CHAINS.filter(c=>result.byChain[c].items.length>0&&DELIVERY[c].available).reduce((s,c)=>{
                        const sub=result.byChain[c].total;
                        return s+(sub>=DELIVERY[c].freeAbove?0:DELIVERY[c].fee);
                      },0) : 0)).toFixed(1)}₪
                    </span>
                  </div>

                  {deliveryMode ? (
                    <button onClick={()=>{ setShowCheckout(true); setOrderNum("PM-" + Date.now().toString().slice(-6)); }}
                      style={{width:"100%",padding:"16px",background:"#FF6B35",color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"'Syne',sans-serif",boxShadow:"0 6px 24px rgba(255,107,53,0.35)"}}>
                      🛒 Passer la commande
                    </button>
                  ) : (
                    <button onClick={()=>{
                      const payload = JSON.stringify({
                        items: basket.map(i=>({id:i.product.id, qty:i.qty, chain:i.chosenChain||cheapestChain(i.product)})),
                        delivery: false
                      });
                      const encoded = btoa(unescape(encodeURIComponent(payload)));
                      const url = window.location.origin + window.location.pathname + "?list=" + encoded;
                      const total = result.totalOptimized.toFixed(0);
                      const chains = CHAINS.filter(c=>result.byChain[c].items.length>0).join(", ");
                      const msg = encodeURIComponent(
                        `🛒 Ma liste de courses · ${total}₪\n` +
                        `${basket.length} articles · ${chains}\n\n` +
                        `Ouvre le lien, coche les articles au fur et à mesure :\n${url}`
                      );
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }}
                      style={{width:"100%",padding:"16px",background:"#25D366",color:"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Syne',sans-serif",boxShadow:"0 6px 24px rgba(37,211,102,0.35)",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                      <span style={{fontSize:20}}>📲</span> Envoyer la liste sur WhatsApp
                    </button>
                  )}
                </div>
              )}
              <div style={{height:100}}/>
            </>
          )}
        </div>
      )}

      {/* SHARED CHECKLIST — affiché quand l'app est ouverte via un lien WhatsApp */}
      {sharedMode && result && (()=>{
        const totalItems = basket.length;
        const doneCount  = checked.size;
        const pct        = totalItems > 0 ? Math.round(doneCount/totalItems*100) : 0;
        const allDone    = doneCount === totalItems && totalItems > 0;
        return (
          <div style={{position:"fixed",inset:0,background:"#F5F0E8",zIndex:1000,overflowY:"auto",maxWidth:430,margin:"0 auto",fontFamily:"'DM Sans',sans-serif"}}>

            {allDone && (
              <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#2D5016",color:"#fff",padding:"10px 20px",borderRadius:50,fontSize:13,fontWeight:500,zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
                ✅ Tous les articles cochés !
              </div>
            )}

            <div style={{background:"#2D5016",padding:"48px 20px 16px",color:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"#fff"}}>🛒 SmartSal</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>Liste partagée · {totalItems} article{totalItems>1?"s":""}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"6px 12px",fontSize:14,fontWeight:700,color:"#fff"}}>
                  {result.totalOptimized.toFixed(0)}₪
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{height:6,background:"rgba(255,255,255,0.2)",borderRadius:10,overflow:"hidden",marginBottom:5}}>
                  <div style={{height:"100%",background:"#A8D878",borderRadius:10,width:`${pct}%`,transition:"width 0.4s ease"}}/>
                </div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",textAlign:"right"}}>{doneCount}/{totalItems} cochés · {pct}%</div>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setChecked(new Set(basket.map(i=>i.product.id)))}
                  style={{flex:1,padding:"8px 4px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                  ✓ Tout cocher
                </button>
                <button onClick={()=>setChecked(new Set())}
                  style={{flex:1,padding:"8px 4px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                  ↺ Tout décocher
                </button>
              </div>
            </div>

            <div style={{padding:"12px 16px"}}>
              {CHAINS.filter(c=>result.byChain[c].items.length>0).map(chain=>{
                const items      = result.byChain[chain].items;
                const chainDone  = items.filter(i=>checked.has(i.product.id)).length;
                const chainColor = CHAIN_COLORS[chain].bg;
                return (
                  <div key={chain} style={{marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:chainColor,flexShrink:0}}/>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#333",flex:1}}>{chain}</span>
                      <span style={{fontSize:11,color:"#999"}}>{chainDone}/{items.length}</span>
                    </div>
                    {items.map(item=>{
                      const isDone = checked.has(item.product.id);
                      return (
                        <div key={item.product.id}
                          onClick={()=>setChecked(prev=>{
                            const n=new Set(prev);
                            isDone?n.delete(item.product.id):n.add(item.product.id);
                            return n;
                          })}
                          style={{display:"flex",alignItems:"center",gap:12,background:"#fff",borderRadius:14,padding:"11px 14px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",opacity:isDone?0.5:1,transition:"opacity 0.2s"}}>
                          <div style={{width:26,height:26,borderRadius:"50%",border:`2px solid ${isDone?"#2D5016":"#CCC"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0,background:isDone?"#2D5016":"transparent",transition:"all 0.2s"}}>
                            {isDone && "✓"}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:500,color:"#222",textDecoration:isDone?"line-through":"none"}}>
                              {item.product.emoji} {item.product.name}
                            </div>
                          </div>
                          {item.qty > 1 && (
                            <div style={{background:"#FF6B35",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700,flexShrink:0}}>
                              ×{item.qty}
                            </div>
                          )}
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:isDone?"#CCC":chainColor,flexShrink:0}}>
                            {item.price.toFixed(1)}₪
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <button onClick={()=>{
                setSharedMode(false);
                setBasket([]);
                setChecked(new Set());
                window.history.replaceState({}, "", window.location.pathname);
              }}
                style={{width:"100%",padding:"14px",background:"#FF6B35",color:"#fff",border:"none",borderRadius:14,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Syne',sans-serif",marginTop:4}}>
                🛒 Créer ma propre liste
              </button>
              <div style={{height:40}}/>
            </div>
          </div>
        );
      })()}

      {/* FLOATING CHECKOUT BUTTON */}
      {basket.length > 0 && tab !== "result" && (
        <div style={{position:"fixed",bottom:24,right:20,zIndex:200}}>
          <button onClick={()=>setTab("result")}
            style={{background:"#FF6B35",color:"#fff",border:"none",borderRadius:"50%",width:60,height:60,fontSize:26,cursor:"pointer",boxShadow:"0 6px 24px rgba(255,107,53,0.5)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            🛒
            <span style={{position:"absolute",top:-4,right:-4,background:"#2D5016",color:"#fff",borderRadius:"50%",width:22,height:22,fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{basket.length}</span>
          </button>
        </div>
      )}

      {/* CHECKOUT MODAL — livraison uniquement */}
      {showCheckout && result && deliveryMode && (()=>{
        const checkoutDeliveryFees = CHAINS.filter(c=>result.byChain[c].items.length>0&&DELIVERY[c].available).reduce((s,c)=>{
              const sub=result.byChain[c].total;
              return s+(sub>=DELIVERY[c].freeAbove?0:DELIVERY[c].fee);
            },0);
        const checkoutTotal = (result.totalOptimized + checkoutDeliveryFees + 35).toFixed(1);
        return (
        <div className="overlay" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div className="slide-in" style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"28px 20px 48px",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:"#2D5016",marginBottom:6}}>
              Finaliser la commande
            </div>
            <div style={{fontSize:13,color:"#999",marginBottom:20}}>
              Paiement par carte · Confirmation par email
            </div>

            {/* RECAP */}
            <div style={{background:"#F5F0E8",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#2D5016",marginBottom:8}}>Récap du panier</div>
              {basket.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                  <span>{item.product.emoji} {item.product.name} {item.qty>1?`×${item.qty}`:""}</span>
                  <span style={{fontWeight:600}}>{(item.product.prices[item.chosenChain || cheapestChain(item.product)]*item.qty).toFixed(1)}₪</span>
                </div>
              ))}
              <div style={{borderTop:"1px solid #EEE8DE",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700}}>
                <span>Total produits</span>
                <span>{result.totalOptimized.toFixed(1)}₪</span>
              </div>
              {deliveryMode && checkoutDeliveryFees > 0 && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#999",marginTop:4}}>
                  <span>🚚 Livraison ({CHAINS.filter(c=>result.byChain[c].items.length>0&&DELIVERY[c].available&&result.byChain[c].total<DELIVERY[c].freeAbove).join(" + ")})</span>
                  <span style={{fontWeight:700}}>{checkoutDeliveryFees.toFixed(1)}₪</span>
                </div>
              )}
              {deliveryMode && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#FF6B35",marginTop:4}}>
                  <span>⚙️ Frais de service</span>
                  <span style={{fontWeight:700}}>35₪</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#2D5016",marginTop:8,borderTop:"1px solid #EEE8DE",paddingTop:8}}>
                <span>TOTAL</span>
                <span>{checkoutTotal}₪</span>
              </div>
            </div>


            {/* CHAMPS LIVRAISON */}
            {[
              {key:"name",    placeholder:"Ton prénom et nom",     label:"👤 Nom"},
              {key:"phone",   placeholder:"05X-XXX-XXXX",          label:"📱 Téléphone"},
              {key:"address", placeholder:"Rue, numéro, ville",    label:"📍 Adresse de livraison"},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>{f.label}</div>
                <input style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#FAFAF8",outline:"none",color:"#222"}}
                  placeholder={f.placeholder}
                  value={checkout[f.key]}
                  onChange={e=>setCheckout(prev=>({...prev,[f.key]:e.target.value}))}/>
              </div>
            ))}

            <div style={{marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>⏰ Créneau souhaité</div>
              <select style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#FAFAF8",outline:"none",color:"#222"}}
                value={checkout.slot} onChange={e=>setCheckout(prev=>({...prev,slot:e.target.value}))}>
                <option value="">Choisir un créneau</option>
                <option>Aujourd'hui 12h-14h</option>
                <option>Aujourd'hui 14h-16h</option>
                <option>Aujourd'hui 16h-18h</option>
                <option>Aujourd'hui 18h-20h</option>
                <option>Demain 10h-12h</option>
                <option>Demain 12h-14h</option>
                <option>Demain 14h-16h</option>
              </select>
            </div>

            {/* CARTE BANCAIRE (maquette) */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>💳 Numéro de carte</div>
              <input style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#FAFAF8",outline:"none",color:"#222",letterSpacing:2}}
                placeholder="1234 5678 9012 3456" maxLength={19}
                value={checkout.card||""}
                onChange={e=>{
                  const v = e.target.value.replace(/\D/g,"").replace(/(\d{4})/g,"$1 ").trim().slice(0,19);
                  setCheckout(prev=>({...prev,card:v}));
                }}/>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <div style={{flex:1}}>
                  <input style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#FAFAF8",outline:"none",color:"#222"}}
                    placeholder="MM/AA" maxLength={5}
                    value={checkout.expiry||""}
                    onChange={e=>{
                      const v = e.target.value.replace(/\D/g,"");
                      const fmt = v.length>=2?v.slice(0,2)+"/"+v.slice(2):v;
                      setCheckout(prev=>({...prev,expiry:fmt.slice(0,5)}));
                    }}/>
                </div>
                <div style={{flex:1}}>
                  <input style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#FAFAF8",outline:"none",color:"#222"}}
                    placeholder="CVV" maxLength={4} type="password"
                    value={checkout.cvv||""}
                    onChange={e=>setCheckout(prev=>({...prev,cvv:e.target.value.replace(/\D/g,"").slice(0,4)}))}/>
                </div>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>📧 Email (pour le reçu)</div>
              <input style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#FAFAF8",outline:"none",color:"#222"}}
                placeholder="ton@email.com" type="email"
                value={checkout.email||""}
                onChange={e=>setCheckout(prev=>({...prev,email:e.target.value}))}/>
            </div>

            <div style={{background:"#FFF8E1",borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#7B6000",lineHeight:1.5}}>
              ⚙️ <strong>Pour activer les vrais paiements</strong> : branche <strong>PayPlus</strong> (payplus.co.il) et <strong>EmailJS</strong> (emailjs.com) — le code est prêt, tu n'as qu'à ajouter tes clés API.
            </div>

            {(()=>{
              const canPay = checkout.name && checkout.phone && checkout.address && checkout.slot && checkout.email && checkout.card && checkout.expiry && checkout.cvv;
              const handlePay = async () => {
                if (!canPay) return;
                const orderDetails = CHAINS
                  .filter(c=>result.byChain[c].items.length>0)
                  .map(c=>`${c}: ${result.byChain[c].items.map(i=>i.product.name+(i.qty>1?" x"+i.qty:"")).join(", ")} (${result.byChain[c].total.toFixed(1)}₪)`)
                  .join(" | ");
                const EMAILJS_SERVICE = "VOTRE_SERVICE_ID";
                const EMAILJS_KEY     = "VOTRE_PUBLIC_KEY";
                const TEMPLATE_CLIENT = "TEMPLATE_CLIENT_ID";
                const TEMPLATE_YORAM  = "TEMPLATE_YORAM_ID";
                try {
                  const emailjs = (await import("https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js")).default;
                  await emailjs.send(EMAILJS_SERVICE, TEMPLATE_CLIENT, {
                    to_email: checkout.email, to_name: checkout.name,
                    order_num: orderNum, total: checkoutTotal+"₪",
                    slot: checkout.slot, address: checkout.address, details: orderDetails,
                  }, EMAILJS_KEY);
                  await emailjs.send(EMAILJS_SERVICE, TEMPLATE_YORAM, {
                    order_num: orderNum, client_name: checkout.name,
                    client_phone: checkout.phone, client_email: checkout.email,
                    client_address: checkout.address, slot: checkout.slot,
                    total: checkoutTotal+"₪", details: orderDetails,
                  }, EMAILJS_KEY);
                  alert("✅ Commande confirmée ! Numéro : " + orderNum + "\nVérifie ton email.");
                  setShowCheckout(false);
                } catch(e) {
                  console.error("EmailJS non configuré:", e);
                  alert("✅ Commande " + orderNum + " enregistrée !\n(Emails désactivés — configure EmailJS)");
                  setShowCheckout(false);
                }
              };
              return (
                <div>
                  <button onClick={handlePay}
                    style={{width:"100%",padding:"16px",background:canPay?"#2D5016":"#CCC",color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:800,cursor:canPay?"pointer":"default",fontFamily:"'Syne',sans-serif",marginBottom:8}}>
                    💳 Payer {checkoutTotal}₪
                  </button>
                  {!canPay && <div style={{fontSize:11,color:"#999",textAlign:"center",marginBottom:8}}>Remplis tous les champs</div>}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:11,color:"#BBB"}}>
                    🔒 Paiement sécurisé · PayPlus
                  </div>
                </div>
              );
            })()}

            <button onClick={()=>setShowCheckout(false)}
              style={{width:"100%",padding:"12px",background:"#F5F0E8",color:"#666",border:"none",borderRadius:12,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",marginTop:12}}>
              Annuler
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

const S = {
  root:{fontFamily:"'DM Sans',sans-serif",background:"#F5F0E8",minHeight:"100vh",maxWidth:430,margin:"0 auto"},
  header:{background:"#2D5016",padding:"48px 20px 20px",color:"#fff"},
  appName:{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:"#fff",marginBottom:4},
  appSub:{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:8},
  disclaimer:{fontSize:11,color:"rgba(255,255,255,0.5)",fontStyle:"italic"},
  tabs:{display:"flex",background:"#fff",borderBottom:"1px solid #EEE8DE"},
  tabBtn:{flex:1,padding:"12px 4px",textAlign:"center",fontSize:12,fontWeight:600,color:"#999",borderBottom:"2.5px solid transparent",position:"relative"},
  tabActive:{color:"#2D5016",borderBottom:"2.5px solid #2D5016"},
  badge:{background:"#FF6B35",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700,marginLeft:4},
  content:{padding:"12px 16px",overflowY:"auto"},
  searchInput:{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #EEE8DE",fontSize:14,fontFamily:"'DM Sans',sans-serif",background:"#fff",outline:"none",color:"#222",marginBottom:12},
  catScroll:{display:"flex",gap:8,overflowX:"auto",paddingBottom:12},
  chip:{whiteSpace:"nowrap",padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:500,background:"#fff",color:"#666",border:"1.5px solid #EEE"},
  chipActive:{background:"#2D5016",color:"#fff",border:"1.5px solid #2D5016"},
  productGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
  productCard:{background:"#fff",borderRadius:16,padding:"14px 12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"},
  productEmoji:{fontSize:28,marginBottom:6},
  productName:{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#222",marginBottom:2,lineHeight:1.3},
  productUnit:{fontSize:10,color:"#BBB"},
  bestPrice:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#2D5016",marginBottom:8},
  addToCartBtn:{width:"100%",padding:"7px 0",borderRadius:10,border:"none",background:"#2D5016",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  inCartBtn:{background:"#A8D878",color:"#2D5016"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modal:{background:"#fff",borderRadius:"24px 24px 0 0",padding:"28px 20px 48px",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto"},
  qtyBtn:{width:44,height:44,borderRadius:12,border:"1.5px solid #EEE",background:"#F5F0E8",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  addBtn:{width:"100%",padding:"14px",background:"#2D5016",color:"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif",cursor:"pointer"},
  empty:{textAlign:"center",padding:"60px 20px"},
  emptyText:{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:"#2D5016",marginTop:12},
  basketItem:{display:"flex",alignItems:"center",gap:12,background:"#fff",borderRadius:14,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"},
  basketEmoji:{fontSize:24,flexShrink:0},
  basketName:{fontSize:14,fontWeight:500,color:"#222"},
  removeBtn:{background:"none",border:"none",color:"#E53935",fontSize:11,cursor:"pointer",marginTop:4},
  savingsBanner:{background:"linear-gradient(135deg,#2D5016,#43A047)",borderRadius:16,padding:"20px",textAlign:"center",marginBottom:12,color:"#fff"},
  savingsAmount:{fontFamily:"'Syne',sans-serif",fontSize:48,fontWeight:800,color:"#A8D878"},
  resultDisclaimer:{background:"#FFF8E1",border:"1.5px solid #FFD54F",borderRadius:12,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#555",lineHeight:1.5},
  chainCard:{background:"#fff",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"},
  chainHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  chainItem:{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderTop:"1px solid #F5F0E8"},
  totalCard:{background:"#fff",borderRadius:14,padding:"16px",marginTop:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"},
};
