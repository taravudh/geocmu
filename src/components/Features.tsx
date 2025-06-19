import React from 'react';
import { Zap, Shield, Users, BarChart3, Clock, Smartphone } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Experience blazing fast performance with our optimized infrastructure and cutting-edge technology.',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with end-to-end encryption, compliance certifications, and data protection.',
      color: 'from-green-400 to-blue-500'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Seamlessly collaborate with your team in real-time with advanced sharing and communication tools.',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Gain deep insights with comprehensive analytics, custom reports, and AI-powered recommendations.',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      icon: Clock,
      title: 'Smart Automation',
      description: 'Automate repetitive tasks and workflows to save time and reduce human error.',
      color: 'from-indigo-400 to-purple-500'
    },
    {
      icon: Smartphone,
      title: 'Mobile Ready',
      description: 'Access your work anywhere with our responsive design and native mobile applications.',
      color: 'from-pink-400 to-red-500'
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}succeed
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to streamline your workflow and boost productivity across your entire organization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl">
            Explore All Features
          </button>
        </div>
      </div>
    </section>
  );
};

export default Features;