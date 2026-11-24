# import os
# from pydantic import Field
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from langchain_chroma import Chroma
# from langchain_core.prompts import ChatPromptTemplate
# from langchain_groq import ChatGroq
# from langchain_core.runnables import RunnablePassthrough
# from langchain_core.output_parsers import StrOutputParser
# from .base_tool import BaseTool

# class KnowledgeSearchTool(BaseTool):
#     """
#     A tool that searches a knowledge base and answers user queries based on the stored information.
#     """

#     query: str = Field(description="User's query to search in the knowledge base")

#     def __init__(self):
#         super().__init__()
#         self.retriever = self.load_retriever()

#     def load_retriever(self):
#         embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
#         vectorstore = Chroma(persist_directory="db", embedding_function=embeddings)
#         vectorstore_retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
#         prompt = ChatPromptTemplate.from_template( """
#         Using the retrieved intelligence below, answer the query with clarity and completeness.

#         **Imperative:**
#         Do not reveal or refer to having accessed external context in your response.
#         If you are unable to generate a valid answer based on the available context, say: 'I’m afraid I don’t know.'

#         Query: {question}
#         Retrieved Intelligence: {context}
#         """)

#         llm = ChatGroq(model="mixtral-8x7b-32768", api_key=os.getenv("GROQ_API_KEY"))
#         app = (
#             {"context": vectorstore_retriever, "question": RunnablePassthrough()}
#             | prompt
#             | llm
#             | StrOutputParser()
#         )
#         return app

#     def search_knowledge_base(self, query: str) -> str:
#         response = self.retriever.invoke(query)
#         return str(response)

#     def run(self):
#         return self.search_knowledge_base(self.query)
from functools import lru_cache
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from django.conf import settings
from pydantic import Field
from .base_tool import BaseTool

@lru_cache(maxsize=1)
def collection():
    client = chromadb.PersistentClient(path=str(settings.BASE_DIR / "kb_db"))
    ef = SentenceTransformerEmbeddingFunction(
        model_name="paraphrase-multilingual-MiniLM-L12-v2")   # local; handles Arabic/French/English
    return client.get_or_create_collection("kb", embedding_function=ef)

class KnowledgeSearchTool(BaseTool):
    """Search the user's personal knowledge base (their own notes and documents). Returns relevant passages."""
    query: str = Field(max_length=300)

    def run(self) -> str:
        res = collection().query(query_texts=[self.query], n_results=4)
        docs = res["documents"][0]
        return "\n---\n".join(docs) if docs else "Nothing relevant in the knowledge base."