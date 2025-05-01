// Hangi viited HTML elementidele
const form = document.getElementById('productForm');
const responseMessage = document.getElementById('responseMessage');
const submitButton = document.getElementById('submitButton');
const imageUpload = document.getElementById('imageUpload');
const startCameraButton = document.getElementById('startCameraButton');
const captureButton = document.getElementById('captureButton');
const clearImageButton = document.getElementById('clearImageButton');
const videoFeed = document.getElementById('videoFeed');
const captureCanvas = document.getElementById('captureCanvas');
const imagePreview = document.getElementById('imagePreview');

// --- TÄHTIS ---
// ASENDA SEE OMA GOOGLE APPS SCRIPT WEB APP URL-IGA!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzxSiFHySk3FM_v-AbO1piDrPIeNyIb-CSdlannU5fRWoKSQIZHDfPyg2zD820jS-k/exec'; // KASUTA SAMA URL-I, MIS ENNE

// ---------------

let currentStream = null; // Hoiab aktiivset kaameravoogu
let imageDataUrl = null; // Hoiab pildi andmeid Base64 formaadis

// --- Funktsioonid ---

// Näita eelvaadet ja salvesta Base64
function displayAndStoreImage(dataUrl) {
    imageDataUrl = dataUrl; // Salvesta Base64 string
    imagePreview.src = dataUrl;
    imagePreview.classList.remove('hidden');
    clearImageButton.classList.remove('hidden');
    stopCameraStream();
    videoFeed.classList.add('hidden');
    captureButton.classList.add('hidden');
    startCameraButton.textContent = 'Kasuta kaamerat';
}

// Peata kaameravoog
function stopCameraStream() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
        videoFeed.srcObject = null;
    }
}

// Tühjenda pildi valik
function clearImage() {
    imageDataUrl = null;
    imagePreview.src = '#';
    imagePreview.classList.add('hidden');
    imageUpload.value = '';
    clearImageButton.classList.add('hidden');
    stopCameraStream();
    videoFeed.classList.add('hidden');
    captureButton.classList.add('hidden');
    startCameraButton.disabled = false;
    startCameraButton.textContent = 'Kasuta kaamerat';
}

// --- Sündmuste kuulajad ---

// Faili üleslaadimise kuulaja
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            stopCameraStream();
            displayAndStoreImage(e.target.result);
        }
        reader.readAsDataURL(file);
    } else {
        if (!imageDataUrl && !currentStream) {
            clearImage();
        }
    }
});

// Kaamera käivitamise nupp
startCameraButton.addEventListener('click', async () => {
    if (currentStream) {
        stopCameraStream();
        videoFeed.classList.add('hidden');
        captureButton.classList.add('hidden');
        startCameraButton.textContent = 'Kasuta kaamerat';
    } else {
        clearImage();
        startCameraButton.disabled = true;
        startCameraButton.textContent = 'Käivitan...';
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoFeed.srcObject = currentStream;
            videoFeed.classList.remove('hidden');
            captureButton.classList.remove('hidden');
            startCameraButton.textContent = 'Peata kaamera';
        } catch (err) {
            console.error("Kaamera viga:", err);
            responseMessage.textContent = `Viga kaamera käivitamisel: ${err.name}`;
            responseMessage.className = 'mt-6 text-center text-sm font-medium text-red-600';
            videoFeed.classList.add('hidden');
            captureButton.classList.add('hidden');
            startCameraButton.textContent = 'Kasuta kaamerat';
        } finally {
             startCameraButton.disabled = false;
        }
    }
});

// Pildistamise nupp
captureButton.addEventListener('click', () => {
    if (currentStream) {
        captureCanvas.width = videoFeed.videoWidth;
        captureCanvas.height = videoFeed.videoHeight;
        const context = captureCanvas.getContext('2d');
        context.drawImage(videoFeed, 0, 0, captureCanvas.width, captureCanvas.height);
        // Kasutame JPEG formaati, et vähendada andmemahtu võrreldes PNG-ga
        const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9); // Kvaliteet 0.9
        displayAndStoreImage(dataUrl);
    }
});

// Pildi eemaldamise nupp
clearImageButton.addEventListener('click', clearImage);

// Vormi saatmise kuulaja
form.addEventListener('submit', (e) => {
    e.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = 'Salvestan...';
    responseMessage.textContent = '';
    responseMessage.className = 'mt-6 text-center text-sm font-medium';

    // Kogu andmed vormi väljadelt
    const formData = new FormData(form);
    const data = {
        productGroup: formData.get('productGroup'),
        product: formData.get('product'),
        imageData: imageDataUrl // Base64 string (või null)
    };

    // Saada andmed Google Apps Scriptile
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        // Lisame 'muteHttpExceptions': true, et saada Apps Scripti veateade JSONina
        // See on tegelikult Apps Scripti UrlFetchApp'i parameeter, mitte fetch() oma,
        // aga kuna Apps Script käsitleb päringut, võib see aidata.
        // Tegelikult peaks Apps Script ise vead püüdma ja JSON vastuse tagastama.
        // Jätame selle välja, kuna Apps Scripti veapüüdja peaks toimima.
    })
    .then(response => {
        // fetch API ei pea response.ok === false veaks juhul kui server tagastab nt 4xx/5xx vea
        // aga koos kehtiva JSON vastusega. Kontrollime staatust ja proovime JSONi lugeda.
         if (!response.ok) {
             // Proovi ikkagi lugeda JSON vastust, äkki Apps Script saatis vea detailid
             return response.json().then(errData => {
                 // Viska viga koos serveri poolt saadetud sõnumiga
                 throw new Error(errData.message || `Serveri viga: ${response.statusText} (Staatuse kood: ${response.status})`);
             }).catch(jsonError => {
                 // Kui JSONi lugemine ebaõnnestus, viska üldine võrguviga
                 throw new Error(`Võrgu viga: ${response.statusText} (Staatuse kood: ${response.status})`);
             });
         }
        return response.json(); // Parsi edukas vastus JSON-ina
    })
    .then(result => {
        console.log('Apps Script vastus:', result);
        if (result.result === 'success') {
            // Kuvame Apps Scripti tagastatud sõnumi, mis võib sisaldada linki
            responseMessage.textContent = result.message || 'Andmed edukalt salvestatud!';
            responseMessage.className = 'mt-6 text-center text-sm font-medium text-green-600'; // Edukas stiil

            // Kui link tagastati, tee see klikitavaks (valikuline täiendus)
            if (result.imageUrl && !result.imageUrl.startsWith("Viga")) {
                responseMessage.innerHTML += ` <a href="${result.imageUrl}" target="_blank" class="underline text-indigo-600 hover:text-indigo-800">(Vaata pilti)</a>`;
            }

            form.reset(); // Tühjenda tekstiväljad
            clearImage(); // Tühjenda ka pildi eelvaade ja andmed
        } else {
            // Kui Apps Script tagastas result: 'error'
            throw new Error(result.message || 'Salvestamisel tekkis tundmatu viga Apps Scriptis.');
        }
    })
    .catch(error => {
        console.error('Viga saatmisel või vastuse töötlemisel:', error);
        // Näita kasutajale veateadet
        responseMessage.textContent = `Viga: ${error.message}`;
        responseMessage.className = 'mt-6 text-center text-sm font-medium text-red-600'; // Vea stiil
    })
    .finally(() => {
        // Taasta nupp
        submitButton.disabled = false;
        submitButton.textContent = 'Salvesta Google Sheeti';
    });
});

// Korista kaameravoog ära, kui lehelt lahkutakse
window.addEventListener('beforeunload', stopCameraStream);

