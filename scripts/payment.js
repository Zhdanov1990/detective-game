function setupDonateButton() {
    document.getElementById('donate-btn').addEventListener('click', () => {
        if (window.Telegram.WebApp.openInvoice) {
            const invoice = {
                title: "Поддержать автора",
                description: "Ваша поддержка поможет создавать новые детективные истории",
                currency: "USD",
                prices: [
                    { label: "50 звезд", amount: "5000" },
                    { label: "100 звезд", amount: "10000" }
                ]
            };
            
            window.Telegram.WebApp.openInvoice(invoice, (status) => {
                if (status === 'paid') {
                    alert('Спасибо за вашу поддержку!');
                }
            });
        } else {
            alert('Пожалуйста, откройте мини-приложение через Telegram');
        }
    });
}

async function unlockCase(caseId, price) {
    if (window.Telegram.WebApp.openInvoice) {
        const invoice = {
            title: `Разблокировка сюжета "${caseId}"`,
            description: `Доступ к платному сюжету за ${price} звезд`,
            currency: "USD",
            prices: [{ label: `${price} звезд`, amount: (price * 100).toString() }]
        };
        
        window.Telegram.WebApp.openInvoice(invoice, async (status) => {
            if (status === 'paid') {
                playerData.unlockedCases.push(caseId);
                await loadCases();
            }
        });
    } else {
        alert('Пожалуйста, откройте мини-приложение через Telegram');
    }
}