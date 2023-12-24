import { Router } from "express";
import { getChat, getChatdata, loginUser, newChat, updateChatdata, updateProject, uploadFileToDriveAndGetURL} from '../controllers/Authcontroller.js'
import multer from "multer";
const upload = multer();


const router = new Router()


router.post('/login', loginUser) 

router.post('/new-chat', newChat)

router.post('/get-chat', getChat)

router.get('/get-chatdata/:chat_id', getChatdata)

router.post('/update-chat', updateChatdata)

router.post('/upload-file', upload.single('file'), uploadFileToDriveAndGetURL)

router.post('/update-project',updateProject)

export default router;