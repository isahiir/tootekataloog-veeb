const form = document.getElementById('productForm');
const responseMessage = document.getElementById('responseMessage');

// !!! ASENDA SEE OMA GOOGLE APPS SCRIPT WEB APP URL-IGA !!!
const SCRIPT_URL = 'SIia_Kleepida_Oma_Apps_Script_Web_App_URL';

form.addEventListener('submit', (e) => {
    e.preventDefault(); // Peata vormi tavapärane saatmine (lehe uuesti laadimine)

    responseMessage.textContent = 'Salvestan...'; // Näita oote teadet
    responseMessage.className = ''; // Eemalda eelnevad stiiliklassid

    // Kogu andmed vormilt
    const formData = new FormData(form);
    const data = {
        productGroup: formData.get('productGroup'),
        product: formData.get('product')
    };

    // Saada andmed Google Apps Scriptile
    fetch(SCRIPT_URL, {
        method: 'POST',
        // Google Apps Script ootab vaikimisi 'text/plain', aga me seadistasime selle JSON jaoks.
        // Saatmine 'application/json' päisega võib nõuda Apps Scriptis OPTIONS päringu käsitlemist (CORS).
        // Kõige lihtsam viis on saata stringina ja parsida Apps Scriptis.
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', // Apps Script töötleb seda kui postData.contents
        },
        // mode: 'no-cors' // Võid proovida seda, kui CORSiga tekib probleeme, aga siis ei saa vastust lugeda
    })
    .then(response => response.json()) // Oota vastust ja parsi see JSONina
    .then(result => {
        console.log('Success:', result);
        if (result.result === 'success') {
            responseMessage.textContent = 'Andmed edukalt salvestatud!';
            responseMessage.className = 'success';
            form.reset(); // Tühjenda vorm väljad
        } else {
            throw new Error(result.message || 'Salvestamisel tekkis tundmatu viga.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        responseMessage.textContent = `Viga: ${error.message}`;
        responseMessage.className = 'error';
    });
});
