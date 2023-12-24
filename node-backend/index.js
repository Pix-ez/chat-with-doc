// MONGODB_URL="mongodb+srv://rahul:rahul123@yt.lpbshqm.mongodb.net/?retryWrites=true&w=majority"
// JWT_SECRET = 8hEnPGeoBqGUT6zksxt4G95gW+uMdzwe7EVaRnp0xRI=

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

import Authroute from './routes/Authroute.js'

const app= express();
const port = 3001;


//middlewares
app.use(cors())
dotenv.config();
app.use(bodyParser.urlencoded({extended: true}));


app.use(express.json());
// app.use(express.urlencoded({extended:true}));


const db_connect = async () => {
	try {
	  await mongoose.connect(process.env.MONGODB_URL);
	  console.log("Connected to mongoDB.");
	} catch (error) {
	  throw error;
	}
  };
  
  mongoose.connection.on("disconnected", () => {
	console.log("mongoDB disconnected!");
  });


//Routes//
app.use("/api", Authroute);

app.get('/', (req, res) => {
	res.json({msg:'welcome Friends'});
  });

  app.listen(port, (error) =>{
	db_connect();
	if(!error)
		console.log("Server is Successfully Running, and App is listening on port "+ port+"😊👌 ")
	else
		console.log("Error occurred, server can't start", error);
	}
);
