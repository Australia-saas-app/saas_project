import React from 'react'

const LoadingComponent = () => {
  return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-sky-50 px-6">
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-20 h-20 rounded-full border-8 border-t-indigo-600 border-gray-200 animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    </div>
  )
}

export default LoadingComponent
