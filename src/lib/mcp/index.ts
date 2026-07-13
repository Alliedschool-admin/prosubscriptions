import { defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import getProduct from "./tools/get-product";
import searchProducts from "./tools/search-products";

export default defineMcp({
  name: "pro-subscriptions-mcp",
  title: "Pro Subscriptions",
  version: "0.1.0",
  instructions:
    "Public, read-only tools for the Pro Subscriptions catalog. Use list_products to browse, search_products to find by keyword, and get_product to fetch one item by id or code. No authentication required. Only public catalog data is exposed — no user, order, or admin data.",
  tools: [listProducts, getProduct, searchProducts],
});