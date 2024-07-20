import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, defer, RouterProvider } from 'react-router-dom'
import App from './App'
import constants from './constants'
import { action as taskAction, TaskForm, loader as taskLoader } from './tasks/TaskForm'
import { action as tasksAction, loader as tasksLoader, TaskTable } from './tasks/TaskTable'

function Home() {
    document.title = `Home | ${constants.title}`
    return (
        <div className='text-center mt-5'>
            <style>
                {`
                    @keyframes rotate {
                        to { transform: rotate(360deg) }
                    }
                `}

            </style>
            <img src='/icon.png' alt='icon' width='300' className='me-5' style={{ animation: 'rotate 1s infinite' }} />
            <img src='/label.png' alt='label' width='300' />
            <h1 className='mt-5'>A web application that manages data synchronization tasks.</h1>
        </div>
    )
}

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <h1 className='text-center mt-5'>Something went wrong!</h1>,
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: 'tasks',
                element: <TaskTable />,
                loader: tasksLoader,
                action: tasksAction
            },
            {
                path: 'tasks/create',
                element: <TaskForm />,
                loader: () => defer({ promise: Promise.resolve(null) }),
                action: taskAction
            },
            {
                path: 'tasks/:id',
                element: <TaskForm />,
                loader: taskLoader,
                action: taskAction
            }
        ]
    }
])

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
)