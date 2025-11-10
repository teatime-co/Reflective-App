import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HelloWorld from './components/HelloWorld'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HelloWorld />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
