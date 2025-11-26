import { ItemModel, ProductModel } from "@models";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";

export async function getHomePage(req: Request, res: Response) {
  // Slides carousel cho quán cafe 2Lane dịp Noel
    const carouselSlides = [
        {
        photo: { link: "1.png" }, // Tên file ảnh nằm tại /public/images/home/christmas_1.png
        title: "Welcome to 2Lane Coffee 🎄",
        description: "A cozy place for festive chats and brews.",
        align: "center",
        active: true,
        ctaButton: {
            href: "#bestSellers",
            label: "Explore best-sellers!"
        }
        },
        {
        photo: { link: "2.png" }, // /public/images/home/christmas_2.png
        title: "",
        description: "Warm flavors, sweet cakes, handcrafted with care.",
        align: "end",
        active: false,
        ctaButton: {
            href: "/products/all",
            label: "Browse the menu"
        }
        },
        {
        photo: { link: "3.png" }, // /public/images/home/christmas_3.png
        title: "Sweet treats & comfort ✨",
        description: "Coffee, cakes and comfort in every cup.",
        align: "center",
        active: false,
        ctaButton: {
            href: "/about",
            label: "Contact us"
        }
        }
    ];

    // Lấy danh sách tất cả sản phẩm
    const allProducts = await ProductModel.getFiltered({});
    // Lọc sản phẩm theo tag best-seller, christmas
    const bestSellers = allProducts.filter(p => p.tags?.includes("best-seller"));
    const christmas = allProducts.filter(p => p.tags?.includes("christmas"));

    res.render("store/pages/index", {
        carouselSlides,
        activeNav: "/",
        userName: res.locals.userName,
        showDashboard: ["administrator", "manager"].includes(res.locals.roleName),
        bestSellers,
        christmas,
        cartCount: getCartItemsCount(req.session.cart),
    });
}

export async function getCategoryPage(req: Request, res: Response) {
  const routeCategory = req.params.category ?? "all";
  const { category, tag } = req.query;

  const categories = [
    { value: "cf", label: "Coffee" },
    { value: "tea", label: "Tea" },
    { value: "ice", label: "Ice" },
    { value: "bread", label: "Bread" }
  ];

  const where: any = {};

  // Category hiệu lực = route param (nếu khác all) hoặc category từ form
  const effectiveCategory =
    routeCategory !== "all"
      ? routeCategory
      : (typeof category === "string" && category !== "" ? category : undefined);

  if (effectiveCategory) {
    where.category = effectiveCategory;
  }

  let filteredTag: string | undefined;
  if (typeof tag === "string" && tag !== "") {
    filteredTag = tag;
    where.tags = { some: { id: tag } }; // Tag.id = "best-seller" | "christmas"
  }

  const products = await ProductModel.getFiltered(where);

  const categoryPhotos = {
    all:   { link: "4.png"},

  };

  const filteredCategory =
    typeof category === "string" ? category : "";

  res.render("store/pages/category", {
    category: routeCategory,
    products,
    categoryPhotos,
    categories,
    filteredCategory,
    filteredTag,
    userName: res.locals.userName,
    showDashboard: ["administrator", "manager"].includes(res.locals.roleName),
    activeNav: routeCategory === "all" ? "/products" : `/products/${routeCategory}`,
    cartCount: getCartItemsCount(req.session.cart)
  });
}


export async function getProductPage(req: Request, res: Response) {
  const category = req.params.category;
  const id = req.params.productId;
  const product = await ProductModel.getById(id);

  if (product.category !== category) {
    res.redirect("/404");
    return;
  }

  // Xử lý ảnh preview
  const previewFile = path.join(".", "public", "images", "products", id, "preview.jpg");
  let previewImage = `/public/images/products/preview-notfound.jpg`;

  if (fs.existsSync(previewFile)) {
    previewImage = `/public/images/products/${id}/preview.jpg`;
  }

  let options: { [spec: string]: Set<string> } = ProductModel.getAllItemSpecs(product);
  let selectedOptions: { [spec: string]: string } = {};

  for (const spec of Object.keys(options)) {
    const queryValue = req.query[spec]?.toString();

    if (queryValue && options[spec].has(queryValue)) {
      selectedOptions[spec] = queryValue;
    } else {
      selectedOptions[spec] = Array.from(options[spec])[0];
    }
  }

  const availableItem = product.items.find(
    item =>
      Object.entries(selectedOptions).every(
        ([spec, value]) => item.specs[spec] === value
      )
  );

  res.render("store/pages/product", {
    product,
    previewImage,
    options,
    selectedOptions,
    availableItem,
    activeNav: `/products/${product.category}`,
    userName: res.locals.userName,
    showDashboard: ["administrator", "manager"].includes(res.locals.roleName),
    cartCount: getCartItemsCount(req.session.cart),
  });
}

export async function getCartPage(req: Request, res: Response) {
    res.render("store/pages/cart", {
        cart: req.session.cart
            ? await Promise.all(
                Object.entries(req.session.cart).map(([itemId, amount]) =>
                    ItemModel.getById(Number(itemId)).then(async item => ({
                        ...item,
                        amount,
                        productName: (await ProductModel.getById(item.productId)).name
                    }))
                )
            )
            : [],
        userName: res.locals.userName,
        showDashboard: ["administrator", "manager"].includes(res.locals.roleName),
        cartCount: getCartItemsCount(req.session.cart)
    });
}

export async function addItemToCart(req: Request, res: Response) {
    const itemId = Number(req.query?.id);

    const item = await ItemModel.getById(itemId);

    if (!req.session.cart) {
        req.session.cart = {};
    }

    if (itemId in req.session.cart) {
        req.session.cart[itemId] = req.session.cart[itemId] + 1;
    } else {
        req.session.cart[itemId] = 1;
    }


    res.redirect("/cart");
}

export async function substractItemFromCart(req: Request, res: Response) {
  const itemId = Number(req.query?.id);

  if (req.session.cart && itemId in req.session.cart) {
    req.session.cart[itemId] = Math.max(req.session.cart[itemId] - 1, 0);

    if (req.session.cart[itemId] === 0) {
      delete req.session.cart[itemId];
    }
  }

  return res.redirect("/cart");
}



export async function removeItemFromCart(req: Request, res: Response) {
    const itemId = Number(req.query?.id);

    if (req.session.cart) {
        delete req.session.cart[itemId];
    }

    res.redirect("/cart");
}

export async function emptyCart(req: Request, res: Response) {
    if (req.session.cart) {
        req.session.cart = {};
    }

    res.redirect("/cart");
}

export function getAboutPage(req: Request, res: Response) {
    res.render("store/pages/about", {
        activeNav: "/about",
        userName: res.locals.userName,
        showDashboard: ["administrator", "manager"].includes(res.locals.roleName),
        cartCount: getCartItemsCount(req.session.cart)
    });
}

export function get404Page(req: Request, res: Response) {
    res.render("store/pages/404", {
        userName: res.locals.userName,
        showDashboard: ["administrator", "manager"].includes(res.locals.roleName),
        cartCount: getCartItemsCount(req.session.cart)
    });
}

function getCartItemsCount(cart: Record<number, number> | undefined): number {
    return cart ? Object.keys(cart).length : 0;
}
