const fs = require('fs');
const path = require('path');

// Usage: node extract-page.js <source-file> <page-slug>
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node extract-page.js <source-file> <page-slug>');
    process.exit(1);
}

const inputFile = args[0];
const pageSlug = args[1];
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
    // Clean up DOCTYPE and html opening generic stuff if we want, but keeping it raw is safer for now
    // except we usually inject this IN output HTML which already has doctype.
    // We'll strip it in the 'getLegacyHead' function logic if needed, or here.
    // Let's save raw head for now.
    const headContent = content.substring(0, bodyStartIndex);

    // Extract Body Classes/Attributes to re-apply if needed
    const bodyTag = bodyMatch[0];

    // BODY Content (inner HTML of body)
    // We want to exclude the closing </body> and </html> if present
    let bodyContent = content.substring(bodyContentStart);
    bodyContent = bodyContent.replace(/<\/body>[\s\S]*$/i, '');

    // Save files with slug prefix
    const headFilename = `legacy-${pageSlug}-head.html`;
    const bodyFilename = `legacy-${pageSlug}-body.html`;
    const bodyTagFilename = `legacy-${pageSlug}-body-tag.txt`;

    fs.writeFileSync(path.join(outputDir, headFilename), headContent);
    fs.writeFileSync(path.join(outputDir, bodyFilename), bodyContent);
    fs.writeFileSync(path.join(outputDir, bodyTagFilename), bodyTag);

    console.log(`Successfully extracted ${pageSlug}:`);
    console.log(`- ${headFilename}`);
    console.log(`- ${bodyFilename}`);
    console.log(`- ${bodyTagFilename}`);

} catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
}
