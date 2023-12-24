import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
      },
      
      email: {
        type: String,
        required: true,
        unique: true,
      },
      
      img: {
        type: String,
      },
    
    
      projects: {
        type: Array,
        
      },
      
    },
    { timestamps: true }
  );
  
  export default mongoose.model("User", UserSchema);