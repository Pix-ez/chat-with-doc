import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import Projects from "../models/projects.js";
import Chats from "../models/chats.js";
import stream from "stream";
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

import { ulid } from 'ulid';


const KEYFILEPATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../credentials.json'
);


const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});


//Login
export const loginUser = async (req, res) => {
    try {
    
      const {  email, name , picture } = req.body;

      // console.log(email)
      // console.log(name)
  
      // console.log(picture)
  
  
      // Check if the user already exists
      let isuser = await User.findOne({ email });

      if (!isuser) {
        console.log('no user found creating new')

        // Create a new user
      const user = new User({
        username:name,
        email:email,
        img:picture
       
      });

       // Save the user to the database
        await user.save();
        console.log('new user created. ')

        res.json({msg:"user created succesfuly ,login succesful"})
     

      }else{

      res.json({msg:"user found succesfuly ,login succesful"})
    
     
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  };


  export const newChat = async (req, res) => {
    try {
    
      const {  email , name} = req.body;

      // console.log(req.body)
      // console.log(name)

      // Check if the user already exists
      let isuser = await User.findOne({ email });

      if (!isuser) {
        console.log('no user found ')

        res.json({msg:"user not found. "})

      }else{

        const projectid = ulid()
        const chat_id = ulid()

        isuser.projects.push(projectid)
        await isuser.save()

        let projects = new Projects({
          project_id:projectid,
          project_name:name,
          chat_id:chat_id,
          index:false
        })
        
        let chats = new Chats({
          chat_id:chat_id

        })

        await projects.save()
        await chats.save()



      res.json({msg:"project created succfully.", projectid:projectid})
    
     
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  };

  export const getChat = async (req, res) => {
    try {
    
      const {  email } = req.body;

      console.log(email)
    
      // Check if the user already exists
      let isuser = await User.findOne({ email });

      if (!isuser) {
        console.log('no user found ')

        res.json({msg:"user not found. "})

      }else{

       
        const projects_id = isuser.projects;
        const allProjects = [];
  
        for (const project_id of projects_id) {
          // Fetch each project from the database
          const project = await Projects.findOne({ project_id: project_id });
  
          // Add the project to the array
          if (project) {
            allProjects.push(project);
          }
        }

            // Now allProjects array contains all the fetched projects
        console.log(allProjects);
        

        
      res.json({msg:"project created succfully.", projects:allProjects})
     
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  };


  export const getChatdata = async (req, res) => {
    try {
      const { chat_id } = req.params;
  
      // Check if the chat exists
      let ischat = await Chats.findOne({ chat_id });
  
      if (!ischat) {
        console.log('No chats found');
        res.status(404).json({ msg: 'Chats not found.' });
      } else {
        const chats = ischat.chats;
        console.log(chats);
        res.json({ chats }); // Send an object with a 'chats' property
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
  


  export const updateChatdata = async (req, res) => {
    try {
    
      const { chat_id, newChat } = req.body; // Use req.params to get parameters from the URL


      console.log(chat_id)
      console.log(newChat)
    
      // Check if the user already exists
      let ischat = await Chats.findOne({ chat_id });

      if (!ischat) {
        console.log('no chats found ')

        res.json({msg:"chats not found. "})

      }else{

        ischat.chats.push(newChat)
         // Save the updated chat document
      await ischat.save();

       
        
        
  
        
            // Now allProjects array contains all the fetched projects
        console.log(newChat);
        

        
      res.json({msg:"chat updated."})
     
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  };

  const uploadFiles = async (file, mimeType) => {
    const drive = google.drive({ version: "v3", auth });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);
    
    const { data } = await drive.files.create({
      media: {
        mimeType: mimeType,
        body: bufferStream,
      },
      requestBody: {
        name: ulid(),
        parents: ['1C69iNlJHu3edz5_5oW7hIadk_AJi9Jfs'],
      },
      fields: "id,name", // Include 'name' in the response fields
    });
  
    // Returning both file id and file name
    return { id: data.id, name: data.name };
  };
  
  export const uploadFileToDriveAndGetURL = async (req, res) => {
    try {
      const file = req.file;
    
      if (!file) {
        return res.status(400).json({ msg: 'No file uploaded.' });
      }
  
      const { id, name } = await uploadFiles(file, file.mimetype);
      const url = `https://drive.google.com/uc?export=view&id=${id}`;
      
      // Retrieve projectId from the request
      const project_id = req.body.project_id; // Assuming it's sent in the request body

  
      // Fetch the project from the database
      const project = await Projects.findOne({project_id});
  
      if (!project) {
        return res.status(404).json({ msg: 'Project not found.' });
      }
  
      // Update doc_name and doc_url fields
    project.doc_name = name;
    project.doc_url = url;

    // Save the updated project
    await project.save();
      // Sending both file id and file name to the client
      res.json({ url, fileName: name , success:true});
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      res.status(500).send('Server Error');
    }
  };

  // Define the update project endpoint
  export const updateProject = async (req, res) => {
  try {
    // Extract project_id and index_name from the request body
    const { project_id, doc_index } = req.body;

    // Find the project in the database based on project_id
    const project = await Projects.findOne({ project_id });

    // Check if the project exists
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Update the project with index_name and set index to true
    project.doc_index = doc_index;
    project.index = true;

    // Save the updated project
    await project.save();

    // Send success response
    res.json({ success: true, message: 'Project updated successfully.' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
  }
