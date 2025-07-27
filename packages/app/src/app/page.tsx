import React from 'react';
import Link from 'next/link';
import { UserMenu } from '../components/auth/UserMenu';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-green-600">BluPoker</h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center max-w-4xl">
        <h1 className="text-6xl font-bold text-green-600 mb-4">
          Hello Poker
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Play-money Texas Hold&apos;em poker server + browser client with real-time multiplayer
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <Link href="/lobby" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 px-6 rounded-lg shadow-lg transition-colors">
            <div className="text-2xl mb-2">🎭</div>
            <div className="text-lg font-bold mb-2">Game Lobby</div>
            <div className="text-sm opacity-90">Browse and join multiplayer games</div>
          </Link>
          
          <Link href="/table" className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-6 rounded-lg shadow-lg transition-colors">
            <div className="text-2xl mb-2">🎮</div>
            <div className="text-lg font-bold mb-2">Single Table</div>
            <div className="text-sm opacity-90">Quick 2-player poker table</div>
          </Link>
          
          <Link href="/deck" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-6 rounded-lg shadow-lg transition-colors">
            <div className="text-2xl mb-2">🃏</div>
            <div className="text-lg font-bold mb-2">Deck Demo</div>
            <div className="text-sm opacity-90">Test card shuffling and dealing algorithms</div>
          </Link>
          
          <Link href="/debug" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-6 px-6 rounded-lg shadow-lg transition-colors">
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-lg font-bold mb-2">Debug Dashboard</div>
            <div className="text-sm opacity-90">Internal debugging and health monitoring</div>
          </Link>
        </div>
        
        <div className="mt-12 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <h3 className="font-bold text-green-600">🔗 Shareable Game URLs</h3>
              <p className="text-sm">Each game gets a unique URL like /table/abc123 for easy sharing</p>
            </div>
            <div>
              <h3 className="font-bold text-green-600">⚡ Real-time Updates</h3>
              <p className="text-sm">Server-Sent Events provide instant game state synchronization</p>
            </div>
            <div>
              <h3 className="font-bold text-green-600">🎯 Heads-up Texas Hold&apos;em</h3>
              <p className="text-sm">Complete poker engine with betting, dealing, and hand evaluation</p>
            </div>
            <div>
              <h3 className="font-bold text-green-600">🛠️ Built-in Debugging</h3>
              <p className="text-sm">Comprehensive debug tools eliminate external dependencies</p>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}