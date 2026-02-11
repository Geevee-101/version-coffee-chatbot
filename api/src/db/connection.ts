import { connect, disconnect } from "mongoose";

export async function connectToDatabase() {
    try {
        await connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw new Error("Failed to connect to MongoDB")
    }
}

export async function disconnectFromDatabase() {
    try {
        await disconnect();
        console.log("Disconnected from MongoDB");
    } catch (error) {
        console.error("Failed to disconnect from MongoDB:", error);
        throw new Error("Failed to disconnect from MongoDB")
    }
}
