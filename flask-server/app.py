from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler


from langchain.prompts import PromptTemplate
from langchain.schema import (SystemMessage, HumanMessage , AIMessage)
from langchain.embeddings import OllamaEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI

from langchain.document_loaders import PyPDFLoader

from langchain_google_genai import GoogleGenerativeAIEmbeddings


import time
import pandas as pd
from tqdm.auto import tqdm
import uuid
import os


import chromadb

from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)

CORS(app)  # Enable CORS for the entire app


chroma_client = chromadb.HttpClient(host='localhost', port=6969)


 


@app.route('/api/generated-embedding', methods=['POST'])
def generated_embedding():
    try:
        # Get the URL from the request
        url = request.json.get('url')
        print('Received URL:', url)

        # Check if the URL is provided
        if not url:
            return jsonify({'error': 'URL not provided'}), 400

        # Load PDF and generate embeddings
        index_name = str(uuid.uuid4())

        loader = PyPDFLoader(url)
        data = loader.load() 
      
        # data =str(data[0].page_content) 


        text_data = ""

  

        for i in tqdm(range(0, len(data))):
            tex = data[i].page_content
            text_data += str(tex)

        print(text_data)



         
        # print('Embeddings Data:', data)

        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=400,
            chunk_overlap=30,
            length_function=len,
            is_separator_regex=False,
        )
        texts = text_splitter.split_text(text_data)

        collection = chroma_client.create_collection(name=index_name ,metadata={"hnsw:space": "cosine"} )


        index = collection

        # Embed and upload text chunks to Pinecone
        embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001" , google_api_key="API_KEY")
        
        embeddings= []
        documents =[]
        ids =[]

        for i in tqdm(range(0, len(texts))):
            data = texts[i]
            # Embed text chunk
            embeds = embedding_model.embed_documents([data])

            embeddings.append(embeds[0])

            documents.append(data)
            ids.append(f'id{i}')

        
        print(embeddings)
        print(documents)
        print(ids)

    # Add to chroma db
        collection.add(embeddings=embeddings,
                       documents=documents,
                       ids=ids)
        
           

        # Return the result
        return jsonify({'success': True, 'message': 'Embeddings generated and uploaded successfully', 'doc_index': index_name}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'error': str(e)}), 500
    

# Endpoint to fetch query results using ChromaDB
@app.route('/api/fetch-query', methods=['POST'])
def fetch_query():
    try:
        # Get the index name from the request
        index_name = request.json.get('index_name')
        print('Received Index Name:', index_name)

        # Check if the index name is provided
        if not index_name:
            return jsonify({'error': 'Index name not provided'}), 400

        # Get the collection using the provided index name
        collection = chroma_client.get_collection(name=index_name)

        # Get the query from the request
        query = request.json.get('query')
        print('Received Query:', query)

        # Check if the query is provided
        if not query:
            return jsonify({'error': 'Query not provided'}), 400

        # Initialize the embedding model
        embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key="API_KEY")

        # Embed the query using ChromaDB
        embeds = embedding_model.embed_query([query])

        # Perform a query on the collection
        query_result = collection.query(
            query_embeddings=embeds,
            n_results=1,
        )

        # Print the query result for demonstration purposes
        print('Query Result:', query_result)

        return jsonify({'success': True, 'message': 'Query executed successfully', 'query_result': query_result}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'error': str(e)}), 500









if __name__ == '__main__':
    app.run(debug=True, port=5002)