import datetime
import json
import os

import jwt
import pandas as pd
import requests


def connect() -> str:
    with open(os.path.join(os.path.dirname(__file__), 'auth', 'netsuite.json')) as file:
        auth = json.load(file)
    
    iat = datetime.datetime.now()
    exp = iat + datetime.timedelta(hours=1)
    auth['token']['payload'].update(iat=int(iat.timestamp()), exp=int(exp.timestamp()))
    auth['body']['client_assertion'] = jwt.encode(**auth['token'])

    response = requests.post(auth['endpoint'], data=auth['body'])
    response.raise_for_status()
    return response.json()['access_token']

def read(query: str) -> pd.DataFrame:
    token = connect()
    headers = {
        'Authorization': f'Bearer {token}',
        'Prefer': 'transient'
    }
    data = {
        'hasMore': True,
        'links': [{'href': 'https://7180450.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql'}]
    }
    items = []

    while data['hasMore']:
        response = requests.post(data['links'][0]['href'], json={'q': query}, headers=headers)
        response.raise_for_status()
        data = response.json()
        items += data['items']
    
    dataframe = pd.DataFrame.from_records(items, exclude=['links'])
    return dataframe

def write(dataframe: pd.DataFrame):
    raise NotImplementedError