import { Request, Response } from "express";
import { ItemModel, ProductModel, UserModel, RecordsModel } from "@models";
import { itemSchema, productSchema, roleSchema } from "@utils/schemas";
import { Item, Product } from "@interfaces";

function serializeBigInts(obj: any): any {
    if (typeof obj === "bigint") return obj.toString();
    if (Array.isArray(obj)) return obj.map(serializeBigInts);
    if (obj && typeof obj === "object") {
        return Object.entries(obj).reduce((acc, [k, v]) => {
            acc[k] = serializeBigInts(v);
            return acc;
        }, {} as Record<string, any>);
    }
    return obj;
}

export function getDashboard(req: Request, res: Response) {
    res.render("dashboard/pages/index", {
        activeNav: "/",
        userName: res.locals.userName,
        roleName: res.locals.roleName,
    });
}

export async function getProducts(req: Request, res: Response) {
  const products = await ProductModel.getAll();

  const categories = [
    { value: "cf", label: "Coffee" },
    { value: "tea", label: "Tea" },
    { value: "ice", label: "Ice" },
    { value: "bread", label: "Bread" }
  ];

  res.render("dashboard/pages/products", {
    products,
    categories, // thêm dòng này
    activeNav: "/products",
    userName: res.locals.userName,
    roleName: res.locals.roleName,
    getAllItemSpecsFromProduct: ProductModel.getAllItemSpecs,
  });
}


export async function addItem(req: Request, res: Response) {
    const addData = itemSchema.parse(req.body) as Omit<Item, "id">;
    await ItemModel.add(addData);
    res.redirect("/dashboard/products");
}

export async function updateItem(req: Request, res: Response) {
    const id = Number(req.query?.id);
    const updateData = itemSchema.partial().parse(req.body);
    await ItemModel.update(id, updateData);
    res.redirect("/dashboard/products");
}

export async function addProduct(req: Request, res: Response) {
  const { sizes, ...rest } = req.body;
  const addData = productSchema.parse(rest) as Omit<Product, "items">;

  try {
    const product = await ProductModel.add(addData);

    let parsedSizes: Array<{ size: string; price: string | number }> = [];
    if (sizes) {
      try {
        parsedSizes = JSON.parse(sizes);
      } catch {
        parsedSizes = [];
      }
    }

    for (const s of parsedSizes) {
      await ItemModel.add({
        productId: product.id,
        price: Number(s.price),
        specs: { Size: s.size },
      });
    }

    res.redirect("/dashboard/products");
  } catch (err: any) {
    // Bắt mọi trường hợp unique constraint Prisma (cả 'id', 'name', v.v.)
    if (err.code === "P2002" && err.meta?.target) {
      let errorMsg = "Đã có sản phẩm bị trùng thông tin!";
      if (Array.isArray(err.meta.target)) {
        if (err.meta.target.includes("id")) {
          errorMsg = "Mã sản phẩm đã tồn tại, vui lòng nhập mã khác!";
        } else if (err.meta.target.includes("name")) {
          errorMsg = "Tên sản phẩm đã tồn tại, vui lòng chọn tên khác!";
        }
      }
      return res.render("dashboard/pages/products", {
        errorMsg,

        products: await ProductModel.getAll(),
        categories: [
          { value: "cf", label: "Coffee" },
          { value: "tea", label: "Tea" },
          { value: "ice", label: "Ice" },
          { value: "bread", label: "Bread" }
        ],
        activeNav: "/products",
        userName: res.locals.userName,
        roleName: res.locals.roleName,
        getAllItemSpecsFromProduct: ProductModel.getAllItemSpecs,
      });
    }
    throw err;
  }
}




export async function updateProduct(req: Request, res: Response) {
  const { sizes, ...rest } = req.body;
  const { id } = rest;

  const updateData = productSchema.partial().parse(rest);
  if (!id) return res.redirect("/dashboard/products");

  await ProductModel.update(id, updateData);

  // xử lý sizes
  let parsedSizes: Array<{ size: string; price: string | number }> = [];
  if (sizes) {
    try {
      parsedSizes = JSON.parse(sizes);
    } catch {
      parsedSizes = [];
    }
  }

  // xóa toàn bộ items cũ của product
  await ItemModel.deleteByProductId(id); // cần có hàm này ở ItemModel

  // tạo lại items
  for (const s of parsedSizes) {
    await ItemModel.add({
      productId: id,
      price: Number(s.price),
      specs: { Size: s.size },
    });
  }

  res.redirect("/dashboard/products");
}


export async function getUsers(req: Request, res: Response) {
    let users = await UserModel.getAll();
    users = users.filter(
        (u) => u.name !== "fallback" && u.email !== "fallback@smartphone-store"
    );
    res.render("dashboard/pages/users", {
        users,
        activeNav: "/users",
        userName: res.locals.userName,
        roleName: res.locals.roleName,
    });
}

export async function getRecords(req: Request, res: Response) {
    const rawRecords = await RecordsModel.getAllRecords();
    const records = rawRecords.map((r) => {
        const createdAt =
            r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
        const clean = serializeBigInts({ ...r, createdAt });
        clean.createdAtIso = createdAt.toISOString();
        clean.createdAtFormatted = createdAt.toLocaleDateString("vi-VN");
        clean.itemsJson = JSON.stringify(clean.items);
        return clean;
    });

    res.render("dashboard/pages/records", {
        records,
        activeNav: "/records",
        userName: res.locals.userName,
        roleName: res.locals.roleName,
    });
}
