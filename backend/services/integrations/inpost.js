// Mock Service: InPost Integrations

/**
 * Generuje i rejestruje nową przesyłkę w systemie InPost
 * @param {Object} orderData - Dane zamówienia (musi zawierać dane klienta i wagę/wymiary)
 * @param {string} targetPoint - (Opcjonalnie) Kod docelowego paczkomatu (np. KRA01A)
 * @returns {Object} Numer przesyłki oraz link do pobrania etykiety
 */
const createShipment = async (orderData, targetPoint = null) => {
    console.log(`[INPOST MOCK] Rejestracja paczki dla zamówienia: ${orderData.id || 'Brak ID'}, Docelowy punkt: ${targetPoint || 'Kurier'}`);
    
    // Generowanie fałszywego numeru przewozowego InPost (zaczynają się zwykle od 6...)
    const fakeTracking = `6${Math.floor(Math.random() * 1000000000000000000).toString().substring(0, 23)}`;
    const fakeLabelUrl = `https://sandbox-manager.inpost.pl/mock/label/${fakeTracking}.pdf`;

    return {
        success: true,
        trackingNumber: fakeTracking,
        labelUrl: fakeLabelUrl,
        message: 'Mock shipment created successfully'
    };
};

/**
 * Pobiera bieżący status przesyłki od InPost
 * @param {string} trackingNumber - Numer przewozowy
 * @returns {Object} Status przesyłki
 */
const trackShipment = async (trackingNumber) => {
    console.log(`[INPOST MOCK] Pobieranie statusu dla przesyłki: ${trackingNumber}`);
    
    // Tablica przykładowych statusów
    const statuses = ['gotowa_do_nadania', 'odebrana_od_klienta', 'w_trakcie_doręczenia', 'wydana_do_doręczenia', 'doręczona'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
        success: true,
        trackingNumber: trackingNumber,
        status: randomStatus,
        lastUpdated: new Date().toISOString()
    };
};

module.exports = {
    createShipment,
    trackShipment
};
