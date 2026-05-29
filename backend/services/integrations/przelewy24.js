// Mock Service: Przelewy24 / BLIK Integrations

/**
 * Inicjalizuje nową transakcję P24
 * @param {Object} orderData - Dane zamówienia
 * @param {string} method - Metoda płatności ('blik' | 'p24')
 * @returns {Object} Zwraca unikalny identyfikator płatności i link URL
 */
const createPayment = async (orderData, method = 'p24') => {
    console.log(`[P24 MOCK] Inicjalizacja płatności dla zamówienia: ${orderData.id || 'Brak ID'}, metoda: ${method}, kwota: ${orderData.total} PLN`);
    
    // W środowisku produkcyjnym tutaj uderzymy do API P24 z kluczami dostępu
    const fakeTransactionId = `tr_fake_${Math.random().toString(36).substring(2, 10)}`;
    const fakeUrl = `https://sandbox.przelewy24.pl/mock/transaction/${fakeTransactionId}`;

    return {
        success: true,
        transactionId: fakeTransactionId,
        paymentUrl: fakeUrl,
        message: 'Mock payment created successfully'
    };
};

/**
 * Weryfikuje i potwierdza transakcję (Zazwyczaj uderzane z Webhooka z P24)
 * @param {string} sessionId - ID transakcji
 * @param {string} sign - Znak kryptograficzny otrzymany od P24
 */
const verifyPayment = async (sessionId, sign) => {
    console.log(`[P24 MOCK] Weryfikacja płatności o sessionId: ${sessionId}`);
    
    // W produkcji wysyłamy żądanie do P24 potwierdzające odbiór powiadomienia
    return {
        success: true,
        verified: true,
        message: 'Mock payment verified successfully'
    };
};

module.exports = {
    createPayment,
    verifyPayment
};
