import { Item, Specs } from "@interfaces";

export interface Product {
    id: string,
    name: string,
    category: string,
    tags: string[],
    description: string | null,
    createdAt: Date,
    items: Omit<Item, "productId">[]
}