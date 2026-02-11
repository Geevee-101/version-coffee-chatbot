import mongoose from "mongoose";

const orderHistorySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    orderHistory: [orderHistorySchema],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);
