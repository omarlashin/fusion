from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Optional

from flask import json
from sqlalchemy import PickleType
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column

from server.database import db

@dataclass
class Task(db.Model):
    id: Mapped[int] = mapped_column('id', primary_key=True)
    name: Mapped[str] = mapped_column('name', unique=True)
    running: Mapped[Optional[bool]] = mapped_column('running')
    sync_times: Mapped[Optional[int]] = mapped_column('sync_times')
    sync_rate: Mapped[Optional[int]] = mapped_column('sync_rate')
    source: Mapped[MutableDict] = mapped_column('source', MutableDict.as_mutable(PickleType))
    destination: Mapped[MutableDict] = mapped_column('destination', MutableDict.as_mutable(PickleType))
    last_run: Mapped[Optional[datetime]] = mapped_column('last_run')
    last_result: Mapped[Optional[bool]] = mapped_column('last_result')

    def __str__(self) -> str:
        return json.dumps(asdict(self))