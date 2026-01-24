import { defineField, defineType } from 'sanity'
import { Home } from 'lucide-react'

export const propertyType = defineType({
    name: 'property',
    title: 'Property',
    type: 'document',
    // icon: Home,
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: { source: 'title' },
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'location',
            title: 'Location',
            type: 'string',
        }),
        defineField({
            name: 'price',
            title: 'Price (per month)',
            type: 'number',
        }),
        defineField({
            name: 'mainImage',
            title: 'Main Image',
            type: 'image',
            options: { hotspot: true },
            fields: [
                {
                    name: 'alt',
                    type: 'string',
                    title: 'Alternative text',
                }
            ]
        }),
        defineField({
            name: 'gallery',
            title: 'Gallery',
            type: 'array',
            of: [{ type: 'image', options: { hotspot: true } }],
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
        }),
        defineField({
            name: 'amenities',
            title: 'Amenities',
            type: 'array',
            of: [{ type: 'string' }],
        }),
        defineField({
            name: 'stats',
            title: 'Key Stats',
            type: 'object',
            fields: [
                defineField({ name: 'guests', type: 'number', title: 'Guests' }),
                defineField({ name: 'bedrooms', type: 'number', title: 'Bedrooms' }),
                defineField({ name: 'bathrooms', type: 'number', title: 'Bathrooms' }),
                defineField({ name: 'sqft', type: 'number', title: 'Square Feet' }),
            ],
        }),
        defineField({
            name: 'shortTermPrice',
            title: 'Short-term Price (per night)',
            type: 'number',
            group: 'pricing',
        }),
        defineField({
            name: 'midTermPrice',
            title: 'Mid-term Price (per month)',
            type: 'number',
            group: 'pricing',
        }),
        defineField({
            name: 'longTermPrice',
            title: 'Long-term Price (per month)',
            type: 'number',
            group: 'pricing',
        }),
        defineField({
            name: 'cleaningFee',
            title: 'Cleaning Fee',
            type: 'number',
            group: 'pricing',
        }),
        defineField({
            name: 'cityTax',
            title: 'City Tax (per night/person)',
            type: 'number',
            group: 'pricing',
        }),
        defineField({
            name: 'houseRules',
            title: 'House Rules',
            type: 'array',
            of: [{ type: 'string' }],
            initialValue: ['Children welcome', 'Infants welcome', 'No pets', 'No parties or events', 'No smoking'],
            group: 'details',
        }),
        defineField({
            name: 'cancellationPolicy',
            title: 'Cancellation Policy',
            type: 'text',
            group: 'details',
        }),
        defineField({
            name: 'hostBio',
            title: 'Host Bio',
            type: 'text',
            group: 'host',
        }),
        defineField({
            name: 'hostImage',
            title: 'Host Image',
            type: 'image',
            options: { hotspot: true },
            group: 'host',
        }),
        defineField({
            name: 'agent',
            title: 'Agent',
            type: 'reference',
            to: [{ type: 'agent' }],
            group: 'host',
        }),
    ],
    groups: [
        { name: 'pricing', title: 'Pricing & Booking' },
        { name: 'details', title: 'Property Details' },
        { name: 'host', title: 'Host Information' },
    ]
})
