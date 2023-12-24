import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
    {
      
      project_id: {
        type: String,
        required: true,
        unique: true,
      },

      project_name: {
        type: String,
        required: true,
        unique: true,
      },
      
      doc_url: {
        type: String,
      },

      doc_name: {
        type: String,
      },
    
      index: {
        type: Boolean,
      },

      doc_index: {
        type: String,
      },
    
    
      chat_id: {
        type: String,
        
      },
      
    },
    { timestamps: true }
  );
  
  export default mongoose.model("Projects", ProjectSchema);