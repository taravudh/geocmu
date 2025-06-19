import React from 'react';
import { ArrowRight, Play } from 'lucide-react';

const Hero = () => {
  return (
    <section className="pt-20 pb-12 md:pt-24 md:pb-20 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="max-w-2xl">
            <div className="mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
                ✨ New: AI-Powered Analytics
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Transform Your
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}Workflow
              </span>
              <br className="hidden sm:block" />
              Experience
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Streamline your productivity with our intelligent platform. Built for modern teams who demand excellence and efficiency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
              
              <button className="group inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-semibold shadow-sm hover:shadow-md">
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                Watch Demo
              </button>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="font-semibold text-gray-900">50K+</span>
                <span className="ml-1">Active users</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-900">99.9%</span>
                <span className="ml-1">Uptime</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-900">4.9/5</span>
                <span className="ml-1">Rating</span>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                    <div className="text-2xl font-bold">2.4K</div>
                    <div className="text-blue-100 text-sm">Active Tasks</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
                    <div className="text-2xl font-bold">98%</div>
                    <div className="text-green-100 text-sm">Completed</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                    <div className="text-2xl font-bold">15</div>
                    <div className="text-purple-100 text-sm">Team Members</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Website Redesign</span>
                    </div>
                    <span className="text-sm text-gray-500">Due Today</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">Mobile App Testing</span>
                    </div>
                    <span className="text-sm text-gray-500">In Progress</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Client Presentation</span>
                    </div>
                    <span className="text-sm text-gray-500">Tomorrow</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-pink-400 to-red-400 rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;