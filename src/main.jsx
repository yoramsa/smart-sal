import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SharedList from './SharedList.jsx'
import './index.css'

const params = new URLSearchParams(window.location.search)
const Root = params.has('app') ? App : SharedList

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
