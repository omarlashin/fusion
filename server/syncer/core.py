import logging

from server.syncer import dio, processing
from server.syncer.utils import DataType

logger = logging.getLogger(__name__)

def synchronize(props: dict):
    dataframe = dio.read(DataType[props['source']['datatype']], props['source'])
    transformed = processing.transform(dataframe)
    dio.write(DataType[props['destination']['datatype']], props['destination'], transformed)