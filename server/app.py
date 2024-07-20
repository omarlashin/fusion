import os

from flask import Flask, json
from flask_json import FlaskJSON
from sqlalchemy import update

from server.database import db
from server.models import task
from server.resources import tasks

app = Flask(__name__, instance_path=os.path.join(os.path.dirname(__file__), 'instance'), instance_relative_config=True)
app.config.from_file('config.json', json.load)

FlaskJSON(app)

db.init_app(app)
with app.app_context():
    db.create_all()
    
    # No background tasks are running when the application is starting.
    db.session.execute(update(task.Task).values(running=False))
    db.session.commit()
    
    db._session = db.sessionmaker(db.engine)

tasks.startup()
app.register_blueprint(tasks.bp)