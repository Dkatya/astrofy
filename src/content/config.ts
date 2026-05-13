import { z, defineCollection } from "astro:content";

const blogSchema = z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.string().optional(),
    heroImage: z.string().optional(),
    badge: z.string().optional(),
    tags: z.array(z.string()).refine(items => new Set(items).size === items.length, {
        message: 'tags must be unique',
    }).optional(),
});

const projectsSchema = z.object({
    title: z.string(),
    description: z.string(),         // short blurb on the cards list
    tldr: z.string().optional(),     // one-sentence headline at top of detail page
    status: z.string().optional(),   // e.g. "Submitted to IEEE GHTC 2026", "In progress"
    stack: z.array(z.string()).optional(),
    image: z.string().optional(),    // card thumbnail
    externalUrl: z.string().optional(), // if set, card links straight there (no detail page)
    githubUrl: z.string().optional(),
    badge: z.string().optional(),
    category: z.string().optional(), // "Research" | "Applied ML"
    order: z.number().default(99),   // lower = earlier on the list
});

export type BlogSchema = z.infer<typeof blogSchema>;
export type ProjectsSchema = z.infer<typeof projectsSchema>;

const blogCollection = defineCollection({ schema: blogSchema });
const projectsCollection = defineCollection({ schema: projectsSchema });

export const collections = {
    'blog': blogCollection,
    'projects': projectsCollection,
}
