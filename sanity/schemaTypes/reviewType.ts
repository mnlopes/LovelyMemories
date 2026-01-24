import { defineField, defineType } from 'sanity'
import { Star } from 'lucide-react'

export const reviewType = defineType({
    name: 'review',
    title: 'Review',
    type: 'document',
    // icon: Star,
    fields: [
        defineField({
            name: 'name',
            title: 'Guest Name',
            type: 'string',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'location',
            title: 'Guest Location',
            type: 'string',
        }),
        defineField({
            name: 'date',
            title: 'Date',
            type: 'date',
        }),
        defineField({
            name: 'rating',
            title: 'Rating',
            type: 'number',
            validation: (rule) => rule.min(1).max(5),
        }),
        defineField({
            name: 'text',
            title: 'Review Text',
            type: 'text',
        }),
        defineField({
            name: 'avatar',
            title: 'Guest Avatar',
            type: 'image',
            options: { hotspot: true },
        }),
        defineField({
            name: 'property',
            title: 'Property',
            type: 'reference',
            to: [{ type: 'property' }],
        }),
    ],
})
