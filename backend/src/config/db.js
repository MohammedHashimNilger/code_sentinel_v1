import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    // If the database is unreachable, the API is useless. Fail fast
    // instead of letting the server run in a broken state.
    process.exit(1);
  }
};

export default connectDB;
