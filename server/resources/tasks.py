import logging
import threading
from dataclasses import asdict
from datetime import datetime
from queue import Empty, Queue

import pytz
from flask import Blueprint, request
from flask_json import JsonError, as_json
from schema import And, Or, Schema, SchemaError, Use
from sqlalchemy import exc, orm, update

from server.database import db
from server.models.task import Task
from server.syncer import core, sharepoint
from server.syncer.utils import DataType

tzinfo = pytz.timezone('Asia/Riyadh')
bp = Blueprint('tasks', __name__, url_prefix='/resources/tasks')
threads: dict[int, tuple[threading.Thread, Queue]] = {}
requests = Queue()
logger = logging.getLogger(__name__)
taskschema = Schema({
    'name': And(Use(str.strip), len),
    'sync_times': And(Use(int), lambda x: x >= 0),
    'sync_rate': And(Use(int), lambda x: x >= 60),
    'source': Or(
        {
            'datatype': And(Use(str.strip), lambda x: DataType[x] is DataType.SHAREPOINTEXCEL),
            'file_url': And(Use(str.strip), sharepoint.validate, error='Invalid source file URL'),
            'sheet_name': And(Use(str.strip), len),
            'headers_row': And(Use(int), lambda x: x >= 0),
            'headers': And([And(Use(str.strip), len)], len)
        },
        {
            'datatype': And(Use(str.strip), lambda x: DataType[x] is DataType.NETSUITE),
            'query': And(Use(str.strip), len)
        }
    ),
    'destination': Or(
        {
            'datatype': And(Use(str.strip), lambda x: DataType[x] is DataType.SHAREPOINTEXCEL),
            'file_url': And(Use(str.strip), sharepoint.validate, error='Invalid destination file URL'),
            'sheet_name': And(Use(str.strip), len)
        }
    )
}, error='Schema error')

def timetrigger(task_id: int, pipe: Queue):
    sync_count = 0
    try:
        with db._session.begin() as session:
            task = session.get_one(Task, task_id)
            task.running = True
            props = asdict(task)
    except:
        logger.exception(None)
    else:
        logger.info(f'{props['name']} started successfully.')
        while props['sync_times'] == 0 or sync_count < props['sync_times']:
            result = True
            try:
                core.synchronize(props)
            except:
                result = False
                logger.exception(None)
            else:
                logger.info(f'{props['name']} synchronized successfully.')
                sync_count += 1
                if props['sync_times'] != 0 and sync_count >= props['sync_times']:
                    break
            finally:
                with db._session.begin() as session:
                    session.execute(update(Task), [{'id': task_id, 'last_run': datetime.now(tz=tzinfo), 'last_result': result}])

            try:
                pipe.get(timeout=props['sync_rate'])
            except Empty:
                pass
            else:
                break
        
        try:
            with db._session.begin() as session:
                session.execute(update(Task), [{'id': task_id, 'running': False}])
            logger.info(f'{props['name']} finished successfully.')
        except:
            logger.exception(None)
    finally:
        threads.pop(task_id, None)

def create(task_id: int) -> tuple[threading.Thread, Queue]:
    pipe = Queue()
    worker = threading.Thread(target=timetrigger, args=(task_id, pipe))
    return worker, pipe

def stop(job: tuple[threading.Thread, Queue]):
    job[1].put('stop')
    job[0].join()

def middleware():
    while True:
        task_id, action, feedback = requests.get()
        try:
            match action:
                case 'start':
                    if task_id not in threads:
                        threads[task_id] = create(task_id)
                        threads[task_id][0].start()
                case 'stop':
                    if task_id in threads:
                        stop(threads[task_id])
                case 'restart':
                    if task_id in threads:
                        stop(threads[task_id])
                        threads[task_id] = create(task_id)
                        threads[task_id][0].start()
        except Exception as exception:
            feedback.put(str(exception))
        else:
            feedback.put(True)

def startup():
    threading.Thread(target=middleware, daemon=True).start()

@bp.route('/datatypes/')
@as_json
def datatypes():
    return [[dtype.name, dtype.value] for dtype in DataType]


@bp.route('/')
@bp.route('/<int:id>/')
@as_json
def get(id: int|None=None):
    if id:
        task = db.get_or_404(Task, id, description='Invalid task ID')
        return task
    
    tasks = Task.query.all()
    return tasks

@bp.route('/', methods=['POST'])
@as_json
def post():
    try:
        data = taskschema.validate(request.json)
    
        task = Task(
            name=data['name'],
            running=False,
            sync_times=data['sync_times'],
            sync_rate=data['sync_rate'],
            source=data['source'],
            destination=data['destination'],
        )
        db.session.add(task)
        db.session.commit()
        return {'id': task.id}, 201
    except SchemaError as error:
        raise JsonError(message=error.code)
    except exc.IntegrityError:
        raise JsonError(message='Task name already exists.')
    except exc.SQLAlchemyError:
        raise JsonError(status_=500, message='Database error')
    except Exception:
        raise JsonError(status_=500, message='Unkown error')

@bp.route('/<int:id>/', methods=['PUT'])
@as_json
def put(id):
    try:
        data = taskschema.validate(request.json)
        data['id'] = id
        db.session.execute(update(Task), [data])
        db.session.commit()
        patch(id, 'restart')
    except SchemaError as error:
        raise JsonError(message=error.code)
    except orm.exc.StaleDataError:
        raise JsonError(message='Invalid task ID')
    except exc.IntegrityError:
        raise JsonError(message='Task name already exists.')
    except exc.SQLAlchemyError:
        raise JsonError(status_=500, message='Database error')
    except Exception:
        raise JsonError(status_=500, message='Unkown error')

@bp.route('/<int:id>/', methods=['DELETE'])
@as_json
def delete(id):
    try:
        task = db.get_or_404(Task, id, description='Invalid task ID')
        patch(id, 'stop')
        db.session.delete(task)
        db.session.commit()
    except exc.SQLAlchemyError:
        raise JsonError(status_=500, message='Database error')
    except Exception:
        raise JsonError(status_=500, message='Unkown error')

@bp.route('/<int:id>/<action>/', methods=['PATCH'])
@as_json
def patch(id: int, action: str):
    task = db.get_or_404(Task, id, description='Invalid task ID')
    
    match action:
        case 'start' | 'stop' | 'restart':
            feedback = Queue()
            requests.put((id, action, feedback))
            
            response = feedback.get()
            if isinstance(response, str):
                raise JsonError(message=response)
        case _:
            raise JsonError(message='Invalid action')