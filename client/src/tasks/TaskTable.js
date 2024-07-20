import axios from 'axios'
import { Suspense, useEffect } from 'react'
import { Await, defer, Link, useFetcher, useLoaderData, useRevalidator } from 'react-router-dom'
import { AsyncError, OverlaySpinner } from '../components'
import constants from '../constants'

export async function action({ request }) {
    const { id, intent } = Object.fromEntries(await request.formData())
    try {
        await axios.patch(`${constants.url}/resources/tasks/${id}/${intent}/`)
        return intent === 'stop' ? 'stopped' : 'running'
    } catch (error) {
        alert(error.message)
        return null
    }
}

function TaskRow({ index, task }) {
    const fetcher = useFetcher()

    let lastStatus = 'N/A'
    let textColor = 'text-black'
    if (task['last_result']) {
        lastStatus = `Success - ${task.last_run}`
        textColor = 'text-success'
    } else if (task.last_result === false) {
        lastStatus = `Fail - ${task.last_run}`
        textColor = 'text-danger'
    }

    const running = fetcher.state === 'loading' ? fetcher.data === 'running' ? true : false : task.running

    return (
        <tr>
            <th scope='row'>{index + 1}</th>
            <td>
                <Link to={String(task.id)} className='btn btn-outline-secondary border-0 fw-medium'>{task.name}</Link>
            </td>
            <td>{running ? 'Running' : 'Stopped'}</td>
            <td className={textColor}>{lastStatus}</td>
            <td>
                <fetcher.Form method='post'>
                    <input type='hidden' name='id' value={task.id} />
                    {
                        running ?
                            <>
                                <button className='btn btn-link btn-lg text-danger' name='intent' value='stop'>
                                    {
                                        fetcher.state === 'submitting' ?
                                            <span className='spinner-border spinner-border-sm text-secondary'></span> :
                                            <i className='bi bi-stop'></i>
                                    }
                                </button>
                                <button className='btn btn-link btn-lg text-warning' name='intent' value='restart'>
                                    {
                                        fetcher.state === 'submitting' ?
                                            <span className='spinner-border spinner-border-sm text-secondary'></span> :
                                            <i className='bi bi-arrow-clockwise'></i>
                                    }
                                </button>
                            </> :
                            <button className='btn btn-link btn-lg' name='intent' value='start'>
                                {
                                    fetcher.state === 'submitting' ?
                                        <span className='spinner-border spinner-border-sm text-secondary'></span> :
                                        <i className='bi bi-play'></i>
                                }
                            </button>
                    }
                </fetcher.Form>
            </td>
        </tr>
    )
}

export function loader() {
    const promise = axios.get(`${constants.url}/resources/tasks/`).then(response => response.data)
    return defer({ promise })
}

export function TaskTable() {
    const { promise } = useLoaderData()
    const revalidator = useRevalidator()

    useEffect(
        () => {
            const interval = setInterval(() => {
                if (revalidator.state === 'idle') {
                    revalidator.revalidate()
                }
            }, 10000)

            return () => clearInterval(interval)
        },
        // eslint-disable-next-line
        []
    )

    document.title = `Tasks | ${constants.title}`

    return (
        <>
            <div className='container text-end'>
                <Link to='create' className='btn btn-outline-success'>New task</Link>
                <hr />
            </div>
            <Suspense fallback={<OverlaySpinner />}>
                <Await resolve={promise} errorElement={<AsyncError />}>
                    {(tasks) =>
                        tasks.length ?
                            <div className='table-responsive'>
                                <table className='table table-striped align-middle text-center'>
                                    <thead>
                                        <tr>
                                            <th scope='col'>#</th>
                                            <th scope='col'>Name</th>
                                            <th scope='col'>State</th>
                                            <th scope='col'>Last Run</th>
                                            <th scope='col'>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tasks.map((task, i) => <TaskRow key={task.id} index={i} task={task} />)}
                                    </tbody>
                                </table>
                            </div> :
                            <h1 className='text-center'>{console.log(tasks)}No tasks to show!</h1>
                    }
                </Await>
            </Suspense>
        </>
    )
}