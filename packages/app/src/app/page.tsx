import React from 'react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-600 mb-4">
          Hello Poker
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Play-money Texas Hold&apos;em poker server + browser client
        </p>
      </div>
    </main>
  )
}