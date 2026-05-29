require('dotenv').config();
const { sequelize, Product, User, Location, Inventory } = require('./models');
const bcrypt = require('bcryptjs');

const productsData = [
    // ==========================================
    // KATEGORIA: ZIARNA
    // ==========================================
    
    // --- Gwatemala Meissa (250g + 1kg) ---
    { 
        name: "Gwatemala Meissa", price: 55, company: "Paloma Roastery", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Klasyczne, bardzo zbalansowane ziarna o niskiej kwasowości. Idealne do porannego, gęstego espresso.", 
        size: "250g", purpose: "espresso", flavours: "Czekolada, Orzech laskowy, Karmel", 
        processingMethod: "Washed", variety: "Bourbon, Caturra", farm: "Finca El Morito", roastDate: "2026-03-01", 
        variantGroup: "gwatemala-meissa",
        warehouseStock: 3
    },
    { 
        name: "Gwatemala Meissa", price: 185, company: "Paloma Roastery", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Klasyczne, bardzo zbalansowane ziarna o niskiej kwasowości. Idealne do porannego, gęstego espresso. Wersja kilogramowa.", 
        size: "1kg", purpose: "espresso", flavours: "Czekolada, Orzech laskowy, Karmel", 
        processingMethod: "Washed", variety: "Bourbon, Caturra", farm: "Finca El Morito", roastDate: "2026-03-01", 
        variantGroup: "gwatemala-meissa",
        warehouseStock: 5
    },

    // --- Kenia Matunda (250g + 1kg) ---
    { 
        name: "Kenia Matunda", price: 68, company: "Paloma Roastery", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Owocowa bomba! Niezwykle soczysta Kenia, która w V60 pokazuje pełnię swoich herbaciano-owocowych możliwości.", 
        size: "250g", purpose: "filtr", flavours: "Czarna porzeczka, Hibiskus, Czerwone owoce", 
        processingMethod: "Washed", variety: "SL28, SL34", farm: "Nyeri Hill", roastDate: "2026-03-05", 
        variantGroup: "kenia-matunda",
        warehouseStock: 3 
    },
    { 
        name: "Kenia Matunda", price: 230, company: "Paloma Roastery", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Owocowa bomba! Niezwykle soczysta Kenia, która w V60 pokazuje pełnię swoich herbaciano-owocowych możliwości. Wersja kilogramowa.", 
        size: "1kg", purpose: "filtr", flavours: "Czarna porzeczka, Hibiskus, Czerwone owoce", 
        processingMethod: "Washed", variety: "SL28, SL34", farm: "Nyeri Hill", roastDate: "2026-03-05", 
        variantGroup: "kenia-matunda",
        warehouseStock: 4 
    },

    // --- Rwanda Gisanga (bez wariantów) ---
    { 
        name: "Rwanda Gisanga", price: 62, company: "Paloma Roastery", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Naturalna obróbka dająca dziki, słodki profil. Kawa dla poszukiwaczy nowych, fermentowanych wrażeń.", 
        size: "250g", purpose: "filtr", flavours: "Czerwone wino, Maliny, Kandyzowana truskawka", 
        processingMethod: "Natural", variety: "Red Bourbon", farm: "Gisanga Washing Station", roastDate: "2026-03-10", 
        variantGroup: null,
        warehouseStock: 15 
    },

    // --- Brazylia Cerrado (250g + 1kg) ---
    { 
        name: "Brazylia Cerrado", price: 45, company: "HAYB", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Czekolada w najczystszej postaci. Praktyczna kawa na co dzień do ekspresu automatycznego lub kawiarki.", 
        size: "250g", purpose: "kawiarka", flavours: "Gorzkie kakao, Ciemna czekolada, Migdały", 
        processingMethod: "Pulped Natural", variety: "Catuai", farm: "Cerrado Mineiro", roastDate: "2026-02-28", 
        variantGroup: "brazylia-cerrado",
        warehouseStock: 12 
    },
    { 
        name: "Brazylia Cerrado", price: 120, company: "HAYB", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Praktyczny, duży worek na co dzień do ekspresu automatycznego lub kawiarki. Czekolada w najczystszej postaci.", 
        size: "1kg", purpose: "kawiarka", flavours: "Gorzkie kakao, Ciemna czekolada, Migdały", 
        processingMethod: "Pulped Natural", variety: "Catuai", farm: "Cerrado Mineiro", roastDate: "2026-02-28", 
        variantGroup: "brazylia-cerrado",
        warehouseStock: 8 
    },

    // --- Etiopia Yirgacheffe (250g + 1kg) ---
    { 
        name: "Etiopia Yirgacheffe", price: 75, company: "HAYB", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Kwiatowa, rześka i niezwykle delikatna Etiopia. Absolutny klasyk dla fanów przelewów i subtelnych naparów.", 
        size: "250g", purpose: "filtr", flavours: "Jaśmin, Bergamotka, Brzoskwinia", 
        processingMethod: "Washed", variety: "Heirloom", farm: "Konga Coop", roastDate: "2026-03-08", 
        variantGroup: "etiopia-yirgacheffe",
        warehouseStock: 3
    },
    { 
        name: "Etiopia Yirgacheffe", price: 250, company: "HAYB", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Kwiatowa, rześka i niezwykle delikatna Etiopia. Absolutny klasyk dla fanów przelewów i subtelnych naparów. Wersja kilogramowa.", 
        size: "1kg", purpose: "filtr", flavours: "Jaśmin, Bergamotka, Brzoskwinia", 
        processingMethod: "Washed", variety: "Heirloom", farm: "Konga Coop", roastDate: "2026-03-08", 
        variantGroup: "etiopia-yirgacheffe",
        warehouseStock: 2
    },

    // --- Kolumbia Supremo (250g + 1kg) ---
    { 
        name: "Kolumbia Supremo", price: 58, company: "Hard Beans", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Idealny balans pomiędzy słodyczą a kwasowością. Świetnie sprawdza się w ekspresach ciśnieniowych oraz z mlekiem.", 
        size: "250g", purpose: "espresso", flavours: "Trzcina cukrowa, Czerwone jabłko, Mleczna czekolada", 
        processingMethod: "Washed", variety: "Castillo", farm: "Finca La Gabriela", roastDate: "2026-03-12", 
        variantGroup: "kolumbia-supremo",
        warehouseStock: 5 
    },
    { 
        name: "Kolumbia Supremo", price: 195, company: "Hard Beans", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Idealny balans pomiędzy słodyczą a kwasowością. Świetnie sprawdza się w ekspresach ciśnieniowych oraz z mlekiem. Opakowanie kilogramowe.", 
        size: "1kg", purpose: "espresso", flavours: "Trzcina cukrowa, Czerwone jabłko, Mleczna czekolada", 
        processingMethod: "Washed", variety: "Castillo", farm: "Finca La Gabriela", roastDate: "2026-03-12", 
        variantGroup: "kolumbia-supremo",
        warehouseStock: 3 
    },

    // --- Panama Geisha (bez wariantów) ---
    { 
        name: "Panama Geisha Esmeralda", price: 250, company: "La Cabra", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Królowa kaw specialty. Ekstremalnie kwiatowa, herbaciana i złożona. Tylko na specjalne okazje.", 
        size: "150g", purpose: "filtr", flavours: "Kwiaty pomarańczy, Earl Grey, Papaja", 
        processingMethod: "Washed", variety: "Geisha", farm: "Hacienda La Esmeralda", roastDate: "2026-03-01", 
        variantGroup: null,
        warehouseStock: 0 // Wyprzedane!
    },

    // --- Kostaryka Tarrazu (bez wariantów) ---
    { 
        name: "Kostaryka Tarrazu", price: 65, company: "Paloma Roastery", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Słodka i gęsta kawa z obróbki miodowej. Doskonała baza pod Flat White.", 
        size: "250g", purpose: "espresso", flavours: "Miód, Prażone migdały, Czerwona śliwka", 
        processingMethod: "Honey", variety: "Caturra", farm: "Dota Coop", roastDate: "2026-03-06", 
        variantGroup: null,
        warehouseStock: 20 
    },

    // --- Honduras Marcala (bez wariantów) ---
    { 
        name: "Honduras Marcala", price: 49, company: "Hard Beans", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Uniwersalny profil omniroast. Zaparzysz ją dobrze zarówno w dripperze, jak i w kawiarce.", 
        size: "250g", purpose: "omniroast", flavours: "Toffi, Czerwone winogrona, Orzech włoski", 
        processingMethod: "Washed", variety: "Bourbon", farm: "Comsa", roastDate: "2026-02-20", 
        variantGroup: null,
        warehouseStock: 6
    },

    // --- Peru Cajamarca Decaf (bez wariantów) ---
    { 
        name: "Peru Cajamarca Decaf", price: 60, company: "HAYB", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Bezkofeinowa kawa dekofeinizowana metodą Swiss Water. Pełnia smaku bez pobudzenia.", 
        size: "250g", purpose: "espresso", flavours: "Kakao, Suszone śliwki, Syrop klonowy", 
        processingMethod: "Swiss Water Decaf", variety: "Typica", farm: "Cajamarca Region", roastDate: "2026-03-10", 
        variantGroup: null,
        warehouseStock: 12 
    },

    // --- Burundi Nemba (bez wariantów) ---
    { 
        name: "Burundi Nemba", price: 72, company: "La Cabra", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Czysta, rześka i bardzo słodka kawa z serca Afryki. Świetna tekstura i herbaciany finisz.", 
        size: "250g", purpose: "filtr", flavours: "Czarna herbata, Cytryna, Miód", 
        processingMethod: "Washed", variety: "Red Bourbon", farm: "Nemba Washing Station", roastDate: "2026-03-02", 
        variantGroup: null,
        warehouseStock: 5 
    },

    // --- Indonezja Sumatra (bez wariantów) ---
    { 
        name: "Indonezja Sumatra Mandheling", price: 59, company: "Paloma Roastery", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Niska kwasowość, ogromne body i ziemisto-ziołowy profil. Kawa o bardzo mocnym charakterze.", 
        size: "250g", purpose: "espresso", flavours: "Ciemna czekolada, Zioła, Tytoń", 
        processingMethod: "Wet Hulled (Giling Basah)", variety: "Catimor", farm: "Lintong Region", roastDate: "2026-02-25", 
        variantGroup: null,
        warehouseStock: 18 
    },

    // --- Meksyk Chiapas (bez wariantów) ---
    { 
        name: "Meksyk Chiapas", price: 54, company: "Hard Beans", category: "Ziarna", 
        image: "gwatemala-meissa.jpg", description: "Lekka i przyjemna kawa codzienna. Świetnie łączy się z mlekiem owsianym.", 
        size: "250g", purpose: "kawiarka", flavours: "Czekolada mleczna, Cynamon, Pomarańcza", 
        processingMethod: "Washed", variety: "Typica", farm: "Chiapas Coop", roastDate: "2026-03-11", 
        variantGroup: null,
        warehouseStock: 25 
    },

    // --- Salwador Finca Potosi (bez wariantów) ---
    { 
        name: "Salwador Finca Potosi", price: 68, company: "Paloma Roastery", category: "Ziarna", 
        image: "kenia_matunda.jpg", description: "Owocowa, naturalna kawa z Salwadoru. Bardzo słodka i syropowata.", 
        size: "250g", purpose: "filtr", flavours: "Dojrzała wiśnia, Czekolada deserowa, Marcepan", 
        processingMethod: "Natural", variety: "Pacamara", farm: "Finca Potosi", roastDate: "2026-03-09", 
        variantGroup: null,
        warehouseStock: 2 
    },

    // --- Blend Morning Kick (250g + 1kg) ---
    { 
        name: "Blend Morning Kick", price: 35, company: "Paloma Roastery", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Nasza autorska mieszanka brazylijskich i kolumbijskich ziaren. Gęsta, słodka, idealna do biura.", 
        size: "250g", purpose: "espresso", flavours: "Gorzka czekolada, Karmel, Orzechy ziemne", 
        processingMethod: "Washed / Natural", variety: "Blend", farm: "Various", roastDate: "2026-03-13", 
        variantGroup: "blend-morning-kick",
        warehouseStock: 10
    },
    { 
        name: "Blend Morning Kick", price: 95, company: "Paloma Roastery", category: "Ziarna", 
        image: "Rwanda-Gisanga.jpg", description: "Nasza autorska mieszanka brazylijskich i kolumbijskich ziaren. Gęsta, słodka, idealna do biura. Opakowanie kilogramowe.", 
        size: "1kg", purpose: "espresso", flavours: "Gorzka czekolada, Karmel, Orzechy ziemne", 
        processingMethod: "Washed / Natural", variety: "Blend", farm: "Various", roastDate: "2026-03-13", 
        variantGroup: "blend-morning-kick",
        warehouseStock: 4
    },

    // ==========================================
    // KATEGORIA: ZAPARZACZE (7 produktów)
    // ==========================================
    { 
        name: "Dripper Hario V60-02", price: 35, company: "Hario", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Kultowy zaparzacz japońskiej marki Hario. Wersja plastikowa, najlepiej trzymająca temperaturę podczas parzenia.", 
        size: "02", purpose: "filtr", 
        warehouseStock: 25 
    },
    { 
        name: "AeroPress Clear", price: 179, company: "AeroPress", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Wielofunkcyjny sprzęt, którym zaparzysz kawę na wyjeździe i w domu. Niezwykle trwały, łatwy w czyszczeniu.", 
        size: "Standard", purpose: "omniroast", 
        warehouseStock: 12 
    },
    { 
        name: "Kawiarka Bialetti Moka Express", price: 140, company: "Bialetti", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Tradycyjna, włoska kawiarka aluminiowa, w której zaparzysz gęstą kawę przypominającą espresso.", 
        size: "3 tz", purpose: "kawiarka", 
        warehouseStock: 5 
    },
    { 
        name: "Chemex Classic (6 filiżanek)", price: 219, company: "Chemex", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Elegancki, szklany zaparzacz dający niezwykle czysty i klarowny napar. Ozdoba każdej kuchni.", 
        size: "6 cups", purpose: "filtr", 
        warehouseStock: 8 
    },
    { 
        name: "Dripper Kalita Wave 185", price: 149, company: "Kalita", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Stalowy zaparzacz z płaskim dnem. Wybacza błędy w polewaniu i daje bardzo powtarzalne ekstrakcje.", 
        size: "185", purpose: "filtr", 
        warehouseStock: 0 // Wyprzedane
    },
    { 
        name: "Kawiarka Bialetti Venus (Indukcja)", price: 169, company: "Bialetti", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Stalowa kawiarka o nowoczesnym designie. Przystosowana do kuchenek indukcyjnych.", 
        size: "4 tz", purpose: "kawiarka", 
        warehouseStock: 15 
    },
    { 
        name: "French Press Bodum Chambord", price: 129, company: "Bodum", category: "Zaparzacze", 
        image: "V60-01-clear.jpg", description: "Klasyczny zaparzacz tłokowy. Świetny do kawy z dużą ilością body oraz do parzenia herbaty.", 
        size: "1000ml", purpose: "omniroast", 
        warehouseStock: 22 
    },

    // ==========================================
    // KATEGORIA: HERBATY (5 produktów)
    // ==========================================
    { 
        name: "Matcha Ceremonialna Moya", price: 139, company: "Moya Matcha", category: "Herbaty", 
        image: "kenia_matunda.jpg", description: "Najwyższej jakości organiczna matcha z pierwszego zbioru (first flush) z Uji. Intensywnie zielona, słodka.", 
        size: "30g", teaType: "Ceremonialna", 
        warehouseStock: 40 
    },
    { 
        name: "Hojicha Bio", price: 55, company: "Moya Matcha", category: "Herbaty", 
        image: "Rwanda-Gisanga.jpg", description: "Prażona japońska zielona herbata o dymnym, karmelowym aromacie. Niska zawartość teiny, idealna na wieczór.", 
        size: "60g", teaType: "Prażona (Hojicha)", 
        warehouseStock: 20 
    },
    { 
        name: "Sencha Senpai", price: 45, company: "Paper & Tea", category: "Herbaty", 
        image: "gwatemala-meissa.jpg", description: "Klasyczna japońska zielona herbata. Trawiasta, orzeźwiająca z delikatną nutą umami.", 
        size: "50g", teaType: "Zielona (Sencha)", 
        warehouseStock: 14 
    },
    { 
        name: "Oolong Milky", price: 60, company: "Johan & Nyström", category: "Herbaty", 
        image: "kenia_matunda.jpg", description: "Wyjątkowy tajwański oolong o naturalnym, mleczno-śmietankowym aromacie.", 
        size: "50g", teaType: "Oolong", 
        warehouseStock: 7 
    },
    { 
        name: "Matcha Codzienna (Kulinarna)", price: 79, company: "Moya Matcha", category: "Herbaty", 
        image: "Rwanda-Gisanga.jpg", description: "Matcha z drugiego zbioru. Idealna do matcha latte, wypieków i smoothie.", 
        size: "50g", teaType: "Kulinarna", 
        warehouseStock: 35 
    },

    // ==========================================
    // KATEGORIA: FILTRY (5 produktów)
    // ==========================================
    { 
        name: "Filtry Hario V60-02 (Białe)", price: 29, company: "Hario", category: "Filtry", 
        image: "V60-01-clear.jpg", description: "Papierowe filtry do drippera w rozmiarze 02, japońska produkcja, 100 sztuk.", 
        size: "02", 
        warehouseStock: 100 
    },
    { 
        name: "Filtry AeroPress", price: 25, company: "AeroPress", category: "Filtry", 
        image: "V60-01-clear.jpg", description: "Zapas oryginalnych mikrofiltrów papierowych do AeroPressa. 350 sztuk w opakowaniu.", 
        size: "Standard", 
        warehouseStock: 150 
    },
    { 
        name: "Filtry Chemex Kwadratowe", price: 49, company: "Chemex", category: "Filtry", 
        image: "V60-01-clear.jpg", description: "Oryginalne filtry z grubej bibuły do Chemexa. Odpowiadają za niezwykłą klarowność naparu (100 sztuk).", 
        size: "6 cups", 
        warehouseStock: 4 
    },
    { 
        name: "Filtry Kalita Wave 185", price: 39, company: "Kalita", category: "Filtry", 
        image: "V60-01-clear.jpg", description: "Pofalowane papierowe filtry do drippera Kalita Wave. 100 sztuk.", 
        size: "185", 
        warehouseStock: 0 // Wyprzedane
    },
    { 
        name: "Filtry Hario V60-01 (Białe)", price: 25, company: "Hario", category: "Filtry", 
        image: "V60-01-clear.jpg", description: "Mniejsze filtry papierowe do zaparzaczy V60 w rozmiarze 01. 100 sztuk.", 
        size: "01", 
        warehouseStock: 45 
    },

    // ==========================================
    // KATEGORIA: KUBKI I SZKŁO (4 produkty)
    // ==========================================
    { 
        name: "Loveramics Egg Flat White", price: 42, company: "Loveramics", category: "Kubki", 
        image: "gwatemala-meissa.jpg", description: "Idealna filiżanka ze spodkiem do Flat White'a. Bardzo grubościenna porcelana świetnie trzyma ciepło.", 
        size: "150 ml",
        warehouseStock: 15 
    },
    { 
        name: "KeepCup Brew Cork", price: 110, company: "KeepCup", category: "Kubki", 
        image: "Rwanda-Gisanga.jpg", description: "Ekologiczny szklany kubek na wynos z korkową opaską. Bądź eko, zrezygnuj z papierowych kubków!", 
        size: "227 ml", 
        warehouseStock: 0 // Wyprzedane!
    },
    { 
        name: "Kinto Kronos Double Wall", price: 65, company: "Kinto", category: "Kubki", 
        image: "kenia_matunda.jpg", description: "Szklanka z podwójną ścianką zapobiegająca oparzeniom. Pływający w powietrzu napar wygląda niesamowicie.", 
        size: "250 ml", 
        warehouseStock: 30 
    },
    { 
        name: "Fellow Carter Move Mug", price: 159, company: "Fellow", category: "Kubki", 
        image: "gwatemala-meissa.jpg", description: "Zaawansowany technologicznie kubek termiczny. Ceramiczne wnętrze nie zmienia smaku kawy, a osłona zapobiega wylewaniu podczas jazdy samochodem.", 
        size: "355 ml", 
        warehouseStock: 8 
    }
];

const seedDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Połączono z bazą...');
    
    await sequelize.sync({ force: true, cascade: true });
    console.log("Baza danych została zresetowana i nadpisana nowym schematem!");
    
    const locations = await Location.bulkCreate([
        { name: "Magazyn Główny", type: "warehouse" }, 
        { name: "Kawiarnia Beera", type: "cafe" },     
        { name: "Kawiarnia Przemysłowa", type: "cafe" }, 
        { name: "Kawiarnia Kazimierz", type: "cafe" }  
    ]);
    console.log('Lokacje stworzone!');

    for (let pData of productsData) {
        // Wyciągamy i usuwamy sztuki magazynowe przed utworzeniem produktu
        const stockToTransfer = pData.warehouseStock;
        delete pData.warehouseStock;

        // Tworzenie produktu
        const product = await Product.create(pData);

        // Generowanie stanu dla Magazynu Głównego (ID: 1)
        await Inventory.create({
            productId: product.id,
            locationId: 1, 
            stockQuantity: stockToTransfer
        });

        // Opcjonalnie: Każda kawiarnia (ID: 2, 3, 4) dostaje na start po 3 sztuki, żebyś miał od razu co odbierać osobiscie!
        for (let i = 2; i <= 4; i++) {
            if (stockToTransfer > 0) { // Dajemy tylko, jeśli to nie jest wyprzedane
                await Inventory.create({
                    productId: product.id,
                    locationId: i, 
                    stockQuantity: 3
                });
            }
        }
    }
    console.log('Katalog Produktów i Stany Magazynowe wgrane pomyślnie!');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);
    
    await User.create({
        username: "emilys",
        email: "emily@somnium.com",
        firstName: "Emily",
        password: hashedPassword,
        role: "super_admin",
        LocationId: null, 
        image: "https://robohash.org/emilys"
    });

    await User.create({
        username: "barista_beera",
        email: "beera@somnium.com",
        firstName: "Jan Kowalski",
        password: hashedPassword,
        role: "admin", 
        LocationId: 2, // Używamy wielkiego "L", by relacja działała!
        image: "https://robohash.org/barista"
    });

    await User.create({
        username: "barista_przemyslowa",
        email: "przemyslowa@somnium.com",
        firstName: "Jan Kowalski",
        password: hashedPassword,
        role: "admin", 
        LocationId: 3,
        image: "https://robohash.org/barista"
    });

    await User.create({
        username: "barista_kazimierz",
        email: "kazimierz@somnium.com",
        firstName: "Jan Kowalski",
        password: hashedPassword,
        role: "admin", 
        LocationId: 4,
        image: "https://robohash.org/barista"
    });

    console.log('Konta pracownicze gotowe!');
    process.exit();
  } catch (err) {
    console.error("Błąd podczas seedowania:", err);
    process.exit(1);
  }
};

seedDB();