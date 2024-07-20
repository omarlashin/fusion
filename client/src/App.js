import { Link, NavLink, Outlet } from 'react-router-dom'

export default function App() {
    return (
        <>
            <nav className='navbar navbar-expand-lg bg-body-secondary' style={{ zIndex: 1600 }}>
                <div className='container-fluid'>
                    <Link to='/' className='navbar-brand my-2'>
                        <img src='/label.png' alt='Alamiya Media' width='130px'></img>
                    </Link>
                    <button className='navbar-toggler' data-bs-toggle='collapse' data-bs-target='#navbar'>
                        <span className='navbar-toggler-icon'></span>
                    </button>
                    <div className='collapse navbar-collapse' id='navbar'>
                        <ul className='navbar-nav nav-underline mx-auto'>
                            <li className='nav-item'>
                                <NavLink to='/' className='nav-link'>Home</NavLink>
                            </li>
                            <li className='nav-item'>
                                <NavLink to='/tasks' className='nav-link'>Tasks</NavLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
            <main className='py-3'>
                <Outlet />
            </main>
        </>
    )
}