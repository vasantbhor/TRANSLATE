
// Mocking Dom elements that might be accessed by other parts of the script if imported, 
// though we only want the function.
const fs = require('fs');
const content = fs.readFileSync('c:/Users/vasan/OneDrive/Desktop/my site/project 7/script.js', 'utf8');

// Extract the function from the script
const startMarker = 'function transliterateMarathiToEnglish(marathiText)';
const startIndex = content.indexOf(startMarker);
const functionBody = content.substring(startIndex);

// Eval the function so we can use it in this script
eval(functionBody);

const tests = [
    { marathi: 'गायकवाड', expected: 'Gaikawad' },
    { marathi: 'भोर', expected: 'Bhor' },
    { marathi: 'पानमंड', expected: 'Panmand' },
    { marathi: 'महेश', expected: 'Mahesh' },
    { marathi: 'पांडुरंग', expected: 'Pandurang' },
    { marathi: 'भीम', expected: 'Bhima' },
    { marathi: 'नाथा', expected: 'Natha' },
    { marathi: 'किसन', expected: 'Kisan' },
    { marathi: 'गणपत', expected: 'Ganpat' },
    { marathi: 'रामचंद्र', expected: 'Ramchandra' },
    { marathi: 'विद्या', expected: 'Vidhya' }
];

console.log('Running Transliteration Tests:');
console.log('-------------------------------');

let passed = 0;
tests.forEach(test => {
    const actual = transliterateMarathiToEnglish(test.marathi);
    const isMatch = actual.toLowerCase() === test.expected.toLowerCase();
    if (isMatch) {
        console.log(`✅ [PASS] ${test.marathi} -> ${actual} (Expected: ${test.expected})`);
        passed++;
    } else {
        console.log(`❌ [FAIL] ${test.marathi} -> ${actual} (Expected: ${test.expected})`);
    }
});

console.log('-------------------------------');
console.log(`Result: ${passed}/${tests.length} tests passed.`);
