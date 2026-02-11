import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    ingredients: { type: [String], required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    image_path: { type: String, required: true },
  },
);

export default mongoose.model("Product", productSchema);