import io
import json
import os
import re

import pandas as pd
from office365.sharepoint.client_context import ClientContext

CONTEXTS = {}

def validate(url: str) -> tuple[str]:
    regex = re.compile(r'^(https://(.+?)\.sharepoint\.com)(/sites/.+?/)(Shared Documents/.+?\.xlsx)')
    match = regex.match(url)
    if not match:
        raise ValueError('URL should be in form "https://[subdomain].sharepoint.com/sites/[site-name]/Shared Documents/[path-to-file.xlsx]"')
    return match.groups()

def connect(url: str) -> tuple[ClientContext, str]:
    global CONTEXTS
    base_url, subdomain, site, path = validate(url)

    with open(os.path.join(os.path.dirname(__file__), 'auth', 'sharepoint.json')) as file:
        auth = json.load(file)
    
    key = (f'{base_url}{site}', auth['thumbprint'])
    if key not in CONTEXTS:
        CONTEXTS[key] = ClientContext(key[0]).with_client_certificate(f'{subdomain}.onmicrosoft.com', **auth)
    return CONTEXTS[key], path

def read(props: dict) -> pd.DataFrame:
    ctx, path = connect(props['file_url'])
    
    with io.BytesIO() as buffer:
        ctx.web.get_file_by_url(path).download(buffer).execute_query()
        dataframe = pd.read_excel(buffer, sheet_name=props['sheet_name'], header=props['headers_row'], usecols=props['headers'], dtype=str)
    
    return dataframe

def write(props: dict, dataframe: pd.DataFrame):
    with io.BytesIO() as buffer:
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            dataframe.to_excel(writer, sheet_name=props['sheet_name'], index=False)
            writer.book.formats[0].set_font_name('Aptos Narrow (Body)')
            sheet = writer.sheets[props['sheet_name']]
            last_row, last_column = dataframe.shape
            headers = [{'header': header} for header in dataframe.columns]
            sheet.add_table(0, 0, last_row, last_column - 1, {'columns': headers, 'style': 'Table Style Medium 2'})
            sheet.autofit()
        
        ctx, path = connect(props['file_url'])
        ctx.web.get_file_by_url(path).save_binary_stream(buffer.getvalue()).execute_query()