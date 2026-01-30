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
            name: 'coordinates',
            title: 'Property Coordinates',
            type: 'geopoint',
            group: 'details',
        }),
        defineField({
            name: 'nearbyPlaces',
            title: 'Nearby Places',
            type: 'array',
            group: 'details',
            of: [{
                type: 'object',
                fields: [
                    defineField({ name: 'category', type: 'string', title: 'Category (e.g., Local Attractions)' }),
                    defineField({
                        name: 'items',
                        type: 'array',
                        of: [{
                            type: 'object',
                            fields: [
                                defineField({ name: 'name', type: 'string', title: 'Place Name' }),
                                defineField({ name: 'time', type: 'string', title: 'Time (e.g., "5 min")' }),
                                defineField({
                                    name: 'icon',
                                    type: 'string',
                                    options: {
                                        list: [
                                            { title: 'Walk', value: 'walk' },
                                            { title: 'Car', value: 'car' }
                                        ]
                                    }
                                }),
                                defineField({ name: 'location', type: 'geopoint', title: 'Place Coordinates' })
                            ]
                        }]
                    })
                ]
            }]
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
            name: 'policies',
            title: 'Booking Policies',
            type: 'object',
            group: 'details',
            fields: [
                defineField({ name: 'checkInStart', title: 'Check-in Start', type: 'string', initialValue: '15:00' }),
                defineField({ name: 'checkOutBy', title: 'Check-out By', type: 'string', initialValue: '11:00' }),
                defineField({ name: 'cancellationText', title: 'Cancellation Policy Text', type: 'text' }),
                defineField({ name: 'cancellationRefund', title: 'Refund Policy Details', type: 'string' }),
                defineField({ name: 'cancellationDeadline', title: 'Deadline (e.g., "7 days", "4 Feb")', type: 'string' }),
                defineField({
                    name: 'houseRules',
                    title: 'House Rules',
                    type: 'object',
                    fields: [
                        defineField({ name: 'childrenAllowed', title: 'Children Allowed', type: 'boolean', initialValue: true }),
                        defineField({ name: 'infantsAllowed', title: 'Infants Allowed', type: 'boolean', initialValue: true }),
                        defineField({ name: 'petsAllowed', title: 'Pets Allowed', type: 'boolean', initialValue: false }),
                        defineField({ name: 'partiesAllowed', title: 'Parties/Events Allowed', type: 'boolean', initialValue: false }),
                        defineField({ name: 'smokingAllowed', title: 'Smoking Allowed', type: 'boolean', initialValue: false }),
                    ]
                })
            ]
        }),
        defineField({
            name: 'pricingConfig',
            title: 'Pricing Configuration',
            type: 'object',
            group: 'pricing',
            fields: [
                defineField({ name: 'weeklyDiscount', title: 'Weekly Discount (%)', type: 'number', initialValue: 0 }),
                defineField({ name: 'cleaningFeeIncluded', title: 'Cleaning Fee Included?', type: 'boolean', initialValue: false }),
                defineField({ name: 'cityTaxIncluded', title: 'City Tax Included?', type: 'boolean', initialValue: false }),
            ]
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
            name: 'concierge',
            title: 'Concierge Services',
            type: 'object',
            group: 'details',
            fields: [
                defineField({ name: 'chef', title: 'Private Chef', type: 'boolean', initialValue: true }),
                defineField({ name: 'chauffeur', title: 'Chauffeur Service', type: 'boolean', initialValue: false }),
                defineField({ name: 'spa', title: 'Spa & Massage', type: 'boolean', initialValue: false }),
                defineField({ name: 'tours', title: 'Private Tours', type: 'boolean', initialValue: true }),
                defineField({ name: 'security', title: '24/7 Security', type: 'boolean', initialValue: false }),
                defineField({ name: 'events', title: 'Event Planning', type: 'boolean', initialValue: false }),
            ]
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
