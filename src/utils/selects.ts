export const specSelect = {
    spec: {
        select: { name: true }
    },
    value: true
};

export const itemSelect = {
    id: true,
    productId: true,
    price: true,
    specs: { select: specSelect }
};

export const productSelect = {
    id: true,
    name: true,
    category: true,
    tags: {
        select: { id: true }
    },
    description: true,
    createdAt: true,
    items: { select: itemSelect }
};

export const userSelect = {
    id: true,
    name: true,
    email: true,
    role: {
        select: { name: true }
    }
}