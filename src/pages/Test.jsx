import React from 'react'
import { Link } from 'react-router-dom'

const Test = () => {
  return (
    <div className="min-h-screen bg-light-grey p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-dark-grey">Tailwind CSS Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Test Card 1 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">Color Test</h2>
            <div className="space-y-2">
              <p className="text-red-500">This should be red text</p>
              <p className="text-green-500">This should be green text</p>
              <p className="text-blue-500">This should be blue text</p>
              <p className="text-purple-500">This should be purple text</p>
            </div>
          </div>
          
          {/* Test Card 2 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">Spacing & Sizing Test</h2>
            <div className="space-y-4">
              <div className="p-2 bg-red-100">Small padding</div>
              <div className="p-4 bg-green-100">Medium padding</div>
              <div className="p-8 bg-blue-100">Large padding</div>
            </div>
          </div>
          
          {/* Test Card 3 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">Button Test</h2>
            <div className="flex flex-wrap gap-4">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Blue Button
              </button>
              <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Red Button
              </button>
              <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Green Button
              </button>
            </div>
          </div>
          
          {/* Test Card 4 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">Layout Test</h2>
            <div className="flex justify-between items-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-full"></div>
              <div className="w-16 h-16 bg-pink-400 rounded-full"></div>
              <div className="w-16 h-16 bg-indigo-400 rounded-full"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            to="/" 
            className="inline-block bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Test