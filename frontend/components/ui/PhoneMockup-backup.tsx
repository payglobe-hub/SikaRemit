'use client'

import React from 'react'

export default function PhoneMockup() {
  return (
    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[8px] rounded-[3.5rem] h-[600px] w-[300px] shadow-2xl">
      <div className="rounded-[2.5rem] overflow-hidden w-full h-full bg-white dark:bg-gray-900">
        {/* Phone Screen Content */}
        <div className="flex flex-col h-full">
          {/* Status Bar */}
          <div className="bg-gray-900 dark:bg-black px-6 py-2 flex justify-between items-center">
            <span className="text-white text-xs font-medium">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-white rounded-sm"></div>
              <div className="w-4 h-3 bg-white rounded-sm"></div>
              <div className="w-4 h-3 bg-white rounded-sm"></div>
            </div>
          </div>
          
          {/* App Content */}
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 p-6">
            {/* SikaRemit App Interface */}
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">S</span>
                </div>
                <h3 className="text-gray-900 dark:text-white font-bold text-lg">SikaRemit</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Send money instantly</p>
              </div>
              
              {/* Balance Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">GHS 1,250.00</p>
                <div className="mt-3 flex gap-2">
                  <div className="h-2 bg-green-500 rounded-full flex-1"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full w-8"></div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 dark:text-blue-400 text-sm">↑</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Send</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-600 dark:text-green-400 text-sm">↓</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Receive</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-600 dark:text-purple-400 text-sm">⚡</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Pay</p>
                </div>
              </div>
              
              {/* Recent Transaction */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 dark:text-orange-400 text-sm">📱</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Airtime</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">MTN • 2 min ago</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">-GHS 50.00</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Success</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Navigation */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex justify-around">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-7 w-40 bg-gray-800 dark:bg-gray-800 rounded-b-3xl"></div>
    </div>
  )
}
