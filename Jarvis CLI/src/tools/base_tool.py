from abc import ABC, abstractmethod
from instructor import OpenAISchema


# Define the BaseTool abstract class
class BaseTool(ABC, OpenAISchema):
    @abstractmethod
    def run(self):
        pass


# from abc import ABC, abstractmethod
# from instructor import OpenAISchema
# from pydantic import BaseModel, Field
# from typing import Dict, Any
# import inspect

# class BaseTool(ABC, OpenAISchema):
#     @abstractmethod
#     def run(self):
#         pass
    
#     @classmethod
#     def get_openai_schema(cls) -> Dict[str, Any]:
#         """Get the serializable schema dictionary"""
#         schema = {
#             "name": cls.__name__,
#             "description": cls.__doc__ or "",
#             "parameters": {
#                 "type": "object",
#                 "properties": {},
#                 "required": []
#             }
#         }
        
#         # Get field information from Pydantic model
#         for field_name, field in cls.__fields__.items():
#             field_info = {
#                 "type": "string",  # Default type
#                 "description": field.field_info.description or ""
#             }
            
#             # Try to get actual type if available
#             if hasattr(field, "annotation"):
#                 type_name = str(field.annotation.__name__).lower()
#                 if type_name in ["str", "int", "float", "bool", "list", "dict"]:
#                     field_info["type"] = type_name
            
#             schema["parameters"]["properties"][field_name] = field_info
            
#             if field.required:
#                 schema["parameters"]["required"].append(field_name)
                
#         return schema

#     @classmethod
#     def openai_schema(cls):
#         """Alternative schema accessor"""
#         return cls.get_openai_schema()