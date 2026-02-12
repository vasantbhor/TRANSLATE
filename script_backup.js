let translatedData = [];

// File input handler
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('downloadBtn').addEventListener('click', downloadExcel);

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Display file name
    document.getElementById('fileName').textContent = `Selected: ${file.name}`;

    // Read Excel file
    const reader = new FileReader();
    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Process the data
        await processNames(jsonData);
    };
    reader.readAsArrayBuffer(file);
}

async function processNames(data) {
    // Show progress section
    document.getElementById('progressSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');

    translatedData = [];
    const records = [];

    // Extract data from Excel (skip header if exists)
    let startRow = 0;

    // Check if first row looks like a header
    if (data.length > 0 && data[0].length >= 2) {
        const firstCell = data[0][0]?.toString().toLowerCase() || '';
        const secondCell = data[0][1]?.toString().toLowerCase() || '';

        if (firstCell.includes('no') || firstCell.includes('sr') ||
            secondCell.includes('name') || secondCell.includes('नाव')) {
            startRow = 1;
        }
    }

    // Extract serial number and names from both columns
    for (let i = startRow; i < data.length; i++) {
        if (data[i] && data[i].length >= 2) {
            const serialNo = data[i][0]?.toString().trim() || '';
            const name = data[i][1]?.toString().trim() || '';

            if (serialNo && name) {
                records.push({
                    serialNo: serialNo,
                    name: name
                });
            }
        }
    }

    if (records.length === 0) {
        alert('No data found in the Excel file! Please ensure you have Serial No in column 1 and Names in column 2.');
        document.getElementById('progressSection').classList.add('hidden');
        return;
    }

    // Translate names
    const total = records.length;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const englishName = transliterateMarathiToEnglish(record.name);

        translatedData.push({
            srNo: record.serialNo,
            marathi: record.name,
            english: englishName
        });

        // Update progress
        const progress = ((i + 1) / total) * 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = `${i + 1} / ${total} names translated`;

        // Small delay to show progress
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    // Display results
    displayResults();
}

function transliterateMarathiToEnglish(marathiText) {
    // Comprehensive Marathi Devanagari to Roman transliteration

    // Consonants with inherent 'a' sound
    const consonants = {
        'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
        'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
        'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
        'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
        'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
        'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
        'ष': 'sha', 'स': 'sa', 'ह': 'ha', 'ळ': 'la'
    };

    // Standalone vowels
    const vowels = {
        'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u',
        'ऋ': 'ru', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
    };

    // Vowel signs (matras) - modify the preceding consonant
    const matras = {
        'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
        'ृ': 'ru', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au'
    };

    // Special marks
    const specialMarks = {
        '्': '', // Halant - removes inherent 'a'
        'ं': 'n', // Anusvara
        'ः': 'h', // Visarga
        'ँ': 'n'  // Chandrabindu
    };

    // Multi-character combinations
    const combos = {
        'क्ष': 'ksha',
        'ज्ञ': 'gnya',
        'त्र': 'tra',
        'श्र': 'shra'
    };

    let result = '';
    let i = 0;

    while (i < marathiText.length) {
        // Check for multi-character combinations first
        let found = false;
        for (let len = 3; len >= 2; len--) {
            const substr = marathiText.substr(i, len);
            if (combos[substr]) {
                result += combos[substr];
                i += len;
                found = true;
                break;
            }
        }
        if (found) continue;

        const char = marathiText[i];
        const nextChar = marathiText[i + 1];

        // Check if current character is a consonant
        if (consonants[char]) {
            let consonantSound = consonants[char];

            // Check for halant (्) - removes the inherent 'a'
            if (nextChar === '्') {
                consonantSound = consonantSound.slice(0, -1); // Remove the 'a'
                result += consonantSound;
                i += 2; // Skip both consonant and halant
                continue;
            }

            // Check for matra (vowel sign)
            if (matras[nextChar]) {
                consonantSound = consonantSound.slice(0, -1) + matras[nextChar];
                result += consonantSound;
                i += 2; // Skip both consonant and matra
                continue;
            }

            // Check for anusvara or other special marks
            if (specialMarks[nextChar]) {
                result += consonantSound + specialMarks[nextChar];
                i += 2;
                continue;
            }

            // Just the consonant with inherent 'a'
            result += consonantSound;
            i++;
            continue;
        }

        // Check if it's a standalone vowel
        if (vowels[char]) {
            result += vowels[char];
            i++;
            continue;
        }

        // Check if it's a special mark (shouldn't happen alone, but handle it)
        if (specialMarks[char]) {
            result += specialMarks[char];
            i++;
            continue;
        }

        // Keep non-Devanagari characters as-is (spaces, numbers, punctuation, etc.)
        result += char;
        i++;
    }

    // Post-processing: clean up and capitalize
    // Split into words for processing

    // Process each word: remove trailing 'a' and capitalize
    return result.split(' ').map(word => {
        if (word.length === 0) return word;

        // Remove trailing 'a' to prevent "Mahesha" -> should be "Mahesh"
        if (word.length > 2 && word.endsWith('a')) {
            word = word.slice(0, -1);
        }

        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

function displayResults() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    translatedData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.srNo}</td>
            <td>${item.marathi}</td>
            <td>${item.english}</td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('resultsSection').classList.remove('hidden');

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function downloadExcel() {
    if (translatedData.length === 0) {
        alert('No data to download!');
        return;
    }

    // Prepare data for Excel
    const excelData = [
        ['Sr. No.', 'Marathi Name', 'English Translation']
    ];

    translatedData.forEach(item => {
        excelData.push([item.srNo, item.marathi, item.english]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
        { wch: 10 },  // Sr. No.
        { wch: 30 },  // Marathi Name
        { wch: 30 }   // English Translation
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Translations');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Marathi_English_Translation_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
}
