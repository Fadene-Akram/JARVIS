# from abc import ABC, abstractmethod
# from instructor import OpenAISchema


# # Define the BaseTool abstract class
# class BaseTool(ABC, OpenAISchema):
#     @abstractmethod
#     def run(self):
#         pass

from abc import ABC, abstractmethod
from typing import ClassVar
from pydantic import BaseModel

class BaseTool(BaseModel, ABC):
    requires_confirmation: ClassVar[bool] = False   # True for anything with side effects

    @classmethod
    def llm_schema(cls) -> dict:
        return {
            "name": cls.__name__,
            "description": (cls.__doc__ or "").strip(),
            "parameters": cls.model_json_schema(),
        }

    @abstractmethod
    def run(self) -> str: ...