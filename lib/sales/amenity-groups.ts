import type { Localized } from './types';

/**
 * Groups the amenities copied from a rental home so the staff picker shows what matters to a buyer first.
 * The rental lists come from Airbnb and mix guest supplies (shampoo, coffee) with real features of the home.
 * Anything not recognised falls into "other", which the picker keeps folded: nothing is lost.
 */
export type AmenityGroup = 'outdoor' | 'comfort' | 'kitchen' | 'building' | 'other';

export const AMENITY_GROUPS: AmenityGroup[] = ['outdoor', 'comfort', 'kitchen', 'building', 'other'];

// Short words are matched whole with Unicode letter lookarounds: \b treats accented letters as breaks,
// so /\brio\b/ would find "rio" inside "armário".
const W = (word: string) => `(?<!\\p{L})${word}(?!\\p{L})`;
const rx = (parts: string[]) => new RegExp(parts.join('|'), 'u');

// Checked first: guest supplies and hosting extras, even when they mention a kitchen or bathroom word.
const GUEST = rx([
    'shampoo', 'conditioner', 'soap', 'shower gel', 'gel de banho', 'body wash', 'toiletr',
    'coffee', 'caf[eé]', 'nespresso', 'toaster', 'torradeira', 'kettle', 'chaleira', 'wine', 'vinho',
    'dishes', 'silverware', 'loi[cç]a e talheres', 'cooking basics', 'b[aá]sicos de cozinha',
    'linen', 'len[cç]o', 'roupa de cama', 'pillow', 'almofad', 'blanket', 'cobertor', 'towel', 'toalha',
    'essentials', 'essenciais', 'hanger', 'cabide', W('iron'), 'ferro de engomar', 'hair ?dryer', 'secador',
    'board game', 'jogos', W('tv'), 'hdtv', 'netflix', 'televis',
    'first aid', 'primeiros socorros', 'extinguisher', 'extintor', 'smoke alarm', 'dete[ct]+or de fumo',
    'carbon monoxide', 'mon[oó]xido', 'self check', 'check-in', 'long term', 'longa dura',
    'cleaning', 'limpeza', 'drying rack', 'estendal', 'hot water', '[aá]gua quente', 'wi-?fi',
    'crib', 'ber[cç]o', 'high chair', 'cadeira de beb', 'luggage', 'bagagem', 'bidet', 'bid[eé]',
]);

const RULES: [AmenityGroup, RegExp][] = [
    ['outdoor', rx([
        'view', 'vista', 'balcon', 'varanda', 'p[aá]tio', 'terrace', 'terra[cç]o', 'garden', 'jardim',
        'outdoor', 'exterior', 'pool', 'piscina', 'bbq', 'barbecue', 'churrasq', 'rooftop',
        W('sea'), W('mar'), 'river', W('rio'), 'beach', 'praia',
    ])],
    ['kitchen', rx([
        'kitchen', 'cozinha', 'oven', 'forno', 'stove', 'fog[aã]o', 'placa', 'induction', 'indu[cç][aã]o',
        'dishwasher', 'lava-loi[cç]a', 'm[aá]quina de lavar loi', 'refrigerator', 'fridge', 'frigor[ií]fico',
        'freezer', 'congelador', 'microwave', 'micro-ondas', 'dining', 'mesa de jantar', 'extractor', 'exaust',
    ])],
    ['building', rx([
        'elevator', 'elevador', W('lift'), 'building', 'pr[eé]dio', 'edif[ií]cio', 'parking', 'estacionamento',
        'garage', 'garagem', 'keypad', 'fechadura', 'lockbox', 'doorman', 'porteiro', 'concierge',
        W('gym'), 'gin[aá]sio', 'storage room', 'arrecada',
    ])],
    ['comfort', rx([
        'heating', 'aquecimento', 'air condition', W('ac'), 'ar condicionado', 'split', W('fan'), 'ventoinha',
        'shades', 'blackout', 'estores', 'closet', 'roupeiro', 'wardrobe', 'ethernet', 'washer',
        'm[aá]quina de lavar', 'dryer', 'm[aá]quina de secar', 'fireplace', 'lareira', 'soundproof', 'insonoriz',
        W('desk'), 'secret[aá]ria', 'workspace', 'bathtub', 'banheira', 'double glaz', 'vidro duplo',
    ])],
];

export function amenityGroup(item: Localized): AmenityGroup {
    const text = `${item.en ?? ''} ${item.pt ?? ''}`.toLowerCase();
    if (!text.trim() || GUEST.test(text)) return 'other';
    for (const [group, re] of RULES) if (re.test(text)) return group;
    return 'other';
}
