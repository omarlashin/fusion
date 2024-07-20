import pandas as pd

from server.syncer import netsuite, sharepoint
from server.syncer.utils import DataType


def read(dtype: DataType, props: dict) -> pd.DataFrame:
    match dtype:
        case DataType.SHAREPOINTEXCEL:
            return sharepoint.read(props)
        case DataType.NETSUITE:
            return netsuite.read(props['query'])
    
    raise TypeError('dtype should be an instance of utils.DataType.')

def write(dtype: DataType, props: dict, dataframe: pd.DataFrame):
    match dtype:
        case DataType.SHAREPOINTEXCEL:
            sharepoint.write(props, dataframe)
        case DataType.NETSUITE:
            netsuite.write(dataframe)
        case _:
            raise TypeError('dtype should be an instance of utils.DataType.')