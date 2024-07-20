import { useAsyncError } from "react-router-dom"

export function Spinner() {
    return (
        <div className='text-center mt-5'>
            <div className='spinner-border text-success fs-5' style={{ width: '5rem', height: '5rem' }}></div>
        </div>
    )
}

export function OverlaySpinner() {
    return (
        <div
            className='bg-black bg-opacity-10 fixed-top w-100 h-100 d-flex justify-content-center align-items-center'
            style={{ zIndex: '1500' }}>
            <div className='spinner-border text-success fs-5' style={{ width: '5rem', height: '5rem' }}></div>
        </div>
    )
}

export function AsyncError() {
    const error = useAsyncError()
    const message = (error.response && error.response.data.message) || error.message
    return <h1 className='text-center'>{message}</h1>
}