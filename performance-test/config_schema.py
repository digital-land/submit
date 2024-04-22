from enum import Enum
from typing import Literal, Optional, List, Union

from pydantic import BaseModel, Field


class RequestTypeEnum(str, Enum):
    check_url = "check_url"
    check_file = "check_file"


class Params(BaseModel):
    type: RequestTypeEnum
    dataset: str
    geom_type: Optional[str] = None


class CheckFileParams(Params):
    type: Literal[RequestTypeEnum.check_file] = RequestTypeEnum.check_file
    file_path: str
    mime_type: str


class CheckUrlParams(Params):
    type: Literal[RequestTypeEnum.check_url] = RequestTypeEnum.check_url
    url: str


class Config(BaseModel):
    journey_parameters: List[Union[CheckUrlParams, CheckFileParams]] = Field(discriminator="type")
