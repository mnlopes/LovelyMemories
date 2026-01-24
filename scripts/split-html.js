const fs = require('fs');
const path = require('path');

const inputFile = 'D:/LovelyMemories/a0b7891a-b481-47af-969e-d1d39bf2a1a5.htm';
const outputDir = 'D:/LovelyMemories/components';

try {
    const content = fs.readFileSync(inputFile, 'utf8');

    // Find structural boundaries
    const bodyStartRegex = /<body[^>]*>/i;
    const bodyMatch = content.match(bodyStartRegex);

    if (!bodyMatch) {
        console.error('Could not find <body> tag');
        process.exit(1);
    }

    const bodyStartIndex = bodyMatch.index;
    const bodyContentStart = bodyStartIndex + bodyMatch[0].length;

    // HEAD Content (everything before body tag)
    const headContent = content.substring(0, bodyStartIndex);

    // Extract Body Classes/Attributes to re-apply if needed
    const bodyTag = bodyMatch[0];

    // BODY Content (inner HTML of body)
    // We want to exclude the closing </body> and </html> if present
    let bodyContent = content.substring(bodyContentStart);
    bodyContent = bodyContent.replace(/<\/body>[\s\S]*$/i, '');

    fs.writeFileSync(path.join(outputDir, 'legacy-head.html'), headContent);
    fs.writeFileSync(path.join(outputDir, 'legacy-body.html'), bodyContent);
    fs.writeFileSync(path.join(outputDir, 'legacy-body-tag.txt'), bodyTag);

    console.log('Successfully split HTML into components/legacy-head.html and components/legacy-body.html');

} catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
}
