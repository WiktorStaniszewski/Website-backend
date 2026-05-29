// Mock Service: Dotykacka POS Integrations

/**
 * Przesyła informację do Dotykacki o zmniejszeniu stanu magazynowego po dokonaniu zamówienia
 * @param {Array} items - Produkty z koszyka
 * @param {string|number} locationId - ID punktu sprzedażowego zmapowane z naszym
 * @returns {Object} Informacja zwrotna o powodzeniu
 */
const syncStock = async (items, locationId) => {
    console.log(`[DOTYKACKA MOCK] Synchonizacja odjętych stanów dla lokacji: ${locationId || 'Brak'}`);
    
    // items.forEach(item => { ... })
    // W środowisku produkcyjnym tu znajdzie się wywołanie PUT /products/{id}/stock

    return {
        success: true,
        message: `Pomyślnie zsynchronizowano ${items.length} pozycji z Dotykacką.`
    };
};

/**
 * Funkcja przyszłościowa, zaciągająca bazę produktów z kasy do sklepu internetowego
 */
const importProducts = async () => {
    console.log(`[DOTYKACKA MOCK] Importowanie asortymentu...`);
    
    // W produkcji pobranie GET /products
    return {
        success: true,
        importedCount: 0,
        message: 'Mock - brak produktów do importu.'
    };
};

module.exports = {
    syncStock,
    importProducts
};
