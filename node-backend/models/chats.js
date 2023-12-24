import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
    {
      chat_id: {
        type: String,
        required: true,
        unique: true,
      },
      
      chats: {
        type: Array,
      },
      
     
    },
    { timestamps: true }
  );
  
  export default mongoose.model("Chats", ChatSchema);