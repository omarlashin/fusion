import axios from 'axios'
import { Suspense, useEffect, useState } from 'react'
import { Await, Form, defer, redirect, useLoaderData, useNavigation, useParams } from "react-router-dom"
import { AsyncError, OverlaySpinner } from '../components'
import constants from '../constants'
import datatypes from './datatypes'

export function loader({ params }) {
    const promise = axios.get(`${constants.url}/resources/tasks/${params.id}/`).then(response => response.data)
    return defer({ promise })
}

export async function action({ params, request }) {
    const formData = await request.formData()
    const intent = formData.get('intent')

    if (intent === 'delete') {
        return await axios.delete(`${constants.url}/resources/tasks/${params.id}/`)
            .then(() => redirect('/tasks'))
            .catch(error => {
                alert(error.response.data.message || error.message)
                return null
            })
    }

    formData.delete('intent')
    const data = { source: {}, destination: {} }
    for (const [key, value] of formData) {
        if (key.startsWith('source_')) data.source[key.slice(7)] = value
        else if (key.startsWith('destination_')) data.destination[key.slice(12)] = value
        else data[key] = value
    }

    data.sync_rate *= 60
    if (data.source.headers_row) data.source.headers_row -= 1
    if (data.source.headers) data.source.headers = data.source.headers.split('\n')

    if (intent === 'post') {
        return await axios.post(`${constants.url}/resources/tasks/`, data)
            .then(() => redirect('/tasks'))
            .catch(error => {
                alert(error.response.data.message || error.message)
                return null
            })
    }

    if (intent === 'put') {
        return await axios.put(`${constants.url}/resources/tasks/${params.id}/`, data)
            .then(() => redirect('/tasks'))
            .catch(error => {
                alert(error.response.data.message || error.message)
                return null
            })
    }
}

export function TaskForm() {
    const [sourceType, setSourceType] = useState()
    const [destinationType, setDestinationType] = useState()
    const { promise } = useLoaderData()
    const navigation = useNavigation()
    const params = useParams()
    if (!params.id) document.title = `Create Task | ${constants.title}`

    useEffect(
        () => {
            (async function () {
                const task = await promise
                if (task) {
                    setSourceType(task.source.datatype)
                    setDestinationType(task.destination.datatype)
                }
            })()
        },
        // eslint-disable-next-line
        []
    )

    return (
        <Suspense fallback={<OverlaySpinner />}>
            <Await resolve={promise} errorElement={<AsyncError />}>
                {
                    (task) => {
                        if (task) {
                            document.title = `${task.name} | ${constants.title}`
                        }

                        return (
                            <div className='container'>
                                {(navigation.state === 'submitting') && <OverlaySpinner />}
                                {(!params.id) && <h1>Task Creation <hr /></h1>}
                                <Form method='post'>
                                    <div className='form-floating mb-3'>
                                        <input className='form-control' id='name' name='name' placeholder='Task name' defaultValue={task?.name} required />
                                        <label htmlFor='name'>Task name</label>
                                    </div>
                                    <div className='form-floating mb-3'>
                                        <input type='number' className='form-control' id='sync_times' name='sync_times' placeholder='Times to synchronize (0: infinity)' min={0} defaultValue={task?.sync_times} required />
                                        <label htmlFor='sync_times'>Times to execute (0: infinity)</label>
                                    </div>
                                    <div className='form-floating mb-3'>
                                        <input type='number' className='form-control' id='sync_rate' name='sync_rate' placeholder='Synchronization rate (minutes)' min={1} defaultValue={task && task.sync_rate / 60} required />
                                        <label htmlFor='sync_rate'>Synchronization rate (minutes)</label>
                                    </div>
                                    <div className='form-floating mb-3'>
                                        <select className='form-select' id='source_datatype' name='source_datatype' defaultValue={task?.source.datatype} onChange={(event) => setSourceType(event.target.value)} required>
                                            {!task && <option></option>}
                                            {datatypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                        </select>
                                        <label htmlFor="source_datatype">Source datatype</label>
                                    </div>
                                    {
                                        sourceType === datatypes[0][0] ?
                                            <>
                                                <div className='form-floating mb-3'>
                                                    <input className='form-control' id='source_file_url' name='source_file_url' placeholder='Source file URL' defaultValue={task?.source.file_url} required />
                                                    <label htmlFor='source_file_url'>Source file URL</label>
                                                </div>
                                                <div className='form-floating mb-3'>
                                                    <input className='form-control' id='source_sheet_name' name='source_sheet_name' placeholder='Source sheet name' defaultValue={task?.source.sheet_name} required />
                                                    <label htmlFor='source_sheet_name'>Source sheet name</label>
                                                </div>
                                                <div className='form-floating mb-3'>
                                                    <input type='number' className='form-control' id='source_headers_row' name='source_headers_row' placeholder='Headers row number' min={1} defaultValue={task && task.source.headers_row + 1} required />
                                                    <label htmlFor='source_headers_row'>Headers row number</label>
                                                </div>
                                                <div className='input-group mb-3'>
                                                    <span className='input-group-text'>Headers to include<br />in the destination<br />(one header per line)</span>
                                                    <textarea className='form-control' name='source_headers' rows={5} defaultValue={task?.source.headers.join('\n')} required></textarea>
                                                </div>
                                            </> :
                                            sourceType === datatypes[1][0] ?
                                                <div className='form-floating mb-3'>
                                                    <input className='form-control' id='source_query' name='source_query' placeholder='SuiteQL query' defaultValue={task?.source.query} required />
                                                    <label htmlFor='source_query'>SuiteQL query</label>
                                                </div> :
                                                <></>
                                    }
                                    <div className='form-floating mb-3'>
                                        <select className='form-select' id='destination_datatype' name='destination_datatype' defaultValue={task?.destination.datatype} onChange={(event) => setDestinationType(event.target.value)} required>
                                            {!task && <option></option>}
                                            {datatypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                        </select>
                                        <label htmlFor="destination_datatype">Destination datatype</label>
                                    </div>
                                    {
                                        destinationType === datatypes[0][0] ?
                                            <>
                                                <div className='form-floating mb-3'>
                                                    <input className='form-control' id='destination_file_url' name='destination_file_url' placeholder='Destination file URL' defaultValue={task?.destination.file_url} required />
                                                    <label htmlFor='destination_file_url'>Destination file URL</label>
                                                </div>
                                                <div className='form-floating mb-3'>
                                                    <input className='form-control' id='destination_sheet_name' name='destination_sheet_name' placeholder='Destination sheet name' defaultValue={task?.destination.sheet_name} required />
                                                    <label htmlFor='destination_sheet_name'>Destination sheet name</label>
                                                </div>
                                            </> :
                                            destinationType === datatypes[1][0] ?
                                                <h3 className='text-center text-danger'>
                                                    This isn't yet implemented! Please choose another destination datatype.
                                                </h3> :
                                                <></>
                                    }
                                    {
                                        params.id ?
                                            <>
                                                <button type='submit' className='btn btn-primary me-2' name='intent' value='put'>Save</button>
                                                <button type='submit' className='btn btn-danger' name='intent' value='delete'>Delete</button>
                                            </> :
                                            <button type='submit' className='btn btn-primary' name='intent' value='post'>Create</button>
                                    }
                                </Form>
                            </div>
                        )
                    }
                }
            </Await>
        </Suspense>
    )
}