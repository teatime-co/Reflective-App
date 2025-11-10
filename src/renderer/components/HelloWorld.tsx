import React from 'react'

function HelloWorld() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hello World
        </h1>
        <p className="text-lg text-gray-600">
          Reflective - Local-first Journaling App
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Electron + React + TypeScript
        </p>
      </div>
    </div>
  )
}

export default HelloWorld
