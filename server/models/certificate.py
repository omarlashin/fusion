from sqlalchemy.orm import Mapped, mapped_column

from server.database import db

class Certificate(db.Model):
    id: Mapped[int] = mapped_column('id', primary_key=True)
    client_id: Mapped[str] = mapped_column('client_id')
    thumbprint: Mapped[str] = mapped_column('thumbprint')
    private_key: Mapped[str] = mapped_column('private_key')