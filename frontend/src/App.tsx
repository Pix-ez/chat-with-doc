
//@ts-nocheck
import { useEffect, useRef, useState, Fragment } from 'react'
import { GoogleLogin } from '@react-oauth/google';
import { useGoogleLogin, googleLogout, useGoogleOneTapLogin } from '@react-oauth/google';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import getAsyncIterator from 'pumpify';
import { faFilePdf } from '@fortawesome/free-regular-svg-icons';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory  } from "@google/generative-ai";

import { jwtDecode } from "jwt-decode";

import { ChromaClient } from 'chromadb'


function App() {
  // Access your API key (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI("API_KEY");



  

  const [loggedin, setLoggedin] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [chatname, setChatname] = useState("")
  const [chatlist, setChatlist] = useState([])
  const [activeChatIndex, setActiveChatIndex] = useState()
  const [accestoken, setAccesstoken] = useState(null)
  const [usercred, setUsercred] = useState("")
  const [chats, setChats] = useState([])
  const [queryText, setQueryText] = useState(""); // State to store the text from textarea
  const [isSendingQuery, setIsSendingQuery] = useState(false); // State to track whether a query is being sent
  const [isProjectSelected, setIsProjectSelected] = useState(false);
  const [isChatIndexSet, setIsChatIndexSet] = useState(false);
  // State to manage the selected file
  const [selectedFile, setSelectedFile] = useState(null);
  // State to manage the upload status
  const [uploadStatus, setUploadStatus] = useState({ uploading: false, success: false, error: false });

  const [embeddingStatus, setEmbeddingStatus] = useState(''); // Possible values: 'generating', 'success', 'error', ''


  function closeModal() {
    setIsOpen(false)
  }

  function openModal() {
    setIsOpen(true)
  }

  const Signup = async () => {
    if (usercred) {
      try {
        const response = await axios.post("http://localhost:3001/api/login", usercred, {
          headers: { 'Content-Type': 'application/json' },
        });

        console.log(response.data);

        setLoggedin(true);
      } catch (error) {
        console.log(error);
        alert("An error occurred. Please try again.");
      }
    }
  };


  const newChat = async (event) => {
    event.preventDefault();

    if (loggedin) {
      try {
        const response = await axios.post("http://localhost:3001/api/new-chat", { email: usercred.email, name: chatname }, {
          headers: { 'Content-Type': 'application/json' },
        });

        console.log(response.data);

        await getChat();
        closeModal();
      } catch (error) {
        console.log(error);
        alert("An error occurred. Please try again.");
      }
    } else {
      alert("Login first.");
    }
  };

  const getChat = async () => {
    try {
      const response = await axios.post("http://localhost:3001/api/get-chat", usercred, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(response.data.projects);
      setChatlist(response.data.projects);
    } catch (error) {
      console.log(error);
      alert("An error occurred. Please try again.");
    }
  };

  useEffect(() => {
    Signup();
  }, [usercred]);

  useEffect(() => {
    if (usercred) {
      getChat();
    }
  }, [usercred]);

  useEffect(() => {
    const accestoken = localStorage.getItem('accestoken');
    if (localStorage.getItem('loggedin')) {
      setLoggedin(true);
      console.log('loged in');
      if (accestoken != null) {
        console.log(accestoken);
        setUsercred(jwtDecode(accestoken));
        console.log(jwtDecode(accestoken));
      }
    } else {
      setLoggedin(false);
      console.log('not log in');
    }
  }, []);


  useEffect(() => {
    // Load activeChatIndex from local storage on component mount
    const storedActiveChatIndex = localStorage.getItem('activeChatIndex');
    if (storedActiveChatIndex !== null) {
      setActiveChatIndex(parseInt(storedActiveChatIndex, 10));
    }
  }, []);



  useEffect(() => {
    if (activeChatIndex !== undefined && chatlist[activeChatIndex]) {
      const chatId = chatlist[activeChatIndex].chat_id;

      axios.get(`http://localhost:3001/api/get-chatdata/${chatId}`)
        .then(response => {
          const chatData = response.data;
          setChats(chatData.chats);
        })
        .catch(error => {
          console.error('Error fetching chat data:', error);
        });
    }
  }, [activeChatIndex, chatlist]);


  const handleChatClick = (index) => {
    setActiveChatIndex(index);
    localStorage.setItem('activeChatIndex', index.toString());
  };


  const handleCombinedSubmission = async () => {
    if (!queryText.trim() || isSendingQuery) {
      return; // If the query is empty or a query is already being sent, do nothing
    }

    // Disable the send button while waiting for the response
    setIsSendingQuery(true);

    try {
      // Format the user's query for the backend
      const userQuery = { role: 'user', content: queryText };
      // Update user's query in the state
     setChats((prevChats) => [...prevChats, userQuery]);


      // Make API call to update user's query in the backend
      const userQueryResponse = await axios.post('http://localhost:3001/api/update-chat', {
        chat_id: chatlist[activeChatIndex].chat_id,
        newChat: userQuery,
      });

      //api to flask server to document search
      const query_search = await axios.post('http://127.0.0.1:5002/api/fetch-query',
                                             {index_name:chatlist[activeChatIndex].doc_index,
                                              query:userQuery.content})

    // console.log(query_search.data.query_result.documents[0][0])

    let context = query_search.data.query_result.documents[0][0]

     // Access your API key (see "Set up your API key" above)
     const genAI = new GoogleGenerativeAI('API_KEY');
  
     // For text-only input, use the gemini-pro model
     const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

     const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    prompt =[
      `You are a chatbot that will answer user's query using provided context.\
      Context: ${context}.\
      Query: ${userQuery.content}.\
      Answer:    `
    ]

    try {
      // Use streaming with text-only input
      // Make a request to the LLM API with the formatted user's query
      const result = await model.generateContentStream(prompt)
      let text = ''
      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        console.log(chunkText)
        text += chunkText
     

      }
      console.log('Final Text:', text)
      // Append the AI's response to the chats array
      const aiResponse = { role: 'ai', content: text };
      setChats((prevChats) => [...prevChats, aiResponse]);
       // You can return the generated text or use it as needed

      // Clear the queryText after sending
      setQueryText('');


      // Make API call to update AI's response in the backend
      const aiResponseUpdate = await axios.post('http://localhost:3001/api/update-chat', {
        chat_id: chatlist[activeChatIndex].chat_id,
        newChat: aiResponse,
      });

      console.log(chats)


    } catch (error) {
      console.error('Error in Generative AI:', error)
      throw error; // Rethrow the error or handle it as needed
    }

    } catch (error) {
      // Handle errors from the API calls
      console.error('Error processing/querying:', error);
    } finally {
      // Enable the send button after processing the query (whether successful or not)
      setIsSendingQuery(false);
    }
  };

  // Function to handle file selection
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };
 

  
  const handleFileUpload = async () => {
    if (!selectedFile) {
      console.error('No file selected for upload.');
      return;
    }
  
    console.log('Selected File:', selectedFile);
  
    setUploadStatus({ uploading: true, success: false, error: false });
    setEmbeddingStatus(''); // Reset embedding status before starting the process
  
    const formData = new FormData();
    formData.append('file', selectedFile);
  
    try {
      console.log('Uploading file...');
  
      // Assuming you have access to the current project ID, use it here
      const currentProjectId = chatlist[activeChatIndex].project_id;
  
      // Append the current project ID to the formData
      formData.append('project_id', currentProjectId);
  
      // Send a request to the Node.js server for file upload
      const response = await axios.post('http://localhost:3001/api/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      console.log('Upload response:', response.data);
  
      // Check if the file was successfully uploaded
      if (response.data.success) {
        // Update the state to indicate that embedding generation is in progress
        setEmbeddingStatus('generating');
  
        // Send an API call to the Flask Python server with the obtained URL
        const flaskResponse = await axios.post('http://127.0.0.1:5002/api/generated-embedding', {
          url: response.data.url, // Assuming the key is 'url'
          // Add any other necessary data to be sent to the Flask server
        });
  
        console.log('Flask Server response:', flaskResponse.data);
  
        // Update the state based on the Flask server response
        if (flaskResponse.data.success) {
          // If the Flask server response includes an index_name, update the project in the Node.js server
          const doc_index = flaskResponse.data.doc_index;
          if (doc_index) {
            // Send a request to the Node.js server to update the project database
            const nodeServerResponse = await axios.post('http://localhost:3001/api/update-project', {
              project_id: currentProjectId,
              doc_index: doc_index,
            });
  
            console.log('Node Server response:', nodeServerResponse.data);
  
            // Check if the update was successful and set the state accordingly
            if (nodeServerResponse.data.success) {
              setIsChatIndexSet(true); // Set the state to true if the chat index is successfully set
              setUploadStatus({ uploading: false, success: true, error: false });
              setEmbeddingStatus('success');
            } else {
              setIsChatIndexSet(false); // Set the state to false if there was an error setting the chat index
              setUploadStatus({ uploading: false, success: false, error: true });
              setEmbeddingStatus('error');
            }
          } else {
            // Handle the case where index_name is not provided in Flask server response
            setIsChatIndexSet(false); // Set the state to false if there was no index_name
            setUploadStatus({ uploading: false, success: false, error: true });
            setEmbeddingStatus('error');
          }
        } else {
          // Handle the case where embedding generation in Flask server failed
          setIsChatIndexSet(false); // Set the state to false if there was an error in embedding generation
          setUploadStatus({ uploading: false, success: false, error: true });
          setEmbeddingStatus('error');
        }
      } else {
        // Handle the case where file upload to Node.js server failed
        setIsChatIndexSet(false); // Set the state to false if there was an error in file upload
        setUploadStatus({ uploading: false, success: false, error: true });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
  
      setIsChatIndexSet(false); // Set the state to false if there was an error
      setUploadStatus({ uploading: false, success: false, error: true });
      setEmbeddingStatus('error');
    }
  };
  




  return (
    <>
      <div className='flex flex-row bg-black  gap-4'>
        <div className=' flex flex-col gap-2 p-2 bg-slate-800/55 h-full w-1/12 '>
          {useGoogleOneTapLogin({
            disabled: loggedin ? true : false,
            onSuccess: credentialResponse => {
              localStorage.setItem('accestoken', credentialResponse.credential);
              localStorage.setItem('loggedin', true);
              setAccesstoken(credentialResponse.credential);
              setUsercred(jwtDecode(credentialResponse.credential));
              setLoggedin(true);
            },
            onError: () => {
              console.log('Login Failed');
            },
          })}
          {loggedin ? (
            <div className='flex flex-row bg-blue-900 p-1 rounded-xl w-fit'>
              
              <a className='text-white font-bold text-lg'>{usercred.name}</a>
              <img src={usercred.picture} className='w-14 h-14 rounded-full p-2' alt="user-pic" />
            </div>
          ) : (
            <>
              <a className='text-white font-bold text-lg'>Not logged in.</a>
            </>
          )}
          <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={closeModal}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/25" />
              </Transition.Child>
              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        Enter name for new chat
                      </Dialog.Title>
                      <div className="mt-2">
                        <input className="text-sm text-gray-500" placeholder='Type name here.'
                          onChange={(event) => setChatname(event.target.value)} />
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          onClick={newChat}
                        >
                          Create
                        </button>
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          onClick={closeModal}
                        >
                          Close
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
          <button className='text-orange-600 font-mono p-2 font-semibold border-white border-2 rounded-lg text-center mb-2 ' onClick={openModal} >Create new chat.</button>
          {chatlist?.map((chat, index) => (
            <a
              key={index}
              className={`text-white font-mono p-2 font-semibold border-white border-2 rounded-lg text-center cursor-pointer ${activeChatIndex === index ? 'bg-blue-500' : 'bg-gray-500'
                }`}
                onClick={() => {
                  handleChatClick(index);
                  setIsProjectSelected(true);
                }}
            >
              {chat.project_name || 'Error ocured'}
            </a>
          ))}
        </div>
        <div className='flex flex-col h-full w-3/5'>
          <p className='text-yellow-500 text-3xl font-extrabold text-center align-top self-center'>Chat with docs</p>
          <div className='flex flex-col gap-2  flex-container' >
            
            {chats && chats.length > 0 ? (
              chats.map((chat, index) => (
                <p
                key={index}
                className={`text-white font-bold ${
                  (chat.role === 'user' ? 'bg-green-800/35' : chat.role === 'ai' ? 'bg-yellow-700/35' : '')
                } p-4 rounded-3xl`}
              >
                 
                 {`${chat.role}: `}
               
                <span className='font-normal' >
                {chat.content}
                </span>
              </p>
              ))
            ) : (<>
              <p className='text-white'>No chats yet</p>
              </>
            )}
          </div>
      
           {isProjectSelected && (
  <div className='flex flex-row fixed bottom-8 gap-4 h-10 mb-3 w-3/5'>
    {/* File Input and Button */}
    {!chatlist[activeChatIndex]?.index ? (
      <>
      {/* <p className='text-white'>index is false show only file uploade thing</p> */}
        <input type="file" id="file" style={{ display: "none" }} onChange={handleFileChange} />
        <label htmlFor="file">
          <FontAwesomeIcon icon={faFilePdf} size='xl' style={{ color: "#f39512" }} className='p-2 bg-slate-600 mb-1 rounded-2xl' />
        </label>
        <button
          className='text-white border-white border-2 p-3 self-center rounded-3xl'
          onClick={handleFileUpload}
          disabled={uploadStatus.uploading} // Disable the button during uploading
        >
          {uploadStatus.uploading ? 'Uploading...' : 'Upload Docs'}
        </button>
      </>
    ) : (
      <>
      {/* <p className='text-white'>index is true show only query input and button</p> */}
          <textarea
      placeholder='Type Query here'
      className='text-black resize-none w-7/12  bg-slate-500 rounded-3xl p-2'
      value={queryText}
      onChange={(e) => setQueryText(e.target.value)}
    ></textarea>

 
    <button
      className='text-white'
      onClick={handleCombinedSubmission}
      disabled={isSendingQuery} // Disable the button when a query is being sent
    >
      {isSendingQuery ? 'Sending...' : 'Send'}
    </button>


    {uploadStatus.success && <p className='text-green-500'>Upload successful!</p>}
    {uploadStatus.error && <p className='text-red-500'>Error uploading file.</p>}
    {embeddingStatus === 'generating' && <p className='text-blue-500'>Generating embeddings...</p>}
    {embeddingStatus === 'success' && <p className='text-green-500'>Embeddings generated successfully!</p>}
    {embeddingStatus === 'error' && <p className='text-red-500'>Error generating embeddings.</p>}
      </>
    
    )}

    

  </div>
)}

        </div>
      </div>

    </>
  )
}

export default App;
