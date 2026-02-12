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
    if (!marathiText) return '';

    // Consonants WITHOUT inherent 'a'
    const consonantBase = {
        'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
        'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l'
    };

    const vowels = {
        'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u',
        'ऋ': 'ru', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
    };

    const matras = {
        'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
        'ृ': 'ru', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
        'ॅ': 'e', 'ॉ': 'o'
    };

    const halant = '्';
    const anusvara = 'ं';

    const combos = {
        'क्ष': 'ksh',
        'ज्ञ': 'dny',
        'त्र': 'tr',
        'श्र': 'shr',
        'द्य': 'dhya', // Custom mapping for user's preference Vidy -> Vidhya
        'ऱ्ह': 'rh'
    };

    let result = '';
    let i = 0;

    while (i < marathiText.length) {
        // Multi-char combinations
        let foundCombo = false;
        for (let len = 3; len >= 2; len--) {
            const substr = marathiText.substr(i, len);
            if (combos[substr]) {
                result += combos[substr];
                i += len;
                foundCombo = true;
                break;
            }
        }
        if (foundCombo) continue;

        const char = marathiText[i];
        const nextChar = marathiText[i + 1];

        // 1. Consonants
        if (consonantBase[char]) {
            let sound = consonantBase[char];

            // Special case for 'य' (ya) after 'ा' (aa) -> often spelled 'i' in names like Gaikwad
            if (char === 'य' && result.endsWith('a')) {
                // Peek ahead or look back? If it's गायकवाड...
                // Only do this for specific name patterns if possible, 
                // but let's try a heuristic: if result ends in 'a' and we have 'ya'
                // Actually let's just use 'y' and handle 'ai' in post-processing if needed.
            }

            // Check if followed by halant, matra, or anusvara
            if (nextChar === halant) {
                result += sound;
                i += 2;
            } else if (matras[nextChar]) {
                result += sound + matras[nextChar];
                i += 2;
                // Check if the NEW next character is anusvara (e.g. कों)
                if (marathiText[i] === anusvara) {
                    result += 'n';
                    i++;
                }
            } else if (nextChar === anusvara) {
                result += sound + 'an';
                i += 2;
            } else {
                result += sound + 'a';
                i++;
            }
        }
        // 2. Standalone Vowels
        else if (vowels[char]) {
            result += vowels[char];
            i++;
            if (marathiText[i] === anusvara) {
                result += 'n';
                i++;
            }
        }
        // 3. Matras (as standalone, e.g. after a combo or cluster)
        else if (matras[char]) {
            result += matras[char];
            i++;
            if (marathiText[i] === anusvara) {
                result += 'n';
                i++;
            }
        }
        // 4. Standalone Anusvara (should have been handled by consolidation but just in case)
        else if (char === anusvara) {
            result += 'n';
            i++;
        }
        // 4. Everything else
        else {
            if (char !== halant) { // Skip standalone halants
                result += char;
            }
            i++;
        }
    }

    // Post-processing
    const marathiWords = marathiText.split(/\s+/);
    let wordIdx = 0;

    return result.split(' ').map(word => {
        if (!word) return '';
        const currentMarathi = marathiWords[wordIdx] || '';
        wordIdx++;

        // Specific corrections (Case-insensitive)
        word = word.replace(/gayakavad/gi, 'Gaikawad');
        word = word.replace(/gayakvad/gi, 'Gaikawad');
        word = word.replace(/gayak/gi, 'Gaik');

        // Specific name pattern corrections
        word = word.replace(/panamand/gi, 'Panmand');
        word = word.replace(/ganapat/gi, 'Ganpat');
        word = word.replace(/dashratha/gi, 'Dasharath');
        word = word.replace(/dashrath/gi, 'Dasharath');
        word = word.replace(/dasharatha/gi, 'Dasharath');
        word = word.replace(/dattatry/gi, 'Dattatray');
        word = word.replace(/dattatraya/gi, 'Dattatray');
        word = word.replace(/tray/gi, 'Tray');
        word = word.replace(/vagh/gi, 'Wagh');

        word = word.replace(/svati/gi, 'Swati');

        // Latest batch of name corrections
        word = word.replace(/patav$/gi, 'Patava');
        word = word.replace(/phakir$/gi, 'Phakira');
        word = word.replace(/mukt$/gi, 'Mukta');
        word = word.replace(/shakuntal$/gi, 'Shakuntala');
        word = word.replace(/sangit$/gi, 'Sangita');
        word = word.replace(/kushab$/gi, 'Kushaba');
        word = word.replace(/savit$/gi, 'Savita');
        word = word.replace(/sujat$/gi, 'Sujata');
        word = word.replace(/mir$/gi, 'Mira');
        word = word.replace(/amin$/gi, 'Amina');
        word = word.replace(/nirmal$/gi, 'Nirmala');
        word = word.replace(/nand$/gi, 'Nanda');
        word = word.replace(/anit$/gi, 'Anita');
        word = word.replace(/ush$/gi, 'Usha');
        word = word.replace(/pushp$/gi, 'Pushpa');
        word = word.replace(/ujval$/gi, 'Ujvala');
        word = word.replace(/manjul$/gi, 'Manjula');
        word = word.replace(/saibab$/gi, 'Saibaba');
        word = word.replace(/vithob$/gi, 'Vithoba');
        word = word.replace(/shant$/gi, 'Shanta');
        // Specific name: Dnyaneshwar (mapping v -> w correctly for this name)
        word = word.replace(/dnyaneshvar/gi, 'Dnyaneshwar');

        // Specific correction: vad -> wad (for names ending in wadi/wad)
        if (word.toLowerCase().endsWith('vad')) word = word.slice(0, -3) + 'wad';
        if (word.toLowerCase().endsWith('vada')) word = word.slice(0, -4) + 'wada';

        // Smart trailing 'a' management
        if (word.endsWith('a') || word.endsWith('A')) {
            const base = word.slice(0, -1);
            const lowerBase = base.toLowerCase();

            // Patterns where we RECOMMEND keeping the 'a'
            const keepPatterns = ['dr', 'tr', 'shr', 'dn', 'dh', 'bh', 'ch', 'ndr', 'im'];

            // Special Case: 'nath' usually drops the 'a' in longer names like Raghunath
            // but short names like Natha should keep it.
            if (lowerBase.endsWith('nath') && word.length > 5) {
                word = base;
            } else {
                let shouldKeep = false;

                // Check if it's a short common name like Rama, Bhima, Natha
                if (word.length <= 5 && (lowerBase.endsWith('m') || lowerBase.endsWith('th') || lowerBase.endsWith('v') || lowerBase.endsWith('k'))) {
                    // "Bhor" (भोर) should drop it.
                    if (lowerBase.endsWith('r')) shouldKeep = false;
                    else shouldKeep = true;
                }

                for (let p of keepPatterns) {
                    if (lowerBase.endsWith(p.toLowerCase())) {
                        shouldKeep = true;
                        break;
                    }
                }

                // Manual overrides for user examples
                if (lowerBase === 'bhor') shouldKeep = false;
                if (lowerBase === 'alak') shouldKeep = true;
                if (lowerBase === 'nath') shouldKeep = true;
                if (lowerBase === 'chandrabhag') shouldKeep = true;
                if (lowerBase === 'suvarn') shouldKeep = true;
                if (lowerBase === 'shil') shouldKeep = true;
                if (lowerBase === 'shila') shouldKeep = true;
                if (lowerBase === 'kalpan') shouldKeep = true;
                if (lowerBase === 'urmil') shouldKeep = true;
                if (lowerBase === 'surekh') shouldKeep = true;
                if (lowerBase === 'svati') shouldKeep = true;
                if (lowerBase === 'ananth') shouldKeep = true;
                if (lowerBase === 'dharm') shouldKeep = true;
                if (lowerBase === 'sulochan') shouldKeep = true;
                if (lowerBase === 'shail') shouldKeep = true;
                if (lowerBase === 'shakuntal') shouldKeep = true;
                if (lowerBase === 'sangit') shouldKeep = true;
                if (lowerBase === 'savit') shouldKeep = true;
                if (lowerBase === 'sujat') shouldKeep = true;
                if (lowerBase === 'nirmal') shouldKeep = true;
                if (lowerBase === 'nand') shouldKeep = true;
                if (lowerBase === 'anit') shouldKeep = true;
                if (lowerBase === 'ush') shouldKeep = true;
                if (lowerBase === 'pushp') shouldKeep = true;
                if (lowerBase === 'ujval') shouldKeep = true;
                if (lowerBase === 'manjul') shouldKeep = true;
                if (lowerBase === 'saibab') shouldKeep = true;
                if (lowerBase === 'vithob') shouldKeep = true;
                if (lowerBase === 'shant') shouldKeep = true;
                if (lowerBase === 'patav') shouldKeep = true;
                if (lowerBase === 'phakir') shouldKeep = true;
                if (lowerBase === 'mukt') shouldKeep = true;
                if (lowerBase === 'mir') shouldKeep = true;
                if (lowerBase === 'amin') shouldKeep = true;
                if (lowerBase === 'manish') shouldKeep = true;
                if (lowerBase === 'chhay') shouldKeep = true;
                if (lowerBase === 'krushn') shouldKeep = true;
                if (lowerBase === 'sunit') shouldKeep = true;
                if (lowerBase === 'sarik') shouldKeep = true;
                if (lowerBase === 'ranjan') shouldKeep = true;
                if (lowerBase === 'lat') shouldKeep = true;
                if (lowerBase === 'min') shouldKeep = true;
                if (lowerBase === 'pramil') shouldKeep = true;
                if (lowerBase === 'sunand') shouldKeep = true;
                if (lowerBase === 'supriy') shouldKeep = true;
                if (lowerBase === 'varsh') shouldKeep = true;
                if (lowerBase === 'vandan') shouldKeep = true;
                if (lowerBase === 'arun') shouldKeep = true;
                if (lowerBase === 'rekh') shouldKeep = true;
                if (lowerBase === 'hamid') shouldKeep = true;
                if (lowerBase === 'asmit') shouldKeep = true;
                if (lowerBase === 'kavit') shouldKeep = true;
                if (lowerBase === 'archan') shouldKeep = true;
                if (lowerBase === 'anushk') shouldKeep = true;
                if (lowerBase === 'jay') shouldKeep = true;
                if (lowerBase === 'vishakh') shouldKeep = true;
                if (lowerBase === 'bal') shouldKeep = true;
                if (lowerBase === 'mand') shouldKeep = true;
                if (lowerBase === 'ash') shouldKeep = true;
                if (lowerBase === 'sadhan') shouldKeep = true;
                if (lowerBase === 'nan') shouldKeep = true;
                if (lowerBase === 'babit') shouldKeep = true;
                if (lowerBase === 'sneh') shouldKeep = true;
                if (lowerBase === 'yogit') shouldKeep = true;
                if (lowerBase === 'ann') shouldKeep = true;
                if (lowerBase === 'annad') shouldKeep = true;
                if (lowerBase === 'vidhy') shouldKeep = true;
                if (lowerBase === 'shilp') shouldKeep = true;
                if (lowerBase === 'sandhy') shouldKeep = true;
                if (lowerBase === 'pratiksh') shouldKeep = true;
                if (lowerBase === 'akshd') shouldKeep = true;
                if (lowerBase === 'ankit') shouldKeep = true;
                if (lowerBase === 'ratn') shouldKeep = true;
                if (lowerBase === 'ashlesh') shouldKeep = true;
                if (lowerBase === 'git') shouldKeep = true;
                if (lowerBase === 'may') shouldKeep = true;
                if (lowerBase === 'app') shouldKeep = true;
                if (lowerBase === 'monik') shouldKeep = true;
                if (lowerBase === 'reshm') shouldKeep = true;
                if (lowerBase === 'namrat') shouldKeep = true;
                if (lowerBase === 'divy') shouldKeep = true;
                if (lowerBase === 'prajakt') shouldKeep = true;
                if (lowerBase === 'samiksh') shouldKeep = true;
                if (lowerBase === 'vanit') shouldKeep = true;
                if (lowerBase === 'kondib') shouldKeep = true;
                if (lowerBase === 'pradny') shouldKeep = true;
                if (lowerBase === 'adity') shouldKeep = true;
                if (lowerBase === 'puj') shouldKeep = true;
                if (lowerBase === 'nit') shouldKeep = true;
                if (lowerBase === 'smit') shouldKeep = true;
                if (lowerBase === 'renuk') shouldKeep = true;
                if (lowerBase === 'mithil') shouldKeep = true;
                if (lowerBase === 'svayansahayyat') shouldKeep = true;
                if (lowerBase === 'jeshth') shouldKeep = true;
                if (lowerBase === 'shvet') shouldKeep = true;
                if (lowerBase === 'chaitany') shouldKeep = true;
                if (lowerBase === 'mahil') shouldKeep = true;
                if (lowerBase === 'lil') shouldKeep = true;
                if (lowerBase === 'hir') shouldKeep = true;
                if (lowerBase === 'ajinky') shouldKeep = true;
                if (lowerBase === 'sonab') shouldKeep = true;
                if (lowerBase === 'sahayyat') shouldKeep = true;
                if (lowerBase === 'jijab') shouldKeep = true;
                if (lowerBase === 'ary') shouldKeep = true;
                if (lowerBase === 'datt') shouldKeep = true;
                if (lowerBase === 'shobhan') shouldKeep = true;
                if (lowerBase === 'mitr') shouldKeep = true;
                if (lowerBase === 'nish') shouldKeep = true;
                if (lowerBase === 'jab') shouldKeep = true;
                if (lowerBase === 'vaj') shouldKeep = true;
                if (lowerBase === 'sukany') shouldKeep = true;
                if (lowerBase === 'taty') shouldKeep = true;
                if (lowerBase === 'eshvary') shouldKeep = true;
                if (lowerBase === 'priyank') shouldKeep = true;
                if (lowerBase === 'lalit') shouldKeep = true;
                if (lowerBase === 'alish') shouldKeep = true;
                if (lowerBase === 'kund') shouldKeep = true;
                if (lowerBase === 'apeksh') shouldKeep = true;
                if (lowerBase === 'rachan') shouldKeep = true;
                if (lowerBase === 'neh') shouldKeep = true;
                if (lowerBase === 'saniy') shouldKeep = true;
                if (lowerBase === 'kashib') shouldKeep = true;
                if (lowerBase === 'sushil') shouldKeep = true;

                // NEW: Automatic check for Marathi 'aa' matra (ा)
                if (currentMarathi.endsWith('ा') || currentMarathi.endsWith('ां') ||
                    currentMarathi.endsWith('्या') || currentMarathi.endsWith('वा')) {
                    shouldKeep = true;
                }

                if (!shouldKeep && word.length > 3) {
                    word = base;
                }
            }
        }

        // Apply cluster and specific name corrections after trailing 'a' logic
        word = word.replace(/shilap$/gi, 'Shilpa');
        word = word.replace(/josn$/gi, 'Josna');
        word = word.replace(/viday$/gi, 'Vidhya');
        word = word.replace(/jayahind$/gi, 'Jayhind');
        word = word.replace(/susham$/gi, 'Sushama');
        word = word.replace(/shama$/gi, 'Sham');
        word = word.replace(/sandhy$/gi, 'Sandhya');
        word = word.replace(/annad$/gi, 'Annada');
        word = word.replace(/datatry$/gi, 'Dattatray');
        word = word.replace(/mitr$/gi, 'Mitra');

        // N to M corrections
        word = word.replace(/tanbe$/gi, 'Tambe');
        word = word.replace(/banbale$/gi, 'Bambale');
        word = word.replace(/anbik$/gi, 'Ambik');

        // General specific corrections
        word = word.replace(/borakar$/gi, 'Borkar');
        word = word.replace(/pokharakar$/gi, 'Pokharkar');
        word = word.replace(/mhsku$/gi, 'Mhasku');
        word = word.replace(/pavar$/gi, 'Pawar');
        word = word.replace(/injiniaring/gi, 'Engineering');
        word = word.replace(/haotel/gi, 'hotel');
        word = word.replace(/raoy$/gi, 'roy');
        word = word.replace(/ray$/gi, 'roy');

        // Manual Preference Overrides
        word = word.replace(/^aruna$/gi, 'Arun');
        word = word.replace(/^rama$/gi, 'Ram');
        word = word.replace(/^manisha$/gi, 'Manish');
        word = word.replace(/sushma$/gi, 'Sushama');
        word = word.replace(/sadab$/gi, 'Sadaba');
        word = word.replace(/akshda?$/gi, 'Akshada');
        word = word.replace(/akshy$/gi, 'Akshay');

        // Final Capitalization
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
