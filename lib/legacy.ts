import fs from 'fs';
import path from 'path';

// Domínio antigo para substituir
const LEGACY_DOMAIN = 'http://207.154.225.193/lovely-memories';

function replaceLegacyUrls(content: string): string {
    if (!content) return '';

    // Regex para substituir apenas href="..." e action="..." começando com o domínio antigo
    // Preserva src="..." (imagens/scripts) e outros atributos
    // Captura o atributo (href/action) e o caminho após o domínio
    const legacyDomainRegex = new RegExp(`(href|action)=["']${LEGACY_DOMAIN}(/[^"']*)?["']`, 'gi');

    return content.replace(legacyDomainRegex, (match, attr, path) => {
        // Normaliza o path
        let newPath = path || '/';
        // Remove barra final se não for raiz
        if (newPath.length > 1 && newPath.endsWith('/')) {
            newPath = newPath.slice(0, -1);
        }
        return `${attr}="${newPath}"`;
    });
}

export function getLegacyHead(pageName: string = 'home') {
    const filePath = path.join(process.cwd(), 'components', `legacy-head.html`);
    const globalHeadPath = path.join(process.cwd(), 'components', 'legacy-head.html');

    try {
        const targetPath = fs.existsSync(path.join(process.cwd(), 'components', `legacy-${pageName}-head.html`))
            ? path.join(process.cwd(), 'components', `legacy-${pageName}-head.html`)
            : globalHeadPath;

        let content = fs.readFileSync(targetPath, 'utf8');
        content = content.replace(/^[\s\S]*?<head[^>]*>/i, '');
        content = content.replace(/<\/head>[\s\S]*$/i, '');

        // Remove scripts perigosos (exceto JSON-LD) para evitar Runtime Errors no cliente
        content = content.replace(/<script[^>]*src=['"][^'"]*['"][^>]*>[\s\S]*?<\/script>/gi, '');
        content = content.replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '');

        // Limpeza de whitespace
        content = content.replace(/>\s+</g, '><').trim();

        return replaceLegacyUrls(content);
    } catch (e) {
        console.error(`Error reading legacy head for ${pageName}:`, e);
        return '';
    }
}

export function getLegacyBody(pageName: string = 'home') {
    const fileName = `legacy-${pageName}-body.html`;
    const filePath = path.join(process.cwd(), 'components', fileName);

    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Remove scripts do body também
        content = content.replace(/<script[^>]*src=['"][^'"]*['"][^>]*>[\s\S]*?<\/script>/gi, '');
        content = content.replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '');

        // Limpeza de whitespace para evitar Hydration Mismatch
        content = content.replace(/>\s+</g, '><').trim();

        return replaceLegacyUrls(content);
    } catch (e) {
        console.error(`Error reading legacy body for ${pageName}:`, e);
        return `<div style="padding: 100px; text-align: center;">Conteúdo para '${pageName}' ainda não migrado (Ficheiro ${fileName} não encontrado).</div>`;
    }
}
