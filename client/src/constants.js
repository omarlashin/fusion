const development = {
    'url': '',
    'title': 'Fusion'
}

const production = {
    'url': 'http://localhost:5000',
    'title': 'Fusion'
}

const constants = process.env.NODE_ENV === 'development' ? development : production
export default constants