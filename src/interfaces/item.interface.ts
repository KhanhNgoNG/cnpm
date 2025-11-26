import { Specs } from "@interfaces";

export interface Item {
    id: number,
    productId: string,
    price: number,
    specs: Specs
}